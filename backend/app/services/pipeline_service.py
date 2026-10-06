from datetime import datetime, timezone
import json
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.case import Case
from app.models.analysis_job import AnalysisJob
from app.services.anomaly_service import AnomalyService
from app.services.clustering_service import ClusteringService
from app.services.finding_service import FindingService
from app.services.risk_service import RiskService
from app.services.relationship_service import RelationshipService
from app.services.report_service import ReportService

class PipelineService:
    @staticmethod
    def start_pipeline(db: Session, case_id: str) -> AnalysisJob:
        case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        # Create new analysis job record
        job = AnalysisJob(
            case_id=case.id,
            status="In Progress",
            current_step="Analyzing Evidence & Validating Hashes",
            progress_percent=15,
            started_at=datetime.now(timezone.utc)
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        # Execute Pipeline Steps
        try:
            # Step 1: Clustering
            job.current_step = "Clustering Activity Sequences"
            job.progress_percent = 40
            db.commit()
            clusters = ClusteringService.cluster_events(db, case.id)

            # Step 2: Anomaly Detection
            job.current_step = "Detecting Behavioral Anomalies"
            job.progress_percent = 60
            db.commit()
            anomalies = AnomalyService.detect_anomalies(db, case.id)

            # Step 3: Finding Correlation
            job.current_step = "Correlating Evidence & Generating Findings"
            job.progress_percent = 80
            db.commit()
            findings = FindingService.run_correlation(db, case.id)

            # Step 4: Multi-Dimensional Risk & Investigation Story
            job.current_step = "Synthesizing Investigation Story & Risk Score"
            job.progress_percent = 95
            db.commit()
            risk_summary = RiskService.calculate_case_risk(db, case.id)
            story = ReportService.generate_investigation_story(db, case.id)

            # Step 5: Completion
            job.current_step = "Completed"
            job.progress_percent = 100
            job.status = "Completed"
            job.completed_at = datetime.now(timezone.utc)
            job.result_summary = json.dumps({
                "clusters_count": len(clusters),
                "anomalies_count": len(anomalies),
                "findings_count": len(findings),
                "risk_score": risk_summary["overall_score"],
                "risk_level": risk_summary["risk_level"]
            })
            db.commit()
            db.refresh(job)

        except Exception as e:
            job.status = "Failed"
            job.current_step = "Error"
            job.error_message = str(e)
            job.completed_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(job)
            raise

        return job

    @staticmethod
    def get_latest_job(db: Session, case_id: str) -> Optional[AnalysisJob]:
        case = db.query(Case).filter((Case.id == case_id) | (Case.case_number == case_id)).first()
        if not case:
            return None
        return db.query(AnalysisJob).filter(AnalysisJob.case_id == case.id).order_by(AnalysisJob.started_at.desc()).first()
