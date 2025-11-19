# Arb Engine - Port Configuration

This document outlines the port configuration for all services in the Arb Engine ecosystem.

## Service Ports

| Service | Port | Description |
|---------|------|-------------|
| **Backend API** | 3000 | Main NestJS application (arb-engine) |
| **UI Dashboard** | 3001 | Next.js web interface |
| **PostgreSQL** | 5432 | Database (if running locally) |
| **Redis** | 6379 | Message queue and caching |

## Port Configuration Details

### Backend (Arb Engine)
- **Default Port**: `3000`
- **Configuration**: Set via `PORT` environment variable in `.env`
- **URL**: `http://localhost:3000`
- **Swagger API Docs**: `http://localhost:3000/api`

```env
PORT=3000
```

### UI Dashboard
- **Default Port**: `3001`
- **Configuration**: Set in `ui/package.json` scripts
- **URL**: `http://localhost:3001`

To change the UI port, edit `ui/package.json`:
```json
{
  "scripts": {
    "dev": "next dev -p 3001",
    "start": "next start -p 3001"
  }
}
```

Or run with custom port:
```bash
pnpm dev -- -p YOUR_PORT
```

### Environment Variables

#### Backend `.env`
```env
PORT=3000
DB_PORT=5432
REDIS_PORT=6379
```

#### UI `.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Port Conflicts

If you encounter port conflicts:

### Backend Port Conflict (3000)
1. Stop the conflicting service:
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

2. Or change the backend port in `.env`:
   ```env
   PORT=3201
   ```

3. Update UI to point to new backend port:
   ```env
   # ui/.env.local
   NEXT_PUBLIC_API_URL=http://localhost:3201
   ```

### UI Port Conflict (3001)
1. Stop the conflicting service:
   ```bash
   lsof -ti:3001 | xargs kill -9
   ```

2. Or change the UI port:
   ```bash
   cd ui
   pnpm dev -- -p 3002
   ```

### Database Port Conflict (5432)
Change PostgreSQL port in `.env`:
```env
DB_PORT=5433
```

### Redis Port Conflict (6379)
Change Redis port in `.env`:
```env
REDIS_PORT=6380
```

## Production Deployment

### Docker Compose
```yaml
services:
  backend:
    ports:
      - "3000:3000"
    environment:
      - PORT=3000

  ui:
    ports:
      - "3001:3001"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:3000

  postgres:
    ports:
      - "5432:5432"

  redis:
    ports:
      - "6379:6379"
```

### Kubernetes
```yaml
apiVersion: v1
kind: Service
metadata:
  name: arb-engine-backend
spec:
  ports:
    - port: 3000
      targetPort: 3000

---
apiVersion: v1
kind: Service
metadata:
  name: arb-engine-ui
spec:
  ports:
    - port: 3001
      targetPort: 3001
```

### Nginx Reverse Proxy
```nginx
# Backend
upstream backend {
    server localhost:3000;
}

# UI
upstream ui {
    server localhost:3001;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://backend;
    }
}

server {
    listen 80;
    server_name app.yourdomain.com;

    location / {
        proxy_pass http://ui;
    }
}
```

## Firewall Configuration

If using a firewall, ensure these ports are accessible:

### Development
- Open `3000` for backend
- Open `3001` for UI
- Keep `5432` and `6379` internal (not exposed externally)

### Production
- Backend: `3000` (or behind reverse proxy on `80/443`)
- UI: `3001` (or behind reverse proxy on `80/443`)
- Database: `5432` (internal only, VPC/network restricted)
- Redis: `6379` (internal only, VPC/network restricted)

## Health Checks

### Backend Health Check
```bash
curl http://localhost:3000
# Should return application info
```

### UI Health Check
```bash
curl http://localhost:3001
# Should return HTML
```

### Check Port Usage
```bash
# macOS/Linux
lsof -i :3000
lsof -i :3001

# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :3001
```

## Quick Start Commands

```bash
# Start backend (port 3000)
pnpm run start:dev

# Start UI (port 3001)
cd ui && pnpm dev

# Check all services
curl http://localhost:3000/api  # Backend Swagger docs
curl http://localhost:3001       # UI
```

## Troubleshooting

### "Port already in use" Error

**Backend:**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
lsof -ti:3000 | xargs kill -9

# Or change port
echo "PORT=3201" >> .env
```

**UI:**
```bash
# Find process using port 3001
lsof -ti:3001

# Kill the process
lsof -ti:3001 | xargs kill -9

# Or run on different port
cd ui && pnpm dev -- -p 3002
```

### CORS Issues

If UI can't connect to backend, ensure CORS is configured:

```typescript
// Backend: src/main.ts
app.enableCors({
  origin: 'http://localhost:3001', // UI URL
  credentials: true,
});
```

### Proxy Configuration (Alternative)

Instead of CORS, you can proxy API requests from UI:

```typescript
// ui/next.config.ts
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/:path*',
      },
    ];
  },
};
```

Then update API client:
```typescript
// ui/lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
```

## Summary

- **Backend**: Port `3000` (configurable via `PORT` env var)
- **UI**: Port `3001` (configurable via CLI flag or package.json)
- **Database**: Port `5432` (internal)
- **Redis**: Port `6379` (internal)

This configuration avoids port conflicts and follows common conventions for web applications.
