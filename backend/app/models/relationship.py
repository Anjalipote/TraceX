from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class EvidenceRelationship(Base):
    __tablename__ = "evidence_relationships"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Generic entity support (Evidence, Event, User, Device, File, Entity)
    source_id = Column(String(64), nullable=True, index=True)
    target_id = Column(String(64), nullable=True, index=True)
    source_type = Column(String(32), default="Evidence", nullable=False)
    target_type = Column(String(32), default="Evidence", nullable=False)

    # Legacy foreign keys for evidence-to-evidence backward compatibility
    source_evidence_id = Column(String(36), ForeignKey("evidence.id", ondelete="CASCADE"), nullable=True)
    target_evidence_id = Column(String(36), ForeignKey("evidence.id", ondelete="CASCADE"), nullable=True)

    relationship_type = Column(String(64), nullable=False, default="RELATED_TO")
    label = Column(String(128), default="Related To")
    explanation = Column(Text, nullable=True)  # Meaningful explanation for why this relationship exists
    confidence = Column(Float, default=1.0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    case = relationship("Case", back_populates="relationships")
    source_evidence = relationship("Evidence", foreign_keys=[source_evidence_id])
    target_evidence = relationship("Evidence", foreign_keys=[target_evidence_id])

    def __repr__(self):
        return f"<EvidenceRelationship {self.source_id or self.source_evidence_id} -> {self.target_id or self.target_evidence_id} ({self.relationship_type})>"
