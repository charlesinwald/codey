"""FastAPI backend for Face-to-Face Debugging."""

import os
import uuid
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import (
    AnalyzeRequest,
    AnalyzeResponse,
    SessionStartRequest,
    SessionStartResponse,
    SessionStatusResponse,
    HealthResponse,
    ErrorResponse,
)
from redis_client import get_redis_client
from claude_client import get_claude_client
from tavus_client import get_tavus_client

# Load environment variables
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup: verify connections
    redis_client = get_redis_client()
    if not redis_client.ping():
        print("Warning: Redis not available at startup")

    yield

    # Shutdown: cleanup if needed
    pass


app = FastAPI(
    title="Face Debugger API",
    description="Backend for Face-to-Face Debugging VS Code extension",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
allowed_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,vscode-webview://*"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    redis_client = get_redis_client()
    redis_ok = redis_client.ping()

    status = "healthy" if redis_ok else "degraded"

    return HealthResponse(
        status=status,
        redis=redis_ok,
    )


@app.post("/session/start", response_model=SessionStartResponse)
async def start_session(request: SessionStartRequest):
    """Create a new debugging session with Tavus conversation.

    Creates a Tavus CVI conversation and stores the URL in Redis.
    """
    session_id = request.session_id or str(uuid.uuid4())

    redis_client = get_redis_client()
    tavus_client = get_tavus_client()

    # Check if session already has an active conversation
    existing_url = redis_client.get_conversation_url(session_id)
    existing_id = redis_client.get_conversation_id(session_id)

    if existing_url and existing_id:
        # Verify conversation is still active
        conversation = await tavus_client.get_conversation(existing_id)
        if conversation and conversation.get("status") == "active":
            return SessionStartResponse(
                conversation_url=existing_url,
                session_id=session_id,
                conversation_id=existing_id,
            )

    # Create new Tavus conversation
    try:
        result = await tavus_client.create_conversation(
            conversation_name=f"Face Debugger - {session_id[:8]}",
            custom_greeting="Hey. I'm watching your code. Let's see what you've got.",
        )

        # Store in Redis
        redis_client.set_conversation(
            session_id,
            result["conversation_url"],
            result["conversation_id"],
        )

        return SessionStartResponse(
            conversation_url=result["conversation_url"],
            session_id=session_id,
            conversation_id=result["conversation_id"],
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create Tavus conversation: {str(e)}",
        )


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_code(request: AnalyzeRequest):
    """Analyze code and optionally trigger avatar speech.

    Implements smart debouncing:
    1. Check content hash - skip if file hasn't changed
    2. Check time debounce - skip if spoke recently
    3. Call Claude for analysis
    4. If Claude wants to speak, trigger Tavus and update state
    """
    redis_client = get_redis_client()

    # 1. Content hash check - primary cost control
    if not redis_client.has_content_changed(request.session_id, request.file_content):
        return AnalyzeResponse(
            speak=False,
            reason="no_change",
        )

    # 2. Debounce check - prevent rapid-fire comments
    if redis_client.is_debounced(request.session_id):
        return AnalyzeResponse(
            speak=False,
            reason="debounced",
        )

    # 3. Get recent history for Claude context
    recent_history = redis_client.get_history(request.session_id)

    # 4. Call Claude for analysis
    claude_client = get_claude_client()
    analysis = claude_client.analyze_code(
        file_content=request.file_content,
        cursor_line=request.cursor_line,
        language=request.language,
        recent_history=recent_history,
    )

    if not analysis.speak or not analysis.line:
        return AnalyzeResponse(
            speak=False,
            reason="nothing_to_say",
        )

    # 5. Claude wants to speak - trigger Tavus
    conversation_id = redis_client.get_conversation_id(request.session_id)

    if conversation_id:
        tavus_client = get_tavus_client()
        success = await tavus_client.speak(conversation_id, analysis.line)

        if success:
            # Update state: add to history, set debounce
            redis_client.add_to_history(request.session_id, analysis.line)
            redis_client.set_debounce(request.session_id)

            return AnalyzeResponse(
                speak=True,
                line=analysis.line,
            )
        else:
            # Tavus failed but Claude had something to say
            # Still return the line for logging/display purposes
            return AnalyzeResponse(
                speak=True,
                line=analysis.line,
                reason="tavus_failed",
            )
    else:
        # No active conversation, but Claude had something to say
        return AnalyzeResponse(
            speak=True,
            line=analysis.line,
            reason="no_conversation",
        )


@app.get("/session/{session_id}/status", response_model=SessionStatusResponse)
async def get_session_status(session_id: str):
    """Get status information for a session."""
    redis_client = get_redis_client()

    conversation_url = redis_client.get_conversation_url(session_id)
    comment_count = redis_client.get_history_count(session_id)
    last_comment = redis_client.get_last_comment(session_id)

    return SessionStatusResponse(
        session_id=session_id,
        active=conversation_url is not None,
        comment_count=comment_count,
        last_comment=last_comment,
        conversation_url=conversation_url,
    )


@app.delete("/session/{session_id}")
async def end_session(session_id: str):
    """End a debugging session and clean up resources."""
    redis_client = get_redis_client()
    tavus_client = get_tavus_client()

    # End Tavus conversation if active
    conversation_id = redis_client.get_conversation_id(session_id)
    if conversation_id:
        await tavus_client.end_conversation(conversation_id)

    # Clear all Redis keys for this session
    deleted_count = redis_client.clear_session(session_id)

    return {
        "session_id": session_id,
        "deleted_keys": deleted_count,
        "message": "Session ended successfully",
    }


@app.get("/session/{session_id}/history")
async def get_session_history(session_id: str):
    """Get comment history for a session."""
    redis_client = get_redis_client()
    history = redis_client.get_history(session_id)

    return {
        "session_id": session_id,
        "comments": history,
        "count": len(history),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
