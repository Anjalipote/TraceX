import os
import sys
from datetime import datetime, timezone

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.core.config import settings
from app.models.user import User
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.timeline import TimelineEvent
from app.models.finding import Finding
from app.models.risk import RiskFactor
from app.models.relationship import EvidenceRelationship
from app.models.report import Report
from app.models.audit_log import AuditLog
from app.services.hash_service import HashService
from app.services.custody_service import CustodyService

def seed_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 0. RBAC Users (ADMIN, INVESTIGATOR, VIEWER)
        users_data = [
            ("user-alex-vance", "Specialist Alex Vance", "investigator@tracex.demo", "ADMIN", "TX-4092"),
            ("user-marcus-thorne", "Specialist Marcus Thorne", "marcus.thorne@tracex.demo", "INVESTIGATOR", "TX-5118"),
            ("user-sarah-chen", "Auditor Sarah Chen", "sarah.chen@tracex.demo", "VIEWER", "TX-9021"),
        ]
        for uid, uname, uemail, urole, ubadge in users_data:
            usr = db.query(User).filter(User.email == uemail).first()
            if not usr:
                usr = User(
                    id=uid,
                    name=uname,
                    email=uemail,
                    password_hash=get_password_hash("TraceX@123"),
                    role=urole,
                    status="active",
                    badge_number=ubadge
                )
                db.add(usr)
            else:
                usr.role = urole
                usr.status = "active"
        db.commit()

        user_id = "user-alex-vance"

        # 1. Cases
        cases_data = [
            {
                "id": "CASE-2026-001",
                "case_number": "CASE-2026-001",
                "name": "Unauthorized Data Access Investigation",
                "description": "Investigation into unauthorized exfiltration of proprietary engineering schematics and customer financial records via removable storage followed by anti-forensic wiper execution.",
                "status": "Active",
                "priority": "Critical",
                "incident_type": "Data Exfiltration",
                "target_system": "WORKSTATION-CORP-FIN09 (Windows 11 Enterprise)",
                "investigator_id": user_id
            },
            {
                "id": "CASE-2026-002",
                "case_number": "CASE-2026-002",
                "name": "Insider Activity Investigation",
                "description": "Post-termination insider review concerning anomalous cloud storage downloads during off-duty hours. Determined as legitimate authorized handover.",
                "status": "Closed",
                "priority": "Medium",
                "incident_type": "Insider Threat",
                "target_system": "DEV-SRV-NORTH-04 (Ubuntu Server 22.04)",
                "investigator_id": user_id
            },
            {
                "id": "CASE-2026-003",
                "case_number": "CASE-2026-003",
                "name": "Ransomware Perimeter Breach",
                "description": "Phishing artifact triage and credential stuffing alerts targeting VPN gateways. Lateral movement halted at DMZ segment.",
                "status": "Under Review",
                "priority": "High",
                "incident_type": "Network Intrusion",
                "target_system": "GATEWAY-VPN-02 (Fortinet Appliance)",
                "investigator_id": user_id
            },
            {
                "id": "CASE-RESTRICTED-099",
                "case_number": "CASE-RESTRICTED-099",
                "name": "RESTRICTED: Counter-Espionage Inquiry",
                "description": "Classified compartmented investigation requiring administrator-level clearance.",
                "status": "Restricted",
                "priority": "Critical",
                "incident_type": "Espionage",
                "target_system": "SECURE-VAULT-CORE",
                "investigator_id": "user-sarah-chen"
            }
        ]

        for cd in cases_data:
            c = db.query(Case).filter(Case.case_number == cd["case_number"]).first()
            if not c:
                c = Case(**cd)
                db.add(c)
        db.commit()

        # 2. Evidence for CASE-2026-001
        case_1 = db.query(Case).filter(Case.case_number == "CASE-2026-001").first()
        uploads_case_dir = os.path.join(settings.UPLOAD_DIR, str(case_1.id))
        os.makedirs(uploads_case_dir, exist_ok=True)

        evidence_seeds = [
            {
                "id": "ev-001",
                "evidence_number": "EV-001",
                "filename": "confidential.pdf",
                "original_filename": "confidential.pdf",
                "file_type": "document",
                "mime_type": "application/pdf",
                "file_size": 2516582,
                "sha256_hash": "8a3f7c92d5e683b1a40f8e91cd2a34bb7219e8cf1032948bb37e6f81a7d45e90",
                "integrity_status": "Verified",
                "analysis_status": "Flagged",
                "source_device": "WORKSTATION-CORP-FIN09 (C:\\Users\\Admin\\Documents\\Classified\\)",
                "category": "Document",
                "notes": "Proprietary IP document containing unreleased blueprints. Copied directly to volume E:\\.",
                "file_created_at": datetime(2026, 10, 5, 9, 12, 4, tzinfo=timezone.utc),
                "file_modified_at": datetime(2026, 10, 5, 9, 47, 18, tzinfo=timezone.utc),
                "file_accessed_at": datetime(2026, 10, 5, 9, 47, 45, tzinfo=timezone.utc),
            },
            {
                "id": "ev-002",
                "evidence_number": "EV-002",
                "filename": "employee_data.xlsx",
                "original_filename": "employee_data.xlsx",
                "file_type": "document",
                "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "file_size": 15518924,
                "sha256_hash": "c4b123fe9082a5124db899018e4726bf738012658921dfbbca20173645920194",
                "integrity_status": "Verified",
                "analysis_status": "Complete",
                "source_device": "WORKSTATION-CORP-FIN09 (C:\\Users\\Admin\\HR_Exports\\)",
                "category": "Database",
                "notes": "Internal database export containing 4,200 employee records and financial routing numbers.",
                "file_created_at": datetime(2026, 10, 4, 16, 20, 11, tzinfo=timezone.utc),
                "file_modified_at": datetime(2026, 10, 5, 9, 35, 10, tzinfo=timezone.utc),
                "file_accessed_at": datetime(2026, 10, 5, 9, 44, 2, tzinfo=timezone.utc),
            },
            {
                "id": "ev-003",
                "evidence_number": "EV-003",
                "filename": "suspicious.exe",
                "original_filename": "suspicious.exe",
                "file_type": "binary",
                "mime_type": "application/x-dosexec",
                "file_size": 860160,
                "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "integrity_status": "Verified",
                "analysis_status": "Flagged",
                "source_device": "WORKSTATION-CORP-FIN09 (C:\\Users\\Admin\\AppData\\Local\\Temp\\)",
                "category": "Executable",
                "notes": "Unsigned binary dropped into %TEMP%. Subsystem calls mimic cipher /w to wipe shadow copies and event logs.",
                "file_created_at": datetime(2026, 10, 5, 9, 49, 15, tzinfo=timezone.utc),
                "file_modified_at": datetime(2026, 10, 5, 9, 49, 15, tzinfo=timezone.utc),
                "file_accessed_at": datetime(2026, 10, 5, 9, 50, 22, tzinfo=timezone.utc),
            },
            {
                "id": "ev-004",
                "evidence_number": "EV-004",
                "filename": "report.docx",
                "original_filename": "report.docx",
                "file_type": "document",
                "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "file_size": 1153433,
                "sha256_hash": "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
                "integrity_status": "Verified",
                "analysis_status": "Complete",
                "source_device": "WORKSTATION-CORP-FIN09 (C:\\Users\\Admin\\Desktop\\)",
                "category": "Document",
                "notes": "Standard quarterly earnings draft generated through corporate template.",
                "file_created_at": datetime(2026, 10, 5, 9, 43, 0, tzinfo=timezone.utc),
                "file_modified_at": datetime(2026, 10, 5, 9, 43, 45, tzinfo=timezone.utc),
                "file_accessed_at": datetime(2026, 10, 5, 9, 44, 10, tzinfo=timezone.utc),
            },
            {
                "id": "ev-005",
                "evidence_number": "EV-005",
                "filename": "system.log",
                "original_filename": "system.log",
                "file_type": "log",
                "mime_type": "text/plain",
                "file_size": 5872025,
                "sha256_hash": "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
                "integrity_status": "Verified",
                "analysis_status": "Complete",
                "source_device": "WORKSTATION-CORP-FIN09 (C:\\Windows\\System32\\Winevt\\Logs\\Security.evtx)",
                "category": "Log",
                "notes": "Security audit log displaying Event ID 4624, Event ID 4663, and clearing of audit trails at 09:55:12 AM.",
                "file_created_at": datetime(2026, 10, 1, 0, 0, 0, tzinfo=timezone.utc),
                "file_modified_at": datetime(2026, 10, 5, 9, 51, 30, tzinfo=timezone.utc),
                "file_accessed_at": datetime(2026, 10, 5, 9, 55, 0, tzinfo=timezone.utc),
            },
            {
                "id": "ev-006",
                "evidence_number": "EV-006",
                "filename": "browser_history.json",
                "original_filename": "browser_history.json",
                "file_type": "log",
                "mime_type": "application/json",
                "file_size": 3355443,
                "sha256_hash": "fcde2b2edba56bf408601fb721fe9b5c338d10ee429ea04fae5511b68fbf8fb9",
                "integrity_status": "Verified",
                "analysis_status": "Complete",
                "source_device": "WORKSTATION-CORP-FIN09 (C:\\Users\\Admin\\AppData\\Local\\Google\\Chrome\\)",
                "category": "Log",
                "notes": "Browser URL navigation cache showing searches for file recovery journal wiping and drop points.",
                "file_created_at": datetime(2026, 10, 5, 8, 45, 0, tzinfo=timezone.utc),
                "file_modified_at": datetime(2026, 10, 5, 9, 42, 15, tzinfo=timezone.utc),
                "file_accessed_at": datetime(2026, 10, 5, 9, 45, 0, tzinfo=timezone.utc),
            },
            {
                "id": "ev-007",
                "evidence_number": "EV-007",
                "filename": "usb_activity.log",
                "original_filename": "usb_activity.log",
                "file_type": "log",
                "mime_type": "text/plain",
                "file_size": 430080,
                "sha256_hash": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
                "integrity_status": "Verified",
                "analysis_status": "Flagged",
                "source_device": "WORKSTATION-CORP-FIN09 (C:\\Windows\\INF\\setupapi.dev.log)",
                "category": "Hardware",
                "notes": "Hardware registry enumeration detailing device VID_0951&PID_1666 (Kingston DataTraveler 3.0), Serial #001A4D5978C1.",
                "file_created_at": datetime(2026, 10, 5, 9, 45, 1, tzinfo=timezone.utc),
                "file_modified_at": datetime(2026, 10, 5, 9, 58, 30, tzinfo=timezone.utc),
                "file_accessed_at": datetime(2026, 10, 5, 9, 58, 30, tzinfo=timezone.utc),
            }
        ]

        for es in evidence_seeds:
            existing_ev = db.query(Evidence).filter(Evidence.id == es["id"]).first()
            mock_file_path = os.path.join(uploads_case_dir, es["filename"])
            if not os.path.exists(mock_file_path):
                with open(mock_file_path, "w", encoding="utf-8") as f:
                    f.write(f"TraceX Inert Forensic Artifact: {es['filename']}\nCase: {case_1.case_number}\nHash: {es['sha256_hash']}\n")

            if not existing_ev:
                ev_obj = Evidence(
                    case_id=case_1.id,
                    storage_path=mock_file_path,
                    uploaded_at=datetime(2026, 10, 5, 10, 0, 0, tzinfo=timezone.utc),
                    **es
                )
                db.add(ev_obj)
        db.commit()

        # 3. Timeline Events
        timeline_seeds = [
            {
                "id": "evt-001",
                "event_type": "auth",
                "description": "Local interactive logon session initiated for user WORKSTATION-CORP\\Admin on display :0.",
                "timestamp": datetime(2026, 10, 5, 9, 40, 12, tzinfo=timezone.utc),
                "severity": "low",
                "source": "Security.evtx (Event ID 4624)",
                "actor": "WORKSTATION-CORP\\Admin",
                "is_suspicious": False,
                "evidence_id": "ev-005",
                "raw_log": "Event ID 4624: An account was successfully logged on. Account Name: Admin, Logon Type: 2 (Interactive), Process: winlogon.exe"
            },
            {
                "id": "evt-002",
                "event_type": "file",
                "description": "Quarterly report draft created under Desktop directory via Microsoft Word template engine.",
                "timestamp": datetime(2026, 10, 5, 9, 43, 0, tzinfo=timezone.utc),
                "severity": "low",
                "source": "NTFS $MFT Record #10924",
                "actor": "WORKSTATION-CORP\\Admin",
                "is_suspicious": False,
                "evidence_id": "ev-004",
                "raw_log": "NTFS Transaction: USN Journal Entry #8911029: CREATE C:\\Users\\Admin\\Desktop\\Quarterly_Financial_Draft.docx"
            },
            {
                "id": "evt-003",
                "event_type": "usb",
                "description": "External USB mass storage device mounted on USB Hub 3 Port 1. Assigned drive letter E:\\.",
                "timestamp": datetime(2026, 10, 5, 9, 45, 10, tzinfo=timezone.utc),
                "severity": "high",
                "source": "setupapi.dev.log & SYSTEM hive",
                "actor": "SYSTEM (Plug-and-Play Manager)",
                "is_suspicious": True,
                "evidence_id": "ev-007",
                "mitre_technique": "T1200 - Hardware Additions",
                "raw_log": "Device Connected: USBSTOR\\DiskKingstonDataTraveler_3.0_001A4D5978C1. Volume Name: E:\\ (FAT32, Capacity: 32GB)"
            },
            {
                "id": "evt-004",
                "event_type": "file",
                "description": "Privileged read handle opened on sensitive corporate blueprint confidential.pdf.",
                "timestamp": datetime(2026, 10, 5, 9, 47, 18, tzinfo=timezone.utc),
                "severity": "critical",
                "source": "Security.evtx (Event ID 4663)",
                "actor": "WORKSTATION-CORP\\Admin",
                "is_suspicious": True,
                "evidence_id": "ev-001",
                "mitre_technique": "T1005 - Data from Local System",
                "raw_log": "Event ID 4663: An attempt was made to access an object: C:\\Users\\Admin\\Documents\\Classified\\confidential.pdf. Accesses: ReadData"
            },
            {
                "id": "evt-005",
                "event_type": "file",
                "description": "confidential.pdf was written to removable destination E:\\Backup\\confidential.pdf.",
                "timestamp": datetime(2026, 10, 5, 9, 48, 42, tzinfo=timezone.utc),
                "severity": "critical",
                "source": "NTFS USN Journal & ShellBags",
                "actor": "WORKSTATION-CORP\\Admin",
                "is_suspicious": True,
                "evidence_id": "ev-001",
                "mitre_technique": "T1052.001 - Exfiltration Over USB",
                "raw_log": "File System Operation: COPY SRC='C:\\Users\\Admin\\Documents\\Classified\\confidential.pdf' DEST='E:\\Backup\\confidential.pdf'"
            },
            {
                "id": "evt-006",
                "event_type": "process",
                "description": "Unsigned process suspicious.exe initiated execution from temp directory with high privileges.",
                "timestamp": datetime(2026, 10, 5, 9, 50, 22, tzinfo=timezone.utc),
                "severity": "critical",
                "source": "Sysmon Event ID 1 & Prefetch",
                "actor": "WORKSTATION-CORP\\Admin",
                "is_suspicious": True,
                "evidence_id": "ev-003",
                "mitre_technique": "T1204.002 - Malicious File Execution",
                "raw_log": "Sysmon Event 1: Process Create: PID: 4892, Image: C:\\Users\\Admin\\AppData\\Local\\Temp\\suspicious.exe, CmdLine: 'suspicious.exe -wipe -all'"
            },
            {
                "id": "evt-007",
                "event_type": "system",
                "description": "Security log configuration altered to suppress audit trail generation for file delete events.",
                "timestamp": datetime(2026, 10, 5, 9, 51, 30, tzinfo=timezone.utc),
                "severity": "high",
                "source": "SYSTEM Hive & AuditPol",
                "actor": "suspicious.exe (PID 4892)",
                "is_suspicious": True,
                "evidence_id": "ev-005",
                "mitre_technique": "T1562.001 - Impair Defenses: Disable Event Logging",
                "raw_log": "Registry Change: HKLM\\System\\CurrentControlSet\\Control\\MiniNT\\AuditPolicy disabled."
            },
            {
                "id": "evt-008",
                "event_type": "file",
                "description": "Rapid batch deletion of 42 files across Document and Temp folders, followed by Volume Shadow Copy wipe.",
                "timestamp": datetime(2026, 10, 5, 9, 55, 4, tzinfo=timezone.utc),
                "severity": "critical",
                "source": "$MFT Record Unlink & Event ID 1102",
                "actor": "suspicious.exe (PID 4892)",
                "is_suspicious": True,
                "evidence_id": "ev-005",
                "mitre_technique": "T1070.001 - Indicator Removal: Clear Windows Event Logs",
                "raw_log": "Anti-Forensics Event: 'vssadmin delete shadows /all /quiet' executed. 42 files unallocated. Security Event 1102 generated."
            },
            {
                "id": "evt-009",
                "event_type": "auth",
                "description": "Interactive session closed for WORKSTATION-CORP\\Admin after device ejection.",
                "timestamp": datetime(2026, 10, 5, 10, 2, 40, tzinfo=timezone.utc),
                "severity": "low",
                "source": "Security.evtx (Event ID 4647)",
                "actor": "WORKSTATION-CORP\\Admin",
                "is_suspicious": False,
                "evidence_id": "ev-005",
                "raw_log": "Event ID 4647: User-initiated logoff. Removable drive E: unmounted 18 seconds prior."
            }
        ]

        for ts in timeline_seeds:
            existing_evt = db.query(TimelineEvent).filter(TimelineEvent.id == ts["id"]).first()
            if not existing_evt:
                te = TimelineEvent(case_id=case_1.id, **ts)
                db.add(te)
        db.commit()

        # 4. Correlation Findings
        findings_seeds = [
            {
                "id": "find-001",
                "title": "Suspicious Executable Detected",
                "description": "An unsigned, high-entropy PE binary executed from a user-writable Temp directory without corporate certificate verification.",
                "severity": "Critical",
                "reason": "Unknown binary executed immediately following classified IP access, leading into mass file deletion.",
                "risk_contribution": 20,
                "mitre_technique": "T1204.002 (User Execution) & T1070 (Indicator Removal)",
                "category": "Execution",
                "status": "Confirmed",
                "evidence_id": "ev-003"
            },
            {
                "id": "find-002",
                "title": "Sensitive File Access & Data Exfiltration Target",
                "description": "Direct read access opened on high-classification proprietary blueprints shortly after removable storage insertion.",
                "severity": "Critical",
                "reason": "Access occurred outside operational baseline; file transferred to external USB volume.",
                "risk_contribution": 20,
                "mitre_technique": "T1005 (Data from Local System) & T1052.001 (Exfiltration over USB)",
                "category": "Exfiltration",
                "status": "Confirmed",
                "evidence_id": "ev-001"
            },
            {
                "id": "find-003",
                "title": "External USB Device Activity Correlated",
                "description": "An unauthorized Kingston DataTraveler 3.0 flash drive was connected to the primary workstation port.",
                "severity": "High",
                "reason": "Device serial is not present on corporate whitelist; connection preceded staging and malware execution.",
                "risk_contribution": 15,
                "mitre_technique": "T1200 (Hardware Additions)",
                "category": "Initial Access",
                "status": "Confirmed",
                "evidence_id": "ev-007"
            },
            {
                "id": "find-005",
                "title": "Sensitive File Copied to Removable Volume",
                "description": "Correlated NTFS journal and volume writes prove byte-level duplicate creation on mount point E:\\.",
                "severity": "Critical",
                "reason": "File copy executed immediately following read handle without DLP authorization.",
                "risk_contribution": 20,
                "mitre_technique": "T1567 (Exfiltration Over Physical/Web Service)",
                "category": "Exfiltration",
                "status": "Confirmed",
                "evidence_id": "ev-001"
            },
            {
                "id": "find-004",
                "title": "Mass File Deletion & Anti-Forensics Activity",
                "description": "Automated batch deletion purged 42 files across Document directories along with clearing of Windows Security event log.",
                "severity": "High",
                "reason": "Volume Shadow Copies forcibly cleared via vssadmin and Event ID 1102 logged.",
                "risk_contribution": 12,
                "mitre_technique": "T1070.001 (Clear Windows Event Logs) & T1485 (Data Destruction)",
                "category": "Defense Evasion",
                "status": "Confirmed",
                "evidence_id": "ev-005"
            }
        ]

        for fs in findings_seeds:
            existing_f = db.query(Finding).filter(Finding.id == fs["id"]).first()
            if not existing_f:
                f_obj = Finding(case_id=case_1.id, **fs)
                db.add(f_obj)
        db.commit()

        # 5. Risk Factors (Summing to 15 + 20 + 20 + 20 + 12 = 87)
        risk_seeds = [
            {
                "id": "risk-usb",
                "name": "Unauthorized USB Device Connected",
                "description": "Unauthorized Kingston DataTraveler 3.0 mounted at 09:45:10, establishing a writable physical exfiltration channel.",
                "score": 15,
                "severity": "High",
                "category": "Exfiltration",
                "source": "setupapi.dev.log",
                "mitre_technique": "T1200 - Hardware Additions"
            },
            {
                "id": "risk-sensitive",
                "name": "Off-Hours Bulk Sensitive File Access",
                "description": "Read access opened on classified document confidential.pdf (92/100 sensitivity) within 2 minutes of device registration.",
                "score": 20,
                "severity": "Critical",
                "category": "Access Anomaly",
                "source": "Security.evtx (Event ID 4663)",
                "mitre_technique": "T1005 - Data from Local System"
            },
            {
                "id": "risk-copy",
                "name": "Direct Copying to Removable Volume",
                "description": "NTFS USN journal confirms replication of confidential.pdf onto drive letter E:\\ (USB mount point) at 09:48:42.",
                "score": 20,
                "severity": "Critical",
                "category": "Exfiltration",
                "source": "NTFS USN Journal",
                "mitre_technique": "T1052.001 - Exfiltration Over USB"
            },
            {
                "id": "risk-exe",
                "name": "Anti-Forensics Binary Execution",
                "description": "Unsigned binary suspicious.exe spawned from %TEMP% directory with elevated privileges at 09:50:22.",
                "score": 20,
                "severity": "Critical",
                "category": "Execution",
                "source": "Sysmon Event ID 1",
                "mitre_technique": "T1204.002 - Malicious File Execution"
            },
            {
                "id": "risk-deletion",
                "name": "Log Wiper & Shadow Copy Purge",
                "description": "Execution of automated file unlinking and Volume Shadow Copy purging at 09:55:04 to destroy forensic artifacts.",
                "score": 12,
                "severity": "High",
                "category": "Defense Evasion",
                "source": "Event ID 1102 & VSSAdmin",
                "mitre_technique": "T1070.001 - Indicator Removal"
            }
        ]

        for rs in risk_seeds:
            existing_rf = db.query(RiskFactor).filter(RiskFactor.id == rs["id"]).first()
            if not existing_rf:
                rf_obj = RiskFactor(case_id=case_1.id, **rs)
                db.add(rf_obj)
        db.commit()

        # 6. Evidence Relationships for Evidence Graph
        rel_seeds = [
            ("ev-007", "ev-001", "transfers", "Exfiltrated to USB (E:\\)", 0.98),
            ("ev-001", "ev-004", "correlates_to", "Same User Desktop Session", 0.85),
            ("ev-003", "ev-005", "modifies", "Purged Event Audit Logs", 0.99),
            ("ev-003", "ev-001", "executes", "Post-Staging Cleanup Binary", 0.92),
            ("ev-006", "ev-003", "correlates_to", "Browser Download Origin", 0.88),
            ("ev-002", "ev-001", "stages", "Shared Classified Staging Path", 0.75),
        ]

        for src, dst, rtype, lbl, conf in rel_seeds:
            existing_rel = db.query(EvidenceRelationship).filter(
                EvidenceRelationship.case_id == case_1.id,
                EvidenceRelationship.source_evidence_id == src,
                EvidenceRelationship.target_evidence_id == dst
            ).first()
            if not existing_rel:
                rel_obj = EvidenceRelationship(
                    case_id=case_1.id,
                    source_evidence_id=src,
                    target_evidence_id=dst,
                    relationship_type=rtype,
                    label=lbl,
                    confidence=conf
                )
                db.add(rel_obj)
        db.commit()

        # 7. Initial Reports
        existing_report = db.query(Report).filter(Report.case_id == case_1.id).first()
        if not existing_report:
            rep = Report(
                case_id=case_1.id,
                title="Full Forensic Dossier - CASE-2026-001",
                report_type="Full Forensic Dossier",
                status="Ready",
                classification="CONFIDENTIAL",
                file_size="2.4 MB"
            )
            db.add(rep)
            rep2 = Report(
                case_id=case_1.id,
                title="Executive Incident Summary - CASE-2026-001",
                report_type="Executive Summary",
                status="Ready",
                classification="CONFIDENTIAL",
                file_size="840 KB"
            )
            db.add(rep2)
            db.commit()

        # 8. Phase 3 Intelligence Pipeline Seeding (Clusters, Anomalies, Explainable Findings, Analysis Job)
        print("Executing Phase 3 Forensic Intelligence Pipeline...")
        from app.services.clustering_service import ClusteringService
        from app.services.anomaly_service import AnomalyService
        from app.services.finding_service import FindingService
        from app.services.pipeline_service import PipelineService

        ClusteringService.cluster_events(db, case_1.id)
        AnomalyService.detect_anomalies(db, case_1.id)
        FindingService.run_correlation(db, case_1.id)
        PipelineService.start_pipeline(db, case_1.id)

        # 9. Phase 4 Intelligence, Audit, and Report Seeding
        print("Executing Phase 4 Advanced Intelligence & Audit Seeding...")
        from app.services.gap_service import GapService
        from app.services.audit_service import AuditService
        from app.services.report_service import ReportService

        # Detect and seed evidence gaps
        GapService.detect_evidence_gaps(db, case_1.id)

        # Seed initial audit records if empty
        if db.query(AuditLog).count() == 0:
            AuditService.log_action(db, "LOGIN", "investigator@tracex.demo", "user-alex-vance", "ADMIN", case_1.id, "Session", "sess-init", "SUCCESS", {"description": "Investigator authentication verified via biometric token"})
            AuditService.log_action(db, "CASE_CREATE", "investigator@tracex.demo", "user-alex-vance", "ADMIN", case_1.id, "Case", case_1.id, "SUCCESS", {"description": "Case vault initialized for corporate exfiltration triage"})
            AuditService.log_action(db, "EVIDENCE_UPLOAD", "investigator@tracex.demo", "user-alex-vance", "ADMIN", case_1.id, "Evidence", "ev-001", "SUCCESS", {"description": "Ingested confidential.pdf into cryptographic vault"})
            AuditService.log_action(db, "ANALYSIS_START", "investigator@tracex.demo", "user-alex-vance", "ADMIN", case_1.id, "Pipeline", "job-init", "SUCCESS", {"description": "Automated forensic analysis pipeline dispatched"})
            AuditService.log_action(db, "FINDING_GENERATE", "investigator@tracex.demo", "user-alex-vance", "ADMIN", case_1.id, "Finding", "find-001", "SUCCESS", {"description": "Heuristic engine flagged high-entropy wiper execution"})
            AuditService.log_action(db, "REPORT_GENERATE", "investigator@tracex.demo", "user-alex-vance", "ADMIN", case_1.id, "Report", "rep-init", "SUCCESS", {"description": "Full Forensic Dossier compiled and SHA-256 stamped"})

        # Seed Cryptographically Linked Tamper-Evident Chain of Custody
        CustodyService.seed_case_custody_if_empty(db, case_1.id)

        # Generate Phase 4 Report with cryptographic SHA-256 hash
        ReportService.generate_report_file(db, case_1.id, "Full Forensic Dossier")

        print("Database seeded successfully with all TraceX forensic items, Phase 3 intelligence, and Phase 4 RBAC & audit models!")
        print("Default credentials: investigator@tracex.demo / TraceX@123 (ADMIN)")
        print("Viewer credentials: sarah.chen@tracex.demo / TraceX@123 (VIEWER)")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
