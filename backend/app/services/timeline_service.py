from datetime import datetime, timezone
import re
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.timeline import TimelineEvent
from app.models.evidence import Evidence

class TimelineService:
    @staticmethod
    def get_events(
        db: Session,
        case_id: str,
        event_type: Optional[str] = None,
        severity: Optional[str] = None,
        suspicious_only: bool = False,
        search: Optional[str] = None,
        limit: int = 200,
        offset: int = 0
    ) -> List[TimelineEvent]:
        query = db.query(TimelineEvent).filter(TimelineEvent.case_id == case_id)

        if event_type and event_type.lower() != "all":
            query = query.filter(TimelineEvent.event_type == event_type.lower())

        if severity and severity.lower() != "all":
            query = query.filter(TimelineEvent.severity == severity.lower())

        if suspicious_only:
            query = query.filter(TimelineEvent.is_suspicious == True)

        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                (TimelineEvent.description.ilike(search_filter)) |
                (TimelineEvent.source.ilike(search_filter)) |
                (TimelineEvent.actor.ilike(search_filter))
            )

        return query.order_by(TimelineEvent.timestamp.asc()).offset(offset).limit(limit).all()

    @staticmethod
    def create_event_from_evidence(
        db: Session,
        case_id: str,
        evidence: Evidence,
        description: str,
        event_type: str = "file",
        severity: str = "info",
        is_suspicious: bool = False,
        actor: str = "SYSTEM",
        mitre_technique: Optional[str] = None
    ) -> TimelineEvent:
        event = TimelineEvent(
            case_id=case_id,
            evidence_id=evidence.id,
            event_type=event_type,
            description=description,
            timestamp=evidence.file_modified_at or evidence.uploaded_at or datetime.now(timezone.utc),
            severity=severity,
            source=f"Evidence: {evidence.filename}",
            actor=actor,
            is_suspicious=is_suspicious,
            mitre_technique=mitre_technique,
            raw_log=f"File: {evidence.filename} | Size: {evidence.file_size}B | Hash: {evidence.sha256_hash}"
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def parse_log_evidence(db: Session, case_id: str, evidence: Evidence) -> List[TimelineEvent]:
        """
        Safely inspects plain text/log evidence files for timestamps and generates chronological events.
        Treats file strictly as read-only text.
        """
        if not evidence.storage_path or not evidence.file_type == "log":
            return []

        created_events = []
        try:
            with open(evidence.storage_path, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()[:100]  # Read up to first 100 entries safely

            # Common ISO timestamp regex: 2026-03-28 02:14:00 or 2026-03-28T02:14:00
            ts_regex = re.compile(r"(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})")

            for line in lines:
                match = ts_regex.search(line)
                if match:
                    try:
                        ts_str = match.group(1).replace("T", " ")
                        parsed_dt = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
                        parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
                    except Exception:
                        parsed_dt = datetime.now(timezone.utc)

                    desc = line.strip()
                    is_suspicious = any(k in desc.lower() for k in ["unauthorized", "suspicious", "fail", "denied", "root", "admin", "delete", "wiper"])
                    severity = "high" if is_suspicious else "info"

                    event = TimelineEvent(
                        case_id=case_id,
                        evidence_id=evidence.id,
                        event_type="log",
                        description=desc[:250],
                        timestamp=parsed_dt,
                        severity=severity,
                        source=evidence.filename,
                        actor="SYSTEM",
                        is_suspicious=is_suspicious,
                        raw_log=line.strip()
                    )
                    db.add(event)
                    created_events.append(event)

            if created_events:
                db.commit()
        except Exception:
            pass

        return created_events
