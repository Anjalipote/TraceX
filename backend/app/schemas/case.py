from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class CaseBase(BaseModel):
    case_number: str
    name: str
    description: Optional[str] = None
    status: str = "Active"
    priority: str = "High"
    incident_type: str = "Data Exfiltration"
    target_system: str = "FINANCE-SRV-04"

class CaseCreate(CaseBase):
    pass

class CaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    incident_type: Optional[str] = None
    target_system: Optional[str] = None

class CaseResponse(CaseBase):
    id: str
    investigator_id: str
    created_at: datetime
    updated_at: datetime
    evidence_count: Optional[int] = 0
    timeline_event_count: Optional[int] = 0
    risk_score: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

class CaseSummaryResponse(BaseModel):
    id: str
    case_number: str
    name: str
    status: str
    priority: str
    incident_type: str
    target_system: str
    risk_score: int
    risk_level: str
    evidence_count: int
    suspicious_count: int
    timeline_event_count: int
    finding_count: int
    investigator_name: str
    last_activity: Optional[datetime] = None
