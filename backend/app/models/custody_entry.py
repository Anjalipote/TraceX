from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from app.core.database import Base

class CustodyEntry(Base):
    __tablename__ = "custody_chain"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=False, index=True)
    sequence_number = Column(Integer, nullable=False, index=True)
    evidence_id = Column(String(36), nullable=True)
    evidence_name = Column(String(255), nullable=False)
    action = Column(String(64), nullable=False)  # INGESTED, HASH_VERIFIED, METADATA_EXTRACTED, CORRELATED, REPORT_SEALED
    actor = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    previous_hash = Column(String(64), nullable=False)
    record_hash = Column(String(64), nullable=False, index=True)

    def __repr__(self):
        return f"<CustodyEntry #{self.sequence_number} {self.action} on {self.evidence_name} - {self.record_hash[:8]}...>"
