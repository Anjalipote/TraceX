from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class TimelineEventBase(BaseModel):
    event_type: str = "system"  # usb, auth, file, process, network, system
    description: str
    timestamp: datetime
    severity: str = "info"  # critical, high, medium, low, info
    source: str = "System Log"
    actor: str = "SYSTEM"
    is_suspicious: bool = False
    mitre_technique: Optional[str] = None
    raw_log: Optional[str] = None

class TimelineEventCreate(TimelineEventBase):
    case_id: str
    evidence_id: Optional[str] = None

class TimelineEventResponse(TimelineEventBase):
    id: str
    case_id: str
    evidence_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TimelineSummaryResponse(BaseModel):
    total_events: int
    suspicious_events: int
    critical_events: int
    high_events: int
    events_by_type: dict
    events: List[TimelineEventResponse]
