from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class ActivityCluster(Base):
    __tablename__ = "activity_clusters"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    event_count = Column(Integer, default=0, nullable=False)
    severity = Column(String(32), default="Medium", nullable=False)  # Critical, High, Medium, Low
    confidence = Column(String(32), default="High", nullable=False)  # High, Medium, Low
    confidence_reason = Column(Text, nullable=True)
    sequence_summary = Column(Text, nullable=False)  # e.g., "USB Connected -> Confidential File Accessed -> File Copied -> ..."
    event_ids = Column(Text, nullable=True)  # JSON-encoded array of timeline event IDs
    evidence_ids = Column(Text, nullable=True)  # JSON-encoded array of related evidence IDs
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    case = relationship("Case", back_populates="activity_clusters")

    def __repr__(self):
        return f"<ActivityCluster '{self.title}' [{self.severity}]>"
