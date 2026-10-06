from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_case_access
from app.models.user import User
from app.services.gap_service import GapService

router = APIRouter(tags=["Evidence Gap Detection"])

@router.get("/cases/{case_id}/gaps")
def get_case_evidence_gaps(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = require_case_access(case_id, db, current_user)
    gaps = GapService.detect_evidence_gaps(db, case.id)
    return [
        {
            "id": g.id,
            "caseId": g.case_id,
            "title": g.title,
            "gapType": g.gap_type,
            "severity": g.severity,
            "confidence": g.confidence,
            "whyItMatters": g.why_it_matters,
            "relatedFindingId": g.related_finding_id,
            "relatedEventId": g.related_event_id,
            "suggestedStep": g.suggested_step,
            "isResolved": g.is_resolved,
            "createdAt": g.created_at.isoformat()
        }
        for g in gaps
    ]
