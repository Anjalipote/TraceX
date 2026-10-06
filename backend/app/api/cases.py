import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_role
from app.services.audit_service import AuditService
from app.models.user import User
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.timeline import TimelineEvent
from app.models.finding import Finding
from app.models.risk import RiskFactor
from app.services.risk_service import RiskService
from app.schemas.case import CaseCreate, CaseUpdate, CaseResponse, CaseSummaryResponse

router = APIRouter(prefix="/cases", tags=["Cases"])

@router.get("", response_model=List[CaseResponse])
def get_cases(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cases = db.query(Case).all()
    results = []
    for c in cases:
        ev_count = db.query(Evidence).filter(Evidence.case_id == c.id).count()
        ev_timeline = db.query(TimelineEvent).filter(TimelineEvent.case_id == c.id).count()
        risk_data = RiskService.calculate_case_risk(db, c.id)
        risk_score = risk_data.get("overall_score", 0)
        results.append(
            CaseResponse(
                id=c.id,
                case_number=c.case_number,
                name=c.name,
                description=c.description,
                status=c.status,
                priority=c.priority,
                incident_type=c.incident_type,
                target_system=c.target_system,
                investigator_id=c.investigator_id,
                created_at=c.created_at,
                updated_at=c.updated_at,
                evidence_count=ev_count,
                timeline_event_count=ev_timeline,
                risk_score=risk_score
            )
        )
    return results

@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create_case(case_in: CaseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Case).filter(Case.case_number == case_in.case_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Case number already exists")

    new_case = Case(
        case_number=case_in.case_number,
        name=case_in.name,
        description=case_in.description,
        status=case_in.status,
        priority=case_in.priority,
        incident_type=case_in.incident_type,
        target_system=case_in.target_system,
        investigator_id=current_user.id
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    return CaseResponse(
        id=new_case.id,
        case_number=new_case.case_number,
        name=new_case.name,
        description=new_case.description,
        status=new_case.status,
        priority=new_case.priority,
        incident_type=new_case.incident_type,
        target_system=new_case.target_system,
        investigator_id=new_case.investigator_id,
        created_at=new_case.created_at,
        updated_at=new_case.updated_at,
        evidence_count=0,
        timeline_event_count=0,
        risk_score=0
    )

@router.get("/{case_id}", response_model=CaseResponse)
def get_case(case_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    ev_count = db.query(Evidence).filter(Evidence.case_id == case.id).count()
    ev_timeline = db.query(TimelineEvent).filter(TimelineEvent.case_id == case.id).count()
    risk_score = sum(r.score for r in db.query(RiskFactor).filter(RiskFactor.case_id == case.id).all())

    return CaseResponse(
        id=case.id,
        case_number=case.case_number,
        name=case.name,
        description=case.description,
        status=case.status,
        priority=case.priority,
        incident_type=case.incident_type,
        target_system=case.target_system,
        investigator_id=case.investigator_id,
        created_at=case.created_at,
        updated_at=case.updated_at,
        evidence_count=ev_count,
        timeline_event_count=ev_timeline,
        risk_score=min(risk_score, 100)
    )

@router.patch("/{case_id}", response_model=CaseResponse)
def update_case(case_id: str, case_in: CaseUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    for field, value in case_in.model_dump(exclude_unset=True).items():
        setattr(case, field, value)

    db.commit()
    db.refresh(case)
    return case

@router.get("/{case_id}/summary", response_model=CaseSummaryResponse)
def get_case_summary(case_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    ev_count = db.query(Evidence).filter(Evidence.case_id == case.id).count()
    suspicious_count = db.query(TimelineEvent).filter(
        TimelineEvent.case_id == case.id,
        TimelineEvent.is_suspicious == True
    ).count()
    timeline_count = db.query(TimelineEvent).filter(TimelineEvent.case_id == case.id).count()
    finding_count = db.query(Finding).filter(Finding.case_id == case.id).count()
    risk_data = RiskService.calculate_case_risk(db, case.id)
    risk_score = risk_data.get("overall_score", 0)
    risk_level = risk_data.get("risk_level", "NO RISK")
    
    last_event = db.query(TimelineEvent).filter(TimelineEvent.case_id == case.id).order_by(TimelineEvent.timestamp.desc()).first()

    return CaseSummaryResponse(
        id=case.id,
        case_number=case.case_number,
        name=case.name,
        status=case.status,
        priority=case.priority,
        incident_type=case.incident_type,
        target_system=case.target_system,
        risk_score=risk_score,
        risk_level=risk_level,
        evidence_count=ev_count,
        suspicious_count=suspicious_count,
        timeline_event_count=timeline_count,
        finding_count=finding_count,
        investigator_name=case.investigator.name if case.investigator else "Senior DFIR Investigator",
        last_activity=last_event.timestamp if last_event else case.updated_at
    )

@router.post("/{case_id}/reset-demo")
def reset_demo_case(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN"]))
):
    """
    Safely reseeds / resets the demo case (e.g. CASE-2026-001) to its canonical baseline state.
    Protected strictly to ADMIN role. Non-demo cases are protected from accidental alteration.
    """
    if "001" not in case_id and "demo" not in case_id.lower():
        raise HTTPException(
            status_code=400,
            detail="Demo reset is restricted strictly to designated demonstration cases to protect real case data."
        )
    import sys
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
    from seed import seed_database
    seed_database()

    AuditService.log_action(
        db=db,
        action="DEMO_RESET",
        user_email=current_user.email,
        user_role=current_user.role,
        case_id=case_id,
        object_type="Case",
        object_id=case_id,
        metadata={"scope": "canonical_demo_reseed"}
    )
    return {
        "success": True,
        "message": f"Demo case {case_id} has been reset to canonical baseline state.",
        "case_id": case_id
    }

