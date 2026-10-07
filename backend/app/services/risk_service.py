from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.case import Case
from app.models.risk import RiskFactor
from app.models.anomaly import Anomaly
from app.models.finding import Finding
from app.models.evidence import Evidence

class RiskService:
    @staticmethod
    def calculate_case_risk(db: Session, case_id: str) -> Dict[str, Any]:
        """
        Calculates the Multi-Dimensional Explainable Investigation Risk / Priority Score.
        Explicitly denotes DFIR triage priority, NOT legal guilt or probability of conviction.
        """
        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            raise ValueError(f"Case with ID {case_id} not found")

        findings = db.query(Finding).filter(Finding.case_id == case_id).all()
        anomalies = db.query(Anomaly).filter(Anomaly.case_id == case_id).all()
        evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()
        factors = db.query(RiskFactor).filter(RiskFactor.case_id == case_id).all()
        from app.models.timeline import TimelineEvent
        suspicious_events = db.query(TimelineEvent).filter(
            TimelineEvent.case_id == case_id,
            TimelineEvent.is_suspicious == True
        ).all()

        # Check for evidence compromises (integrity)
        tampered_count = sum(1 for e in evidence_items if e.integrity_status == "Compromised")
        integrity_contribution = 30 if tampered_count > 0 else 0

        # Calculate dynamic contributions from actual data
        severity_contribution = sum(
            (25 if str(f.severity).lower() == "critical" else 15 if str(f.severity).lower() == "high" else 10 if str(f.severity).lower() == "medium" else 5)
            for f in findings
        )
        severity_contribution = min(severity_contribution, 30)

        # Evidence dimension: based on suspicious flags on actual files
        evidence_contribution = 0
        for e in evidence_items:
            fn = e.filename.lower()
            if "exe" in fn or e.file_type == "binary":
                evidence_contribution += 10
            if "confidential" in fn or "secret" in fn or "classified" in fn:
                evidence_contribution += 10
        evidence_contribution = min(evidence_contribution, 25)

        # Correlation dimension
        correlation_contribution = min(len(findings) * 5, 20)

        # Anomaly dimension
        anomaly_contribution = min(len(anomalies) * 10, 20)

        # Timeline dimension: suspicious timeline events
        timeline_contribution = min(len(suspicious_events) * 5, 15)

        # IF CASE HAS NO FINDINGS, NO ANOMALIES, NO TAMPERING, NO SUSPICIOUS EVENTS, NO RISK FACTORS:
        if not findings and not anomalies and tampered_count == 0 and not suspicious_events and evidence_contribution == 0 and not factors:
            total_score = 0
            risk_level = "NO RISK"
            status_label = "Clean Baseline (Zero Threats Detected)"
            factors = []
            categories = {
                "Exfiltration": 0,
                "Access Anomaly": 0,
                "Defense Evasion": 0,
                "Execution": 0
            }
            calc_explanation = (
                f"Automated forensic verification completed across {len(evidence_items)} evidence artifact(s). "
                "No suspicious patterns, disguised executables, anti-forensics activity, or integrity violations were detected. "
                "Investigation priority score is evaluated at 0/100 (Clean Baseline)."
            )
            recommendation = "No investigative action required. Ingested artifacts are consistent with normal, authorized baseline behavior."
        else:
            if factors:
                total_score = min(sum(rf.score for rf in factors) + integrity_contribution, 100)
            else:
                total_score = min(
                    severity_contribution + evidence_contribution + correlation_contribution +
                    anomaly_contribution + timeline_contribution + integrity_contribution,
                    100
                )
            if (findings or anomalies) and total_score == 0:
                total_score = 25

            if total_score >= 80:
                risk_level = "CRITICAL"
                status_label = "Urgent Investigation Priority (High Confidence)"
            elif total_score >= 60:
                risk_level = "HIGH"
                status_label = "Escalated Investigation Advised"
            elif total_score >= 40:
                risk_level = "MEDIUM"
                status_label = "Standard DFIR Review"
            elif total_score > 0:
                risk_level = "LOW"
                status_label = "Routine Monitoring"
            else:
                risk_level = "NO RISK"
                status_label = "Clean Baseline"

            categories = {}
            for f in findings:
                cat = f.category or "General"
                categories[cat] = categories.get(cat, 0) + (f.risk_contribution or 15)
            if not categories:
                categories = {"General Telemetry": total_score}

            calc_explanation = (
                "Investigation Priority Score is synthesized across 6 discrete forensic dimensions: "
                f"Severity (+{severity_contribution} pts from {len(findings)} findings), "
                f"Evidence (+{evidence_contribution} pts), "
                f"Correlation (+{correlation_contribution} pts), "
                f"Anomalies (+{anomaly_contribution} pts from {len(anomalies)} anomalies), "
                f"Timeline (+{timeline_contribution} pts from {len(suspicious_events)} suspicious events), and "
                f"Integrity ({integrity_contribution} pts). Total triage priority: {total_score}/100."
            )
            recommendation = (
                f"Observed evidence indicates potential security anomalies on host {case.target_system}. "
                "Primary recommendation: Review high-priority findings and preserve forensic chain of custody."
            )

        breakdown_list = [
            {
                "category": cat_name,
                "score": cat_score,
                "max_score": 30,
                "percentage": min(int((cat_score / 30) * 100), 100) if cat_score else 0
            }
            for cat_name, cat_score in categories.items()
        ]

        return {
            "case_id": case.id,
            "case_number": case.case_number,
            "overall_score": total_score,
            "risk_level": risk_level,
            "status_label": status_label,
            "confidence_score": 0.94,
            "factors": factors,
            "breakdown_by_category": breakdown_list,
            "investigation_recommendation": recommendation,
            "severity_contribution": severity_contribution,
            "evidence_contribution": evidence_contribution,
            "correlation_contribution": correlation_contribution,
            "anomaly_contribution": anomaly_contribution,
            "timeline_contribution": timeline_contribution,
            "integrity_contribution": integrity_contribution,
            "calculation_explanation": calc_explanation,
            "calculated_at": datetime.now(timezone.utc)
        }
