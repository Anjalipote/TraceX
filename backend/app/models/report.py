from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    report_type = Column(String(64), default="Full Forensic Dossier", nullable=False)  # Executive Summary, Full Forensic Dossier, Court-Admissible Evidence Log
    status = Column(String(32), default="Ready", nullable=False)  # Ready, Generating, Failed
    generated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    file_path = Column(String(512), nullable=True)
    file_size = Column(String(32), default="1.2 MB")
    classification = Column(String(32), default="CONFIDENTIAL")
    summary_json = Column(Text, nullable=True)
    content_json = Column(Text, nullable=True)
    report_hash = Column(String(64), nullable=True)  # SHA-256 integrity hash
    report_version = Column(String(32), default="v1.0.0")
    verified_at = Column(DateTime, nullable=True)

    # Relationships
    case = relationship("Case", back_populates="reports")

    def __repr__(self):
        return f"<Report {self.title} ({self.status}) - Hash: {self.report_hash[:8] if self.report_hash else 'None'}>"
