from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class ActivityClusterResponse(BaseModel):
    id: str
    case_id: str
    title: str
    description: str
    start_time: datetime
    end_time: datetime
    event_count: int
    severity: str
    confidence: str
    confidence_reason: Optional[str] = None
    sequence_summary: str
    event_ids: Optional[str] = None
    evidence_ids: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
