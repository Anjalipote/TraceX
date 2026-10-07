from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, DateTime, JSON, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class CollectionJob(Base):
    __tablename__ = "collection_jobs"

    id = Column(String, primary_key=True, default=lambda: f"JOB-{uuid.uuid4().hex[:8].upper()}")
    investigation_id = Column(String, index=True, nullable=False)
    computer_id = Column(String, index=True, nullable=False)
    status = Column(String, default="queued")  # queued, running, completed, failed, partial
    stage = Column(String, default="queued")  # queued, file_discovery, usn_journal, usb_registry, event_logs, correlating, completed
    progress_percent = Column(Integer, default=0)
    
    # Scope configuration
    scope_config = Column(JSON, default=dict)
    
    # Counts & telemetry
    artifacts_discovered = Column(Integer, default=0)
    artifacts_collected = Column(Integer, default=0)
    artifacts_status = Column(JSON, default=dict)  # per-source breakdown: status, reason, count
    
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "investigation_id": self.investigation_id,
            "computer_id": self.computer_id,
            "status": self.status,
            "stage": self.stage,
            "progress_percent": self.progress_percent,
            "scope_config": self.scope_config or {},
            "artifacts_discovered": self.artifacts_discovered,
            "artifacts_collected": self.artifacts_collected,
            "artifacts_status": self.artifacts_status or {},
            "error_message": self.error_message,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
