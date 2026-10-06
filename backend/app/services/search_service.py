from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.timeline import TimelineEvent
from app.models.finding import Finding
from app.models.anomaly import Anomaly
from app.models.activity_cluster import ActivityCluster
from app.schemas.search import SearchResultItem, GlobalSearchResponse

class SearchService:
    @staticmethod
    def global_search(db: Session, case_id: str, query_str: str, category: Optional[str] = None) -> GlobalSearchResponse:
        case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        q = query_str.strip().lower()
        results: List[SearchResultItem] = []
        counts: Dict[str, int] = {
            "evidence": 0,
            "finding": 0,
            "timeline": 0,
            "anomaly": 0,
            "cluster": 0,
            "entity": 0
        }

        # 1. Search Evidence
        if not category or category == "evidence":
            ev_items = db.query(Evidence).filter(Evidence.case_id == case.id).all()
            for ev in ev_items:
                searchable_text = f"{ev.filename} {ev.category} {ev.notes or ''} {ev.sha256_hash} {ev.source_device or ''}".lower()
                if q in searchable_text:
                    counts["evidence"] += 1
                    results.append(SearchResultItem(
                        category="evidence",
                        id=ev.id,
                        title=ev.filename,
                        subtitle=f"{ev.file_type.upper()} • {round(ev.file_size / 1024, 1)} KB",
                        snippet=ev.notes or f"Forensic artifact from {ev.source_device}. SHA-256: {ev.sha256_hash[:16]}...",
                        severity="CRITICAL" if ev.analysis_status == "Flagged" else "LOW",
                        confidence="High",
                        metadata={"sha256": ev.sha256_hash, "integrity": ev.integrity_status}
                    ))

        # 2. Search Findings
        if not category or category == "finding":
            findings = db.query(Finding).filter(Finding.case_id == case.id).all()
            for f in findings:
                searchable = f"{f.title} {f.description} {f.reason} {f.mitre_technique or ''} {f.what_happened or ''} {f.why_suspicious or ''}".lower()
                if q in searchable:
                    counts["finding"] += 1
                    results.append(SearchResultItem(
                        category="finding",
                        id=f.id,
                        title=f.title,
                        subtitle=f"Risk: +{f.risk_contribution} pts • {f.category}",
                        snippet=f.description,
                        severity=f.severity.upper(),
                        confidence=f.confidence or "High",
                        metadata={"mitre": f.mitre_technique, "status": f.status}
                    ))

        # 3. Search Timeline Events
        if not category or category == "timeline":
            events = db.query(TimelineEvent).filter(TimelineEvent.case_id == case.id).all()
            for e in events:
                searchable = f"{e.description} {e.source} {e.actor or ''} {e.raw_log or ''} {e.event_type}".lower()
                if q in searchable:
                    counts["timeline"] += 1
                    results.append(SearchResultItem(
                        category="timeline",
                        id=e.id,
                        title=e.description,
                        subtitle=f"{e.event_type.upper()} • {e.source}",
                        snippet=e.raw_log or e.description,
                        severity=e.severity.upper(),
                        confidence="High",
                        timestamp=e.timestamp.strftime("%H:%M:%S UTC"),
                        metadata={"actor": e.actor, "is_suspicious": e.is_suspicious}
                    ))

        # 4. Search Anomalies
        if not category or category == "anomaly":
            anomalies = db.query(Anomaly).filter(Anomaly.case_id == case.id).all()
            for anom in anomalies:
                searchable = f"{anom.title} {anom.description} {anom.anomaly_type} {anom.explanation}".lower()
                if q in searchable:
                    counts["anomaly"] += 1
                    results.append(SearchResultItem(
                        category="anomaly",
                        id=anom.id,
                        title=anom.title,
                        subtitle=f"Anomaly: {anom.anomaly_type.replace('_', ' ').title()}",
                        snippet=anom.explanation,
                        severity=anom.severity.upper(),
                        confidence=anom.confidence,
                        metadata={"type": anom.anomaly_type}
                    ))

        # 5. Search Activity Clusters
        if not category or category == "cluster":
            clusters = db.query(ActivityCluster).filter(ActivityCluster.case_id == case.id).all()
            for cl in clusters:
                searchable = f"{cl.title} {cl.description} {cl.sequence_summary}".lower()
                if q in searchable:
                    counts["cluster"] += 1
                    results.append(SearchResultItem(
                        category="cluster",
                        id=cl.id,
                        title=cl.title,
                        subtitle=f"{cl.event_count} Events Clustered",
                        snippet=cl.sequence_summary,
                        severity=cl.severity.upper(),
                        confidence=cl.confidence,
                        metadata={"sequence": cl.sequence_summary}
                    ))

        return GlobalSearchResponse(
            query=query_str,
            case_id=case.id,
            total_results=len(results),
            results_by_category=counts,
            results=results
        )
