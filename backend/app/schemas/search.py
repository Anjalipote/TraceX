from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict

class SearchResultItem(BaseModel):
    category: str  # evidence, finding, timeline, anomaly, cluster, entity
    id: str
    title: str
    subtitle: Optional[str] = None
    snippet: str
    severity: Optional[str] = None
    confidence: Optional[str] = None
    timestamp: Optional[str] = None
    metadata: Dict[str, Any] = {}

class GlobalSearchResponse(BaseModel):
    query: str
    case_id: str
    total_results: int
    results_by_category: Dict[str, int]
    results: List[SearchResultItem]
