"""ElevenLabs text-to-speech client for Face Debugger."""

import os
from typing import Optional

from dotenv import load_dotenv
import httpx

# Load environment variables
load_dotenv()


class ElevenLabsClient:
    """Handles text-to-speech using ElevenLabs API."""

    BASE_URL = "https://api.elevenlabs.io/v1"

    # Default voice - "Adam" is a good neutral male voice
    # You can change this to any ElevenLabs voice ID
    DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB"  # Adam

    # Alternative voices:
    # "21m00Tcm4TlvDq8ikWAM" - Rachel (female)
    # "AZnzlk1XvdvUeBnXmlld" - Domi (female)
    # "EXAVITQu4vr4xnSDxMaL" - Bella (female)
    # "ErXwobaYiN019PkySvjV" - Antoni (male)
    # "MF3mGyEYCl7XYWbV9V6O" - Elli (female)
    # "TxGEqnHWrfWFTfGW9XjX" - Josh (male)
    # "VR6AewLTigWG4xSOukaG" - Arnold (male)
    # "pNInz6obpgDQGcFmaJgB" - Adam (male)
    # "yoZ06aMxZJJ28mfd3POQ" - Sam (male)

    def __init__(self, api_key: Optional[str] = None, voice_id: Optional[str] = None):
        """Initialize ElevenLabs client.

        Args:
            api_key: ElevenLabs API key. Defaults to ELEVENLABS_API_KEY env var.
            voice_id: Voice ID to use. Defaults to Adam.
        """
        self.api_key = (api_key or os.environ.get("ELEVENLABS_API_KEY", "")).strip()
        if not self.api_key:
            raise ValueError("ELEVENLABS_API_KEY environment variable not set")

        self.voice_id = voice_id or os.environ.get("ELEVENLABS_VOICE_ID", self.DEFAULT_VOICE_ID)
        self.client = httpx.Client(timeout=30.0)

    def text_to_speech(
        self,
        text: str,
        voice_id: Optional[str] = None,
        model_id: str = "eleven_turbo_v2_5",
        stability: float = 0.5,
        similarity_boost: float = 0.75,
    ) -> bytes:
        """Convert text to speech audio.

        Args:
            text: The text to convert to speech.
            voice_id: Optional voice ID override.
            model_id: ElevenLabs model to use. Options:
                - eleven_turbo_v2_5 (fastest, good quality)
                - eleven_multilingual_v2 (best quality, slower)
                - eleven_monolingual_v1 (legacy)
            stability: Voice stability (0-1). Lower = more expressive.
            similarity_boost: Voice clarity (0-1). Higher = clearer.

        Returns:
            Audio data as bytes (MP3 format).
        """
        voice = voice_id or self.voice_id
        url = f"{self.BASE_URL}/text-to-speech/{voice}"

        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key,
        }

        payload = {
            "text": text,
            "model_id": model_id,
            "voice_settings": {
                "stability": stability,
                "similarity_boost": similarity_boost,
            },
        }

        response = self.client.post(url, json=payload, headers=headers)

        if response.status_code == 401:
            raise ValueError("Invalid ElevenLabs API key. Please check your ELEVENLABS_API_KEY.")
        elif response.status_code == 422:
            error_detail = response.json().get("detail", {})
            raise ValueError(f"ElevenLabs validation error: {error_detail}")

        response.raise_for_status()

        return response.content

    def text_to_speech_stream(
        self,
        text: str,
        voice_id: Optional[str] = None,
        model_id: str = "eleven_turbo_v2_5",
    ):
        """Stream text to speech audio.

        Args:
            text: The text to convert to speech.
            voice_id: Optional voice ID override.
            model_id: ElevenLabs model to use.

        Yields:
            Audio data chunks as bytes.
        """
        voice = voice_id or self.voice_id
        url = f"{self.BASE_URL}/text-to-speech/{voice}/stream"

        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key,
        }

        payload = {
            "text": text,
            "model_id": model_id,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
            },
        }

        with self.client.stream("POST", url, json=payload, headers=headers) as response:
            response.raise_for_status()
            for chunk in response.iter_bytes():
                yield chunk

    def get_voices(self) -> list[dict]:
        """Get available voices.

        Returns:
            List of voice dictionaries with id, name, etc.
        """
        url = f"{self.BASE_URL}/voices"
        headers = {"xi-api-key": self.api_key}

        response = self.client.get(url, headers=headers)
        response.raise_for_status()

        return response.json().get("voices", [])


# Singleton instance
_elevenlabs_client: Optional[ElevenLabsClient] = None


def get_elevenlabs_client() -> ElevenLabsClient:
    """Get or create ElevenLabs client singleton."""
    global _elevenlabs_client
    if _elevenlabs_client is None:
        _elevenlabs_client = ElevenLabsClient()
    return _elevenlabs_client


def reset_elevenlabs_client() -> None:
    """Reset the singleton (useful if API key changes)."""
    global _elevenlabs_client
    _elevenlabs_client = None
