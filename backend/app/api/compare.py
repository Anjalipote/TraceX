from typing import Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_case_access
from app.models.user import User
from app.services.comparison_service import ComparisonService

router = APIRouter(tags=["Case Comparison"])

@router.get("/cases/compare")
def compare_cases(
    case1: str = Query(..., description="First Case ID to compare"),
    case2: str = Query(..., description="Second Case ID to compare"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify access to both cases
    require_case_access(case1, db, current_user)
    require_case_access(case2, db, current_user)

    result = ComparisonService.compare_cases(db, case1, case2)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result
