from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class RiskFactor(Base):
    __tablename__ = "risk_factors"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    score = Column(Integer, default=0, nullable=False)  # e.g., 20, 15, 12
    severity = Column(String(32), default="Medium", nullable=False)  # Critical, High, Medium, Low
    category = Column(String(64), default="Behavioral Anomaly")
    source = Column(String(128), default="Correlation Engine")
    mitre_technique = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    case = relationship("Case", back_populates="risk_factors")

    def __repr__(self):
        return f"<RiskFactor {self.name}: {self.score}pts>"
