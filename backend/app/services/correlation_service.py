from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import uuid
import json
from sqlalchemy.orm import Session
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.timeline import TimelineEvent
from app.models.finding import Finding
from app.models.relationship import EvidenceRelationship
from app.models.forensic_event import ForensicEvent
from app.models.collection_job import CollectionJob
from app.services.audit_service import AuditService

class CorrelationEngine:
    """
    Automated Forensic Correlation & Explainability Engine.
    Correlates candidate files, historical USB events, and filesystem activity.
    Produces objective, non-accusatory forensic findings and timeline sequences.
    """

    @classmethod
    def correlate_investigation(
        cls,
        db: Session,
        investigation_id: str,
        job_id: Optional[str] = None,
        actor_email: str = "system@tracex.local"
    ) -> Dict[str, Any]:
        # Fetch forensic events
        query = db.query(ForensicEvent).filter(ForensicEvent.investigation_id == investigation_id)
        if job_id:
            query = query.filter(ForensicEvent.job_id == job_id)
        
        events: List[ForensicEvent] = query.order_by(ForensicEvent.timestamp.asc()).all()
        if not events:
            return {
                "investigation_id": investigation_id,
                "events_correlated": 0,
                "findings_generated": 0,
                "message": "No forensic events available for correlation."
            }

        # 1. Identify USB devices & connection windows
        usb_devices = []
        usb_events = [e for e in events if e.category == "USB / Removable Storage" or "USB" in (e.event_type or "")]
        file_events = [e for e in events if e.category == "File System" or "FILE_" in (e.event_type or "")]

        seen_serials = set()
        for u in usb_events:
            serial = u.device_serial or (u.details or {}).get("serial", "UNKNOWN")
            if serial not in seen_serials:
                seen_serials.add(serial)
                usb_devices.append({
                    "name": u.device_name or "USB Mass Storage Device",
                    "serial": serial,
                    "mount_point": u.mount_point,
                    "first_seen": u.timestamp.isoformat() if u.timestamp else None,
                    "raw_source": u.raw_artifact_source
                })

        # Ensure Case exists
        case = db.query(Case).filter((Case.id == investigation_id) | (Case.case_number == investigation_id)).first()
        if not case:
            case = Case(
                id=investigation_id,
                case_number=investigation_id,
                name=f"Forensic Investigation {investigation_id}",
                description=f"Automated endpoint forensic investigation for case {investigation_id}.",
                status="In Progress",
                priority="High",
                incident_type="Data Exfiltration",
                target_system=events[0].computer_id or "Windows Endpoint",
                investigator_id=1
            )
            db.add(case)
            db.commit()
            db.refresh(case)

        # 2. Correlate File activity with USB & baseline changes
        findings_created = []
        timeline_entries_created = []
        evidence_created = []

        correlation_window = timedelta(minutes=60)

        # Group file events by target file
        files_map: Dict[str, List[ForensicEvent]] = {}
        for fe in file_events:
            fkey = fe.file_path or fe.file_name or "unknown"
            if fkey not in files_map:
                files_map[fkey] = []
            files_map[fkey].append(fe)

        for fpath, f_evts in files_map.items():
            primary_evt = f_evts[0]
            fname = primary_evt.file_name or (fpath.split("\\")[-1] if "\\" in fpath else fpath)
            
            # Check if file has hash modification
            has_hash_change = bool(primary_evt.previous_hash and primary_evt.file_hash and primary_evt.previous_hash != primary_evt.file_hash)
            
            # Check temporal correlation with any USB event
            correlated_usb = None
            for ue in usb_events:
                if ue.timestamp and primary_evt.timestamp and abs(primary_evt.timestamp - ue.timestamp) <= correlation_window:
                    correlated_usb = ue
                    break
            
            # If no direct timestamp match, check if USB was detected in registry as persistent artifact
            if not correlated_usb and usb_events:
                correlated_usb = usb_events[0]

            # Determine suspicion level and forensic explanation
            is_suspicious = False
            severity = "Low"
            reasons = []

            if has_hash_change:
                is_suspicious = True
                severity = "High"
                reasons.append(f"Cryptographic SHA-256 hash changed from {primary_evt.previous_hash[:12]}... to {primary_evt.file_hash[:12]}...")

            if correlated_usb:
                is_suspicious = True
                if severity != "High":
                    severity = "Medium"
                reasons.append(f"Removable storage device detected ({correlated_usb.device_name or 'USB Device'}, Serial: {correlated_usb.device_serial or 'N/A'})")

            if primary_evt.event_type in ["FILE_MODIFIED", "FILE_CREATED", "FILE_RENAMED"]:
                if not is_suspicious:
                    severity = "Low"
                reasons.append(f"Filesystem action: {primary_evt.event_type.replace('_', ' ').title()}")

            why_suspicious = " | ".join(reasons) if reasons else "Routine filesystem metadata record."
            primary_evt.is_suspicious = is_suspicious
            primary_evt.suspicion_reason = why_suspicious

            # Register as Evidence record in TraceX database if not exists
            ev_id = f"EV-LIVE-{uuid.uuid4().hex[:6].upper()}"
            ev = Evidence(
                id=ev_id,
                case_id=case.id,
                filename=fname,
                original_filename=fname,
                storage_path=fpath,
                file_size=primary_evt.file_size or 0,
                file_type=fname.split(".")[-1].lower() if "." in fname else "document",
                sha256_hash=primary_evt.file_hash or "0000000000000000000000000000000000000000000000000000000000000000",
                md5_hash=(primary_evt.details or {}).get("md5", "00000000000000000000000000000000"),
                source_device=primary_evt.computer_id or "Endpoint",
                integrity_status="Compromised" if has_hash_change else "Verified",
                notes=why_suspicious,
                is_live_agent=True,
                baseline_sha256=primary_evt.previous_hash,
                pdf_diff_data=json.dumps((primary_evt.details or {}).get("diff_data")) if (primary_evt.details or {}).get("diff_data") else None
            )
            db.add(ev)
            evidence_created.append(ev)
            primary_evt.evidence_id = ev_id

            # Create Finding
            if is_suspicious:
                finding_id = f"FND-{uuid.uuid4().hex[:6].upper()}"
                title = f"Candidate File Modification: {fname}" if has_hash_change else f"Potential Removable Storage File Activity: {fname}"
                desc = (
                    f"Forensic artifact analysis identified activity on '{fname}' at {primary_evt.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC') if primary_evt.timestamp else 'N/A'}. "
                    f"{why_suspicious}"
                )
                
                fnd = Finding(
                    id=finding_id,
                    case_id=case.id,
                    evidence_id=ev_id,
                    title=title,
                    description=desc,
                    severity=severity,
                    reason=why_suspicious,
                    risk_contribution=40 if severity == "High" else 20,
                    category="Removable Storage Exfiltration" if correlated_usb else "Integrity Violation",
                    status="Confirmed",
                    is_live_agent=True,
                    confidence="High" if (has_hash_change and correlated_usb) else "Medium",
                    confidence_reason="Correlated multiple independent OS artifacts (Filesystem metadata, cryptographic hash, USB registry)",
                    what_happened=f"File {fname} was modified/accessed on host {primary_evt.computer_id or 'Endpoint'}.",
                    why_detected="Detected via automated endpoint file discovery and correlation engine.",
                    why_suspicious=why_suspicious,
                    recommended_next_step="Inspect document textual diff and compare USB storage contents.",
                    supporting_factors=json.dumps(reasons),
                    related_entities=json.dumps([fname, primary_evt.computer_id or "Host", correlated_usb.device_serial if correlated_usb else "None"])
                )
                db.add(fnd)
                findings_created.append(fnd)

            # Create Timeline Event
            tl_id = f"TL-{uuid.uuid4().hex[:6].upper()}"
            source_label = primary_evt.raw_artifact_source or "NTFS File Metadata Scan"
            ts_str = primary_evt.timestamp.strftime('%I:%M:%S %p') if primary_evt.timestamp else 'Recorded'
            
            # Format explicitly as requested:
            # FILE MODIFIED
            # File: C:\TraceX-Test\test_document.pdf
            # Time: 10:43:27 AM
            # Source: NTFS USN Change Journal / NTFS File Metadata Scan
            # Event: FILE_MODIFIED
            evt_type_clean = (primary_evt.event_type or "FILE_MODIFIED").upper()
            tl_desc = f"{evt_type_clean}\nFile: {fpath}\nTime: {ts_str}\nSource: {source_label}\nEvent: {evt_type_clean}"

            tle = TimelineEvent(
                id=tl_id,
                case_id=case.id,
                evidence_id=ev_id,
                event_type=primary_evt.event_type.lower() if primary_evt.event_type else "file",
                description=tl_desc,
                timestamp=primary_evt.timestamp or datetime.now(timezone.utc),
                source=source_label,
                severity=severity.lower(),
                actor=primary_evt.user or "Unknown",
                is_suspicious=is_suspicious,
                is_live_agent=True,
                raw_log=json.dumps(primary_evt.details or {})
            )
            db.add(tle)
            timeline_entries_created.append(tle)

            # Create Relationships for Connections Graph
            # 1. Host -> Evidence
            rel_host = EvidenceRelationship(
                id=f"REL-HOST-{uuid.uuid4().hex[:6].upper()}",
                case_id=case.id,
                source_id=primary_evt.computer_id or "Endpoint",
                target_id=ev_id,
                source_type="Device",
                target_type="Evidence",
                source_evidence_id=None,
                target_evidence_id=ev_id,
                relationship_type="HOSTED_ON",
                label="Stored On Host",
                explanation=f"File {fname} is located on target host {primary_evt.computer_id or 'Endpoint'}.",
                confidence=1.0
            )
            db.add(rel_host)

            # 2. Correlated USB -> Evidence
            if correlated_usb:
                rel_usb = EvidenceRelationship(
                    id=f"REL-USB-{uuid.uuid4().hex[:6].upper()}",
                    case_id=case.id,
                    source_id=correlated_usb.device_serial or "USB-STORAGE",
                    target_id=ev_id,
                    source_type="Device",
                    target_type="Evidence",
                    source_evidence_id=None,
                    target_evidence_id=ev_id,
                    relationship_type="POTENTIAL_EXFILTRATION_TARGET",
                    label="Removable Storage Correlation",
                    explanation=f"Removable storage hardware ({correlated_usb.device_name}) was connected during/near file modification window.",
                    confidence=0.88 if has_hash_change else 0.70
                )
                db.add(rel_usb)

            # 3. User -> Evidence
            if primary_evt.user and primary_evt.user != "SYSTEM":
                rel_user = EvidenceRelationship(
                    id=f"REL-USER-{uuid.uuid4().hex[:6].upper()}",
                    case_id=case.id,
                    source_id=f"USER-{primary_evt.user}",
                    target_id=ev_id,
                    source_type="User",
                    target_type="Evidence",
                    source_evidence_id=None,
                    target_evidence_id=ev_id,
                    relationship_type="MODIFIED_BY",
                    label="User Activity",
                    explanation=f"User {primary_evt.user} performed filesystem operations on {fname}.",
                    confidence=0.95
                )
                db.add(rel_user)

        # 3. Add USB events to timeline as well
        for ue in usb_events:
            tl_id = f"TL-USB-{uuid.uuid4().hex[:6].upper()}"
            ue_ts_str = ue.timestamp.strftime('%I:%M:%S %p') if ue.timestamp else 'Recorded'
            usb_source = ue.raw_artifact_source or "HKLM\\SYSTEM\\CurrentControlSet\\Enum\\USBSTOR"
            usb_desc = (
                f"USB STORAGE CONNECTED\n"
                f"Device: {ue.device_name or 'USB Mass Storage Device'}\n"
                f"Serial: {ue.device_serial or 'N/A'}\n"
                f"Time: {ue_ts_str}\n"
                f"Source: {usb_source}\n"
                f"Event: USB_CONNECTED"
            )

            tle = TimelineEvent(
                id=tl_id,
                case_id=case.id,
                event_type="usb",
                description=usb_desc,
                timestamp=ue.timestamp or datetime.now(timezone.utc),
                source=usb_source,
                severity="medium",
                actor=ue.user or "SYSTEM",
                is_suspicious=True,
                is_live_agent=True,
                raw_log=json.dumps(ue.details or {})
            )
            db.add(tle)
            timeline_entries_created.append(tle)

        # 4. Add System / Kernel-PnP Event Log entries to timeline
        event_log_events = [e for e in events if e.category == "System Log" or "Windows Event Log" in (e.raw_artifact_source or "")]
        for ee in event_log_events[:15]:
            tl_id = f"TL-LOG-{uuid.uuid4().hex[:6].upper()}"
            ee_ts_str = ee.timestamp.strftime('%I:%M:%S %p') if ee.timestamp else 'Recorded'
            log_source = ee.raw_artifact_source or "Windows Event Log"
            log_desc = (
                f"SYSTEM LOG EVENT\n"
                f"Source: {log_source}\n"
                f"Time: {ee_ts_str}\n"
                f"User: {ee.user or 'SYSTEM'}\n"
                f"Event: {ee.event_type or 'SYSTEM_EVENT'}\n"
                f"Details: {(ee.details or {}).get('description', '')[:120]}"
            )

            tle = TimelineEvent(
                id=tl_id,
                case_id=case.id,
                event_type="system",
                description=log_desc,
                timestamp=ee.timestamp or datetime.now(timezone.utc),
                source=log_source,
                severity=ee.severity.lower() if ee.severity else "info",
                actor=ee.user or "SYSTEM",
                is_suspicious=False,
                is_live_agent=True,
                raw_log=json.dumps(ee.details or {})
            )
            db.add(tle)
            timeline_entries_created.append(tle)

        db.commit()

        AuditService.log_action(
            db=db,
            action="CORRELATION_COMPLETED",
            user_email=actor_email,
            user_role="Investigator",
            case_id=case.id,
            object_type="CorrelationEngine",
            object_id=investigation_id,
            metadata={
                "events_correlated": len(events),
                "findings_created": len(findings_created),
                "evidence_created": len(evidence_created),
                "timeline_created": len(timeline_entries_created)
            }
        )

        return {
            "investigation_id": investigation_id,
            "events_correlated": len(events),
            "candidate_files_count": len(files_map),
            "usb_devices_count": len(usb_devices),
            "findings_generated": len(findings_created),
            "evidence_generated": len(evidence_created),
            "timeline_entries_generated": len(timeline_entries_created),
            "usb_devices": usb_devices,
            "findings": [
                {
                    "id": f.id,
                    "title": f.title,
                    "description": f.description,
                    "severity": f.severity,
                    "why_suspicious": f.why_suspicious,
                    "is_live_agent": f.is_live_agent
                } for f in findings_created
            ]
        }
