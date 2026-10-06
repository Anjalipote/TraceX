from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_case_access
from app.models.user import User
from app.services.explainability_service import ExplainabilityService

router = APIRouter(tags=["Explainability Center"])

@router.get("/cases/{case_id}/explainability")
def get_case_explainability_matrix(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = require_case_access(case_id, db, current_user)
    return ExplainabilityService.get_explainability_matrix(db, case.id)
