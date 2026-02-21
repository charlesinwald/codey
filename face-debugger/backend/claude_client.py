"""Anthropic Claude client for code analysis."""

import json
import os
from typing import Optional

import anthropic

from models import ClaudeAnalysis


SYSTEM_PROMPT_TEMPLATE = """You are a grumpy but brilliant senior software engineer pair programming
via a live code feed. You receive the full contents of the file the
developer is actively editing, plus their current cursor line.

SPEAK UP when you notice:
- A likely bug or unhandled edge case near the cursor or recently edited area
- A dangerous pattern (mutation, injection, race condition, off-by-one)
- A naming or readability issue severe enough to hurt future maintainers
- Something genuinely clever worth acknowledging (rarely)

STAY SILENT when:
- The code looks fine
- You already commented on this recently (check: {recent_history})
- The change is trivial (adding a blank line, fixing indentation)
- You are not confident there is actually an issue

PERSONALITY:
- Dry, understated. You have seen everything before.
- Two sentences maximum. You are not writing documentation.
- Speak as a human would on a Zoom call, not as an AI assistant.
- Examples of good output:
  "that variable name is going to haunt you at 2am."
  "wait — are you sure that handles the empty array case?"
  "oh no. you are mutating state directly. I have seen this movie."
  "...actually, that is a clean solution. huh."

CURSOR CONTEXT:
The developer is currently on line {cursor_line}. Weight your observations
toward code near this line — it is likely what they just wrote.

LANGUAGE: {language}

RECENT COMMENTS (do not repeat these topics):
{recent_history}

OUTPUT: Respond with ONLY valid JSON. No explanation, no markdown.
{{ "speak": false }}
OR
{{ "speak": true, "line": "your comment as you would say it out loud" }}"""


class ClaudeClient:
    """Wrapper for Anthropic Claude API for code analysis."""

    MODEL = "claude-sonnet-4-5-20250514"
    MAX_TOKENS = 100

    def __init__(self, api_key: Optional[str] = None):
        """Initialize Claude client.

        Args:
            api_key: Anthropic API key. Defaults to ANTHROPIC_API_KEY env var.
        """
        key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not key:
            raise ValueError("ANTHROPIC_API_KEY not set")
        self.client = anthropic.Anthropic(api_key=key)

    def analyze_code(
        self,
        file_content: str,
        cursor_line: int,
        language: str,
        recent_history: list[str],
    ) -> ClaudeAnalysis:
        """Analyze code and decide whether to comment.

        Args:
            file_content: Full content of the active file.
            cursor_line: Current cursor line number (1-indexed).
            language: Language ID (e.g., 'typescript', 'python').
            recent_history: List of recent comments to avoid repetition.

        Returns:
            ClaudeAnalysis with speak flag and optional comment line.
        """
        # Format recent history for the prompt
        if recent_history:
            history_str = "\n".join(f"- {comment}" for comment in recent_history)
        else:
            history_str = "(none yet)"

        # Build system prompt
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            cursor_line=cursor_line,
            language=language,
            recent_history=history_str,
        )

        # Build user message with file content and context
        user_message = self._build_user_message(file_content, cursor_line)

        try:
            response = self.client.messages.create(
                model=self.MODEL,
                max_tokens=self.MAX_TOKENS,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
            )

            # Extract text content
            text_content = response.content[0].text.strip()

            # Parse JSON response
            return self._parse_response(text_content)

        except anthropic.APIError as e:
            # Log error but return silent response
            print(f"Claude API error: {e}")
            return ClaudeAnalysis(speak=False)

    def _build_user_message(self, file_content: str, cursor_line: int) -> str:
        """Build the user message with file content and cursor marker.

        Args:
            file_content: Full file content.
            cursor_line: Current cursor line number (1-indexed).

        Returns:
            Formatted user message.
        """
        lines = file_content.split("\n")
        annotated_lines = []

        for i, line in enumerate(lines, start=1):
            if i == cursor_line:
                annotated_lines.append(f"{i:4d} >>> {line}")
            else:
                annotated_lines.append(f"{i:4d}     {line}")

        annotated_content = "\n".join(annotated_lines)

        return f"""Here is the current file with line numbers. The >>> marker shows the cursor position:

```
{annotated_content}
```

Analyze this code and respond with JSON only."""

    def _parse_response(self, text: str) -> ClaudeAnalysis:
        """Parse Claude's JSON response.

        Args:
            text: Raw text response from Claude.

        Returns:
            ClaudeAnalysis object.
        """
        try:
            # Clean up potential markdown code blocks
            text = text.strip()
            if text.startswith("```"):
                # Remove markdown code block wrapper
                lines = text.split("\n")
                # Remove first line (```json or ```)
                lines = lines[1:]
                # Remove last line if it's ``
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                text = "\n".join(lines)

            data = json.loads(text)

            speak = data.get("speak", False)
            line = data.get("line") if speak else None

            return ClaudeAnalysis(speak=speak, line=line)

        except (json.JSONDecodeError, KeyError, TypeError) as e:
            print(f"Failed to parse Claude response: {e}")
            print(f"Raw response: {text}")
            return ClaudeAnalysis(speak=False)


# Singleton instance
_claude_client: Optional[ClaudeClient] = None


def get_claude_client() -> ClaudeClient:
    """Get or create Claude client singleton."""
    global _claude_client
    if _claude_client is None:
        _claude_client = ClaudeClient()
    return _claude_client
