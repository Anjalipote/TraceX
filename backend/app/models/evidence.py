from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, BigInteger, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=False, index=True)
    evidence_number = Column(String(64), nullable=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(64), nullable=False, default="binary")  # log, binary, registry, document, disk_image, network
    mime_type = Column(String(128), default="application/octet-stream")
    file_size = Column(BigInteger, nullable=False, default=0)
    storage_path = Column(String(512), nullable=False)
    sha256_hash = Column(String(64), nullable=False, index=True)
    md5_hash = Column(String(32), nullable=True)
    integrity_status = Column(String(32), default="Verified", nullable=False)  # Verified, Compromised, Pending
    analysis_status = Column(String(32), default="Complete", nullable=False)    # Complete, Processing, Queued, Flagged
    source_device = Column(String(255), default="FINANCE-SRV-04")
    category = Column(String(64), default="FileSystem")
    notes = Column(Text, nullable=True)
    
    # Forensic Timestamps (extracted from file or header)
    file_created_at = Column(DateTime, nullable=True)
    file_modified_at = Column(DateTime, nullable=True)
    file_accessed_at = Column(DateTime, nullable=True)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    case = relationship("Case", back_populates="evidence_items")
    timeline_events = relationship("TimelineEvent", back_populates="evidence")
    findings = relationship("Finding", back_populates="evidence")

    def __repr__(self):
        return f"<Evidence {self.filename} ({self.sha256_hash[:8]}...)>"
