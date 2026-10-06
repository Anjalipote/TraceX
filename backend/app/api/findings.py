from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.case import Case
from app.models.finding import Finding
from app.schemas.finding import FindingCreate, FindingResponse, FindingSummaryResponse
from app.services.finding_service import FindingService

router = APIRouter(prefix="/cases/{case_id}/findings", tags=["Findings & Correlation"])

@router.get("", response_model=List[FindingResponse])
def get_findings(
    case_id: str,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    return FindingService.get_findings(db, case.id, severity=severity, status=status)

@router.post("", response_model=FindingResponse, status_code=status.HTTP_201_CREATED)
def create_finding(
    case_id: str,
    finding_in: FindingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    finding = Finding(
        case_id=case.id,
        evidence_id=finding_in.evidence_id,
        title=finding_in.title,
        description=finding_in.description,
        severity=finding_in.severity,
        reason=finding_in.reason,
        risk_contribution=finding_in.risk_contribution,
        mitre_technique=finding_in.mitre_technique,
        category=finding_in.category,
        status=finding_in.status
    )
    db.add(finding)
    db.commit()
    db.refresh(finding)
    return finding

@router.post("/correlate", response_model=List[FindingResponse])
def run_correlation_engine(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    return FindingService.run_correlation(db, case.id)

@router.get("/summary", response_model=FindingSummaryResponse)
def get_findings_summary(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    findings = db.query(Finding).filter(Finding.case_id == case.id).all()
    critical_count = sum(1 for f in findings if f.severity.lower() == "critical")
    high_count = sum(1 for f in findings if f.severity.lower() == "high")
    medium_count = sum(1 for f in findings if f.severity.lower() == "medium")
    low_count = sum(1 for f in findings if f.severity.lower() == "low")
    total_risk = sum(f.risk_contribution for f in findings)

    return FindingSummaryResponse(
        total_findings=len(findings),
        critical_count=critical_count,
        high_count=high_count,
        medium_count=medium_count,
        low_count=low_count,
        total_risk_contribution=total_risk,
        findings=findings
    )
