from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.anomaly import AnomalyResponse
from app.services.anomaly_service import AnomalyService

router = APIRouter(prefix="/cases/{case_id}/anomalies", tags=["Anomaly Detection"])

@router.get("", response_model=List[AnomalyResponse])
def get_anomalies(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    anomalies = AnomalyService.get_anomalies(db, case_id)
    if not anomalies:
        anomalies = AnomalyService.detect_anomalies(db, case_id)
    return anomalies
