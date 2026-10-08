from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, BigInteger, DateTime, Text, Boolean, Index, ForeignKey
from app.core.database import Base

class InvestigationFile(Base):
    """
    Associates an investigation with the target file selected on the target computer.
    Tracks both the original on-disk file path and any reference copies.
    """
    __tablename__ = "investigation_files"

    id = Column(String(36), primary_key=True, default=lambda: f"INV-FILE-{uuid.uuid4().hex[:8].upper()}")
    investigation_id = Column(String(64), index=True, nullable=False)
    computer_id = Column(String(128), index=True, nullable=False)
    agent_id = Column(String(128), index=True, nullable=True)

    # File Identity on Target Machine
    original_file_path = Column(String(512), index=True, nullable=False)
    file_name = Column(String(255), index=True, nullable=False)
    extension = Column(String(32), nullable=True)
    file_size = Column(BigInteger, default=0, nullable=False)
    
    # Hash Tracking
    current_sha256 = Column(String(64), index=True, nullable=False)
    baseline_sha256 = Column(String(64), nullable=True)
    is_hash_diverged = Column(Boolean, default=False)

    # Volume & System
    volume = Column(String(16), default="C:")
    filesystem = Column(String(32), default="NTFS")

    # Timestamps
    creation_time = Column(DateTime, nullable=True)
    modification_time = Column(DateTime, nullable=True)
    access_time = Column(DateTime, nullable=True)

    # PDF Specifics
    is_pdf = Column(Boolean, default=False)
    pdf_diff_available = Column(Boolean, default=False)
    pdf_comparison_summary = Column(Text, nullable=True)
    
    # Investigation & Collection Status
    status = Column(String(32), default="Selected")  # Selected, Investigating, Analyzed, Flagged
    notes = Column(Text, nullable=True)
    reference_storage_path = Column(String(512), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_inv_file_comp_path", "computer_id", "original_file_path"),
        Index("idx_inv_file_inv_sha", "investigation_id", "current_sha256"),
    )

    def to_dict(self):
        sz = self.file_size or 0
        sz_fmt = f"{sz} bytes" if sz < 1024 else (f"{sz / 1024:.1f} KB" if sz < 1024 * 1024 else f"{sz / (1024 * 1024):.2f} MB")
        return {
            "id": self.id,
            "investigation_id": self.investigation_id,
            "case_id": self.investigation_id,
            "computer_id": self.computer_id,
            "agent_id": self.agent_id,
            "original_file_path": self.original_file_path,
            "target_file_path": self.original_file_path,
            "file_name": self.file_name,
            "extension": self.extension,
            "file_size": self.file_size,
            "file_size_bytes": self.file_size,
            "file_size_formatted": sz_fmt,
            "file_exists": True,
            "exists_on_disk": True,
            "current_sha256": self.current_sha256,
            "baseline_sha256": self.baseline_sha256,
            "is_hash_diverged": self.is_hash_diverged,
            "volume": self.volume,
            "filesystem": self.filesystem,
            "creation_time": self.creation_time.isoformat() if self.creation_time else None,
            "modification_time": self.modification_time.isoformat() if self.modification_time else None,
            "access_time": self.access_time.isoformat() if self.access_time else None,
            "is_pdf": self.is_pdf,
            "pdf_diff_available": self.pdf_diff_available,
            "pdf_comparison_summary": self.pdf_comparison_summary,
            "status": self.status,
            "notes": self.notes,
            "reference_storage_path": self.reference_storage_path,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
