"""Redis client for Face Debugger state management."""

import hashlib
import os
from typing import Optional

import redis


class RedisClient:
    """Handles all Redis operations for session state management."""

    # TTL constants (in seconds)
    DEBOUNCE_TTL = 12  # Block rapid repeat calls
    CONTENT_HASH_TTL = 30  # Cache content hash
    HISTORY_TTL = 3600  # 1 hour for comment history
    SESSION_TTL = 14400  # 4 hours for active session

    # Key prefixes
    PREFIX_DEBOUNCE = "debounce"
    PREFIX_CONTENT_HASH = "content_hash"
    PREFIX_HISTORY = "history"
    PREFIX_SESSION = "session"

    MAX_HISTORY_LENGTH = 10

    def __init__(self, redis_url: Optional[str] = None):
        """Initialize Redis client.

        Args:
            redis_url: Redis connection URL. Defaults to REDIS_URL env var or localhost.
        """
        url = redis_url or os.environ.get("REDIS_URL", "redis://localhost:6379")
        self.client = redis.from_url(url, decode_responses=True)

    def _key(self, prefix: str, session_id: str) -> str:
        """Generate a namespaced Redis key."""
        return f"face_debugger:{prefix}:{session_id}"

    def ping(self) -> bool:
        """Check Redis connectivity."""
        try:
            return self.client.ping()
        except redis.RedisError:
            return False

    # ─────────────────────────────────────────────────────────────────
    # Session Operations
    # ─────────────────────────────────────────────────────────────────

    def set_session_active(self, session_id: str) -> None:
        """Mark a session as active.

        Args:
            session_id: The session identifier.
        """
        key = self._key(self.PREFIX_SESSION, session_id)
        self.client.setex(key, self.SESSION_TTL, "active")

    def is_session_active(self, session_id: str) -> bool:
        """Check if a session is active.

        Args:
            session_id: The session identifier.

        Returns:
            True if session is active, False otherwise.
        """
        key = self._key(self.PREFIX_SESSION, session_id)
        return self.client.exists(key) == 1

    # ─────────────────────────────────────────────────────────────────
    # Debounce Operations
    # ─────────────────────────────────────────────────────────────────

    def is_debounced(self, session_id: str) -> bool:
        """Check if session is currently debounced (spoke recently).

        Args:
            session_id: The session identifier.

        Returns:
            True if debounced (should not speak), False otherwise.
        """
        key = self._key(self.PREFIX_DEBOUNCE, session_id)
        return self.client.exists(key) == 1

    def set_debounce(self, session_id: str) -> None:
        """Set debounce flag for a session.

        Args:
            session_id: The session identifier.
        """
        key = self._key(self.PREFIX_DEBOUNCE, session_id)
        self.client.setex(key, self.DEBOUNCE_TTL, "1")

    # ─────────────────────────────────────────────────────────────────
    # Content Hash Operations
    # ─────────────────────────────────────────────────────────────────

    @staticmethod
    def compute_hash(content: str) -> str:
        """Compute MD5 hash of content.

        Args:
            content: The file content to hash.

        Returns:
            MD5 hex digest.
        """
        return hashlib.md5(content.encode("utf-8")).hexdigest()

    def has_content_changed(self, session_id: str, content: str) -> bool:
        """Check if content has changed since last check.

        Args:
            session_id: The session identifier.
            content: Current file content.

        Returns:
            True if content has changed, False if identical.
        """
        key = self._key(self.PREFIX_CONTENT_HASH, session_id)
        current_hash = self.compute_hash(content)
        stored_hash = self.client.get(key)

        if stored_hash == current_hash:
            return False

        # Update stored hash
        self.client.setex(key, self.CONTENT_HASH_TTL, current_hash)
        return True

    # ─────────────────────────────────────────────────────────────────
    # Comment History Operations
    # ─────────────────────────────────────────────────────────────────

    def get_history(self, session_id: str) -> list[str]:
        """Get recent comment history for a session.

        Args:
            session_id: The session identifier.

        Returns:
            List of recent comments (most recent last).
        """
        key = self._key(self.PREFIX_HISTORY, session_id)
        history = self.client.lrange(key, 0, -1)
        return history

    def add_to_history(self, session_id: str, comment: str) -> None:
        """Add a comment to session history.

        Args:
            session_id: The session identifier.
            comment: The comment that was spoken.
        """
        key = self._key(self.PREFIX_HISTORY, session_id)

        # Push to the right (end) of the list
        self.client.rpush(key, comment)

        # Trim to keep only the last N comments
        self.client.ltrim(key, -self.MAX_HISTORY_LENGTH, -1)

        # Reset TTL
        self.client.expire(key, self.HISTORY_TTL)

    def get_history_count(self, session_id: str) -> int:
        """Get the number of comments in history.

        Args:
            session_id: The session identifier.

        Returns:
            Number of comments in history.
        """
        key = self._key(self.PREFIX_HISTORY, session_id)
        return self.client.llen(key)

    def get_last_comment(self, session_id: str) -> Optional[str]:
        """Get the most recent comment.

        Args:
            session_id: The session identifier.

        Returns:
            The last comment or None if no history.
        """
        key = self._key(self.PREFIX_HISTORY, session_id)
        result = self.client.lrange(key, -1, -1)
        return result[0] if result else None

    # ─────────────────────────────────────────────────────────────────
    # Session Cleanup
    # ─────────────────────────────────────────────────────────────────

    def clear_session(self, session_id: str) -> int:
        """Clear all Redis keys for a session.

        Args:
            session_id: The session identifier.

        Returns:
            Number of keys deleted.
        """
        pattern = f"face_debugger:*:{session_id}"
        keys = self.client.keys(pattern)

        if keys:
            return self.client.delete(*keys)
        return 0


# Singleton instance
_redis_client: Optional[RedisClient] = None


def get_redis_client() -> RedisClient:
    """Get or create Redis client singleton."""
    global _redis_client
    if _redis_client is None:
        _redis_client = RedisClient()
    return _redis_client
