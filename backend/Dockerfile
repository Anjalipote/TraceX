# ==============================================================================
# TraceX Forensic Engine - Backend Dockerfile
# ==============================================================================
FROM python:3.11-slim

WORKDIR /app

# Install system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY . .

# Ensure uploads directory exists and is strictly non-executable
RUN mkdir -p uploads && chmod 700 uploads

# Expose API port
EXPOSE 8000

# Health check (supports dynamic Render $PORT or default 8000)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD sh -c "curl -f http://localhost:\${PORT:-8000}/health || curl -f http://localhost:\${PORT:-8000}/api/health || exit 1"

# Run FastAPI backend via Uvicorn (verifies schema migrations, seeds demo if needed, binds to $PORT)
CMD ["sh", "-c", "python seed.py || true && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
