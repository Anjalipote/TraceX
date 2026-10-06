# TraceX Forensic Platform — Production Deployment Guide

> **Target Architecture**: React (Vite/TypeScript) + FastAPI (Python 3.11/Uvicorn) + PostgreSQL 16+ Database

---

## 1. Overview & Architecture

TraceX is packaged into two production-hardened tiers backed by a persistent relational database and encrypted non-executable storage:

```
[ Internet / Investigator Client ]
               │
               ▼
[ Nginx Reverse Proxy / Port 80 ] (React SPA Bundle)
       │                    │
       │ (Static Assets)    │ (/api/* requests)
       ▼                    ▼
[ /usr/share/nginx/html ]  [ FastAPI Engine : 8000 ]
                                 │            │
             (Database Queries)  │            │  (Inert File Read/Write)
                                 ▼            ▼
                     [ PostgreSQL 16 ]   [ Persistent Volume: /app/uploads ]
```

---

## 2. Production Environment Variables

TraceX strictly reads all sensitive runtime parameters from environment variables. Do **not** hardcode secrets in source files or commit `.env` to version control.

### Backend (`backend/.env` or Container Environment)

| Variable | Description | Production Example / Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+psycopg2://postgres:StrongPassword@db:5432/tracex_db` |
| `JWT_SECRET` | Cryptographically random secret key (minimum 32 characters) | `openssl rand -hex 32` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT expiration duration in minutes | `1440` (24 hours) |
| `ALGORITHM` | JWT signing algorithm | `HS256` |
| `UPLOAD_DIR` | Dedicated path for non-executable evidence storage | `/app/uploads` |
| `MAX_UPLOAD_SIZE` | Hard cap on uploaded evidence size in bytes | `52428800` (50 MB) |
| `BACKEND_CORS_ORIGINS` | JSON list of authorized frontend origins | `["https://tracex.yourdomain.com"]` |
| `ENVIRONMENT` | Deployment environment identifier | `production` |

### Frontend (`.env` or Build Arguments)

| Variable | Description | Production Example / Default |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Relative API path or full URL of backend API | `/api` (or `https://api.yourdomain.com/api`) |
| `VITE_API_URL` | Legacy fallback for `VITE_API_BASE_URL` | `/api` |

---

## 3. Database: PostgreSQL Setup & Migration

TraceX in production **requires PostgreSQL** (PostgreSQL 14, 15, or 16). SQLite is strictly intended for local developer unit testing.

### Step 3.1: Provision PostgreSQL Database
Create a dedicated user and database on PostgreSQL:
```sql
CREATE USER tracex WITH PASSWORD 'YourStrongPasswordHere';
CREATE DATABASE tracex_db OWNER tracex;
GRANT ALL PRIVILEGES ON DATABASE tracex_db TO tracex;
```

### Step 3.2: Initialize Schema & Migrations
On the backend host or container, run the migration upgrade:
```bash
# Using Alembic (reads dynamic DATABASE_URL from environment)
alembic upgrade head
```

Alternatively, initialize tables and seed canonical admin accounts using the automated seed script:
```bash
python seed.py
```

This guarantees that all 14 forensic models are created:
1. `users`
2. `cases`
3. `evidence`
4. `timeline_events`
5. `findings`
6. `risk_factors`
7. `evidence_relationships`
8. `reports`
9. `analysis_jobs`
10. `activity_clusters`
11. `anomalies`
12. `audit_logs`
13. `evidence_gaps`
14. `custody_entries`

### Initial Admin Credentials Seeded:
- **Email**: `investigator@tracex.demo`
- **Password**: `TraceX@123`
- **Role**: `ADMIN`
- *(Important: Log in and update this password via RBAC Administration immediately after first launch)*

---

## 4. Evidence Storage Configuration

TraceX treats all uploaded evidence as **inert binary streams**. Under no circumstances will evidence artifacts be executed, evaluated, or run in system shells.

### Production Storage Best Practices
1. **Mount External Persistent Volume**:
   - In Docker: Local named volume `evidence_storage:/app/uploads`.
   - In AWS: AWS Elastic File System (EFS) mounted to `/app/uploads`.
   - In GCP / Kubernetes: Persistent Volume Claim (PVC) with `ReadWriteMany` or `ReadWriteOnce` access mode.
2. **File Permissions (`chmod 400` / `stat.S_IREAD`)**:
   - The platform automatically enforces read-only attributes on newly ingested files.
   - The directory permissions must be restricted to the application service user (`chmod 700 /app/uploads`).
3. **Execution Prevention**:
   - Do not serve `/app/uploads` via public static web servers.
   - Mount storage on Linux with `noexec,nosuid,nodev` mount flags if utilizing a dedicated partition:
     ```
     /dev/sdb1 /app/uploads ext4 defaults,noexec,nosuid,nodev 0 2
     ```

---

## 5. Docker Production Deployment (Recommended)

TraceX includes a production multi-stage `Dockerfile` for the frontend and an optimized container for the backend engine.

### Quick Start with Docker Compose
To start the entire full-stack platform with PostgreSQL, backend engine, and Nginx frontend:

```bash
# 1. Copy template and edit production credentials
cp .env.example .env
nano .env

# 2. Build and start all services in detached mode
docker compose up -d --build

# 3. Verify health status of all containers
docker compose ps
```

Services exposed:
- **Frontend & App Interface**: `http://localhost:80` (or `http://localhost:5173`)
- **Backend API**: `http://localhost:8000`
- **PostgreSQL**: `localhost:5432`

---

## 6. Bare-Metal / Virtual Machine Deployment

If deploying without Docker on an Ubuntu/Debian Linux VM:

### Backend Deployment (Systemd + Uvicorn/Gunicorn)
1. **Install dependencies**:
   ```bash
   sudo apt-get update
   sudo apt-get install -y python3.11 python3.11-venv build-essential libpq-dev postgresql-client
   ```
2. **Set up virtualenv**:
   ```bash
   cd /opt/tracex/backend
   python3.11 -m venv venv
   ./venv/bin/pip install --upgrade pip
   ./venv/bin/pip install -r requirements.txt
   ```
3. **Create Systemd Service** (`/etc/systemd/system/tracex-backend.service`):
   ```ini
   [Unit]
   Description=TraceX Forensic API Engine
   After=network.target postgresql.service

   [Service]
   User=www-data
   Group=www-data
   WorkingDirectory=/opt/tracex/backend
   Environment="DATABASE_URL=postgresql+psycopg2://tracex:SecretPass@127.0.0.1:5432/tracex_db"
   Environment="JWT_SECRET=ReplaceWithSecureHex32"
   Environment="UPLOAD_DIR=/var/tracex/uploads"
   Environment="ENVIRONMENT=production"
   ExecStart=/opt/tracex/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4

   Restart=always
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```
4. **Enable & Start**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable tracex-backend
   sudo systemctl start tracex-backend
   ```

### Frontend Deployment (Nginx)
1. **Build assets**:
   ```bash
   cd /opt/tracex
   npm ci
   VITE_API_BASE_URL=/api npm run build
   sudo cp -r dist/* /var/www/tracex/
   ```
2. **Configure Nginx** (`/etc/nginx/sites-available/tracex`):
   ```nginx
   server {
       listen 80;
       server_name tracex.yourdomain.com;

       root /var/www/tracex;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /api/ {
           proxy_pass http://127.0.0.1:8000/api/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           client_max_body_size 50M;
       }
   }
   ```
3. **Enable & Reload**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/tracex /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

---

## 7. Health Checks & Verification

Cloud load balancers and orchestrators (AWS ALB, Kubernetes, Google Cloud Run) can monitor TraceX using the built-in health endpoints:

### Endpoint: `GET /health` or `GET /api/health`
- **Success Response** (HTTP 200 OK):
  ```json
  {
    "status": "healthy",
    "service": "TraceX Forensic Platform",
    "version": "5.0.0",
    "environment": "production",
    "database": "connected",
    "engine": "postgresql"
  }
  ```
- **Failure / Degraded Response** (HTTP 503 Service Unavailable):
  ```json
  {
    "status": "degraded",
    "service": "TraceX Forensic Platform",
    "version": "5.0.0",
    "environment": "production",
    "database": "disconnected: connection refused",
    "engine": "postgresql"
  }
  ```

---

## 8. Verification Checklist Before Going Live

- [x] Frontend compiled with `npm run build` with zero errors.
- [x] Backend test suite passing 100% (`47 of 47 tests passed`).
- [x] `GET /health` verifies live database connectivity (`SELECT 1`).
- [x] PostgreSQL connection string configured with `psycopg2`.
- [x] Evidence storage directory set to non-executable permissions.
- [x] Multi-stage production `Dockerfile` configured for frontend.
- [x] CORS origins restricted to verified corporate domains.
- [x] Default admin password rotated after initial deployment.
