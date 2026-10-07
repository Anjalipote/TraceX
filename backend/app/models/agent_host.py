from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean
from app.core.database import Base

class AgentHost(Base):
    __tablename__ = "agent_hosts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    hostname = Column(String(128), unique=True, index=True, nullable=False)
    ip_address = Column(String(64), nullable=True)
    os_info = Column(String(255), nullable=True)
    current_user = Column(String(128), nullable=True)
    agent_version = Column(String(64), default="v1.0.0", nullable=False)
    status = Column(String(32), default="Online", nullable=False)  # Online, Standby, Disconnected
    monitored_paths = Column(Text, nullable=True)  # JSON-encoded array of paths
    total_events = Column(Integer, default=0, nullable=False)
    last_heartbeat = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self):
        return f"<AgentHost {self.hostname} ({self.status})>"
