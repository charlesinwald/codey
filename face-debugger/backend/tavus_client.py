"""Tavus API client for avatar conversations."""

import os
from typing import Optional

import httpx


class TavusClient:
    """Wrapper for Tavus API for creating conversations and triggering speech."""

    BASE_URL = "https://tavusapi.com/v2"

    def __init__(
        self,
        api_key: Optional[str] = None,
        replica_id: Optional[str] = None,
        persona_id: Optional[str] = None,
    ):
        """Initialize Tavus client.

        Args:
            api_key: Tavus API key. Defaults to TAVUS_API_KEY env var.
            replica_id: Tavus replica ID. Defaults to TAVUS_REPLICA_ID env var.
            persona_id: Tavus persona ID. Defaults to TAVUS_PERSONA_ID env var.
        """
        self.api_key = api_key or os.environ.get("TAVUS_API_KEY")
        self.replica_id = replica_id or os.environ.get("TAVUS_REPLICA_ID")
        self.persona_id = persona_id or os.environ.get("TAVUS_PERSONA_ID")

        if not self.api_key:
            raise ValueError("TAVUS_API_KEY not set")
        if not self.replica_id:
            raise ValueError("TAVUS_REPLICA_ID not set")
        if not self.persona_id:
            raise ValueError("TAVUS_PERSONA_ID not set")

        self.headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
        }

    async def create_conversation(
        self,
        conversation_name: Optional[str] = None,
        custom_greeting: Optional[str] = None,
    ) -> dict:
        """Create a new Tavus CVI conversation.

        Args:
            conversation_name: Optional name for the conversation.
            custom_greeting: Optional custom greeting message.

        Returns:
            Dict with conversation_id and conversation_url.

        Raises:
            httpx.HTTPStatusError: If API request fails.
        """
        url = f"{self.BASE_URL}/conversations"

        payload = {
            "replica_id": self.replica_id,
            "persona_id": self.persona_id,
            "conversation_name": conversation_name or "Face Debugger Session",
            "conversational_context": "You are pair programming with a developer. Watch their code and offer observations when appropriate.",
            "properties": {
                "max_call_duration": 14400,  # 4 hours max
                "participant_left_timeout": 300,  # 5 min timeout if participant leaves
                "enable_recording": False,
                "apply_greenscreen": False,
            },
        }

        if custom_greeting:
            payload["custom_greeting"] = custom_greeting

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers=self.headers,
                json=payload,
                timeout=30.0,
            )
            response.raise_for_status()

            data = response.json()

            return {
                "conversation_id": data["conversation_id"],
                "conversation_url": data["conversation_url"],
            }

    async def speak(self, conversation_id: str, text: str) -> bool:
        """Make the avatar speak a specific line.

        Uses the Tavus Interactions Protocol to inject speech into an
        active CVI session from the backend.

        Args:
            conversation_id: The active conversation ID.
            text: The text for the avatar to speak.

        Returns:
            True if successful, False otherwise.
        """
        url = f"{self.BASE_URL}/conversations/{conversation_id}/say"

        payload = {
            "text": text,
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url,
                    headers=self.headers,
                    json=payload,
                    timeout=30.0,
                )
                response.raise_for_status()
                return True

            except httpx.HTTPStatusError as e:
                print(f"Tavus speak error: {e.response.status_code} - {e.response.text}")
                return False
            except httpx.RequestError as e:
                print(f"Tavus request error: {e}")
                return False

    async def end_conversation(self, conversation_id: str) -> bool:
        """End an active conversation.

        Args:
            conversation_id: The conversation ID to end.

        Returns:
            True if successful, False otherwise.
        """
        url = f"{self.BASE_URL}/conversations/{conversation_id}/end"

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url,
                    headers=self.headers,
                    timeout=30.0,
                )
                response.raise_for_status()
                return True

            except httpx.HTTPStatusError as e:
                print(f"Tavus end conversation error: {e.response.status_code}")
                return False
            except httpx.RequestError as e:
                print(f"Tavus request error: {e}")
                return False

    async def get_conversation(self, conversation_id: str) -> Optional[dict]:
        """Get conversation details.

        Args:
            conversation_id: The conversation ID.

        Returns:
            Conversation details dict or None if not found.
        """
        url = f"{self.BASE_URL}/conversations/{conversation_id}"

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    headers=self.headers,
                    timeout=30.0,
                )
                response.raise_for_status()
                return response.json()

            except httpx.HTTPStatusError:
                return None
            except httpx.RequestError:
                return None


# Singleton instance
_tavus_client: Optional[TavusClient] = None


def get_tavus_client() -> TavusClient:
    """Get or create Tavus client singleton."""
    global _tavus_client
    if _tavus_client is None:
        _tavus_client = TavusClient()
    return _tavus_client
