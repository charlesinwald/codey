# Face Debugger - Service Management Scripts

## Quick Start

### Restart All Services
```bash
cd face-debugger
./restart-all.sh
```

This script will:
1. ✅ Stop all existing services (backend, frontend)
2. ✅ Start/check Redis
3. ✅ Recompile VS Code extension
4. ✅ Start backend server (port 8000)
5. ✅ Start frontend dev server (port 5173)

### Stop All Services
```bash
./stop-all.sh
```

## What the Scripts Do

### `restart-all.sh`

**Stops:**
- Backend server (port 8000)
- Frontend dev server (port 5173)
- Any processes using those ports

**Starts:**
- Redis (via Docker if available, or uses existing instance)
- Backend server with auto-reload
- Frontend dev server

**Compiles:**
- VS Code extension TypeScript → JavaScript

**Output:**
- Process IDs saved to `backend.pid` and `frontend.pid`
- Logs saved to `backend.log` and `frontend.log`

### `stop-all.sh`

**Stops:**
- Backend server (by PID and port)
- Frontend dev server (by PID and port)
- Optionally stops Redis Docker container

## Prerequisites

- **Redis:** Running locally or via Docker
- **Python:** With virtual environment set up
- **Node.js:** With yarn or npm
- **Dependencies:** Installed in both backend and frontend

## Manual Setup (if scripts don't work)

### 1. Redis
```bash
docker run -d --name face-debugger-redis -p 6379:6379 redis:alpine
```

### 2. Backend
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm run dev  # or yarn dev
```

### 4. Extension
```bash
cd extension
npm run compile  # or yarn compile
```

## Viewing Logs

**Backend logs:**
```bash
tail -f face-debugger/backend.log
```

**Frontend logs:**
```bash
tail -f face-debugger/frontend.log
```

**Both logs:**
```bash
tail -f face-debugger/backend.log face-debugger/frontend.log
```

## Troubleshooting

### Script fails with "command not found"
Make sure the script is executable:
```bash
chmod +x restart-all.sh stop-all.sh
```

### Port already in use
The script tries to kill processes on ports 8000 and 5173. If it fails:
```bash
# Find and kill manually
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Redis not starting
Make sure Docker is running:
```bash
docker ps  # Should show running containers
```

Or start Redis manually:
```bash
docker run -d --name face-debugger-redis -p 6379:6379 redis:alpine
```

### Backend fails to start
Check:
- Virtual environment is activated
- Dependencies installed: `pip install -r requirements.txt`
- `.env` file exists with `ANTHROPIC_API_KEY`

### Frontend fails to start
Check:
- Dependencies installed: `npm install` or `yarn install`
- Node.js version is 18+

## Process Management

**Check if services are running:**
```bash
lsof -i:8000  # Backend
lsof -i:5173  # Frontend
redis-cli ping  # Redis
```

**Kill specific service:**
```bash
# By PID
kill $(cat backend.pid)
kill $(cat frontend.pid)

# By port
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

## Development Workflow

1. **Make code changes**
2. **Restart services:**
   ```bash
   ./restart-all.sh
   ```
3. **View logs if needed:**
   ```bash
   tail -f backend.log frontend.log
   ```

The backend and frontend have auto-reload enabled, so most changes don't require a full restart. Use the restart script when:
- Adding new dependencies
- Changing configuration
- Recompiling extension
- After pulling new code

