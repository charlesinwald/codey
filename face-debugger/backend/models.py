"""Pydantic request/response models for Face Debugger API."""

from pydantic import BaseModel, Field
from typing import Optional, Literal



class AnalyzeRequest(BaseModel):
    """Request body for POST /analyze endpoint."""

    file_content: str = Field(..., description="Full content of the active file")
    cursor_line: int = Field(..., ge=1, description="Current cursor line number (1-indexed)")
    language: str = Field(..., description="Language ID from VS Code (e.g., 'typescript', 'python')")
    session_id: str = Field(..., description="Unique session identifier from extension")
    personality: Optional[str] = Field(
        default=None,
        description="Personality preset for the AI (e.g., 'grumpy', 'mentor', 'sarcastic')"
    )


class AnalyzeResponse(BaseModel):
    """Response body for POST /analyze endpoint."""

    speak: bool = Field(..., description="Whether the avatar should speak")
    line: Optional[str] = Field(None, description="The comment to display, if speak=True")
    reason: Optional[str] = Field(
        None,
        description="Reason for not speaking (e.g., 'no_change', 'debounced', 'nothing_to_say')"
    )


class ClaudeAnalysis(BaseModel):
    """Structured output from Claude analysis."""

    speak: bool
    line: Optional[str] = None


class SessionStartRequest(BaseModel):
    """Request body for POST /session/start endpoint."""

    session_id: Optional[str] = Field(
        None,
        description="Optional session ID. If not provided, one will be generated."
    )


class SessionStartResponse(BaseModel):
    """Response body for POST /session/start endpoint."""

    session_id: str = Field(..., description="Session ID for subsequent requests")
    active: bool = Field(default=True, description="Whether the session is active")


class SessionStatusResponse(BaseModel):
    """Response body for GET /session/{session_id}/status endpoint."""

    session_id: str
    active: bool
    comment_count: int
    last_comment: Optional[str] = None


class HealthResponse(BaseModel):
    """Response body for GET /health endpoint."""

    status: Literal["healthy", "degraded", "unhealthy"]
    redis: bool
    version: str = "1.0.0"


class ErrorResponse(BaseModel):
    """Standard error response."""

    error: str
    detail: Optional[str] = None


class PersonalityInfo(BaseModel):
    """Information about a personality preset."""

    id: str
    name: str
    description: str


class PersonalitiesResponse(BaseModel):
    """Response body for GET /personalities endpoint."""

    personalities: list[PersonalityInfo]
    default: str
