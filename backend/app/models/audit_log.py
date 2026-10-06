from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Text, DateTime
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), nullable=True, index=True)
    user_id = Column(String(36), nullable=True)
    user_email = Column(String(255), nullable=False)
    user_role = Column(String(32), default="INVESTIGATOR", nullable=False)
    action = Column(String(100), nullable=False, index=True)
    object_type = Column(String(64), nullable=True)
    object_id = Column(String(100), nullable=True)
    result = Column(String(32), default="SUCCESS", nullable=False)
    ip_address = Column(String(64), default="127.0.0.1", nullable=False)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    def __repr__(self):
        return f"<AuditLog {self.action} by {self.user_email} at {self.created_at}>"
