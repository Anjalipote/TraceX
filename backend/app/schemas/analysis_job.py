from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

class StartAnalysisRequest(BaseModel):
    reanalyze_all: bool = True
    detect_anomalies: bool = True
    cluster_timeline: bool = True

class AnalysisJobResponse(BaseModel):
    id: str
    case_id: str
    status: str  # Queued, In Progress, Completed, Failed
    current_step: str
    progress_percent: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    result_summary: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
