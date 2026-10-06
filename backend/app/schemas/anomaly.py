from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class AnomalyResponse(BaseModel):
    id: str
    case_id: str
    title: str
    anomaly_type: str
    severity: str
    confidence: str
    confidence_reason: Optional[str] = None
    description: str
    detected_at: datetime
    supporting_evidence: Optional[str] = None
    explanation: str

    model_config = ConfigDict(from_attributes=True)
