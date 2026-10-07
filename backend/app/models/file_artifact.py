from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, BigInteger, Integer, DateTime, Text, Boolean, JSON, Index
from app.core.database import Base

class FileMetadata(Base):
    """Stores full operating system metadata captured directly from the NTFS filesystem."""
    __tablename__ = "file_metadata"

    id = Column(String(36), primary_key=True, default=lambda: f"FMD-{uuid.uuid4().hex[:8].upper()}")
    investigation_id = Column(String(64), index=True, nullable=False)
    computer_id = Column(String(128), index=True, nullable=False)
    agent_id = Column(String(128), index=True, nullable=True)

    file_path = Column(String(512), index=True, nullable=False)
    file_name = Column(String(255), index=True, nullable=False)
    extension = Column(String(32), nullable=True)
    file_size = Column(BigInteger, default=0, nullable=False)

    creation_time = Column(DateTime, nullable=True)
    modification_time = Column(DateTime, nullable=True)
    access_time = Column(DateTime, nullable=True)

    volume = Column(String(32), default="C:")
    filesystem = Column(String(32), default="NTFS")
    file_attributes = Column(String(128), nullable=True)
    owner = Column(String(128), nullable=True)
    
    collected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("idx_file_meta_inv_path", "investigation_id", "file_path"),
    )


class FileHash(Base):
    """Maintains immutable cryptographic records of computed file hashes over time."""
    __tablename__ = "file_hashes"

    id = Column(String(36), primary_key=True, default=lambda: f"FHS-{uuid.uuid4().hex[:8].upper()}")
    investigation_id = Column(String(64), index=True, nullable=False)
    computer_id = Column(String(128), index=True, nullable=False)
    agent_id = Column(String(128), index=True, nullable=True)

    file_path = Column(String(512), index=True, nullable=False)
    sha256 = Column(String(64), index=True, nullable=False)
    md5 = Column(String(32), nullable=True)
    file_size = Column(BigInteger, default=0)

    timestamp_calculated = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    is_current = Column(Boolean, default=True, nullable=False)
    calculated_by = Column(String(64), default="TraceX-Agent-Hasher")

    __table_args__ = (
        Index("idx_file_hash_path_sha", "file_path", "sha256"),
    )


class FileVersion(Base):
    """Maintains verifiable version states of a target document when baseline/history exists."""
    __tablename__ = "file_versions"

    id = Column(String(36), primary_key=True, default=lambda: f"FVER-{uuid.uuid4().hex[:8].upper()}")
    investigation_id = Column(String(64), index=True, nullable=False)
    computer_id = Column(String(128), index=True, nullable=False)

    file_path = Column(String(512), index=True, nullable=False)
    version_label = Column(String(64), default="Baseline")  # Baseline, Modified, Current
    sha256 = Column(String(64), nullable=False)
    captured_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    source = Column(String(128), default="Baseline Seizure")

    # Content textual comparison summary if PDF / Text
    content_diff_summary = Column(Text, nullable=True)
    changed_pages_json = Column(JSON, default=list)


class WindowsEventRecord(Base):
    """Raw Windows Event Log records ingested with microsecond timestamps."""
    __tablename__ = "windows_events"

    id = Column(String(36), primary_key=True, default=lambda: f"WEVT-{uuid.uuid4().hex[:8].upper()}")
    investigation_id = Column(String(64), index=True, nullable=False)
    computer_id = Column(String(128), index=True, nullable=False)

    log_channel = Column(String(64), index=True, nullable=False)  # Kernel-PnP, System, Security
    event_id = Column(String(16), index=True, nullable=False)     # 400, 410, 420, 4663, etc.
    timestamp = Column(DateTime, index=True, nullable=False)

    user = Column(String(128), default="SYSTEM")
    provider_name = Column(String(128), nullable=True)
    task_category = Column(String(128), nullable=True)
    description = Column(Text, nullable=True)
    raw_xml_text = Column(Text, nullable=True)

    __table_args__ = (
        Index("idx_winevt_inv_time", "investigation_id", "timestamp"),
    )


class UsnEventRecord(Base):
    """Forensic records parsed directly from NTFS USN (Update Sequence Number) Change Journal."""
    __tablename__ = "usn_events"

    id = Column(String(36), primary_key=True, default=lambda: f"USN-{uuid.uuid4().hex[:8].upper()}")
    investigation_id = Column(String(64), index=True, nullable=False)
    computer_id = Column(String(128), index=True, nullable=False)

    volume = Column(String(16), default="C:")
    usn = Column(String(32), index=True, nullable=False)
    file_ref = Column(String(64), index=True, nullable=False)
    parent_file_ref = Column(String(64), nullable=True)
    
    reason_code = Column(String(32), nullable=True)
    change_reason = Column(String(128), nullable=False)  # USN_REASON_FILE_CREATE, DATA_OVERWRITE, etc.
    timestamp = Column(DateTime, index=True, nullable=True)

    file_name = Column(String(255), index=True, nullable=False)
    file_path = Column(String(512), nullable=True)

    __table_args__ = (
        Index("idx_usnevt_inv_file", "investigation_id", "file_name"),
    )


class DeviceEventRecord(Base):
    """Historical or live hardware attachment records from Windows USBSTOR & PnP."""
    __tablename__ = "device_events"

    id = Column(String(36), primary_key=True, default=lambda: f"DEV-{uuid.uuid4().hex[:8].upper()}")
    investigation_id = Column(String(64), index=True, nullable=False)
    computer_id = Column(String(128), index=True, nullable=False)

    device_name = Column(String(255), nullable=False)
    serial_number = Column(String(128), index=True, nullable=True)
    hardware_id = Column(String(255), nullable=True)
    vendor_id = Column(String(64), nullable=True)
    product_id = Column(String(64), nullable=True)
    mount_point = Column(String(32), nullable=True)

    event_type = Column(String(64), default="ATTACHED")  # ATTACHED, REMOVED, CONFIGURED
    timestamp = Column(DateTime, index=True, nullable=False)
    source = Column(String(128), default="HKLM\\SYSTEM\\CurrentControlSet\\Enum\\USBSTOR")
