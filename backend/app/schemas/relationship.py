from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict

class EvidenceRelationshipBase(BaseModel):
    source_id: Optional[str] = None
    target_id: Optional[str] = None
    source_type: str = "Evidence"
    target_type: str = "Evidence"
    source_evidence_id: Optional[str] = None
    target_evidence_id: Optional[str] = None
    relationship_type: str = "RELATED_TO"
    label: str = "Related To"
    explanation: Optional[str] = None
    confidence: float = 1.0

class EvidenceRelationshipCreate(EvidenceRelationshipBase):
    case_id: str

class EvidenceRelationshipResponse(EvidenceRelationshipBase):
    id: str
    case_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# React Flow Compatibility Schemas
class GraphNodePosition(BaseModel):
    x: float
    y: float

class GraphNode(BaseModel):
    id: str
    type: Optional[str] = "custom"
    position: GraphNodePosition
    data: Dict[str, Any]

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None
    relationship_type: Optional[str] = "RELATED_TO"
    explanation: Optional[str] = None
    confidence: Optional[float] = 1.0
    animated: Optional[bool] = False
    style: Optional[Dict[str, Any]] = None

class GraphDataResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    total_nodes: int
    total_edges: int
