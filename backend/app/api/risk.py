from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.case import Case
from app.models.risk import RiskFactor
from app.schemas.risk import RiskAssessmentResponse, RiskFactorCreate, RiskFactorResponse
from app.services.risk_service import RiskService

router = APIRouter(prefix="/cases/{case_id}/risk", tags=["Risk Analysis"])

@router.get("", response_model=RiskAssessmentResponse)
def get_case_risk(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    return RiskService.calculate_case_risk(db, case.id)

@router.post("/factors", response_model=RiskFactorResponse, status_code=status.HTTP_201_CREATED)
def add_risk_factor(
    case_id: str,
    factor_in: RiskFactorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    factor = RiskFactor(
        case_id=case.id,
        name=factor_in.name,
        description=factor_in.description,
        score=factor_in.score,
        severity=factor_in.severity,
        category=factor_in.category,
        source=factor_in.source,
        mitre_technique=factor_in.mitre_technique
    )
    db.add(factor)
    db.commit()
    db.refresh(factor)
    return factor
