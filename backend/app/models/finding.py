from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Finding(Base):
    __tablename__ = "findings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_id = Column(String(36), ForeignKey("evidence.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(32), default="Medium", nullable=False)  # Critical, High, Medium, Low, Info
    reason = Column(Text, nullable=False)
    risk_contribution = Column(Integer, default=0, nullable=False)  # Points added to risk score
    mitre_technique = Column(String(128), nullable=True)
    category = Column(String(64), default="Exfiltration")
    status = Column(String(32), default="Confirmed", nullable=False)  # Confirmed, Under Review, Dismissed
    
    # Phase 3 Explainability & Confidence Extensions
    confidence = Column(String(32), default="High", nullable=False)  # High, Medium, Low
    confidence_reason = Column(Text, nullable=True)
    what_happened = Column(Text, nullable=True)
    why_detected = Column(Text, nullable=True)
    why_suspicious = Column(Text, nullable=True)
    recommended_next_step = Column(Text, nullable=True)
    supporting_factors = Column(Text, nullable=True)  # JSON-encoded list of specific supporting factors
    related_entities = Column(Text, nullable=True)   # JSON-encoded list of related entities (users, devices, hashes)
    related_timeline_event_ids = Column(Text, nullable=True)  # JSON-encoded array of timeline event IDs

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    case = relationship("Case", back_populates="findings")
    evidence = relationship("Evidence", back_populates="findings")

    def __repr__(self):
        return f"<Finding [{self.severity}] {self.title} (+{self.risk_contribution})>"
