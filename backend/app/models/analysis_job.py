from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(32), default="Queued", nullable=False)  # Queued, In Progress, Completed, Failed
    current_step = Column(String(64), default="Queued", nullable=False)
    progress_percent = Column(Integer, default=0, nullable=False)  # 0 to 100
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    result_summary = Column(Text, nullable=True)  # JSON-encoded summary metrics

    # Relationships
    case = relationship("Case", back_populates="analysis_jobs")

    def __repr__(self):
        return f"<AnalysisJob {self.id} [{self.status} {self.progress_percent}%]>"
