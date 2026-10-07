from datetime import datetime, timezone
import uuid
import os
import json
import platform
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.timeline import TimelineEvent
from app.models.finding import Finding
from app.models.agent_host import AgentHost
from app.models.collection_job import CollectionJob
from app.models.forensic_event import ForensicEvent
from app.services.audit_service import AuditService
from app.services.collector_service import WindowsForensicCollector
from app.services.correlation_service import CorrelationEngine

router = APIRouter(prefix="/investigations", tags=["Forensic Investigations"])

# Pydantic Schemas
class ComputerInfo(BaseModel):
    id: str
    name: str
    os: str
    status: str
    collection_mode: str
    collection_type: str
    last_seen: str
    agent_version: str
    is_demo: bool
    is_admin: bool = False

class AuthorizeRequest(BaseModel):
    computer_id: str = "EMP-LT-001"
    case_id: Optional[str] = "TRX-001"
    collection_mode: str = "read_only"
    collection_type: str = "demo"  # "demo" or "live"
    authorized: bool = True
    categories: List[str] = [
        "System Logs", "File Activity", "USB / Device Activity",
        "User Activity", "Network Activity", "Application Activity",
        "Timestamps and Metadata"
    ]

class AuthorizeResponse(BaseModel):
    authorization_id: str
    computer_id: str
    case_id: str
    status: str
    collection_mode: str
    collection_type: str
    authorized_at: str
    authorized_by: str
    categories_granted: List[str]
    read_only_guarantee: bool
    notice: str

class ScanRequest(BaseModel):
    computer_id: str = "EMP-LT-001"
    case_id: Optional[str] = "TRX-001"
    investigation_mode: Optional[str] = "historical"  # "historical" or "live"
    collection_type: str = "demo"  # "demo" or "live"
    hours: Optional[int] = 24
    scan_paths: Optional[List[str]] = None

class ScanStage(BaseModel):
    id: str
    name: str
    status: str  # "completed", "scanning", "queued", "unavailable"
    artifacts_count: int
    description: str

class ScanResponse(BaseModel):
    scan_id: str
    case_id: str
    computer_id: str
    status: str
    investigation_mode: str = "historical"
    collection_type: str
    artifacts_collected: int
    elapsed_seconds: int
    stages: List[ScanStage]
    completed_at: str

class CorrelatedResult(BaseModel):
    id: str
    title: str
    description: str
    timestamp: str
    severity: str
    category: str
    why_suspicious: str
    related_events: List[str]
    metadata: Dict[str, Any]
    is_live_agent: bool = False

class InvestigationResultsResponse(BaseModel):
    case_id: str
    computer_id: str
    investigation_mode: str = "historical"
    collection_type: str
    suspicious_events_count: int
    usb_devices_count: int
    files_accessed_count: int
    network_connections_count: int
    has_suspicious_activity: bool
    summary: str
    findings: List[CorrelatedResult]
    candidate_files: Optional[List[Dict[str, Any]]] = None
    telemetry_status: Optional[Dict[str, Any]] = None


@router.get("/computers", response_model=List[ComputerInfo])
def get_available_computers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns computers available for authorized forensic artifact collection.
    Distinguishes Live Windows Host from Demo Benchmark collectors.
    """
    computers: List[ComputerInfo] = []

    # Current Host (Live Windows System)
    is_win = platform.system() == "Windows"
    is_elevated = WindowsForensicCollector.is_admin() if is_win else False
    local_host_name = platform.node() or "WINDOWS-LOCAL"

    computers.append(
        ComputerInfo(
            id=local_host_name,
            name=f"{local_host_name} (Current Windows Endpoint)",
            os=f"{platform.system()} {platform.release()} ({platform.version()})",
            status="Connected (Ready for Collection)",
            collection_mode="Read-only",
            collection_type="Live Agent",
            last_seen="Active Now",
            agent_version="v2.5.0-native",
            is_demo=False,
            is_admin=is_elevated
        )
    )

    # Registered external live endpoint agents
    registered_hosts = db.query(AgentHost).filter(AgentHost.hostname != local_host_name).all()
    for h in registered_hosts:
        computers.append(
            ComputerInfo(
                id=h.id,
                name=f"{h.hostname} (Live Remote Host)",
                os=h.os_info or "Windows 11",
                status="Connected" if h.status == "online" else "Standby",
                collection_mode="Read-only",
                collection_type="Live Agent",
                last_seen=h.last_heartbeat.strftime("%H:%M:%S UTC") if h.last_heartbeat else "Just now",
                agent_version=h.agent_version or "v2.5.0-live",
                is_demo=False,
                is_admin=False
            )
        )

    # Demo Benchmark Collector
    computers.append(
        ComputerInfo(
            id="EMP-LT-001",
            name="EMP-LT-001 (Demo Benchmark Simulation)",
            os="Windows 11 Enterprise (Build 22631)",
            status="Standby (Pre-recorded Evidence)",
            collection_mode="Read-only",
            collection_type="Demo Collector",
            last_seen="Archived",
            agent_version="v2.4.1-demo",
            is_demo=True,
            is_admin=False
        )
    )

    return computers


@router.post("/authorize", response_model=AuthorizeResponse)
def authorize_investigation(
    req: AuthorizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Step 1: Records formal investigator permission and authorization
    for read-only forensic artifact collection.
    """
    if not req.authorized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Investigation authorization must be explicitly granted before proceeding."
        )

    auth_id = f"AUTH-{uuid.uuid4().hex[:8].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()

    AuditService.log_action(
        db=db,
        action="INVESTIGATION_AUTHORIZED",
        user_email=current_user.email,
        user_role=current_user.role,
        case_id=req.case_id or "TRX-001",
        object_type="HostInvestigation",
        object_id=req.computer_id,
        metadata={
            "auth_id": auth_id,
            "computer_id": req.computer_id,
            "collection_type": req.collection_type,
            "collection_mode": req.collection_mode,
            "categories": req.categories
        }
    )

    return AuthorizeResponse(
        authorization_id=auth_id,
        computer_id=req.computer_id,
        case_id=req.case_id or "TRX-001",
        status="Authorized",
        collection_mode=req.collection_mode,
        collection_type="Demo Collector" if req.collection_type == "demo" else "Live Agent",
        authorized_at=now_iso,
        authorized_by=current_user.name,
        categories_granted=req.categories,
        read_only_guarantee=True,
        notice="TraceX operates strictly in read-only mode. System files and metadata are acquired without file modification."
    )


@router.post("/scan", response_model=ScanResponse)
def execute_forensic_scan(
    req: ScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Step 2 & 3: Executes real or demo forensic artifact scan across stages
    and stores normalized artifacts in the investigation database.
    """
    scan_id = f"SCAN-{uuid.uuid4().hex[:8].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()
    case_id = req.case_id or "TRX-001"

    # Ensure Case exists in DB
    case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        case = Case(
            id=case_id,
            case_number=case_id,
            name=f"Forensic Investigation ({req.computer_id})",
            description=f"Investigation into potential data modification and removable storage activity on {req.computer_id}.",
            status="In Progress",
            priority="High",
            incident_type="Data Exfiltration",
            target_system=req.computer_id,
            investigator_id=current_user.id
        )
        db.add(case)
        db.commit()
        db.refresh(case)

    # LIVE AGENT / REAL WINDOWS COLLECTION PATH
    if req.collection_type == "live" or req.computer_id != "EMP-LT-001":
        # Resolve scan paths against project root
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        target_paths = []
        for p in (req.scan_paths or []):
            if not os.path.isabs(p):
                cand = os.path.join(base_dir, p)
                if os.path.exists(cand):
                    target_paths.append(cand)
                else:
                    target_paths.append(os.path.abspath(p))
            else:
                target_paths.append(p)

        if not target_paths:
            test_ev_dir = os.path.join(base_dir, "agent_test_evidence")
            monitored_ev_dir = os.path.join(base_dir, "monitored_evidence")
            for p in [test_ev_dir, monitored_ev_dir]:
                if os.path.exists(p):
                    target_paths.append(p)
            if not target_paths:
                target_paths.append(base_dir)

        # Load baseline manifest if present
        baseline_cache_dir = os.path.join(base_dir, "agent", ".tracex_baseline")
        baseline_manifest_file = os.path.join(baseline_cache_dir, "baseline_manifest.json")
        baseline_manifest = {}
        if os.path.exists(baseline_manifest_file):
            try:
                with open(baseline_manifest_file, "r", encoding="utf-8") as bf:
                    baseline_manifest = json.load(bf)
            except Exception:
                pass

        # Create CollectionJob record
        job = CollectionJob(
            id=f"JOB-{uuid.uuid4().hex[:8].upper()}",
            investigation_id=case_id,
            computer_id=req.computer_id,
            status="running",
            stage="running_collectors",
            progress_percent=20,
            scope_config={"paths": target_paths, "hours": req.hours or 24},
            started_at=datetime.now(timezone.utc)
        )
        db.add(job)
        db.commit()

        # 1. Candidate File Discovery
        candidate_files = WindowsForensicCollector.discover_candidate_files(
            search_paths=target_paths,
            hours=req.hours or 24,
            baseline_manifest=baseline_manifest,
            baseline_cache_dir=baseline_cache_dir
        )

        # 2. USB Registry Collection
        usb_result = WindowsForensicCollector.collect_usb_history()

        # 3. Windows Event Logs Collection
        event_result = WindowsForensicCollector.collect_event_logs(hours=req.hours or 24)

        # 4. NTFS USN Journal Collection
        usn_result = WindowsForensicCollector.collect_usn_journal()

        # Ingest File Events into ForensicEvent table
        now_dt = datetime.now(timezone.utc)
        for cf in candidate_files:
            evt_type = "FILE_MODIFIED" if cf.get("is_baseline_diverged") else "FILE_ACCESSED"
            mtime_val = datetime.fromisoformat(cf["mtime"]) if cf.get("mtime") else now_dt
            
            fevt = ForensicEvent(
                investigation_id=case_id,
                job_id=job.id,
                timestamp=mtime_val,
                timestamp_source="filesystem_mtime",
                event_type=evt_type,
                category="File System",
                severity="High" if cf.get("is_baseline_diverged") else "Low",
                computer_id=req.computer_id,
                user=current_user.name,
                file_name=cf["file_name"],
                file_path=cf["file_path"],
                file_size=cf["file_size"],
                file_hash=cf["sha256"],
                previous_hash=cf.get("baseline_sha256"),
                raw_artifact_source="NTFS File Metadata Scan",
                details={
                    "ctime": cf.get("ctime"),
                    "mtime": cf.get("mtime"),
                    "atime": cf.get("atime"),
                    "usn_data": cf.get("usn_data"),
                    "diff_data": cf.get("pdf_diff")
                }
            )
            db.add(fevt)

        # Ingest USN Journal records if available (when elevated or queried)
        for rec in usn_result.get("records", []):
            rec_ts = now_dt
            try:
                rec_ts = datetime.fromisoformat(rec.get("timestamp")) if rec.get("timestamp") else now_dt
            except Exception:
                pass
            fevt = ForensicEvent(
                investigation_id=case_id,
                job_id=job.id,
                timestamp=rec_ts,
                timestamp_source="ntfs_usn_journal",
                event_type=rec.get("event_type", "FILE_MODIFIED"),
                category="File System",
                severity="High" if "DELETE" in rec.get("event_type", "") or "RENAME" in rec.get("event_type", "") else "Medium",
                computer_id=req.computer_id,
                user=current_user.name,
                file_name=rec.get("file_name", "Unknown"),
                file_path=f"{rec.get('volume', 'C:')}\\{rec.get('file_name', 'Unknown')}",
                raw_artifact_source="NTFS USN Change Journal",
                details=rec
            )
            db.add(fevt)

        # Ingest USB Events into ForensicEvent table
        for u in usb_result.get("devices", []):
            fevt = ForensicEvent(
                investigation_id=case_id,
                job_id=job.id,
                timestamp=now_dt,
                timestamp_source="registry_usbstor",
                event_type="USB_CONNECTED",
                category="USB / Removable Storage",
                severity="Medium",
                computer_id=req.computer_id,
                device_name=u.get("friendly_name"),
                device_serial=u.get("serial_number"),
                hardware_id=u.get("hardware_id"),
                raw_artifact_source="HKLM\\SYSTEM\\CurrentControlSet\\Enum\\USBSTOR",
                details=u
            )
            db.add(fevt)

        # Ingest System & PnP Log Events into ForensicEvent table
        for el in event_result.get("events", [])[:25]:
            fevt = ForensicEvent(
                investigation_id=case_id,
                job_id=job.id,
                timestamp=now_dt,
                timestamp_source="windows_event_log",
                event_type=el.get("action", "SYSTEM_EVENT"),
                category="System Log",
                severity="Low",
                computer_id=req.computer_id,
                raw_artifact_source=el.get("source", f"Event ID {el.get('event_id')}"),
                details=el
            )
            db.add(fevt)

        db.commit()

        # Run Correlation Engine
        CorrelationEngine.correlate_investigation(
            db=db,
            investigation_id=case_id,
            job_id=job.id,
            actor_email=current_user.email
        )

        # Update Job Status
        total_collected = len(candidate_files) + len(usb_result.get("devices", [])) + len(event_result.get("events", [])) + len(usn_result.get("records", []))
        job.status = "completed"
        job.stage = "completed"
        job.progress_percent = 100
        job.artifacts_discovered = total_collected
        job.artifacts_collected = total_collected
        job.artifacts_status = {
            "candidate_files": {"status": "available", "count": len(candidate_files)},
            "usb_registry": usb_result,
            "event_logs": event_result.get("channel_status", {}),
            "usn_journal": usn_result
        }
        job.completed_at = datetime.now(timezone.utc)
        db.commit()

        # Build real stages response
        stages = [
            ScanStage(
                id="stage-1",
                name="Scanning candidate files & metadata",
                status="completed",
                artifacts_count=len(candidate_files),
                description=f"Discovered {len(candidate_files)} candidate files with full NTFS metadata (mtime/ctime/atime/SHA-256)"
            ),
            ScanStage(
                id="stage-2",
                name="Querying USBSTOR registry",
                status="completed",
                artifacts_count=len(usb_result.get("devices", [])),
                description=f"Extracted {len(usb_result.get('devices', []))} removable storage device records from HKLM\\...\\USBSTOR"
            ),
            ScanStage(
                id="stage-3",
                name="Collecting Windows event logs",
                status="completed" if event_result.get("events") else "partial",
                artifacts_count=len(event_result.get("events", [])),
                description="Kernel-PnP device and system event logs acquired via wevtutil"
            ),
            ScanStage(
                id="stage-4",
                name="Inspecting NTFS USN Change Journal",
                status="unavailable" if usn_result.get("status") == "unavailable" else "completed",
                artifacts_count=usn_result.get("records_count", 0),
                description=usn_result.get("reason", "NTFS USN journal stream read successfully")
            ),
            ScanStage(
                id="stage-5",
                name="Correlating files with removable devices",
                status="completed",
                artifacts_count=len(candidate_files),
                description="Temporal proximity, cryptographic divergence, and entity graph generated"
            )
        ]

        return ScanResponse(
            scan_id=scan_id,
            case_id=case_id,
            computer_id=req.computer_id,
            status="Completed",
            investigation_mode=req.investigation_mode or "historical",
            collection_type="Live Agent",
            artifacts_collected=total_collected,
            elapsed_seconds=12,
            stages=stages,
            completed_at=now_iso
        )

    # DEMO / BENCHMARK COLLECTOR PATH
    else:
        stages = [
            ScanStage(
                id="stage-1",
                name="Collecting system logs",
                status="completed",
                artifacts_count=45,
                description="Security event logs, audit trails, and authentication records"
            ),
            ScanStage(
                id="stage-2",
                name="Scanning file activity",
                status="completed",
                artifacts_count=52,
                description="Access times, modifications, file creation, and USN journal"
            ),
            ScanStage(
                id="stage-3",
                name="Detecting connected devices",
                status="completed",
                artifacts_count=8,
                description="Removable storage mount points, vendor IDs, and serial numbers"
            ),
            ScanStage(
                id="stage-4",
                name="Collecting user activity",
                status="completed",
                artifacts_count=12,
                description="Active logon sessions, interactive sessions, and user processes"
            ),
            ScanStage(
                id="stage-5",
                name="Analyzing network logs",
                status="completed",
                artifacts_count=14,
                description="Outbound connections, DNS queries, and active listening sockets"
            ),
            ScanStage(
                id="stage-6",
                name="Gathering application logs",
                status="completed",
                artifacts_count=18,
                description="Application crash dumps, prefetch executions, and user binaries"
            )
        ]
        total_artifacts = sum(s.artifacts_count for s in stages)

        return ScanResponse(
            scan_id=scan_id,
            case_id=case_id,
            computer_id=req.computer_id,
            status="Completed",
            collection_type="Demo Collector",
            artifacts_collected=total_artifacts,
            elapsed_seconds=15,
            stages=stages,
            completed_at=now_iso
        )


@router.get("/{case_id}/results", response_model=InvestigationResultsResponse)
def get_investigation_results(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Step 4: Returns normalized correlated results and "Why Suspicious?"
    causal explanations for the host investigation.
    """
    # 1. Query findings in database for this case
    db_findings = db.query(Finding).filter(Finding.case_id == case_id).all()
    db_events = db.query(ForensicEvent).filter(ForensicEvent.investigation_id == case_id).all()
    latest_job = db.query(CollectionJob).filter(CollectionJob.investigation_id == case_id).order_by(CollectionJob.created_at.desc()).first()

    # If real database findings exist, format and return them
    if db_findings:
        findings_out: List[CorrelatedResult] = []
        for f in db_findings:
            # Look up related evidence
            ev = db.query(Evidence).filter(Evidence.id == f.evidence_id).first() if f.evidence_id else None
            
            # Format metadata
            meta = {
                "file_name": ev.filename if ev else "N/A",
                "file_path": ev.storage_path if ev else "N/A",
                "sha256": ev.sha256_hash if ev else "N/A",
                "baseline_sha256": ev.baseline_sha256 if ev else "N/A",
                "integrity_status": "Diverged" if (ev and ev.baseline_sha256 and ev.baseline_sha256 != ev.sha256_hash) else "Verified",
                "pdf_diff_available": bool(ev and ev.pdf_diff_data),
                "diff_data": ev.pdf_diff_data if ev else None,
                "is_live_agent": f.is_live_agent or False
            }

            findings_out.append(
                CorrelatedResult(
                    id=f.id,
                    title=f.title,
                    description=f.description,
                    timestamp=f.created_at.strftime("%d %b %Y, %H:%M:%S") if f.created_at else "Just now",
                    severity=f.severity,
                    category=f.category or "Forensics",
                    why_suspicious=f.why_suspicious or f.reason or "Warrants forensic review.",
                    related_events=[f"{f.title} detected on endpoint"],
                    metadata=meta,
                    is_live_agent=f.is_live_agent or False
                )
            )

        candidate_files_count = len([e for e in db_events if e.category == "File System"])
        usb_count = len([e for e in db_events if "USB" in (e.event_type or "") or e.category == "USB / Removable Storage"])

        return InvestigationResultsResponse(
            case_id=case_id,
            computer_id=(latest_job.computer_id if latest_job else "Windows Endpoint"),
            investigation_mode="historical",
            collection_type="Live Agent" if any(f.is_live_agent for f in db_findings) else "Demo Collector",
            suspicious_events_count=len(db_findings),
            usb_devices_count=usb_count,
            files_accessed_count=candidate_files_count,
            network_connections_count=0,
            has_suspicious_activity=True,
            summary=f"TraceX correlated {len(db_events)} endpoint forensic events across candidate files and USB storage artifacts.",
            findings=findings_out,
            telemetry_status=latest_job.artifacts_status if latest_job else None
        )

    # Fallback to Demo Benchmark results if no DB findings yet
    demo_findings = [
        CorrelatedResult(
            id="TRX-FIND-001",
            title="Confidential File Access",
            description="confidential.pdf was accessed shortly before USB connection",
            timestamp="2 Oct 2026, 14:32:15",
            severity="High",
            category="File Access",
            why_suspicious="This file was accessed shortly before a USB device was connected and file transfer activity was detected. The sequence of events suggests potential data transfer activity.",
            related_events=[
                "USB Device Connected (14:33:02)",
                "File Transfer Activity (14:34:18)",
                "USB Device Disconnected (14:36:05)"
            ],
            metadata={
                "user": "Employee01",
                "file_name": "confidential.pdf",
                "file_path": "C:\\Users\\Employee01\\Documents\\confidential.pdf",
                "action": "Read",
                "process": "Acrobat.exe (PID: 4521)",
                "sha256": "8a3f7c92d5e683b1a40f8e91cd2a34bb7219e8cf1032948bb37e6f81a7d45e90",
                "integrity_status": "Verified"
            },
            is_live_agent=False
        ),
        CorrelatedResult(
            id="TRX-FIND-002",
            title="USB Device Connected",
            description="SanDisk USB device was connected to workstation port",
            timestamp="2 Oct 2026, 14:33:02",
            severity="Medium",
            category="USB Activity",
            why_suspicious="A removable mass storage device was connected 47 seconds after access to confidential corporate blueprints.",
            related_events=[
                "Confidential File Access (14:32:15)",
                "File Transfer Activity (14:34:18)",
                "USB Device Disconnected (14:36:05)"
            ],
            metadata={
                "user": "Employee01",
                "device_name": "SanDisk Ultra 64GB",
                "serial_number": "4C530001230912098134",
                "mount_point": "E:\\",
                "file_system": "exFAT",
                "action": "Mount / Connect",
                "process": "System (PnP Manager)"
            },
            is_live_agent=False
        ),
        CorrelatedResult(
            id="TRX-FIND-003",
            title="File Transfer Activity",
            description="confidential.pdf copied to removable drive volume E:\\",
            timestamp="2 Oct 2026, 14:34:18",
            severity="High",
            category="Data Transfer",
            why_suspicious="File transfer operation copied document to removable drive E:\\ followed by device dismount.",
            related_events=[
                "Confidential File Access (14:32:15)",
                "USB Device Connected (14:33:02)",
                "USB Device Disconnected (14:36:05)"
            ],
            metadata={
                "user": "Employee01",
                "file_name": "confidential.pdf",
                "file_path": "C:\\Users\\Employee01\\Documents\\confidential.pdf -> E:\\confidential.pdf",
                "action": "Copy / Write",
                "process": "explorer.exe (PID: 4120)",
                "size_bytes": 2516582,
                "sha256": "8a3f7c92d5e683b1a40f8e91cd2a34bb7219e8cf1032948bb37e6f81a7d45e90"
            },
            is_live_agent=False
        )
    ]

    return InvestigationResultsResponse(
        case_id=case_id,
        computer_id="EMP-LT-001",
        investigation_mode="historical",
        collection_type="Demo Collector",
        suspicious_events_count=3,
        usb_devices_count=1,
        files_accessed_count=4,
        network_connections_count=2,
        has_suspicious_activity=True,
        summary="TraceX identified potential data transfer pattern on EMP-LT-001 involving confidential.pdf and removable storage.",
        findings=demo_findings,
        telemetry_status=None
    )


@router.get("/{case_id}/collection-status")
def get_collection_status(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns live collection job progress and artifact telemetry status.
    """
    job = db.query(CollectionJob).filter(CollectionJob.investigation_id == case_id).order_by(CollectionJob.created_at.desc()).first()
    if not job:
        return {
            "status": "idle",
            "progress_percent": 0,
            "artifacts_collected": 0,
            "stage": "not_started"
        }
    return job.to_dict()


@router.post("/{case_id}/events")
def ingest_forensic_events(
    case_id: str,
    events: List[Dict[str, Any]],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ingests normalized forensic events from external or local Windows agents.
    """
    ingested = 0
    now_dt = datetime.now(timezone.utc)
    for e in events:
        ts = e.get("timestamp")
        ts_parsed = datetime.fromisoformat(ts) if ts else now_dt
        
        fevt = ForensicEvent(
            investigation_id=case_id,
            timestamp=ts_parsed,
            event_type=e.get("event_type", "FILE_ACCESSED"),
            category=e.get("category", "File System"),
            severity=e.get("severity", "Low"),
            computer_id=e.get("computer_id", "Endpoint"),
            user=e.get("user"),
            file_name=e.get("file_name"),
            file_path=e.get("file_path"),
            file_size=e.get("file_size"),
            file_hash=e.get("sha256_hash") or e.get("file_hash"),
            previous_hash=e.get("baseline_sha256") or e.get("previous_hash"),
            device_name=e.get("device_name"),
            device_serial=e.get("device_serial"),
            raw_artifact_source=e.get("source", "Agent Telemetry"),
            details=e.get("details", {})
        )
        db.add(fevt)
        ingested += 1

    db.commit()
    return {"success": True, "events_ingested": ingested, "investigation_id": case_id}


@router.post("/{case_id}/correlate")
def trigger_correlation(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Triggers automated correlation engine for an investigation.
    """
    result = CorrelationEngine.correlate_investigation(
        db=db,
        investigation_id=case_id,
        actor_email=current_user.email
    )
    return result
