from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
import app.models  # Guarantees all model schemas are registered for table creation
from app.api import (
    auth, cases, evidence, timeline, findings, 
    risk, relationships, reports, pipeline, 
    clusters, anomalies, search, audit, 
    gaps, explainability, compare, users,
    investigations, agent
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure all tables and required columns are verified and migrated
    try:
        from app.core.migration import run_schema_migrations
        run_schema_migrations(engine)
    except Exception as e:
        import logging
        logging.getLogger("tracex.main").error(f"Lifespan schema migration error: {e}")
    yield

OPENAPI_TAGS = [
    {"name": "Authentication", "description": "Investigator authentication, JWT issuance, and session inspection."},
    {"name": "Cases", "description": "Case management, summaries, access permissions, and demo reseed operations."},
    {"name": "Evidence & Integrity", "description": "Inert evidence ingestion, SHA-256/MD5 hashing, and bit-for-bit verification."},
    {"name": "Timeline & Chronology", "description": "Reconstructed microsecond-precision UTC incident timelines."},
    {"name": "Findings & MITRE", "description": "Automated finding generation and MITRE ATT&CK tactic mappings."},
    {"name": "Risk & Triage", "description": "Multi-dimensional explainable investigation priority scoring."},
    {"name": "Activity Clusters", "description": "Heuristic event sequences and multi-step activity clustering."},
    {"name": "Anomalies", "description": "Temporal velocity threshold and anti-forensics anomaly detection."},
    {"name": "Forensic Explainability", "description": "Decision audit trails: Input Evidence → Applied Rule → Result → Confidence."},
    {"name": "Cross-Case Comparison", "description": "Side-by-side incident correlation and delta calculations."},
    {"name": "Telemetry Gaps", "description": "Detection of missing investigation data and recommended acquisition steps."},
    {"name": "Reports & Investigation Story", "description": "Structured forensic dossiers, SHA-256 seal verification, and CSV exports."},
    {"name": "Audit & Compliance", "description": "Immutable ledger of all investigator operations and system actions."},
    {"name": "User Administration", "description": "Role-Based Access Control management (Admin only)."}
]

app = FastAPI(
    title="TraceX - Digital Forensics & Evidence Analysis API",
    description="Enterprise DFIR backend API for automated evidence correlation, SHA-256 integrity validation, multi-dimensional risk scoring, and structured investigation story dossiers.",
    version="5.0.0",
    openapi_tags=OPENAPI_TAGS,
    lifespan=lifespan
)

# Global Security & Error Handling Middleware
@app.middleware("http")
async def security_and_error_middleware(request: Request, call_next):
    try:
        response = await call_next(request)
        # Security Hardening Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response
    except Exception as exc:
        # Prevent stack trace leakage in API responses
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Internal Forensic Engine Error",
                "message": "An unexpected error occurred while processing the investigation request.",
                "path": request.url.path
            }
        )

# CORS Middleware
cors_origins = settings.BACKEND_CORS_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if "*" not in cors_origins else ["*"],
    allow_credentials=True if "*" not in cors_origins else False,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:[0-9]+)?" if "*" not in cors_origins else None,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include All Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(compare.router, prefix=settings.API_V1_STR)
app.include_router(cases.router, prefix=settings.API_V1_STR)
app.include_router(evidence.router, prefix=settings.API_V1_STR)
app.include_router(timeline.router, prefix=settings.API_V1_STR)
app.include_router(findings.router, prefix=settings.API_V1_STR)
app.include_router(risk.router, prefix=settings.API_V1_STR)
app.include_router(relationships.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(pipeline.router, prefix=settings.API_V1_STR)
app.include_router(clusters.router, prefix=settings.API_V1_STR)
app.include_router(anomalies.router, prefix=settings.API_V1_STR)
app.include_router(search.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(gaps.router, prefix=settings.API_V1_STR)
app.include_router(explainability.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(investigations.router, prefix=settings.API_V1_STR)
app.include_router(agent.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "tagline": settings.TAGLINE,
        "version": settings.VERSION,
        "status": "operational",
        "docs_url": "/docs"
    }

from sqlalchemy import text

@app.get("/health", tags=["Health & Status"])
@app.get("/api/health", tags=["Health & Status"])
def health_check():
    db_status = "connected"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"disconnected: {str(e)}"
    
    is_healthy = db_status == "connected"
    return JSONResponse(
        status_code=status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "healthy" if is_healthy else "degraded",
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
            "database": db_status,
            "engine": engine.dialect.name
        }
    )
