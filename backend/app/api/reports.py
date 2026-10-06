import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import FileResponse, PlainTextResponse
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_role, require_case_access
from app.models.user import User
from app.models.case import Case
from app.models.report import Report
from app.schemas.report import ReportCreate, ReportResponse, ReportVerifyResponse, InvestigationStorySummary
from app.services.report_service import ReportService
from app.services.audit_service import AuditService

router = APIRouter(tags=["Reports & Investigation Story"])

@router.get("/cases/{case_id}/reports", response_model=List[ReportResponse])
def get_case_reports(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = require_case_access(case_id, db, current_user)
    return db.query(Report).filter(Report.case_id == case.id).order_by(Report.generated_at.desc()).all()

@router.post("/cases/{case_id}/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def generate_report(
    case_id: str,
    report_in: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["ADMIN", "INVESTIGATOR"]))
):
    case = require_case_access(case_id, db, current_user)
    return ReportService.generate_report_file(
        db=db,
        case_id=case.id,
        report_type=report_in.report_type,
        current_user=current_user
    )

@router.get("/cases/{case_id}/story", response_model=InvestigationStorySummary)
def get_investigation_story(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = require_case_access(case_id, db, current_user)
    return ReportService.generate_investigation_story(db, case.id)

@router.get("/reports/{report_id}/verify", response_model=ReportVerifyResponse)
def verify_report(
    report_id: str,
    claimed_hash: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = ReportService.verify_report_integrity(db, report_id, claimed_hash)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    # Audit Log
    AuditService.log_action(
        db=db,
        action="REPORT_VERIFY",
        user_email=current_user.email,
        user_role=current_user.role,
        object_type="Report",
        object_id=report_id,
        result="SUCCESS" if result["is_valid"] else "FAILED",
        metadata={"claimed_hash": claimed_hash, "computed_hash": result["computed_hash"]}
    )

    return result

@router.get("/reports/{report_id}/download")
def download_report_file(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if not report.file_path or not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found on disk")

    # Audit Log
    AuditService.log_action(
        db=db,
        action="REPORT_EXPORT_PDF",
        user_email=current_user.email,
        user_role=current_user.role,
        case_id=report.case_id,
        object_type="Report",
        object_id=report.id
    )

    return FileResponse(
        path=report.file_path,
        filename=os.path.basename(report.file_path),
        media_type="text/html"
    )

@router.get("/cases/{case_id}/reports/export/csv")
def export_case_csv(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = require_case_access(case_id, db, current_user)
    csv_data = ReportService.export_csv(db, case.id)

    # Audit Log
    AuditService.log_action(
        db=db,
        action="REPORT_EXPORT_CSV",
        user_email=current_user.email,
        user_role=current_user.role,
        case_id=case.id,
        object_type="Case",
        object_id=case.id
    )

    return PlainTextResponse(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=TraceX_Export_{case.case_number}.csv"}
    )
