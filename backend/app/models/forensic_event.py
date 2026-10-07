from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, DateTime, JSON, Text, Boolean, Index
from app.core.database import Base

class ForensicEvent(Base):
    __tablename__ = "forensic_events"

    id = Column(String, primary_key=True, default=lambda: f"EVT-{uuid.uuid4().hex[:10].upper()}")
    investigation_id = Column(String, index=True, nullable=False)
    job_id = Column(String, index=True, nullable=True)
    
    timestamp = Column(DateTime, index=True, nullable=False, default=lambda: datetime.now(timezone.utc))
    timestamp_source = Column(String, default="filesystem")  # file_mtime, file_ctime, usn_journal, windows_event_log, registry, agent_live
    
    event_type = Column(String, index=True, nullable=False)  # FILE_MODIFIED, FILE_CREATED, FILE_DELETED, FILE_RENAMED, FILE_ACCESSED, USB_CONNECTED, USB_DISCONNECTED, USER_LOGON, USER_LOGOFF
    category = Column(String, default="File System")  # File System, USB / Removable Storage, Authentication, System Log
    severity = Column(String, default="Low")  # Low, Medium, High, Critical
    
    computer_id = Column(String, index=True, nullable=True)
    user = Column(String, nullable=True)
    
    # File details
    file_name = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    destination_file = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    file_hash = Column(String, nullable=True)  # SHA-256
    previous_hash = Column(String, nullable=True)
    
    # Device details (for USB/Removable)
    device_name = Column(String, nullable=True)
    device_serial = Column(String, nullable=True)
    mount_point = Column(String, nullable=True)
    vendor_id = Column(String, nullable=True)
    product_id = Column(String, nullable=True)
    hardware_id = Column(String, nullable=True)
    
    # Raw artifact provenance
    raw_artifact_source = Column(String, nullable=True)  # e.g. "HKLM\\SYSTEM\\CurrentControlSet\\Enum\\USBSTOR", "Security 4663", "USN Journal", "os.stat"
    details = Column(JSON, default=dict)
    
    # Correlation & Explainability
    is_suspicious = Column(Boolean, default=False)
    suspicion_reason = Column(Text, nullable=True)
    correlation_group_id = Column(String, index=True, nullable=True)
    evidence_id = Column(String, nullable=True)  # linked Evidence record in traceX database

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_forensic_evt_inv_time", "investigation_id", "timestamp"),
        Index("idx_forensic_evt_inv_type", "investigation_id", "event_type"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "investigation_id": self.investigation_id,
            "job_id": self.job_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "timestamp_source": self.timestamp_source,
            "event_type": self.event_type,
            "category": self.category,
            "severity": self.severity,
            "computer_id": self.computer_id,
            "user": self.user,
            "file_name": self.file_name,
            "file_path": self.file_path,
            "destination_file": self.destination_file,
            "file_size": self.file_size,
            "file_hash": self.file_hash,
            "previous_hash": self.previous_hash,
            "device_name": self.device_name,
            "device_serial": self.device_serial,
            "mount_point": self.mount_point,
            "vendor_id": self.vendor_id,
            "product_id": self.product_id,
            "raw_artifact_source": self.raw_artifact_source,
            "details": self.details or {},
            "is_suspicious": self.is_suspicious,
            "suspicion_reason": self.suspicion_reason,
            "correlation_group_id": self.correlation_group_id,
            "evidence_id": self.evidence_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
