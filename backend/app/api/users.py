from typing import List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_role
from app.models.user import User
from app.services.user_service import UserService
from app.services.audit_service import AuditService

router = APIRouter(tags=["User Management & RBAC"])

class RoleUpdateRequest(BaseModel):
    role: str

class StatusUpdateRequest(BaseModel):
    status: str

@router.get("/users")
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"]))
):
    """
    Lists users for Administrator management without exposing password hashes.
    """
    return UserService.get_users(db)

@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    payload: RoleUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"]))
):
    try:
        updated = UserService.update_user_role(db, user_id, payload.role)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not updated:
        raise HTTPException(status_code=404, detail="User not found")

    # Audit Log
    AuditService.log_action(
        db=db,
        action="ROLE_CHANGE",
        user_email=current_user.email,
        user_role=current_user.role,
        object_type="User",
        object_id=user_id,
        metadata={"new_role": payload.role}
    )

    return updated

@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    payload: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"]))
):
    updated = UserService.update_user_status(db, user_id, payload.status)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")

    AuditService.log_action(
        db=db,
        action="USER_STATUS_CHANGE",
        user_email=current_user.email,
        user_role=current_user.role,
        object_type="User",
        object_id=user_id,
        metadata={"new_status": payload.status}
    )

    return updated
