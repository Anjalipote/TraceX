import os
import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.timeline import TimelineEvent
from app.models.finding import Finding
from app.models.agent_host import AgentHost
from app.services.audit_service import AuditService
from app.services.pdf_diff_service import PdfDiffService

router = APIRouter(prefix="/agent", tags=["Live Endpoint Agent"])

# Pydantic Schemas
class RegisterAgentRequest(BaseModel):
    hostname: str
    ip_address: Optional[str] = "127.0.0.1"
    os_info: Optional[str] = "Windows 11"
    current_user: Optional[str] = "SYSTEM"
    agent_version: Optional[str] = "v1.0.0"
    monitored_paths: List[str] = []

class HeartbeatRequest(BaseModel):
    hostname: str
    monitored_paths: List[str] = []
    events_count: int = 0

class AgentEventPayload(BaseModel):
    event_type: str  # "created", "modified", "deleted", "moved", "renamed"
    file_path: str
    original_path: Optional[str] = None
    file_name: str
    file_size: int = 0
    file_extension: str = ""
    sha256_hash: str = ""
    baseline_sha256: Optional[str] = None
    is_modified_from_baseline: bool = False
    timestamp: str  # ISO UTC
    user: str = "Unknown"
    hostname: str = "Unknown"
    case_id: Optional[str] = "CASE-2026-001"
    is_pdf: bool = False
    pdf_diff: Optional[Dict[str, Any]] = None

class IngestEventsRequest(BaseModel):
    hostname: str
    agent_version: str = "v1.0.0"
    case_id: str = "CASE-2026-001"
    events: List[AgentEventPayload]


@router.post("/register")
def register_agent(req: RegisterAgentRequest, db: Session = Depends(get_db)):
    """
    Registers a Windows endpoint agent or updates its connection heartbeat.
    """
    host = db.query(AgentHost).filter(AgentHost.hostname == req.hostname).first()
    now_utc = datetime.now(timezone.utc)
    if not host:
        host = AgentHost(
            hostname=req.hostname,
            ip_address=req.ip_address,
            os_info=req.os_info,
            current_user=req.current_user,
            agent_version=req.agent_version or "v1.0.0",
            status="Online",
            monitored_paths=json.dumps(req.monitored_paths),
            last_heartbeat=now_utc
        )
        db.add(host)
    else:
        host.ip_address = req.ip_address
        host.os_info = req.os_info
        host.current_user = req.current_user
        host.agent_version = req.agent_version or host.agent_version
        host.status = "Online"
        host.monitored_paths = json.dumps(req.monitored_paths)
        host.last_heartbeat = now_utc

    db.commit()
    db.refresh(host)

    return {
        "success": True,
        "message": f"Agent {host.hostname} registered successfully.",
        "host_id": host.id,
        "status": host.status,
        "server_time": now_utc.isoformat()
    }


@router.post("/heartbeat")
def agent_heartbeat(req: HeartbeatRequest, db: Session = Depends(get_db)):
    """
    Periodic heartbeat from live agent indicating active directory monitoring.
    """
    host = db.query(AgentHost).filter(AgentHost.hostname == req.hostname).first()
    now_utc = datetime.now(timezone.utc)
    if host:
        host.status = "Online"
        host.last_heartbeat = now_utc
        if req.monitored_paths:
            host.monitored_paths = json.dumps(req.monitored_paths)
        host.total_events = max(host.total_events, req.events_count)
        db.commit()

    return {
        "status": "acknowledged",
        "timestamp": now_utc.isoformat(),
        "registered": host is not None
    }


@router.get("/status")
def get_agent_status(db: Session = Depends(get_db)):
    """
    Returns the current live status of all registered endpoint agents.
    """
    hosts = db.query(AgentHost).all()
    results = []
    now_utc = datetime.now(timezone.utc)

    for h in hosts:
        paths = []
        try:
            paths = json.loads(h.monitored_paths or "[]")
        except Exception:
            paths = []

        diff_seconds = (now_utc - h.last_heartbeat.replace(tzinfo=timezone.utc)).total_seconds() if h.last_heartbeat else 9999
        is_online = diff_seconds < 30  # Active within last 30 seconds

        results.append({
            "id": h.id,
            "hostname": h.hostname,
            "ip_address": h.ip_address,
            "os_info": h.os_info,
            "current_user": h.current_user,
            "agent_version": h.agent_version,
            "status": "Online" if is_online else "Standby",
            "is_online": is_online,
            "monitored_paths": paths,
            "total_events": h.total_events,
            "last_heartbeat": h.last_heartbeat.isoformat() if h.last_heartbeat else None,
            "seconds_since_heartbeat": int(diff_seconds)
        })

    return {
        "total_agents": len(hosts),
        "online_agents": sum(1 for r in results if r["is_online"]),
        "agents": results
    }


@router.post("/events")
def ingest_agent_events(req: IngestEventsRequest, db: Session = Depends(get_db)):
    """
    Ingests live file create/modify/delete/rename events sent by the Windows Agent.
    Automatically integrates them into Evidence, Timeline, Findings, and Integrity.
    """
    # Find or default case
    target_case_id = req.case_id or "CASE-2026-001"
    case = db.query(Case).filter((Case.id == target_case_id) | (Case.case_number == target_case_id)).first()
    if not case:
        case = db.query(Case).first()
        if not case:
            raise HTTPException(status_code=404, detail="No active case found for agent telemetry.")
        target_case_id = case.id

    # Update host total events
    host = db.query(AgentHost).filter(AgentHost.hostname == req.hostname).first()
    if host:
        host.total_events += len(req.events)
        host.last_heartbeat = datetime.now(timezone.utc)
        host.status = "Online"
        db.commit()

    ingested_count = 0
    evidence_created_count = 0
    findings_created_count = 0

    for ev in req.events:
        ingested_count += 1
        event_time = datetime.now(timezone.utc)
        try:
            event_time = datetime.fromisoformat(ev.timestamp.replace("Z", "+00:00"))
        except Exception:
            pass

        # 1. Timeline Event
        is_suspicious_event = False
        sev = "low"
        if ev.is_modified_from_baseline:
            is_suspicious_event = True
            sev = "critical" if ev.is_pdf else "high"
        elif ev.event_type == "deleted":
            sev = "medium"
        elif "confidential" in ev.file_name.lower() or "secret" in ev.file_name.lower():
            is_suspicious_event = True
            sev = "high"

        timeline_desc = f"File {ev.event_type.upper()}: {ev.file_name}"
        if ev.original_path:
            timeline_desc += f" (Renamed from {os.path.basename(ev.original_path)})"
        if ev.is_modified_from_baseline:
            timeline_desc += f" [Content Modified from Baseline, SHA-256 changed]"
            if ev.is_pdf and ev.pdf_diff and ev.pdf_diff.get("changed_pages"):
                timeline_desc += f" (Altered text on Pages {ev.pdf_diff.get('changed_pages')})"

        tl_evt = TimelineEvent(
            case_id=case.id,
            event_type="file",
            description=timeline_desc,
            timestamp=event_time,
            severity=sev,
            source="LIVE AGENT",
            actor=ev.user or "EndpointUser",
            is_suspicious=is_suspicious_event,
            is_live_agent=True,
            raw_log=json.dumps({
                "source": "LIVE AGENT",
                "hostname": ev.hostname,
                "file_path": ev.file_path,
                "file_size": ev.file_size,
                "sha256": ev.sha256_hash,
                "baseline_sha256": ev.baseline_sha256,
                "event_type": ev.event_type
            })
        )
        db.add(tl_evt)

        # 2. Evidence Record (for created / modified files)
        evidence_item = None
        if ev.event_type in ["created", "modified"] and ev.sha256_hash:
            # Check if this evidence file is already tracked in this case
            existing_ev = db.query(Evidence).filter(
                Evidence.case_id == case.id,
                Evidence.filename == ev.file_name
            ).first()

            integrity_status = "Verified"
            if ev.is_modified_from_baseline:
                integrity_status = "Modified from Baseline"

            pdf_diff_json = json.dumps(ev.pdf_diff) if ev.pdf_diff else None

            if existing_ev:
                existing_ev.sha256_hash = ev.sha256_hash
                existing_ev.file_size = ev.file_size
                existing_ev.file_modified_at = event_time
                existing_ev.integrity_status = integrity_status
                existing_ev.is_live_agent = True
                if ev.baseline_sha256:
                    existing_ev.baseline_sha256 = ev.baseline_sha256
                if pdf_diff_json:
                    existing_ev.pdf_diff_data = pdf_diff_json
                existing_ev.notes = f"Live Agent monitored event '{ev.event_type}' on host {ev.hostname} by {ev.user}."
                evidence_item = existing_ev
            else:
                new_ev = Evidence(
                    case_id=case.id,
                    evidence_number=f"EV-LIVE-{uuid.uuid4().hex[:6].upper()}",
                    filename=ev.file_name,
                    original_filename=ev.file_name,
                    file_type="document" if ev.is_pdf or ev.file_extension in [".pdf", ".docx", ".txt"] else "binary",
                    file_size=ev.file_size,
                    storage_path=ev.file_path,
                    sha256_hash=ev.sha256_hash,
                    integrity_status=integrity_status,
                    analysis_status="Complete",
                    source_device=ev.hostname,
                    category="Live Endpoint File",
                    is_live_agent=True,
                    baseline_sha256=ev.baseline_sha256 or ev.sha256_hash,
                    pdf_diff_data=pdf_diff_json,
                    file_created_at=event_time,
                    file_modified_at=event_time,
                    notes=f"Live Agent monitored event '{ev.event_type}' on host {ev.hostname} by {ev.user}."
                )
                db.add(new_ev)
                db.flush()
                evidence_item = new_ev
                evidence_created_count += 1

        # 3. Generate Explainable Finding if Modified from Baseline or PDF Alteration
        if ev.is_modified_from_baseline and ev.sha256_hash:
            finding_title = f"Unauthorized File Modification: {ev.file_name}"
            category = "Data Tampering"
            severity_str = "High"

            why_suspicious_text = (
                f"File '{ev.file_name}' was modified from its recorded baseline on endpoint {ev.hostname} by user {ev.user}. "
                f"Cryptographic SHA-256 changed from {ev.baseline_sha256[:12] if ev.baseline_sha256 else 'initial'} to {ev.sha256_hash[:12]}."
            )

            if ev.is_pdf and ev.pdf_diff:
                changed_pages = ev.pdf_diff.get("changed_pages", [])
                summary_diff = ev.pdf_diff.get("summary", "")
                finding_title = f"PDF Document Content Altered: {ev.file_name}"
                category = "Document Alteration / Tampering"
                severity_str = "Critical"
                why_suspicious_text = (
                    f"Textual content inside PDF '{ev.file_name}' was modified on Pages {changed_pages}. "
                    f"{summary_diff} Observed on host {ev.hostname} under user account {ev.user}."
                )

            finding = Finding(
                case_id=case.id,
                evidence_id=evidence_item.id if evidence_item else None,
                title=finding_title,
                description=f"File content was altered on endpoint {ev.hostname}. Path: {ev.file_path}",
                severity=severity_str,
                reason="Hash mismatch and textual delta detected against baseline.",
                risk_contribution=25,
                category=category,
                status="Confirmed",
                confidence="High",
                confidence_reason="Cryptographic SHA-256 divergence and semantic PDF comparison.",
                what_happened=f"File '{ev.file_name}' modified by {ev.user} on {ev.hostname}.",
                why_detected="Real-time Windows endpoint filesystem monitor captured write transaction.",
                why_suspicious=why_suspicious_text,
                recommended_next_step="Inspect user session logs and review specific text changes in the PDF Diff viewer.",
                is_live_agent=True,
                supporting_factors=json.dumps([
                    f"Baseline Hash: {ev.baseline_sha256}",
                    f"Current Hash: {ev.sha256_hash}",
                    f"Host: {ev.hostname}",
                    f"Actor: {ev.user}"
                ]),
                related_entities=json.dumps([ev.file_name, ev.hostname, ev.user])
            )
            db.add(finding)
            findings_created_count += 1

    db.commit()

    return {
        "success": True,
        "message": f"Successfully ingested {ingested_count} live agent events.",
        "case_id": case.id,
        "ingested_events": ingested_count,
        "evidence_created": evidence_created_count,
        "findings_created": findings_created_count
    }


@router.post("/upload-artifact")
async def upload_agent_artifact(
    case_id: str = Form("CASE-2026-001"),
    hostname: str = Form("Unknown"),
    user: str = Form("SYSTEM"),
    file_type: str = Form("document"),
    is_baseline: bool = Form(False),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Receives physical file copies (baseline or modified) uploaded by the Live Agent.
    Saves in backend upload vault and calculates hash.
    """
    case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        case = db.query(Case).first()

    target_dir = os.path.join(settings.UPLOAD_DIR, "live_agent_artifacts")
    os.makedirs(target_dir, exist_ok=True)

    file_bytes = await file.read()
    import hashlib
    sha256_str = hashlib.sha256(file_bytes).hexdigest()

    saved_filename = f"{'baseline_' if is_baseline else 'live_'}_{uuid.uuid4().hex[:6]}_{file.filename}"
    saved_path = os.path.join(target_dir, saved_filename)

    with open(saved_path, "wb") as f:
        f.write(file_bytes)

    return {
        "success": True,
        "filename": file.filename,
        "saved_path": saved_path,
        "sha256_hash": sha256_str,
        "file_size": len(file_bytes),
        "is_baseline": is_baseline
    }


@router.get("/pdf-diff/{evidence_id}")
def get_pdf_diff_for_evidence(evidence_id: str, db: Session = Depends(get_db)):
    """
    Returns the page-by-page text comparison between baseline and modified versions of a PDF evidence item.
    """
    ev = db.query(Evidence).filter((Evidence.id == evidence_id) | (Evidence.filename == evidence_id)).order_by(Evidence.uploaded_at.desc()).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence item not found")

    if not ev.pdf_diff_data:
        # Check if we can construct a diff or return structured baseline info
        return {
            "evidence_id": ev.id,
            "filename": ev.filename,
            "has_diff": False,
            "message": "No modification diff recorded for this artifact. Artifact matches initial baseline.",
            "baseline_sha256": ev.baseline_sha256 or ev.sha256_hash,
            "current_sha256": ev.sha256_hash
        }

    try:
        diff_obj = json.loads(ev.pdf_diff_data)
        return {
            "evidence_id": ev.id,
            "filename": ev.filename,
            "has_diff": True,
            "baseline_sha256": ev.baseline_sha256,
            "current_sha256": ev.sha256_hash,
            "diff": diff_obj
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF diff data: {str(e)}")
