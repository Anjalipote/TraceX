import os
import shutil
import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_role, require_case_access
from app.models.user import User
from app.models.case import Case
from app.models.evidence import Evidence
from app.schemas.evidence import EvidenceResponse, EvidenceVerifyResponse, EvidenceIntegritySummary
from app.services.hash_service import HashService
from app.services.metadata_service import MetadataService
from app.services.timeline_service import TimelineService
from app.services.audit_service import AuditService
from app.services.merkle_service import MerkleService
from app.services.custody_service import CustodyService
from app.core.config import settings

router = APIRouter(tags=["Evidence & Integrity"])

# Max allowed upload size: 50MB
MAX_UPLOAD_SIZE = 50 * 1024 * 1024

@router.get("/cases/{case_id}/evidence", response_model=List[EvidenceResponse])
def get_case_evidence(
    case_id: str,
    file_type: Optional[str] = None,
    integrity_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = require_case_access(case_id, db, current_user)

    query = db.query(Evidence).filter(Evidence.case_id == case.id)
    if file_type and file_type.lower() != "all":
        query = query.filter(Evidence.file_type == file_type.lower())
    if integrity_status and integrity_status.lower() != "all":
        query = query.filter(Evidence.integrity_status == integrity_status.capitalize())

    return query.order_by(Evidence.uploaded_at.desc()).all()

@router.post("/cases/{case_id}/evidence/upload", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    case_id: str,
    file: UploadFile = File(...),
    source_device: str = Form("FINANCE-SRV-04"),
    category: str = Form("FileSystem"),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "INVESTIGATOR"]))
):
    case = require_case_access(case_id, db, current_user)

    # Security: Path Traversal & Malicious Filename Guard
    filename = file.filename or "unnamed_evidence"
    if ".." in filename or "\x00" in filename or filename.startswith("/") or filename.startswith("\\"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malicious or invalid filename detected: Path traversal sequences prohibited."
        )

    clean_basename = os.path.basename(filename)
    if not clean_basename or clean_basename in [".", ".."]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid evidence filename provided."
        )

    # Safe destination directory
    case_dir = os.path.join(settings.UPLOAD_DIR, str(case.id))
    os.makedirs(case_dir, exist_ok=True)

    # Sanitize and create safe storage filename
    safe_name = f"{uuid.uuid4().hex[:8]}_{clean_basename}"
    storage_path = os.path.join(case_dir, safe_name)

    # Stream file to disk safely while checking file size limit
    total_bytes = 0
    try:
        with open(storage_path, "wb") as buffer:
            while chunk := await file.read(64 * 1024):
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_SIZE:
                    buffer.close()
                    if os.path.exists(storage_path):
                        os.remove(storage_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Evidence file exceeds maximum permitted upload limit (50 MB)."
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save evidence file safely: {str(e)}")

    # Security: Enforce inert read-only permissions on saved evidence artifact (non-executable)
    try:
        import stat
        os.chmod(storage_path, stat.S_IREAD)
    except Exception:
        pass

    # Calculate cryptographic hashes (SHA-256 and MD5)
    sha256_hash, md5_hash = HashService.calculate_hashes(storage_path)

    # Safely extract forensic metadata (inert, read-only binary stream, never execute)
    metadata = MetadataService.extract_metadata(storage_path, clean_basename)

    evidence_count = db.query(Evidence).filter(Evidence.case_id == case.id).count()
    evidence_number = f"EV-{(evidence_count + 1):03d}"
    existing_duplicate = db.query(Evidence).filter(
        Evidence.case_id == case.id,
        Evidence.sha256_hash == sha256_hash
    ).first()
    notes_val = notes or metadata.get("notes")
    if existing_duplicate:
        dup_tag = f"Duplicate detected: SHA-256 matches artifact {existing_duplicate.evidence_number} ({existing_duplicate.filename})"
        notes_val = f"{notes_val} [{dup_tag}]" if notes_val else dup_tag
    if total_bytes == 0:
        zero_note = "Zero-byte file ingested (inert file system placeholder or anti-forensic zeroed artifact)."
        notes_val = f"{notes_val} [{zero_note}]" if notes_val else zero_note

    evidence = Evidence(
        case_id=case.id,
        evidence_number=evidence_number,
        filename=clean_basename,
        original_filename=filename,
        file_type=metadata["file_type"],
        mime_type=metadata["mime_type"],
        file_size=metadata["file_size"],
        storage_path=storage_path,
        sha256_hash=sha256_hash,
        md5_hash=md5_hash,
        integrity_status="Verified",
        analysis_status="Flagged" if metadata.get("is_suspicious", False) else "Complete",
        source_device=source_device,
        category=category,
        notes=notes_val,
        file_created_at=metadata["file_created_at"],
        file_modified_at=metadata["file_modified_at"],
        file_accessed_at=metadata["file_accessed_at"],
        uploaded_at=datetime.now(timezone.utc)
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    # Record Audit Log
    AuditService.log_action(
        db=db,
        action="EVIDENCE_UPLOAD",
        user_email=current_user.email,
        user_role=current_user.role,
        case_id=case.id,
        object_type="Evidence",
        object_id=evidence.id,
        metadata={"filename": clean_basename, "sha256": sha256_hash, "size": metadata["file_size"]}
    )

    # Automatically add timeline event for evidence ingest
    is_threat = metadata.get("is_suspicious", False) or ("malicious" in (notes or "").lower())
    threat_reason = metadata.get("suspicious_details", "")
    event_desc = f"Evidence ingested: {evidence.filename} ({round(evidence.file_size / 1024, 1)} KB). SHA-256 verified."
    if is_threat and threat_reason:
        event_desc += f" Anomaly noted: {threat_reason}"

    TimelineService.create_event_from_evidence(
        db=db,
        case_id=case.id,
        evidence=evidence,
        description=event_desc,
        event_type="file",
        severity="high" if is_threat else "info",
        is_suspicious=is_threat,
        actor=current_user.name
    )

    # If log evidence, safely parse timeline events
    if evidence.file_type == "log":
        TimelineService.parse_log_evidence(db, case.id, evidence)
    elif metadata.get("file_created_at") and metadata.get("file_modified_at"):
        # Record MACB filesystem timeline events for ingested document/binary
        TimelineService.create_event_from_evidence(
            db=db,
            case_id=case.id,
            evidence=evidence,
            description=f"File Created: {evidence.filename} initial timestamp on source volume.",
            event_type="file",
            severity="info",
            is_suspicious=False,
            actor="SYSTEM (NTFS $MFT)"
        )

    # Register in Cryptographically Linked Tamper-Evident Chain of Custody
    try:
        CustodyService.add_custody_entry(
            db=db,
            case_id=case.id,
            evidence_name=clean_basename,
            action="SECURE_INGESTION",
            actor=current_user.name,
            details=f"SHA-256: {sha256_hash} | Size: {metadata['file_size']}B | Status: Verified",
            evidence_id=evidence.id
        )
    except Exception:
        pass

    # Execute automated forensic correlation & analysis pipeline for case
    try:
        from app.services.finding_service import FindingService
        from app.services.anomaly_service import AnomalyService
        from app.services.clustering_service import ClusteringService
        from app.services.risk_service import RiskService

        FindingService.run_correlation(db, case.id)
        AnomalyService.detect_anomalies(db, case.id)
        ClusteringService.cluster_events(db, case.id)
        RiskService.calculate_case_risk(db, case.id)
    except Exception:
        pass

    return evidence

@router.get("/evidence/{evidence_id}", response_model=EvidenceResponse)
def get_evidence(evidence_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        ev = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database query error: {str(e)}")
    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Evidence artifact '{evidence_id}' not found.")
    return ev

@router.post("/evidence/{evidence_id}/verify", response_model=EvidenceVerifyResponse)
def verify_evidence_integrity(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "INVESTIGATOR"]))
):
    try:
        ev = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database query error: {str(e)}")
    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Evidence artifact '{evidence_id}' not found.")

    result = HashService.verify_integrity(ev.storage_path, ev.sha256_hash)
    ev.integrity_status = result["status"]
    db.commit()

    # Audit Log
    AuditService.log_action(
        db=db,
        action="EVIDENCE_VERIFY",
        user_email=current_user.email,
        user_role=current_user.role,
        case_id=ev.case_id,
        object_type="Evidence",
        object_id=ev.id,
        result="SUCCESS" if result["verified"] else "COMPROMISED",
        metadata={"status": result["status"], "filename": ev.filename}
    )

    return EvidenceVerifyResponse(
        evidence_id=ev.id,
        filename=ev.filename,
        expected_sha256=result["expected"],
        calculated_sha256=result["calculated"] or "FILE_NOT_FOUND",
        integrity_status=result["status"],
        matches=result["verified"],
        verified_at=datetime.now(timezone.utc),
        message=result["message"]
    )

@router.get("/cases/{case_id}/integrity", response_model=EvidenceIntegritySummary)
def get_case_integrity_summary(case_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = require_case_access(case_id, db, current_user)

    items = db.query(Evidence).filter(Evidence.case_id == case.id).all()
    total = len(items)
    verified = sum(1 for e in items if e.integrity_status == "Verified")
    compromised = sum(1 for e in items if e.integrity_status == "Compromised")
    pending = sum(1 for e in items if e.integrity_status == "Pending")
    rate = round((verified / total * 100), 1) if total > 0 else 100.0

    return EvidenceIntegritySummary(
        total_evidence=total,
        verified_count=verified,
        compromised_count=compromised,
        pending_count=pending,
        integrity_rate_percent=rate,
        items=items
    )

@router.get("/cases/{case_id}/merkle")
def get_case_merkle_root(case_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = require_case_access(case_id, db, current_user)
    return MerkleService.get_case_merkle_root(db, case.id)

@router.post("/cases/{case_id}/merkle/verify")
def verify_case_merkle_root(case_id: str, expected_root: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = require_case_access(case_id, db, current_user)
    return MerkleService.verify_case_integrity(db, case.id, expected_root)

@router.get("/cases/{case_id}/custody")
def get_case_custody_chain(case_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = require_case_access(case_id, db, current_user)
    return CustodyService.get_custody_chain(db, case.id)

@router.get("/cases/{case_id}/custody/verify")
def verify_case_custody_chain(case_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = require_case_access(case_id, db, current_user)
    return CustodyService.verify_chain_integrity(db, case.id)

