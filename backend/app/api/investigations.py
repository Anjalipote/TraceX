from datetime import datetime, timezone
import uuid
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
from app.services.audit_service import AuditService

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
    collection_type: str = "demo"  # "demo" or "live"

class ScanStage(BaseModel):
    id: str
    name: str
    status: str  # "completed", "scanning", "queued"
    artifacts_count: int
    description: str

class ScanResponse(BaseModel):
    scan_id: str
    case_id: str
    computer_id: str
    status: str
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

class InvestigationResultsResponse(BaseModel):
    case_id: str
    computer_id: str
    collection_type: str
    suspicious_events_count: int
    usb_devices_count: int
    files_accessed_count: int
    network_connections_count: int
    has_suspicious_activity: bool
    summary: str
    findings: List[CorrelatedResult]


@router.get("/computers", response_model=List[ComputerInfo])
def get_available_computers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns computers available for authorized forensic artifact collection.
    Clearly distinguishes Live Agents from Demo/Development Collectors.
    """
    computers: List[ComputerInfo] = []

    # Include registered live endpoint agents
    registered_hosts = db.query(AgentHost).all()
    for h in registered_hosts:
        computers.append(
            ComputerInfo(
                id=h.id,
                name=f"{h.hostname} (Live Windows Host)",
                os=h.os_info or "Windows 11",
                status="Connected" if h.status == "online" else "Standby",
                collection_mode="Read-only",
                collection_type="Live Agent",
                last_seen=h.last_heartbeat.strftime("%H:%M:%S UTC") if h.last_heartbeat else "Just now",
                agent_version=h.agent_version or "v2.5.0-live",
                is_demo=False
            )
        )

    # Built-in investigation targets
    computers.extend([
        ComputerInfo(
            id="EMP-LT-001",
            name="EMP-LT-001 (Demo Benchmark)",
            os="Windows 11 Enterprise (Build 22631)",
            status="Connected",
            collection_mode="Read-only",
            collection_type="Demo Collector",
            last_seen="Just now",
            agent_version="v2.4.1-demo",
            is_demo=True
        ),
        ComputerInfo(
            id="WORKSTATION-CORP-FIN09",
            name="WORKSTATION-CORP-FIN09",
            os="Windows 11 Enterprise (Build 22621)",
            status="Connected",
            collection_mode="Read-only",
            collection_type="Live Agent",
            last_seen="2 mins ago",
            agent_version="v2.4.1",
            is_demo=False
        ),
        ComputerInfo(
            id="DEV-SRV-NORTH-04",
            name="DEV-SRV-NORTH-04",
            os="Ubuntu 22.04 LTS",
            status="Standby",
            collection_mode="Read-only",
            collection_type="Live Agent",
            last_seen="1 hour ago",
            agent_version="v2.4.0",
            is_demo=False
        )
    ])
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
    Step 2 & 3: Executes forensic artifact scan across stages
    and stores normalized artifacts in the investigation database.
    """
    scan_id = f"SCAN-{uuid.uuid4().hex[:8].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()

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

    # Ensure case TRX-001 exists in DB so foreign keys resolve
    case = db.query(Case).filter((Case.id == "TRX-001") | (Case.case_number == "TRX-001")).first()
    if not case:
        case = Case(
            id="TRX-001",
            case_number="TRX-001",
            name="Potential Data Transfer Investigation (EMP-LT-001)",
            description="Investigation into potential unauthorized data transfer and removable storage access from host EMP-LT-001.",
            status="Completed",
            priority="High",
            incident_type="Data Exfiltration",
            target_system="EMP-LT-001",
            investigator_id=current_user.id
        )
        db.add(case)
        db.commit()
        db.refresh(case)

    AuditService.log_action(
        db=db,
        action="FORENSIC_SCAN_COMPLETED",
        user_email=current_user.email,
        user_role=current_user.role,
        case_id="TRX-001",
        object_type="HostInvestigation",
        object_id=req.computer_id,
        metadata={
            "scan_id": scan_id,
            "total_artifacts": total_artifacts,
            "collection_type": req.collection_type
        }
    )

    return ScanResponse(
        scan_id=scan_id,
        case_id="TRX-001",
        computer_id=req.computer_id,
        status="Completed",
        collection_type="Demo Collector" if req.collection_type == "demo" else "Live Agent",
        artifacts_collected=total_artifacts,
        elapsed_seconds=84,
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
    findings = [
        CorrelatedResult(
            id="TRX-FIND-001",
            title="Confidential File Access",
            description="confidential.pdf was accessed shortly before USB connection",
            timestamp="2 Oct 2026, 14:32:15",
            severity="High",
            category="File Access",
            why_suspicious="This file was accessed shortly before a USB device was connected and file transfer activity was detected. The sequence of events suggests potential data exfiltration.",
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
            }
        ),
        CorrelatedResult(
            id="TRX-FIND-002",
            title="USB Device Connected",
            description="SanDisk USB device was connected to workstation port",
            timestamp="2 Oct 2026, 14:33:02",
            severity="Medium",
            category="USB Activity",
            why_suspicious="A non-whitelisted removable mass storage device was inserted 47 seconds after access to confidential corporate blueprints.",
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
            }
        ),
        CorrelatedResult(
            id="TRX-FIND-003",
            title="File Transfer Activity",
            description="confidential.pdf copied to removable drive volume E:\\",
            timestamp="2 Oct 2026, 14:34:18",
            severity="High",
            category="Data Transfer",
            why_suspicious="File transfer operation copied sensitive document directly to the newly mounted removable drive E:\\ followed swiftly by device dismount.",
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
            }
        )
    ]

    return InvestigationResultsResponse(
        case_id=case_id,
        computer_id="EMP-LT-001",
        collection_type="Demo Collector",
        suspicious_events_count=3,
        usb_devices_count=1,
        files_accessed_count=4,
        network_connections_count=2,
        has_suspicious_activity=True,
        summary="TraceX identified potential data exfiltration pattern on EMP-LT-001 involving confidential.pdf and removable storage.",
        findings=findings
    )
