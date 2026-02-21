"""FastAPI backend for Face-to-Face Debugging."""

import os
import uuid
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import (
    AnalyzeRequest,
    AnalyzeResponse,
    SessionStartRequest,
    SessionStartResponse,
    SessionStatusResponse,
    HealthResponse,
)
from redis_client import get_redis_client, RedisClient
from claude_client import get_claude_client

# Load environment variables
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup: verify connections
    try:
        redis_client = get_redis_client()
        if not redis_client.ping():
            print("Warning: Redis not available at startup")
    except Exception as e:
        print(f"Warning: Redis connection failed: {e}")

    yield

    # Shutdown: cleanup if needed
    pass


app = FastAPI(
    title="Face Debugger API",
    description="Backend for Face-to-Face Debugging VS Code extension",
    version="2.0.0",
    lifespan=lifespan,
)

# Configure CORS - must be added before routes
allowed_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,vscode-webview://*"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler to ensure CORS headers on errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "detail": "Internal server error"},
    )


def get_redis_safe() -> tuple[RedisClient | None, bool]:
    """Get Redis client, returning None if unavailable."""
    try:
        client = get_redis_client()
        if client.ping():
            return client, True
        return None, False
    except Exception:
        return None, False


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    _, redis_ok = get_redis_safe()
    status = "healthy" if redis_ok else "degraded"

    return HealthResponse(
        status=status,
        redis=redis_ok,
    )


@app.post("/session/start", response_model=SessionStartResponse)
async def start_session(request: SessionStartRequest):
    """Create a new debugging session.

    Initializes session state in Redis if available.
    """
    session_id = request.session_id or str(uuid.uuid4())

    redis_client, redis_ok = get_redis_safe()

    if redis_client and redis_ok:
        try:
            redis_client.set_session_active(session_id)
        except Exception as e:
            print(f"Warning: Failed to set session active in Redis: {e}")

    return SessionStartResponse(
        session_id=session_id,
        active=True,
    )


# Global variable to store last debug info
_last_debug_info = {}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_code(request: AnalyzeRequest):
    """Analyze code and return AI commentary.

    Implements smart debouncing:
    1. Check content hash - skip if file hasn't changed
    2. Check time debounce - skip if spoke recently
    3. Call Claude for analysis
    4. If Claude wants to speak, store in history and return
    """
    redis_client, redis_ok = get_redis_safe()

    if not redis_ok:
        raise HTTPException(
            status_code=503,
            detail="Redis is not available. Please ensure Redis is running."
        )

    # 1. Content hash check - primary cost control
    if not redis_client.has_content_changed(request.session_id, request.file_content):
        _last_debug_info["reason"] = "no_change"
        return AnalyzeResponse(
            speak=False,
            reason="no_change",
        )

    # 2. Debounce check - prevent rapid-fire comments
    if redis_client.is_debounced(request.session_id):
        _last_debug_info["reason"] = "debounced"
        return AnalyzeResponse(
            speak=False,
            reason="debounced",
        )

    # 3. Get recent history for Claude context
    recent_history = redis_client.get_history(request.session_id)

    # 4. Call Claude for analysis
    try:
        claude_client = get_claude_client()
    except ValueError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Claude client not configured: {e}"
        )

    analysis = claude_client.analyze_code(
        file_content=request.file_content,
        cursor_line=request.cursor_line,
        language=request.language,
        recent_history=recent_history,
    )

    # Debug logging
    from claude_client import ClaudeClient as ClaudeClientClass
    raw_response = ClaudeClientClass._last_raw_response
    
    print(f"Claude analysis result: speak={analysis.speak}, line={analysis.line}")
    print(f"Claude raw response: {raw_response}")
    
    _last_debug_info.update({
        "speak": analysis.speak,
        "line": analysis.line,
        "raw_response": raw_response,
        "file_content": request.file_content,
        "cursor_line": request.cursor_line,
        "language": request.language,
    })

    if not analysis.speak or not analysis.line:
        return AnalyzeResponse(
            speak=False,
            reason="nothing_to_say",
        )

    # 5. Claude wants to speak - store in history and set debounce
    redis_client.add_to_history(request.session_id, analysis.line)
    redis_client.set_debounce(request.session_id)

    return AnalyzeResponse(
        speak=True,
        line=analysis.line,
    )


@app.get("/session/{session_id}/status", response_model=SessionStatusResponse)
async def get_session_status(session_id: str):
    """Get status information for a session."""
    redis_client, redis_ok = get_redis_safe()

    if not redis_ok:
        return SessionStatusResponse(
            session_id=session_id,
            active=False,
            comment_count=0,
            last_comment=None,
        )

    active = redis_client.is_session_active(session_id)
    comment_count = redis_client.get_history_count(session_id)
    last_comment = redis_client.get_last_comment(session_id)

    return SessionStatusResponse(
        session_id=session_id,
        active=active,
        comment_count=comment_count,
        last_comment=last_comment,
    )


@app.delete("/session/{session_id}")
async def end_session(session_id: str):
    """End a debugging session and clean up resources."""
    redis_client, redis_ok = get_redis_safe()

    deleted_count = 0
    if redis_ok:
        deleted_count = redis_client.clear_session(session_id)

    return {
        "session_id": session_id,
        "deleted_keys": deleted_count,
        "message": "Session ended successfully",
    }


@app.get("/session/{session_id}/history")
async def get_session_history(session_id: str):
    """Get comment history for a session."""
    redis_client, redis_ok = get_redis_safe()

    if not redis_ok:
        return {
            "session_id": session_id,
            "comments": [],
            "count": 0,
        }

    history = redis_client.get_history(session_id)

    return {
        "session_id": session_id,
        "comments": history,
        "count": len(history),
    }


@app.get("/debug/last-analysis")
async def get_last_analysis():
    """Debug endpoint to see last Claude analysis result."""
    return _last_debug_info


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
