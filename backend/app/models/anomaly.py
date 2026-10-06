from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    anomaly_type = Column(String(64), nullable=False)  # temporal_proximity, rapid_volume, off_hours, anti_forensics, rare_process
    severity = Column(String(32), default="Medium", nullable=False)  # Critical, High, Medium, Low
    confidence = Column(String(32), default="High", nullable=False)  # High, Medium, Low
    confidence_reason = Column(Text, nullable=True)
    description = Column(Text, nullable=False)
    detected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    supporting_evidence = Column(Text, nullable=True)  # JSON-encoded array of evidence/files involved
    explanation = Column(Text, nullable=False)  # Deterministic explanation of why this was flagged as anomalous

    # Relationships
    case = relationship("Case", back_populates="anomalies")

    def __repr__(self):
        return f"<Anomaly '{self.title}' [{self.anomaly_type}]>"
