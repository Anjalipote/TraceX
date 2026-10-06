from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_role, require_case_access
from app.models.user import User
from app.models.audit_log import AuditLog
from app.services.audit_service import AuditService

router = APIRouter(tags=["Audit Logs & Activity Feed"])

@router.get("/cases/{case_id}/activity")
def get_case_activity_feed(
    case_id: str,
    limit: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = require_case_access(case_id, db, current_user)
    return AuditService.get_case_activity_feed(db, case.id, limit=limit)

@router.get("/cases/{case_id}/audit")
def get_case_audit_logs(
    case_id: str,
    action: Optional[str] = None,
    user_email: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = require_case_access(case_id, db, current_user)
    logs, total = AuditService.get_logs(
        db=db,
        case_id=case.id,
        action=action,
        user_email=user_email,
        search=search,
        limit=limit,
        offset=offset
    )
    return {
        "case_id": case.id,
        "total": total,
        "limit": limit,
        "offset": offset,
        "logs": [
            {
                "id": l.id,
                "action": l.action,
                "userEmail": l.user_email,
                "userRole": l.user_role,
                "caseId": l.case_id,
                "objectType": l.object_type,
                "objectId": l.object_id,
                "result": l.result,
                "ipAddress": l.ip_address,
                "createdAt": l.created_at.isoformat(),
                "timeFormatted": l.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")
            }
            for l in logs
        ]
    }

@router.get("/audit")
def get_global_audit_logs(
    action: Optional[str] = None,
    user_email: Optional[str] = None,
    case_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "INVESTIGATOR"]))
):
    """
    Global investigation audit trail with filters and pagination.
    """
    logs, total = AuditService.get_logs(
        db=db,
        case_id=case_id,
        action=action,
        user_email=user_email,
        search=search,
        limit=limit,
        offset=offset
    )
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "logs": [
            {
                "id": l.id,
                "action": l.action,
                "userEmail": l.user_email,
                "userRole": l.user_role,
                "caseId": l.case_id,
                "objectType": l.object_type,
                "objectId": l.object_id,
                "result": l.result,
                "ipAddress": l.ip_address,
                "createdAt": l.created_at.isoformat(),
                "timeFormatted": l.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")
            }
            for l in logs
        ]
    }
