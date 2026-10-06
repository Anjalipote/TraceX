# TraceX Backend & Forensic Intelligence Engine

> **Tagline:** "From Digital Evidence to Investigation Story"  
> **Phase:** Phase 2 Full-Stack MVP

---

## Architecture Overview

```
Frontend (React + Vite + Tailwind + React Flow)
                      ↓ (REST API / JSON)
          FastAPI Forensic Core (Port 8000)
                      ↓
  ┌───────────────────┴───────────────────┐
  │           Forensic Services           │
  ├───────────────────────────────────────┤
  │ • Streaming SHA-256 / MD5 Hashing    │
  │ • Safe Metadata Extraction (Inert)    │
  │ • Chronological Timeline Engine       │
  │ • Forensic Correlation & MITRE ATT&CK │
  │ • Explainable Risk Scoring (0 - 100)  │
  │ • React Flow Relationship Graph       │
  │ • Investigation Story Dossier Gen     │
  └───────────────────┬───────────────────┘
                      ↓
          SQLAlchemy 2.0 ORM + Alembic
                      ↓
        PostgreSQL / SQLite Database
```

---

## Safety & Integrity Guarantees

- **Inert Evidence Analysis:** Uploaded binaries and scripts are **never** executed, spawned, or invoked by any shell or interpreter. All files are inspected strictly as read-only binary streams.
- **Cryptographic Chain of Custody:** SHA-256 hashes are calculated using 64 KB streaming buffers, preventing memory exhaustion and ensuring exact hash consistency with court-admissible standards.
- **Explainable Triage Scoring:** The investigation risk score (87/100) is deterministically explained through individual risk factors and is explicitly bounded to investigative triage priority, not legal guilt.

---

## Quickstart

### 1. Run the Backend Server
```powershell
.\backend\venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend
```
- API Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Healthcheck: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

### 2. Seed Forensic Investigation Data
```powershell
.\backend\venv\Scripts\python backend/seed.py
```
- Default Investigator: `investigator@tracex.demo`
- Default Vault Passphrase: `TraceX@123`
- Default Case: `CASE-2026-001` (Unauthorized Data Access Investigation)

### 3. Run Automated Tests
```powershell
.\backend\venv\Scripts\pytest backend/tests -v
```
All 10 tests verify authentication, case summaries, evidence ingestion, SHA-256 validation, chronological ordering, risk scoring (87), and graph generation.

---

## API Endpoints

| Category | Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | `POST` | `/api/auth/login` | Authenticate and obtain JWT access token |
| **Auth** | `GET` | `/api/auth/me` | Return active investigator profile |
| **Cases** | `GET` | `/api/cases` | List all investigation cases |
| **Cases** | `GET` | `/api/cases/{case_id}/summary` | Retrieve consolidated case triage summary |
| **Evidence** | `GET` | `/api/cases/{case_id}/evidence` | List all evidence items for a case |
| **Evidence** | `POST` | `/api/cases/{case_id}/evidence/upload` | Multipart upload with streaming SHA-256 & metadata extraction |
| **Integrity** | `POST` | `/api/evidence/{id}/verify` | Cryptographically verify on-disk hash against record |
| **Integrity** | `GET` | `/api/cases/{case_id}/integrity` | Summary metrics of evidence integrity rate |
| **Timeline** | `GET` | `/api/cases/{case_id}/timeline` | Chronological activity timeline with filter support |
| **Findings** | `GET` | `/api/cases/{case_id}/findings` | Automated correlation findings with MITRE mappings |
| **Risk** | `GET` | `/api/cases/{case_id}/risk` | Explainable Investigation Risk Score (87/100) & factors |
| **Graph** | `GET` | `/api/cases/{case_id}/relationships` | React Flow compatible graph nodes and edges |
| **Reports** | `GET` | `/api/cases/{case_id}/story` | Synthesized natural-language Investigation Story |
| **Reports** | `POST` | `/api/cases/{case_id}/reports` | Generate court-admissible evidence dossier |
| **Reports** | `GET` | `/api/reports/{id}/download` | Download standalone styled HTML dossier |
