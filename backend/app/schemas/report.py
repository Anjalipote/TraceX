from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict

class ReportBase(BaseModel):
    title: str
    report_type: str = "Full Forensic Dossier"  # Executive Summary, Full Forensic Dossier, Court-Admissible Evidence Log
    classification: str = "CONFIDENTIAL"

class ReportCreate(ReportBase):
    case_id: str

class ReportResponse(ReportBase):
    id: str
    case_id: str
    status: str
    generated_at: datetime
    file_path: Optional[str] = None
    file_size: Optional[str] = "1.2 MB"
    summary_json: Optional[str] = None
    report_hash: Optional[str] = None
    report_version: Optional[str] = "v1.0.0-phase4"
    verified_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ReportVerifyResponse(BaseModel):
    report_id: str
    case_id: str
    report_hash: Optional[str] = None
    computed_hash: Optional[str] = None
    claimed_hash: Optional[str] = None
    is_valid: bool
    verified_at: Optional[str] = None
    status: str

class InvestigationStorySummary(BaseModel):
    case_id: str
    case_number: str
    title: str
    executive_summary: str
    incident_narrative: Optional[str] = ""
    chronological_sequence: List[str] = []
    why_sequence_matters: Optional[str] = None
    supporting_evidence_details: List[Dict[str, Any]] = []
    further_investigation_required: List[str] = []
    key_actors: List[str] = []
    attack_vectors: List[str] = []
    timeline_milestones: List[Dict[str, Any]] = []
    critical_evidence_chain: List[Dict[str, Any]] = []
    observed_facts: List[str] = []
    inferences_and_correlations: List[str] = []
    investigator_notes: List[str] = []
    limitations: List[str] = []
    evidence_gaps: List[Dict[str, Any]] = []
    risk_assessment: Dict[str, Any] = {}
    investigation_conclusion: str
    recommendations: List[str] = []
    generated_at: datetime
