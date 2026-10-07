from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class EvidenceBase(BaseModel):
    filename: str
    original_filename: str
    file_type: str = "binary"
    mime_type: str = "application/octet-stream"
    file_size: int = 0
    source_device: str = "FINANCE-SRV-04"
    category: str = "FileSystem"
    notes: Optional[str] = None

class EvidenceCreate(EvidenceBase):
    case_id: str
    storage_path: str
    sha256_hash: str
    md5_hash: Optional[str] = None
    integrity_status: str = "Verified"
    analysis_status: str = "Complete"
    file_created_at: Optional[datetime] = None
    file_modified_at: Optional[datetime] = None
    file_accessed_at: Optional[datetime] = None

class EvidenceResponse(EvidenceBase):
    id: str
    case_id: str
    evidence_number: Optional[str] = None
    sha256_hash: str
    md5_hash: Optional[str] = None
    integrity_status: str
    analysis_status: str
    file_created_at: Optional[datetime] = None
    file_modified_at: Optional[datetime] = None
    file_accessed_at: Optional[datetime] = None
    uploaded_at: datetime
    storage_path: Optional[str] = None
    is_live_agent: Optional[bool] = False
    baseline_sha256: Optional[str] = None
    pdf_diff_data: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class EvidenceVerifyResponse(BaseModel):
    evidence_id: str
    filename: str
    expected_sha256: str
    calculated_sha256: str
    integrity_status: str  # Verified or Compromised
    matches: bool
    verified_at: datetime
    message: str

class EvidenceIntegritySummary(BaseModel):
    total_evidence: int
    verified_count: int
    compromised_count: int
    pending_count: int
    integrity_rate_percent: float
    items: List[EvidenceResponse]
