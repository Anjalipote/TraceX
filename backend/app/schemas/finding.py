from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class FindingBase(BaseModel):
    title: str
    description: str
    severity: str = "Medium"  # Critical, High, Medium, Low, Info
    reason: str
    risk_contribution: int = 0
    mitre_technique: Optional[str] = None
    category: str = "Exfiltration"
    status: str = "Confirmed"  # Confirmed, Under Review, Dismissed
    
    # Phase 3 Explainability & Confidence
    confidence: str = "High"  # High, Medium, Low
    confidence_reason: Optional[str] = None
    what_happened: Optional[str] = None
    why_detected: Optional[str] = None
    why_suspicious: Optional[str] = None
    recommended_next_step: Optional[str] = None
    supporting_factors: Optional[str] = None
    related_entities: Optional[str] = None
    related_timeline_event_ids: Optional[str] = None

class FindingCreate(FindingBase):
    case_id: str
    evidence_id: Optional[str] = None

class FindingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    reason: Optional[str] = None
    risk_contribution: Optional[int] = None
    mitre_technique: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    confidence: Optional[str] = None
    confidence_reason: Optional[str] = None
    what_happened: Optional[str] = None
    why_detected: Optional[str] = None
    why_suspicious: Optional[str] = None
    recommended_next_step: Optional[str] = None

class FindingResponse(FindingBase):
    id: str
    case_id: str
    evidence_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FindingSummaryResponse(BaseModel):
    total_findings: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    total_risk_contribution: int
    findings: List[FindingResponse]
