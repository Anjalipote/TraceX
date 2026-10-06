from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone
import json
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.audit_log import AuditLog
from app.models.user import User

class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        action: str,
        user_email: str = "investigator@tracex.demo",
        user_id: Optional[str] = None,
        user_role: str = "INVESTIGATOR",
        case_id: Optional[str] = None,
        object_type: Optional[str] = None,
        object_id: Optional[str] = None,
        result: str = "SUCCESS",
        metadata: Optional[Dict[str, Any]] = None,
        ip_address: str = "127.0.0.1"
    ) -> AuditLog:
        """
        Creates an immutable audit log entry recording key investigative and security actions.
        """
        metadata_str = json.dumps(metadata) if metadata else None
        log_entry = AuditLog(
            action=action,
            user_email=user_email,
            user_id=user_id,
            user_role=user_role.upper() if user_role else "INVESTIGATOR",
            case_id=case_id,
            object_type=object_type,
            object_id=object_id,
            result=result.upper(),
            ip_address=ip_address,
            metadata_json=metadata_str,
            created_at=datetime.now(timezone.utc)
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry

    @staticmethod
    def get_logs(
        db: Session,
        case_id: Optional[str] = None,
        action: Optional[str] = None,
        user_email: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[AuditLog], int]:
        """
        Queries audit records with multi-facet filters and pagination.
        """
        query = db.query(AuditLog)

        if case_id:
            query = query.filter((AuditLog.case_id == case_id) | (AuditLog.case_id == None))
        if action:
            query = query.filter(AuditLog.action == action)
        if user_email:
            query = query.filter(AuditLog.user_email.ilike(f"%{user_email}%"))
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                (AuditLog.action.ilike(search_filter)) |
                (AuditLog.user_email.ilike(search_filter)) |
                (AuditLog.object_id.ilike(search_filter)) |
                (AuditLog.metadata_json.ilike(search_filter))
            )

        total = query.count()
        logs = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(limit).all()
        return logs, total

    @staticmethod
    def get_case_activity_feed(db: Session, case_id: str, limit: int = 15) -> List[Dict[str, Any]]:
        """
        Extracts human-readable timeline of investigative actions for a case.
        """
        logs = db.query(AuditLog).filter(AuditLog.case_id == case_id).order_by(desc(AuditLog.created_at)).limit(limit).all()
        feed = []
        for l in logs:
            meta = json.loads(l.metadata_json) if l.metadata_json else {}
            feed.append({
                "id": l.id,
                "action": l.action,
                "user": l.user_email,
                "role": l.user_role,
                "timestamp": l.created_at.isoformat(),
                "timeFormatted": l.created_at.strftime("%H:%M:%S UTC"),
                "result": l.result,
                "description": meta.get("description", f"{l.action.replace('_', ' ').title()} performed by {l.user_email}"),
                "objectType": l.object_type,
                "objectId": l.object_id
            })
        return feed
