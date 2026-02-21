#!/bin/bash
# Stop all Face Debugger services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🛑 Stopping Face Debugger Services"
echo "==================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Debug function
debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1" >&2
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
                    warn "Port $port still in use after kill attempt"
                else
                    success "Port $port cleared"
                fi
            fi
        else
            warn "lsof not available, cannot kill process on port $port"
        fi
    else
        debug "Port $port already free"
    fi
}

# Kill by PID files if they exist
debug "Checking for PID files..."
if [ -f "backend.pid" ]; then
    PID=$(cat backend.pid 2>/dev/null || echo "")
    if [ -n "$PID" ] && ps -p $PID > /dev/null 2>&1; then
        debug "Stopping backend process (PID: $PID)..."
        kill $PID 2>/dev/null || true
        sleep 1
        if ps -p $PID > /dev/null 2>&1; then
            debug "Process still running, force killing..."
            kill -9 $PID 2>/dev/null || true
        fi
        rm -f backend.pid
        success "Backend process stopped"
    else
        debug "Backend PID file exists but process not running, cleaning up..."
        rm -f backend.pid
    fi
else
    debug "No backend.pid file found"
fi

if [ -f "frontend.pid" ]; then
    PID=$(cat frontend.pid 2>/dev/null || echo "")
    if [ -n "$PID" ] && ps -p $PID > /dev/null 2>&1; then
        debug "Stopping frontend process (PID: $PID)..."
        kill $PID 2>/dev/null || true
        sleep 1
        if ps -p $PID > /dev/null 2>&1; then
            debug "Process still running, force killing..."
            kill -9 $PID 2>/dev/null || true
        fi
        rm -f frontend.pid
        success "Frontend process stopped"
    else
        debug "Frontend PID file exists but process not running, cleaning up..."
        rm -f frontend.pid
    fi
else
    debug "No frontend.pid file found"
fi

if [ -f "copilotkit.pid" ]; then
    PID=$(cat copilotkit.pid 2>/dev/null || echo "")
    if [ -n "$PID" ] && ps -p $PID > /dev/null 2>&1; then
        debug "Stopping CopilotKit runtime process (PID: $PID)..."
        kill $PID 2>/dev/null || true
        sleep 1
        if ps -p $PID > /dev/null 2>&1; then
            debug "Process still running, force killing..."
            kill -9 $PID 2>/dev/null || true
        fi
        rm -f copilotkit.pid
        success "CopilotKit runtime stopped"
    else
        debug "CopilotKit PID file exists but process not running, cleaning up..."
        rm -f copilotkit.pid
    fi
else
    debug "No copilotkit.pid file found"
fi

# Kill by port (in case PID files are stale)
debug "Killing processes by port..."
kill_port 8000  # Backend
kill_port 4000  # CopilotKit runtime
kill_port 5173  # Frontend

# Optionally stop Redis container
if command -v docker &> /dev/null; then
    if docker ps --format '{{.Names}}' | grep -q "^face-debugger-redis$"; then
        echo ""
        read -p "Stop Redis container? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker stop face-debugger-redis
            echo -e "${GREEN}✅ Redis stopped${NC}"
        fi
    fi
fi

echo ""
echo -e "${GREEN}✅ All services stopped${NC}"

