from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=False, index=True)
    evidence_id = Column(String(36), ForeignKey("evidence.id", ondelete="SET NULL"), nullable=True)
    event_type = Column(String(64), nullable=False, default="system")  # usb, auth, file, process, network, system
    description = Column(Text, nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    severity = Column(String(32), default="info", nullable=False)  # critical, high, medium, low, info
    source = Column(String(128), default="System Log")
    actor = Column(String(128), default="SYSTEM")
    is_suspicious = Column(Boolean, default=False, nullable=False)
    mitre_technique = Column(String(128), nullable=True)
    raw_log = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    case = relationship("Case", back_populates="timeline_events")
    evidence = relationship("Evidence", back_populates="timeline_events")

    def __repr__(self):
        return f"<TimelineEvent [{self.timestamp}] {self.event_type}: {self.description[:40]}>"
