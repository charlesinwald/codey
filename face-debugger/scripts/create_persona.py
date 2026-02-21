#!/usr/bin/env python3
"""
One-time script to create a Tavus persona for Face-to-Face Debugging.
Run this once, then copy the printed persona_id into your backend/.env file.

Usage:
    export TAVUS_API_KEY=your_api_key
    python create_persona.py
"""

import os
import sys
import json
import requests

TAVUS_API_URL = "https://tavusapi.com/v2/personas"

PERSONA_CONFIG = {
    "persona_name": "Face Debugger",
    "system_prompt": """You are a grumpy but brilliant senior software engineer acting as a pair programming partner.
You speak in short, dry observations — never more than two sentences.
You've seen every bug before and are mildly exasperated but ultimately helpful.
You communicate as a human colleague would on a video call, not as an AI assistant.
When asked questions directly, answer concisely with practical advice.
Examples of your style:
- "That's going to break in production. Trust me."
- "Ah, the classic off-by-one. We've all been there."
- "Actually... that's not bad. I'm almost impressed."
""",
    "context": """This persona is used for a VS Code extension that watches developers code in real-time.
The avatar receives code analysis from Claude and speaks observations about potential bugs,
dangerous patterns, or occasionally acknowledges good solutions.
The tone should feel like a senior colleague doing a casual code review over video chat.""",
    "default_replica_id": os.environ.get("TAVUS_REPLICA_ID", "rf4e9d9790f0"),
    "layers": {
        "llm": {
            "model": "tavus-llama",
            "speculative_inference": True
        },
        "tts": {
            "tts_engine": "cartesia",
            "playht_voice_id": None,
            "cartesia_voice_id": "a0e99841-438c-4a64-b679-ae501e7d6091"
        }
    }
}


def create_persona():
    api_key = os.environ.get("TAVUS_API_KEY")

    if not api_key:
        print("Error: TAVUS_API_KEY environment variable not set")
        print("Usage: export TAVUS_API_KEY=your_api_key && python create_persona.py")
        sys.exit(1)

    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json"
    }

    print("Creating Tavus persona...")
    print(f"Config: {json.dumps(PERSONA_CONFIG, indent=2)}")
    print()

    try:
        response = requests.post(
            TAVUS_API_URL,
            headers=headers,
            json=PERSONA_CONFIG,
            timeout=30
        )
        response.raise_for_status()

        data = response.json()
        persona_id = data.get("persona_id")

        print("=" * 60)
        print("SUCCESS! Persona created.")
        print("=" * 60)
        print()
        print(f"Persona ID: {persona_id}")
        print()
        print("Add this to your backend/.env file:")
        print(f"TAVUS_PERSONA_ID={persona_id}")
        print()
        print("Full response:")
        print(json.dumps(data, indent=2))

        return persona_id

    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e}")
        print(f"Response: {e.response.text}")
        sys.exit(1)
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        sys.exit(1)


def list_personas():
    """Helper function to list existing personas."""
    api_key = os.environ.get("TAVUS_API_KEY")

    if not api_key:
        print("Error: TAVUS_API_KEY environment variable not set")
        sys.exit(1)

    headers = {
        "x-api-key": api_key,
    }

    try:
        response = requests.get(
            TAVUS_API_URL,
            headers=headers,
            timeout=30
        )
        response.raise_for_status()

        data = response.json()
        print("Existing personas:")
        print(json.dumps(data, indent=2))

    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--list":
        list_personas()
    else:
        create_persona()
