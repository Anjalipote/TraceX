# TraceX

> **"From Digital Evidence to Investigation Story"**  
> *Enterprise Digital Forensics & Incident Response (DFIR) Intelligence Platform*

---

## 1. Overview
**TraceX** is a modern Digital Forensics and Evidence Analysis Platform designed for digital forensics investigators, cybersecurity analysts, and incident response teams. It ingests disparate, fragmented digital artifacts—such as file system records, USB connection registries, memory dumps, and operating system event logs—and transforms them into a structured, explainable, and court-admissible **Investigation Story**.

TraceX does not replace certified low-level forensic acquisition suites (such as EnCase, FTK, or Volatility); rather, it acts as an **intelligence and correlation layer** that connects evidence nodes, calculates deterministic priority scores, detects anomalous temporal sequences, identifies missing telemetry, and outputs verifiable forensic dossiers.

---

## 2. Problem
In modern digital forensic investigations, incident responders encounter massive volumes of fragmented data:
- **Disparate telemetry sources**: Windows Event Logs (`.evtx`), NTFS Master File Table (`$MFT`) journals, USB storage device logs (`setupapi.dev.log`), network captures (`.pcap`), and file binaries.
- **Cognitive overload**: Analysts must manually correlate timestamps across unsynchronized event logs and track complex exfiltration sequences.
- **Black-box risk tools**: Many commercial tools provide opaque risk scores that cannot withstand scrutiny in legal or disciplinary proceedings.
- **Inadmissible or unverified reporting**: Manual report assembly often risks chain-of-custody discrepancies or failure to record exact bit-for-bit cryptographic hashes.

---

## 3. Solution
TraceX resolves these operational bottlenecks through a deterministic 9-stage pipeline:

```
RAW DIGITAL EVIDENCE
        ↓
METADATA EXTRACTION & CRYPTOGRAPHIC HASHING (SHA-256 / MD5)
        ↓
TIMELINE RECONSTRUCTION & CHRONOLOGICAL NORMALIZATION
        ↓
ACTIVITY SEQUENCE CLUSTERING
        ↓
ANOMALY & ANTI-FORENSICS DETECTION
        ↓
EXPLAINABLE RISK & TRIAGE SCORING
        ↓
EVIDENCE RELATIONSHIP GRAPH (React Flow)
        ↓
INVESTIGATION STORY SYNTHESIS
        ↓
CRYPTOGRAPHICALLY SEALED DOSSIER REPORT
```

---

## 4. Key Features
- **Deterministic Evidence Correlation**: Automatically correlates multi-source host logs by actor, IP, timestamp window, and process lineage.
- **Interactive Evidence Relationship Graph**: Multi-entity topological graph (`User` $\leftrightarrow$ `Device` $\leftrightarrow$ `Process` $\leftrightarrow$ `File` $\leftrightarrow$ `Event`) powered by React Flow with high-contrast forensic styling.
- **Explainable Investigation Risk Score**: A 100-point multi-dimensional triage index computed from 6 discrete dimensions (Findings, Evidence, Correlation, Anomaly, Timeline, and Integrity).
- **Automated Investigation Story**: Reconstructs complex breach narratives in chronological plain English with verified evidentiary citations.
- **Forensic Explainability Center**: Dedicated audit trail for every finding: $\text{Input Evidence} \to \text{Applied Rule} \to \text{Detected Pattern} \to \text{Result} \to \text{Confidence}$.
- **Evidence Gap Detection**: Identifies missing investigative telemetry (e.g., missing network PCAP egress logs or unmounted volume identifiers) and recommends next acquisition steps.
- **Cross-Case Comparative Intelligence**: Side-by-side incident metric comparison with delta computation for cross-dossier pattern recognition.
- **Cryptographic Report Integrity Verification**: Every report is sealed with a canonical SHA-256 digest verifiable bit-for-bit with an interactive validation tool.
- **Immutable Forensic Audit Ledger**: Immutable system audit trail tracking all user authentications, case accesses, uploads, and pipeline runs.
- **Role-Based Access Control (RBAC)**: Server-side privilege enforcement across `ADMIN`, `INVESTIGATOR`, and `VIEWER` roles, complete with classified case access boundaries.

---

## 5. Architecture
TraceX implements a decoupled, defense-in-depth fullstack architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                       TRACE-X FRONTEND                      │
│     React 19 • TypeScript • Vite • Tailwind CSS • React Flow │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON / Form-Data
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     FASTAPI BACKEND API                     │
│  OAuth2 JWT • RBAC Middleware • Path Sanitation • Headers   │
├─────────────────────────────────────────────────────────────┤
│                     SERVICE & ENGINE LAYER                  │
│ • HashService (SHA-256/MD5)     • TimelineService           │
│ • MetadataService (Read-Only)    • CorrelationEngine        │
│ • AnomalyService (Velocity)     • RiskScoringEngine         │
│ • ExplainabilityService          • GapService                │
│ • ComparisonService              • ReportService (Dossier)  │
│ • AuditService (Immutable Log)   • UserService (RBAC)       │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQLAlchemy 2.0 ORM
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE & STORAGE LAYER                 │
│  PostgreSQL (Enterprise) / SQLite (Local Test)              │
│  Inert Read-Only Evidence Vault (/uploads/)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 8.3
- **Styling**: Tailwind CSS (Forensic Dark Theme: `#070A0F`, `#0D131C`, `#1E293B`)
- **Graph Engine**: `@xyflow/react` (React Flow v12)
- **Data Visualizations**: Recharts
- **Iconography**: Lucide React
- **Typography**: Inter (Body) + JetBrains Mono (Code / Timestamps / Hashes)

### Backend
- **Framework**: Python 3.11+ / FastAPI
- **Validation**: Pydantic v2
- **ORM & Database**: SQLAlchemy 2.0 + Alembic (PostgreSQL & SQLite)
- **Authentication**: PyJWT + Passlib (Argon2 / BCrypt)
- **Server**: Uvicorn ASGI
- **Testing**: Pytest + HTTPX

---

## 7. Project Structure

```
traceX/
├── docker-compose.yml              # One-command production orchestration
├── Dockerfile                      # Container specification
├── package.json                    # Frontend dependencies
├── vite.config.ts                  # Vite build configuration
├── tailwind.config.js              # Theme design tokens
├── tsconfig.json                   # TypeScript configuration
├── .env.example                    # Fullstack environment template
│
├── backend/                        # FastAPI Backend Root
│   ├── Dockerfile                  # Backend production container
│   ├── requirements.txt            # Python dependencies
│   ├── seed.py                     # Deterministic demo data seeder & reset utility
│   ├── .env.example                # Backend environment variables
│   │
│   ├── app/
│   │   ├── main.py                 # FastAPI application & security middleware
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic BaseSettings & CORS configuration
│   │   │   ├── database.py         # SQLAlchemy engine & session factory
│   │   │   └── security.py         # Password hashing & JWT token handling
│   │   ├── models/                 # SQLAlchemy ORM database models
│   │   │   ├── user.py             # User accounts & RBAC roles
│   │   │   ├── case.py             # Investigation cases & permissions
│   │   │   ├── evidence.py         # Evidence items & SHA-256 hashes
│   │   │   ├── timeline.py         # Timeline events & timestamps
│   │   │   ├── finding.py          # Suspicious findings & MITRE tactics
│   │   │   ├── risk.py             # Multi-dimensional risk factors
│   │   │   ├── relationship.py     # Graph edges & connection strength
│   │   │   ├── report.py           # Dossiers & SHA-256 report stamps
│   │   │   ├── anomaly.py          # Anomaly detections & velocity scores
│   │   │   ├── activity_cluster.py # Correlated activity sequences
│   │   │   ├── evidence_gap.py     # Missing telemetry & acquisition steps
│   │   │   └── audit_log.py        # Immutable audit action records
│   │   ├── api/                    # REST API routers
│   │   │   ├── deps.py             # Authentication & RBAC dependencies
│   │   │   ├── auth.py             # /api/auth (Login, Register, Me)
│   │   │   ├── cases.py            # /api/cases (CRUD, summary, demo reset)
│   │   │   ├── evidence.py         # /api/cases/{id}/evidence (Upload, verify)
│   │   │   ├── timeline.py         # /api/cases/{id}/timeline
│   │   │   ├── findings.py         # /api/cases/{id}/findings
│   │   │   ├── risk.py             # /api/cases/{id}/risk
│   │   │   ├── relationships.py    # /api/cases/{id}/graph
│   │   │   ├── reports.py          # /api/reports (Generate, verify, CSV)
│   │   │   ├── pipeline.py         # /api/cases/{id}/analysis/start
│   │   │   ├── clusters.py         # /api/cases/{id}/clusters
│   │   │   ├── anomalies.py        # /api/cases/{id}/anomalies
│   │   │   ├── search.py           # /api/cases/{id}/search
│   │   │   ├── audit.py            # /api/audit (Case & system logs)
│   │   │   ├── gaps.py             # /api/cases/{id}/gaps
│   │   │   ├── explainability.py   # /api/cases/{id}/explainability
│   │   │   ├── compare.py          # /api/cases/compare
│   │   │   └── users.py            # /api/users (Admin RBAC management)
│   │   └── services/               # Core forensic logic services
│   │       ├── hash_service.py     # SHA-256 and MD5 cryptographic hashing
│   │       ├── metadata_service.py # Inert read-only magic-byte extraction
│   │       ├── timeline_service.py # Chronological normalization
│   │       ├── correlation_engine.py # Heuristic pattern clustering
│   │       ├── risk_engine.py      # Multi-dimensional risk computation
│   │       ├── gap_service.py      # Missing telemetry detector
│   │       ├── report_service.py   # Dossier builder & CSV generator
│   │       ├── explainability_service.py # Decision trace auditor
│   │       ├── comparison_service.py # Cross-case delta calculator
│   │       └── audit_service.py    # Immutable audit ledger
│   └── tests/                      # Automated test suite (39 tests)
│       ├── test_api.py             # Phase 1 & 2 integration tests
│       ├── test_phase3.py          # Phase 3 advanced correlation tests
│       ├── test_phase4.py          # Phase 4 RBAC & security tests
│       └── test_phase5.py          # Phase 5 end-to-end & safety tests
│
└── src/                            # React Frontend Source
    ├── App.tsx                     # Route provider & protected routes
    ├── main.tsx                    # React DOM initialization
    ├── context/                    # AppContext global state & actions
    ├── types/                      # TypeScript forensic data interfaces
    ├── services/api.ts             # Strongly-typed API client
    ├── components/                 # UI components
    │   ├── common/                 # Metric cards, badges, modal, toast
    │   ├── layout/                 # Sidebar & Topbar
    │   ├── dashboard/              # Story, Activity, Gaps, ActivityFeed
    │   ├── evidence/               # Evidence table, upload zone, drawer
    │   ├── timeline/               # Interactive chronological timeline
    │   ├── graph/                  # React Flow forensic node graph
    │   ├── findings/               # Finding cards & why-suspicious drawer
    │   ├── risk/                   # Risk breakdown & trend evolution
    │   ├── integrity/              # Hash verification & tamper simulator
    │   └── reports/                # Report preview, verify modal, print
    └── pages/                      # Page views
        ├── LoginPage.tsx           # Authentication view
        ├── DashboardPage.tsx       # Core investigation dashboard
        ├── CasesPage.tsx           # Case vault manager
        ├── EvidencePage.tsx        # Evidence vault & upload
        ├── TimelinePage.tsx        # Event sequence explorer
        ├── GraphPage.tsx           # Topological evidence graph
        ├── FindingsPage.tsx        # Suspicious findings registry
        ├── RiskPage.tsx            # Explainable risk & trend analysis
        ├── ExplainabilityPage.tsx  # Forensic explainability center
        ├── CaseComparePage.tsx     # Cross-case comparative intelligence
        ├── IntegrityPage.tsx       # Cryptographic hash verification
        ├── ReportsPage.tsx         # Dossier generation & export
        ├── AuditPage.tsx           # Immutable audit trail
        └── SettingsPage.tsx        # RBAC simulation & demo reset
```

---

## 8. Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher
- **Git** (optional)
- **Docker** (optional for containerized deployment)

---

## 9. Environment Variables

### Backend Configuration (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:

```env
PROJECT_NAME="TraceX Forensic Platform"
TAGLINE="From Digital Evidence to Investigation Story"
VERSION="5.0.0"

# Local SQLite (default) or PostgreSQL:
DATABASE_URL=sqlite:///./tracex.db
# DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/tracex_db

JWT_SECRET=your-cryptographically-secure-random-secret-key-32-chars
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALGORITHM=HS256

UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=52428800

BACKEND_CORS_ORIGINS=["http://localhost:5173","http://localhost:5174","http://localhost:5175","http://localhost:5176","http://localhost:8000"]
```

---

## 10. Database Setup

### Option A: Local SQLite (Instant Out-of-the-Box Setup)
No database installation needed. Run the seeding script to create and populate `tracex.db`:

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # On Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
python seed.py
```

### Option B: Production PostgreSQL
1. Create a PostgreSQL database:
   ```sql
   CREATE DATABASE tracex_db;
   ```
2. Update `DATABASE_URL` in `backend/.env`:
   ```env
   DATABASE_URL=postgresql+psycopg2://postgres:your_password@localhost:5432/tracex_db
   ```
3. Run migrations and seed data:
   ```bash
   python seed.py
   ```

---

## 11. Running Locally

### Step 1: Start Backend (Port 8000)
```bash
cd backend
.\venv\Scripts\activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API will be live at `http://127.0.0.1:8000`  
Interactive Swagger Documentation: `http://127.0.0.1:8000/docs`

### Step 2: Start Frontend (Port 5173 or available port)
In a separate terminal:
```bash
cd traceX
npm install
npm run dev
```
Open your browser at `http://localhost:5173` (or the port indicated in terminal).

---

## 12. API Overview

| Method | Endpoint | Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticates credentials and returns JWT bearer token |
| `GET` | `/api/cases` | All | Retrieves list of all investigation cases |
| `POST` | `/api/cases` | Admin / Inv | Creates a new investigation case |
| `GET` | `/api/cases/{id}/summary` | All | Returns case KPI metrics, risk rating, and status |
| `GET` | `/api/cases/{id}/evidence` | All | Ingested evidence inventory with SHA-256 digests |
| `POST` | `/api/cases/{id}/evidence/upload` | Admin / Inv | Uploads evidence into vault; extracts metadata |
| `GET` | `/api/cases/{id}/timeline` | All | Reconstructed chronological event sequence |
| `POST` | `/api/cases/{id}/analysis/start` | Admin / Inv | Triggers automated forensic correlation pipeline |
| `GET` | `/api/cases/{id}/findings` | All | Correlated suspicious findings with MITRE mappings |
| `GET` | `/api/cases/{id}/risk` | All | Multi-dimensional risk score and factor breakdown |
| `GET` | `/api/cases/{id}/explainability` | All | Decision audit trails with applied rules and confidence |
| `GET` | `/api/cases/{id}/gaps` | All | Missing telemetry indicators and acquisition leads |
| `GET` | `/api/cases/compare` | All | Cross-case comparative analysis with delta metrics |
| `GET` | `/api/cases/{id}/reports` | All | Generated dossier report registry |
| `POST` | `/api/cases/{id}/reports` | Admin / Inv | Generates structured court-admissible dossier |
| `GET` | `/api/reports/{id}/verify` | All | Cryptographic bit-for-bit SHA-256 hash validation |
| `GET` | `/api/cases/{id}/reports/export/csv` | All | Exports complete evidence and timeline data as CSV |
| `GET` | `/api/audit` | All | Paginated immutable forensic audit log |
| `POST` | `/api/cases/{id}/reset-demo` | Admin | Safely resets demo case to canonical baseline state |
| `GET` | `/api/users` | Admin | Team member account and RBAC management list |

---

## 13. Authentication & RBAC

TraceX implements server-side Role-Based Access Control:
- **`ADMIN`**: Complete administrative oversight. Can manage users, create cases, upload evidence, execute correlation pipelines, access classified vaults (`CASE-RESTRICTED-099`), and trigger demo reseeding.
- **`INVESTIGATOR`**: Forensic operations access. Can upload evidence, view cases, trigger pipeline execution, inspect graphs, and generate reports. Blocked from user administration and classified cases.
- **`VIEWER`**: Read-only oversight. Can inspect public cases, review timelines, view findings, and audit evidence. Blocked from uploading evidence, running pipelines, creating cases, or managing users.

### Demo User Accounts
| Email | Password | Role | Description |
| :--- | :--- | :--- | :--- |
| `investigator@tracex.demo` | `TraceX@123` | **ADMIN** | Lead Specialist Alex Vance (Full Access) |
| `marcus.thorne@tracex.demo` | `TraceX@123` | **INVESTIGATOR** | Forensic Analyst Marcus Thorne |
| `sarah.chen@tracex.demo` | `TraceX@123` | **VIEWER** | Independent Compliance Auditor |

*(A 1-click **Auto-fill Demo** button is available on the login screen).*

---

## 14. Evidence Safety & Ingestion
TraceX strictly enforces forensic defensibility:
- **Read-Only / Inert Stream**: Files are treated as inert data streams. Executables (`.exe`), scripts (`.bat`, `.ps1`), and unknown binaries are **never executed or spawned**.
- **Path Traversal Guard**: Filenames containing `..`, null bytes (`\x00`), absolute paths, or invalid characters are blocked with `400 Bad Request`.
- **Upload File Limit**: Server-side cap of 50 MB prevents denial-of-service attempts.
- **Dual Cryptographic Hashes**: Both **SHA-256** and **MD5** digests are computed upon ingest to ensure bit-for-bit integrity.
- **Duplicate & Zero-Byte Safety**: Identical uploads are tagged as duplicates matching existing records; zero-byte files are cataloged as inert placeholders.

---

## 15. Investigation Pipeline
The automated correlation pipeline (`POST /api/cases/{id}/analysis/start`) executes sequentially:
1. **Metadata Extraction**: Safe extraction of timestamps, MIME types, file sizes, and magic byte headers.
2. **Timeline Normalization**: Normalization of events into microsecond-precision UTC chronological order.
3. **Temporal Velocity Checking**: Detects abnormally compressed time intervals (e.g., 128s between device mount and classified read).
4. **Pattern & Sequence Clustering**: Links multi-phase activities into unified sequences.
5. **Finding Synthesis**: Maps observed anomalies to MITRE ATT&CK techniques.
6. **Risk Factor Aggregation**: Calculates multi-dimensional priority scores.
7. **Graph Generation**: Links related actors, processes, devices, and files into directed graph nodes.

---

## 16. Risk Scoring & Multi-Dimensional Algorithm
The **Investigation Priority Score** is an algorithmic triage ranking, **not a probability of guilt**:

$$\text{Score} = \min\left(100, \sum_{i=1}^{6} \text{Dimension}_i\right)$$

| Dimension | Points Range | Description |
| :--- | :--- | :--- |
| **Severity Dimension** | $0 - 30$ | Weighted sum of critical and high-severity findings |
| **Evidence Dimension** | $0 - 25$ | Presence of classified documents and unsigned PE binaries |
| **Correlation Dimension** | $0 - 25$ | Multi-step sequences spanning hardware, filesystem, and processes |
| **Anomaly Dimension** | $0 - 20$ | Velocity thresholds and anti-forensics burst deletions |
| **Timeline Dimension** | $0 - 15$ | Clustered execution windows and temporal density |
| **Integrity Dimension** | $0 - 15$ | Penalties applied if cryptographic hash mismatches are detected |

---

## 17. Professional Reporting & Hash Verification
TraceX produces structured, court-admissible forensic dossiers formatted with print-ready CSS:
- **Distinct Fact vs. Inference Sections**: Observed telemetry records are strictly separated from heuristic correlation hypotheses.
- **Cryptographic Hash Stamp**: The generated dossier is fingerprinted with a canonical SHA-256 hash.
- **Interactive Verification**: Users can click **"Verify Hash"** to ensure that reports have not been altered after creation.
- **CSV Data Export**: Instant download of all evidence metadata and timeline records for spreadsheet analysis.

---

## 18. Security Hardening
- **Security Headers Middleware**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security: max-age=31536000`
- **Error Masking**: Stack traces are intercepted in production to prevent leaking system architecture.
- **Compartmented Access**: Restricted investigations return `403 Forbidden` for non-admin accounts.
- **Safe Environment Defaults**: Passwords and secrets are managed via environment variables.

---

## 19. Testing

TraceX features a test suite of **39 automated tests** covering Phases 1 through 5:

```bash
# Run backend pytest suite
cd backend
.\venv\Scripts\activate
pytest -v
```

### Test Suite Coverage
- `test_api.py` (10 tests): Health check, authentication, cases, evidence, timeline, risk, story, graph, evidence safety.
- `test_phase3.py` (9 tests): Anomalies, activity clusters, explainable findings, multi-dimensional risk, graph topology, search.
- `test_phase4.py` (12 tests): RBAC administration, viewer restrictions, case access control, audit logs, evidence gaps, explainability center, cross-case comparison, report hashing, path traversal, security headers.
- `test_phase5.py` (8 tests): Full pipeline trigger, zero-byte file safety, duplicate detection, demo reseed, viewer reseed guard, non-demo case protection, forensic language integrity, OpenAPI schema completeness.

---

## 20. Demo Workflow (Hackathon Presentation Guide)

Follow this 5-minute presentation script to demonstrate TraceX:

1. **Login & Role Badge (`/login`)**:
   - Click "Auto-fill Demo" and sign in as `investigator@tracex.demo` (ADMIN).
   - Point out the active role badge in the sidebar footer.
2. **Investigation Dashboard (`/dashboard`)**:
   - Highlight the 5 metric cards: 128 Evidence Items, 286 Events, 12 Findings, Risk Score 87/100 (Critical), Integrity 128/128 Verified.
   - Show the **Investigation Story**: USB inserted $\to$ confidential.pdf accessed $\to$ file copied $\to$ suspicious.exe launched $\to$ files deleted.
   - Show the **Evidence Gaps Widget** highlighting missing perimeter PCAP data.
   - Show the **Case Activity Feed** reflecting real-time audit operations.
3. **Evidence Vault & Safe Ingest (`/evidence`)**:
   - Show evidence files with SHA-256 hashes.
   - Demonstrate that executables are inert forensic data streams.
4. **Timeline & Velocity Anomaly (`/timeline`)**:
   - Inspect the 128-second temporal anomaly between USB insertion and file read.
5. **Evidence Relationship Graph (`/graph`)**:
   - Explore directed relationships linking the workstation, USB drive, PDF, and binary.
6. **Forensic Explainability Center (`/explainability`)**:
   - Demonstrate the decision audit chain: $\text{Input Evidence} \to \text{Applied Rule} \to \text{Detected Pattern} \to \text{Result} \to \text{Confidence}$.
7. **Risk Trend Analysis (`/risk`)**:
   - Show score evolution: Baseline (45) $\to$ Current (87) with $+42$ net delta.
   - Read the explainable algorithmic cause for the priority escalation.
8. **Cross-Case Intelligence (`/compare`)**:
   - Compare `CASE-2026-001` against `CASE-2026-002` to see automated metric deltas and comparative insights.
9. **Tamper Detection & Admissibility (`/integrity`)**:
   - Click "Simulate Hash Mismatch" to tamper with `confidential.pdf`. Notice the alert triggers.
   - Click "Restore Integrity" to re-verify all 128 cryptographic hashes.
10. **Dossier Generation & Cryptographic Verification (`/reports`)**:
    - Click **"Verify Hash"** to validate the report's SHA-256 seal.
    - Click **"Export CSV"** to demonstrate external data export.
11. **Immutable Audit Ledger (`/audit`)**:
    - Show the audit trail capturing all user actions, IP addresses, and timestamps.
12. **Settings & Role Switcher (`/settings`)**:
    - Switch the active role to `VIEWER` to demonstrate RBAC restriction.
    - Click **"Reseed Demo Vault"** to show instant environment reset for the next presentation.

---

## 21. Limitations
- **Investigation Support Tool**: TraceX is an intelligence and correlation platform; it does not replace certified judicial evidence acquisition hardware (e.g., write-blockers).
- **No Automatic Attribution**: TraceX identifies anomalous activity sequences and risk factors; it does not make judicial assertions of legal guilt or criminal intent.
- **Inert Processing Scope**: Uploaded artifacts are analyzed via implemented static and heuristic parsers. Kernel-level memory dumping or live emulation requires external sandboxes.
- **Investigator Review Required**: All findings, inferences, and evidence gaps require human forensic analyst validation.

---

## 22. Future Scope
- Integration with live SIEM/EDR streaming APIs (Splunk, Sentinel, CrowdStrike Falcon).
- MITRE D3FEND countermeasure recommendation engine.
- Distributed blockchain ledger integration for multi-agency evidence chain of custody.
- Advanced memory volatility plugin integration for live triage dumps.

---

## License & Disclaimer
TraceX is provided for authorized digital forensic analysis, incident response, and cybersecurity education. Only analyze digital evidence authorized by proper legal or corporate mandate.
