import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.security import create_access_token

client = TestClient(app)
token = create_access_token(subject="user-alex-vance", role="ADMIN")
client.headers["Authorization"] = f"Bearer {token}"

def test_anomalies_endpoint():
    res = client.get("/api/cases/CASE-2026-001/anomalies")
    assert res.status_code == 200
    anomalies = res.json()
    assert len(anomalies) >= 3
    
    types = [a["anomaly_type"] for a in anomalies]
    assert "temporal_proximity" in types
    assert "unusual_sequence" in types
    assert "anti_forensics" in types

    # Check explainability
    for a in anomalies:
        assert len(a["explanation"]) > 20
        assert a["confidence"] in ["High", "Medium", "Low"]
        assert a["confidence_reason"] is not None

def test_activity_clusters_endpoint():
    res = client.get("/api/cases/CASE-2026-001/clusters")
    assert res.status_code == 200
    clusters = res.json()
    assert len(clusters) >= 1

    primary = next(c for c in clusters if "Exfiltration" in c["title"])
    assert primary["event_count"] >= 4
    assert "USB Connected" in primary["sequence_summary"]
    assert "Sensitive File Accessed" in primary["sequence_summary"]
    assert "File Copied" in primary["sequence_summary"]

def test_explainable_findings_detail():
    res = client.get("/api/cases/CASE-2026-001/findings")
    assert res.status_code == 200
    findings = res.json()
    assert len(findings) >= 5

    for f in findings:
        assert f["confidence"] in ["High", "Medium", "Low"]
        assert f["confidence_reason"] is not None
        assert f["what_happened"] is not None
        assert f["why_detected"] is not None
        assert f["why_suspicious"] is not None
        assert f["recommended_next_step"] is not None

def test_multidimensional_risk():
    res = client.get("/api/cases/CASE-2026-001/risk")
    assert res.status_code == 200
    data = res.json()
    assert data["overall_score"] == 87
    assert data["risk_level"] == "CRITICAL"
    assert data["severity_contribution"] > 0
    assert data["evidence_contribution"] > 0
    assert data["correlation_contribution"] > 0
    assert data["anomaly_contribution"] > 0
    assert data["timeline_contribution"] > 0
    assert "dimensions" in data["calculation_explanation"].lower() or "synthesized" in data["calculation_explanation"].lower()

def test_multi_entity_graph():
    res = client.get("/api/cases/CASE-2026-001/relationships")
    assert res.status_code == 200
    graph = res.json()
    
    # Check node entity types
    entity_types = {n["data"].get("entity_type") for n in graph["nodes"] if "entity_type" in n["data"]}
    assert "Evidence" in entity_types
    assert "User" in entity_types
    assert "Device" in entity_types
    assert "Finding" in entity_types

    # Check edge explanations
    for edge in graph["edges"]:
        assert "explanation" in edge
        assert edge["explanation"] is not None
        assert edge["relationship_type"] in ["RELATED_TO", "ACCESSED", "CREATED", "DERIVED_FROM", "CAUSED_BY", "MODIFIED", "ASSOCIATED_WITH"]

def test_investigation_story_chronology():
    res = client.get("/api/cases/CASE-2026-001/story")
    assert res.status_code == 200
    story = res.json()
    
    seq = story["chronological_sequence"]
    assert len(seq) == 5
    assert "09:45" in seq[0]
    assert "09:47" in seq[1]
    assert "09:48" in seq[2]
    assert "09:50" in seq[3]
    assert "09:55" in seq[4]

    assert len(story["why_sequence_matters"]) > 20
    assert len(story["supporting_evidence_details"]) >= 4
    assert len(story["further_investigation_required"]) >= 3

def test_analysis_pipeline_api():
    # Trigger pipeline run
    res = client.post("/api/cases/CASE-2026-001/analysis/start")
    assert res.status_code == 202
    job = res.json()
    assert job["status"] == "Completed"
    assert job["progress_percent"] == 100

    # Check status
    res_status = client.get("/api/cases/CASE-2026-001/analysis/status")
    assert res_status.status_code == 200
    assert res_status.json()["status"] == "Completed"

def test_global_search_api():
    res = client.get("/api/cases/CASE-2026-001/search?q=usb")
    assert res.status_code == 200
    data = res.json()
    assert data["total_results"] > 0
    assert "results_by_category" in data
    assert any("usb" in r["title"].lower() or "usb" in r["snippet"].lower() for r in data["results"])

def test_global_search_category_filter():
    res = client.get("/api/cases/CASE-2026-001/search?q=confidential&category=evidence")
    assert res.status_code == 200
    data = res.json()
    assert all(r["category"] == "evidence" for r in data["results"])
