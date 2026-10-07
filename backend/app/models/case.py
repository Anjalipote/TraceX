from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class Case(Base):
    __tablename__ = "cases"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_number = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(32), default="Active", nullable=False)
    priority = Column(String(32), default="High", nullable=False)
    incident_type = Column(String(64), default="Data Exfiltration", nullable=False)
    target_system = Column(String(128), default="FINANCE-SRV-04", nullable=False)
    investigator_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Real Forensic Investigation Fields
    is_real_investigation = Column(Boolean, default=False, nullable=True)
    collection_type = Column(String(32), default="demo", nullable=True)  # "real" or "demo"
    computer_id = Column(String(128), nullable=True)
    target_file_path = Column(String(512), nullable=True)
    authorization_status = Column(String(32), default="Pending", nullable=True)  # Pending, Authorized, Revoked

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    investigator = relationship("User", backref="cases")
    evidence_items = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    timeline_events = relationship("TimelineEvent", back_populates="case", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="case", cascade="all, delete-orphan")
    risk_factors = relationship("RiskFactor", back_populates="case", cascade="all, delete-orphan")
    relationships = relationship("EvidenceRelationship", back_populates="case", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="case", cascade="all, delete-orphan")
    analysis_jobs = relationship("AnalysisJob", back_populates="case", cascade="all, delete-orphan")
    activity_clusters = relationship("ActivityCluster", back_populates="case", cascade="all, delete-orphan")
    anomalies = relationship("Anomaly", back_populates="case", cascade="all, delete-orphan")
    evidence_gaps = relationship("EvidenceGap", back_populates="case", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Case {self.case_number}: {self.name}>"
