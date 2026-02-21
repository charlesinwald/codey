#!/bin/bash
# Restart all Face Debugger services and recompile extension

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Face Debugger - Restarting All Services"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Debug function
debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1" >&2
}

# Error function
error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Success function
success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Warning function
warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Function to check if a process is running on a port
check_port() {
    if command -v lsof &> /dev/null; then
        lsof -ti:$1 > /dev/null 2>&1
    elif command -v netstat &> /dev/null; then
        netstat -an | grep -q ":$1.*LISTEN" 2>/dev/null
    else
        debug "Cannot check port $1 - lsof and netstat not available"
        return 1
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    debug "Checking port $port..."
    if check_port $port; then
        warn "Stopping process on port $port..."
        if command -v lsof &> /dev/null; then
            local pids=$(lsof -ti:$port 2>/dev/null)
            if [ -n "$pids" ]; then
                debug "Found PIDs on port $port: $pids"
                echo $pids | xargs kill -9 2>/dev/null || true
                sleep 1
                if check_port $port; then
                    error "Failed to kill process on port $port"
                    return 1
                else
                    success "Port $port cleared"
                fi
            fi
        else
            warn "lsof not available, cannot kill process on port $port"
        fi
    else
        debug "Port $port is already free"
    fi
}

# 1. Stop existing services
echo -e "${YELLOW}1️⃣  Stopping existing services...${NC}"
debug "Checking for existing processes..."

# Kill by PID files first
if [ -f "backend.pid" ]; then
    PID=$(cat backend.pid 2>/dev/null || echo "")
    if [ -n "$PID" ] && ps -p $PID > /dev/null 2>&1; then
        debug "Killing backend process (PID: $PID)"
        kill $PID 2>/dev/null || true
        rm -f backend.pid
    fi
fi

if [ -f "frontend.pid" ]; then
    PID=$(cat frontend.pid 2>/dev/null || echo "")
    if [ -n "$PID" ] && ps -p $PID > /dev/null 2>&1; then
        debug "Killing frontend process (PID: $PID)"
        kill $PID 2>/dev/null || true
        rm -f frontend.pid
    fi
fi

if [ -f "copilotkit.pid" ]; then
    PID=$(cat copilotkit.pid 2>/dev/null || echo "")
    if [ -n "$PID" ] && ps -p $PID > /dev/null 2>&1; then
        debug "Killing CopilotKit runtime process (PID: $PID)"
        kill $PID 2>/dev/null || true
        rm -f copilotkit.pid
    fi
fi

kill_port 8000  # Backend
kill_port 4000  # CopilotKit runtime
kill_port 5173  # Frontend
# kill_port 6379  # Redis (if running locally)
success "Services stopped"
echo ""

# 2. Start Redis
# echo -e "${YELLOW}2️⃣  Starting Redis...${NC}"
# debug "Checking Redis availability..."

# if command -v redis-cli &> /dev/null; then
#     debug "redis-cli found, testing connection..."
#     if redis-cli ping &> /dev/null; then
#         success "Redis is already running"
#     else
#         debug "Redis not responding, attempting to start via Docker..."
#         # Try to start Redis via Docker
#         if command -v docker &> /dev/null; then
#             debug "Docker found, checking for existing container..."
#             if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^face-debugger-redis$"; then
#                 debug "Found existing Redis container, starting it..."
#                 if docker start face-debugger-redis &> /dev/null; then
#                     debug "Container started, waiting for Redis to be ready..."
#                     sleep 2
#                     if redis-cli ping &> /dev/null; then
#                         success "Redis started from existing container"
#                     else
#                         error "Redis container started but not responding"
#                         exit 1
#                     fi
#                 else
#                     error "Failed to start Redis container"
#                     exit 1
#                 fi
#             else
#                 debug "No existing container, creating new one..."
#                 if docker run -d --name face-debugger-redis -p 6379:6379 redis:alpine &> /dev/null; then
#                     debug "Container created, waiting for Redis to be ready..."
#                     sleep 2
#                     if redis-cli ping &> /dev/null; then
#                         success "Redis started in new container"
#                     else
#                         error "Redis container created but not responding"
#                         exit 1
#                     fi
#                 else
#                     error "Failed to create Redis container"
#                     exit 1
#                 fi
#             fi
#         else
#             error "Redis not running and Docker not available"
#             echo "   Try: docker run -d --name face-debugger-redis -p 6379:6379 redis:alpine"
#             exit 1
#         fi
#     fi
# else
#     warn "redis-cli not found. Assuming Redis is running externally."
#     debug "You may need to start Redis manually if it's not running"
# fi
# echo ""

# 3. Recompile VS Code Extension
echo -e "${YELLOW}3️⃣  Recompiling VS Code Extension...${NC}"
debug "Changing to extension directory..."
cd extension

if [ ! -f "package.json" ]; then
    error "package.json not found in extension directory"
    exit 1
fi

debug "Checking for package manager..."
if command -v yarn &> /dev/null; then
    debug "Using yarn to compile..."
    if yarn run compile 2>&1; then
        success "Extension compiled with yarn"
    else
        error "Extension compilation failed with yarn"
        exit 1
    fi
elif command -v npm &> /dev/null; then
    debug "Using npm to compile..."
    if npm run compile 2>&1; then
        success "Extension compiled with npm"
    else
        error "Extension compilation failed with npm"
        exit 1
    fi
else
    error "Neither yarn nor npm found"
    exit 1
fi

debug "Checking compilation output..."
if [ -d "out" ] && [ -f "out/extension.js" ]; then
    debug "Compilation successful - out/extension.js exists"
else
    warn "Compilation may have failed - out/extension.js not found"
fi

cd ..
echo ""

# 4. Start Backend
echo -e "${YELLOW}4️⃣  Starting Backend Server...${NC}"
debug "Changing to backend directory..."
cd backend

# Check for virtual environment
debug "Looking for virtual environment..."
if [ -d "venv" ]; then
    debug "Found venv, activating..."
    source venv/bin/activate
    debug "Virtual environment activated"
elif [ -d ".venv" ]; then
    debug "Found .venv, activating..."
    source .venv/bin/activate
    debug "Virtual environment activated"
else
    warn "No virtual environment found. Using system Python."
    debug "Python version: $(python --version 2>&1 || echo 'not found')"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    warn ".env file not found. Make sure ANTHROPIC_API_KEY is set."
    debug "You can create .env from .env.example if it exists"
else
    debug ".env file found"
    if grep -q "ANTHROPIC_API_KEY" .env 2>/dev/null; then
        debug "ANTHROPIC_API_KEY found in .env"
    else
        warn "ANTHROPIC_API_KEY not found in .env"
    fi
fi

# Check dependencies
debug "Checking for uvicorn..."
if ! command -v uvicorn &> /dev/null; then
    error "uvicorn not found. Install with: pip install uvicorn"
    exit 1
fi
debug "uvicorn found: $(which uvicorn)"

# Start backend in background
debug "Starting backend server..."
debug "Command: uvicorn main:app --reload --host 0.0.0.0 --port 8000"
nohup uvicorn main:app --reload --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid
debug "Backend process started with PID: $BACKEND_PID"
debug "Waiting for backend to start..."
sleep 3

# Check if backend started
if check_port 8000; then
    success "Backend started (PID: $BACKEND_PID)"
    debug "Backend is listening on port 8000"
    debug "Logs: tail -f backend.log"
    
    # Test health endpoint
    debug "Testing backend health endpoint..."
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        debug "Health endpoint responding"
    else
        warn "Health endpoint not responding yet (may still be starting)"
    fi
else
    error "Backend failed to start. Check backend.log"
    debug "Last 20 lines of backend.log:"
    tail -20 ../backend.log 2>/dev/null || echo "No log file found"
    exit 1
fi
cd ..
echo ""

# 5. Start CopilotKit Runtime
echo -e "${YELLOW}5️⃣  Starting CopilotKit Runtime Server...${NC}"
debug "Changing to frontend directory..."
cd frontend

debug "Starting CopilotKit runtime on port 4000..."
nohup node --env-file=../backend/.env copilotkit-server.mjs > ../copilotkit.log 2>&1 &
COPILOTKIT_PID=$!
echo $COPILOTKIT_PID > ../copilotkit.pid
debug "CopilotKit runtime started with PID: $COPILOTKIT_PID"
debug "Waiting for runtime to start..."
sleep 2

if check_port 4000; then
    success "CopilotKit runtime started (PID: $COPILOTKIT_PID)"
    debug "Logs: tail -f copilotkit.log"
else
    error "CopilotKit runtime failed to start. Check copilotkit.log"
    tail -20 ../copilotkit.log 2>/dev/null || echo "No log file found"
    exit 1
fi
cd ..
echo ""

# 6. Start Frontend
echo -e "${YELLOW}6️⃣  Starting Frontend Dev Server...${NC}"
debug "Changing to frontend directory..."
cd frontend

if [ ! -f "package.json" ]; then
    error "package.json not found in frontend directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    warn "node_modules not found, installing dependencies..."
    debug "This may take a few minutes..."
    if command -v yarn &> /dev/null; then
        debug "Using yarn to install..."
        if yarn install 2>&1; then
            debug "Dependencies installed with yarn"
        else
            error "Failed to install dependencies with yarn"
            exit 1
        fi
    else
        debug "Using npm to install..."
        if npm install 2>&1; then
            debug "Dependencies installed with npm"
        else
            error "Failed to install dependencies with npm"
            exit 1
        fi
    fi
else
    debug "node_modules found, skipping install"
fi

# Check for dev script
debug "Checking package.json for dev script..."
if grep -q '"dev"' package.json 2>/dev/null; then
    debug "dev script found in package.json"
else
    error "dev script not found in package.json"
    exit 1
fi

# Start frontend in background
debug "Starting frontend dev server..."
if command -v yarn &> /dev/null; then
    debug "Using yarn dev..."
    nohup yarn dev > ../frontend.log 2>&1 &
else
    debug "Using npm run dev..."
    nohup npm run dev > ../frontend.log 2>&1 &
fi
FRONTEND_PID=$!
echo $FRONTEND_PID > ../frontend.pid
debug "Frontend process started with PID: $FRONTEND_PID"
debug "Waiting for frontend to start..."
sleep 4

# Check if frontend started
if check_port 5173; then
    success "Frontend started (PID: $FRONTEND_PID)"
    debug "Frontend is listening on port 5173"
    debug "Logs: tail -f frontend.log"
    
    # Test frontend endpoint
    debug "Testing frontend endpoint..."
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        debug "Frontend responding"
    else
        warn "Frontend not responding yet (may still be starting)"
    fi
else
    warn "Frontend may still be starting. Check frontend.log"
    debug "Last 20 lines of frontend.log:"
    tail -20 ../frontend.log 2>/dev/null || echo "No log file found"
fi
cd ..
echo ""

# Summary
echo "=========================================="
success "All services restarted!"
echo ""
echo "Services Status:"
echo "  • Redis:            $(redis-cli ping 2>/dev/null && echo -e "${GREEN}✅ Running${NC}" || echo -e "${RED}❌ Not running${NC}")"
echo "  • Backend:          $(check_port 8000 && echo -e "${GREEN}✅ Running${NC}" || echo -e "${RED}❌ Not running${NC}")"
echo "  • CopilotKit:       $(check_port 4000 && echo -e "${GREEN}✅ Running${NC}" || echo -e "${RED}❌ Not running${NC}")"
echo "  • Frontend:         $(check_port 5173 && echo -e "${GREEN}✅ Running${NC}" || echo -e "${RED}❌ Not running${NC}")"
echo "  • Extension:        $(test -f extension/out/extension.js && echo -e "${GREEN}✅ Compiled${NC}" || echo -e "${RED}❌ Not compiled${NC}")"
echo ""
echo "Quick Tests:"
echo "  • Backend:          curl http://localhost:8000/health"
echo "  • CopilotKit:       curl http://localhost:4000/copilotkit"
echo "  • Frontend:         curl http://localhost:5173"
echo "  • Redis:            redis-cli ping"
echo ""
echo "Logs:"
echo "  • Backend:          tail -f backend.log"
echo "  • CopilotKit:       tail -f copilotkit.log"
echo "  • Frontend:         tail -f frontend.log"
echo ""
echo "Debug Info:"
echo "  • Backend PID:      $(cat backend.pid 2>/dev/null || echo 'N/A')"
echo "  • CopilotKit PID:   $(cat copilotkit.pid 2>/dev/null || echo 'N/A')"
echo "  • Frontend PID:     $(cat frontend.pid 2>/dev/null || echo 'N/A')"
echo ""
echo "To stop all services:"
echo "  ./stop-all.sh"
echo ""
echo "To view logs:"
echo "  tail -f backend.log frontend.log"
echo ""

