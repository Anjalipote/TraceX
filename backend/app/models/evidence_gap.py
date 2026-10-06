from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class EvidenceGap(Base):
    __tablename__ = "evidence_gaps"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    gap_type = Column(String(64), nullable=False)  # missing_telemetry, weak_support, unexplained_timeline_gap, missing_expected_evidence, low_confidence_correlation
    severity = Column(String(32), default="HIGH", nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW
    confidence = Column(String(32), default="High", nullable=False)
    why_it_matters = Text()
    why_it_matters = Column(Text, nullable=False)
    related_finding_id = Column(String(36), nullable=True)
    related_event_id = Column(String(36), nullable=True)
    suggested_step = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    case = relationship("Case", back_populates="evidence_gaps")

    def __repr__(self):
        return f"<EvidenceGap {self.title} ({self.gap_type})>"
