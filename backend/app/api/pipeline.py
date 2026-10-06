from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.analysis_job import AnalysisJobResponse, StartAnalysisRequest
from app.services.pipeline_service import PipelineService

router = APIRouter(prefix="/cases/{case_id}/analysis", tags=["Analysis Pipeline"])

@router.post("/start", response_model=AnalysisJobResponse, status_code=status.HTTP_202_ACCEPTED)
def start_case_analysis(
    case_id: str,
    req: StartAnalysisRequest = StartAnalysisRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        job = PipelineService.start_pipeline(db, case_id)
        return job
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")

@router.get("/status", response_model=AnalysisJobResponse)
def get_analysis_status(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = PipelineService.get_latest_job(db, case_id)
    if not job:
        # If no job recorded yet, trigger a baseline pipeline run
        job = PipelineService.start_pipeline(db, case_id)
    return job
