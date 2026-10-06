from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.case import Case
from app.models.timeline import TimelineEvent
from app.schemas.timeline import TimelineEventCreate, TimelineEventResponse, TimelineSummaryResponse
from app.services.timeline_service import TimelineService

router = APIRouter(prefix="/cases/{case_id}/timeline", tags=["Timeline"])

@router.get("", response_model=List[TimelineEventResponse])
def get_timeline(
    case_id: str,
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    suspicious_only: bool = False,
    search: Optional[str] = None,
    limit: int = 250,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    return TimelineService.get_events(
        db=db,
        case_id=case.id,
        event_type=event_type,
        severity=severity,
        suspicious_only=suspicious_only,
        search=search,
        limit=limit,
        offset=offset
    )

@router.post("", response_model=TimelineEventResponse, status_code=status.HTTP_201_CREATED)
def create_timeline_event(
    case_id: str,
    event_in: TimelineEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    event = TimelineEvent(
        case_id=case.id,
        evidence_id=event_in.evidence_id,
        event_type=event_in.event_type,
        description=event_in.description,
        timestamp=event_in.timestamp,
        severity=event_in.severity,
        source=event_in.source,
        actor=event_in.actor,
        is_suspicious=event_in.is_suspicious,
        mitre_technique=event_in.mitre_technique,
        raw_log=event_in.raw_log
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

@router.get("/summary", response_model=TimelineSummaryResponse)
def get_timeline_summary(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    events = db.query(TimelineEvent).filter(TimelineEvent.case_id == case.id).order_by(TimelineEvent.timestamp.asc()).all()

    by_type = {}
    suspicious_count = 0
    critical_count = 0
    high_count = 0

    for e in events:
        by_type[e.event_type] = by_type.get(e.event_type, 0) + 1
        if e.is_suspicious:
            suspicious_count += 1
        if e.severity == "critical":
            critical_count += 1
        elif e.severity == "high":
            high_count += 1

    return TimelineSummaryResponse(
        total_events=len(events),
        suspicious_events=suspicious_count,
        critical_events=critical_count,
        high_events=high_count,
        events_by_type=by_type,
        events=events
    )
