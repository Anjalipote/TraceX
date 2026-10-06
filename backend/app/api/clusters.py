from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.activity_cluster import ActivityClusterResponse
from app.services.clustering_service import ClusteringService

router = APIRouter(prefix="/cases/{case_id}/clusters", tags=["Activity Clusters"])

@router.get("", response_model=List[ActivityClusterResponse])
def get_activity_clusters(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    clusters = ClusteringService.get_clusters(db, case_id)
    if not clusters:
        clusters = ClusteringService.cluster_events(db, case_id)
    return clusters

@router.get("/phases")
def get_activity_phases(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ClusteringService.get_activity_phases(db, case_id)

