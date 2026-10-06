from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.search import GlobalSearchResponse
from app.services.search_service import SearchService

router = APIRouter(prefix="/cases/{case_id}/search", tags=["Global Investigation Search"])

@router.get("", response_model=GlobalSearchResponse)
def search_investigation(
    case_id: str,
    q: str = Query(..., min_length=1, description="Search query string"),
    category: Optional[str] = Query(None, description="Optional category filter (evidence, finding, timeline, anomaly, cluster)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return SearchService.global_search(db, case_id, q, category)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
