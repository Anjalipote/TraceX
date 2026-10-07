# ==============================================================================
# TraceX Forensic Platform - Multi-Stage Production Frontend Dockerfile
# ==============================================================================

# Stage 1: Build the React + TypeScript static assets
FROM node:20-alpine AS builder

WORKDIR /app

# Install package dependencies
COPY package*.json ./
RUN npm ci

# Copy application source code and compile optimized production bundle
COPY . .
RUN npm run build

# Stage 2: Serve via high-performance, security-hardened Nginx Alpine
FROM nginx:1.25-alpine AS runner

# Remove default nginx distribution files
RUN rm -rf /usr/share/nginx/html/*

# Copy built production assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration (SPA routing fallback & /api/ reverse proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/health || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
