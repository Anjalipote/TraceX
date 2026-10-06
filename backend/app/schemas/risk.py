from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class RiskFactorBase(BaseModel):
    name: str
    description: str
    score: int
    severity: str = "Medium"
    category: str = "Behavioral Anomaly"
    source: str = "Correlation Engine"
    mitre_technique: Optional[str] = None
    confidence: str = "High"
    confidence_reason: Optional[str] = None

class RiskFactorCreate(RiskFactorBase):
    case_id: str

class RiskFactorResponse(RiskFactorBase):
    id: str
    case_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RiskBreakdownCategory(BaseModel):
    category: str
    score: int
    max_score: int
    percentage: int

class RiskAssessmentResponse(BaseModel):
    case_id: str
    case_number: str
    overall_score: int  # 0 - 100
    risk_level: str     # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    status_label: str
    confidence_score: float
    factors: List[RiskFactorResponse]
    breakdown_by_category: List[RiskBreakdownCategory]
    investigation_recommendation: str
    
    # Phase 3 Multi-Dimensional Contribution Breakdown
    severity_contribution: int = 25
    evidence_contribution: int = 20
    correlation_contribution: int = 20
    anomaly_contribution: int = 12
    timeline_contribution: int = 10
    integrity_contribution: int = 0
    calculation_explanation: str = "Investigation priority score synthesized across correlated USB access, rapid file staging, anti-forensics execution, and detected anomaly sequences."
    
    calculated_at: datetime
