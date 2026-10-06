from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.case import Case
from app.models.relationship import EvidenceRelationship
from app.schemas.relationship import GraphDataResponse, EvidenceRelationshipCreate, EvidenceRelationshipResponse
from app.services.relationship_service import RelationshipService

router = APIRouter(prefix="/cases/{case_id}/relationships", tags=["Evidence Relationships"])

@router.get("", response_model=GraphDataResponse)
def get_evidence_graph(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    return RelationshipService.get_graph_data(db, case.id)

@router.post("", response_model=EvidenceRelationshipResponse, status_code=status.HTTP_201_CREATED)
def create_relationship(
    case_id: str,
    rel_in: EvidenceRelationshipCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    rel = EvidenceRelationship(
        case_id=case.id,
        source_evidence_id=rel_in.source_evidence_id,
        target_evidence_id=rel_in.target_evidence_id,
        relationship_type=rel_in.relationship_type,
        label=rel_in.label,
        confidence=rel_in.confidence
    )
    db.add(rel)
    db.commit()
    db.refresh(rel)
    return rel
