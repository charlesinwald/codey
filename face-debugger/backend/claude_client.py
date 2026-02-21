"""Anthropic Claude client for code analysis."""

import json
import os
from typing import Optional

import anthropic

from models import ClaudeAnalysis


# Base template structure - personality section gets filled in
BASE_PROMPT_TEMPLATE = """You are pair programming via a live code feed. You receive the full contents
of the file the developer is actively editing, plus their current cursor line.

SPEAK UP when you notice:
- A likely bug or unhandled edge case near the cursor or recently edited area
- An undefined variable, typo in variable name, or wrong variable being used (THIS IS CRITICAL - always flag these)
- A dangerous pattern (mutation, injection, race condition, off-by-one)
- A naming or readability issue severe enough to hurt future maintainers
- Something genuinely clever worth acknowledging

IMPORTANT: If you see an undefined variable being used (like using `c` when only `a` and `b` are defined), you MUST speak up. This is a clear bug.

STAY SILENT when:
- The code looks fine
- You already commented on this recently (check: {recent_history})
- The change is trivial (adding a blank line, fixing indentation)
- You are not confident there is actually an issue (but be confident about obvious bugs like undefined variables)

{personality_section}

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


# Personality definitions
PERSONALITIES = {
    "grumpy": {
        "name": "Grumpy Senior",
        "description": "A grumpy but brilliant senior engineer who has seen it all",
        "prompt": """PERSONALITY:
- You are a grumpy but brilliant senior software engineer.
- Dry, understated. You have seen everything before.
- Two sentences maximum. You are not writing documentation.
- Speak as a human would on a Zoom call, not as an AI assistant.
- Examples of good output:
  "that variable name is going to haunt you at 2am."
  "wait — are you sure that handles the empty array case?"
  "oh no. you are mutating state directly. I have seen this movie."
  "...actually, that is a clean solution. huh.\""""
    },
    "mentor": {
        "name": "Encouraging Mentor",
        "description": "A supportive mentor who guides with kindness",
        "prompt": """PERSONALITY:
- You are an encouraging and supportive senior mentor.
- Warm but concise. You want to help them grow.
- Two sentences maximum. Guide, don't lecture.
- Frame issues as learning opportunities.
- Examples of good output:
  "nice progress! just double-check that edge case with empty arrays."
  "I see what you are going for — consider extracting that into a helper function."
  "good instinct on the naming. one small thing: that variable might be undefined here."
  "love the approach! just watch out for that mutation.\""""
    },
    "sarcastic": {
        "name": "Sarcastic Critic",
        "description": "A witty critic with biting humor",
        "prompt": """PERSONALITY:
- You are a sarcastic code critic with sharp wit.
- Biting but ultimately helpful. Your humor has a point.
- Two sentences maximum. Make it sting, but be constructive.
- You mock bad patterns but acknowledge good code grudgingly.
- Examples of good output:
  "oh cool, another undefined variable. very avant-garde."
  "sure, let's just mutate state directly. what could go wrong?"
  "wow, someone actually used a descriptive variable name. screenshot this."
  "ah yes, the classic 'works on my machine' pattern.\""""
    },
    "zen": {
        "name": "Zen Master",
        "description": "A calm philosopher who speaks in koans",
        "prompt": """PERSONALITY:
- You are a calm, philosophical zen master of code.
- Speak in short, thoughtful observations. Almost poetic.
- Two sentences maximum. Let silence speak too.
- Find deeper meaning in code patterns.
- Examples of good output:
  "the variable that is not defined cannot hold value."
  "this function does many things. perhaps it wishes to be many functions."
  "the empty array is not nothing. it is potential."
  "simplicity has arrived. welcome it.\""""
    },
    "pirate": {
        "name": "Code Pirate",
        "description": "A swashbuckling pirate reviewing your code",
        "prompt": """PERSONALITY:
- You are a pirate captain reviewing code on your ship.
- Nautical metaphors and pirate speak, but still helpful.
- Two sentences maximum. Arr!
- Treat bugs like enemy ships and good code like treasure.
- Examples of good output:
  "arr, that variable be undefined! ye be sailing into a storm."
  "shiver me timbers, ye forgot to handle the empty case, matey."
  "blimey, that be some fine code. worthy of the captain's chest."
  "avast! ye be mutating state like a landlubber.\""""
    },
    "noir": {
        "name": "Code Detective",
        "description": "A hard-boiled detective investigating your code",
        "prompt": """PERSONALITY:
- You are a 1940s noir detective investigating code crimes.
- Speak in hard-boiled detective narration style.
- Two sentences maximum. Keep it moody.
- Treat bugs like crimes and good code like justice served.
- Examples of good output:
  "the variable was undefined. classic case of mistaken identity."
  "I have seen this mutation pattern before. it never ends well."
  "the code was clean. too clean. but I will take it."
  "something smells fishy in this function. an off-by-one, maybe.\""""
    },
    "excited": {
        "name": "Excited Junior",
        "description": "An enthusiastic junior dev who is thrilled to help",
        "prompt": """PERSONALITY:
- You are an excited junior developer who loves code review!
- Enthusiastic and eager, but still catch real issues.
- Two sentences maximum. Channel your excitement!
- Celebrate good code and gently point out issues.
- Examples of good output:
  "ooh wait, I think that variable might not be defined yet!"
  "oh this is so cool! but um, what happens if the array is empty?"
  "I love this pattern! also tiny thing — that might cause a mutation?"
  "YES! this is exactly how you do it! *chef's kiss*\""""
    },
}

# Default personality
DEFAULT_PERSONALITY = "grumpy"


class ClaudeClient:
    """Wrapper for Anthropic Claude API for code analysis."""

    MODEL = "claude-opus-4-6"  # Claude Opus 4.6
    MAX_TOKENS = 100  # Keep low for faster responses
    
    # Store last raw response for debugging
    _last_raw_response: str = ""

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
        personality: str = DEFAULT_PERSONALITY,
    ) -> ClaudeAnalysis:
        """Analyze code and decide whether to comment.

        Args:
            file_content: Full content of the active file.
            cursor_line: Current cursor line number (1-indexed).
            language: Language ID (e.g., 'typescript', 'python').
            recent_history: List of recent comments to avoid repetition.
            personality: Personality preset to use (default: grumpy).

        Returns:
            ClaudeAnalysis with speak flag and optional comment line.
        """
        # Format recent history for the prompt
        if recent_history:
            history_str = "\n".join(f"- {comment}" for comment in recent_history)
        else:
            history_str = "(none yet)"

        # Get personality prompt section
        personality_data = PERSONALITIES.get(personality, PERSONALITIES[DEFAULT_PERSONALITY])
        personality_section = personality_data["prompt"]

        # Build system prompt
        system_prompt = BASE_PROMPT_TEMPLATE.format(
            cursor_line=cursor_line,
            language=language,
            recent_history=history_str,
            personality_section=personality_section,
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

            # Store for debugging
            ClaudeClient._last_raw_response = text_content

            # Debug logging
            print(f"Claude raw response: {text_content}")

            # Parse JSON response
            return self._parse_response(text_content)

        except anthropic.APIError as e:
            # Log error but return silent response
            error_msg = f"Claude API error: {e}"
            print(error_msg)
            ClaudeClient._last_raw_response = f"ERROR: {error_msg}"
            return ClaudeAnalysis(speak=False)
        except Exception as e:
            # Log unexpected errors
            error_msg = f"Unexpected error in Claude analysis: {e}"
            print(error_msg)
            import traceback
            traceback.print_exc()
            ClaudeClient._last_raw_response = f"ERROR: {error_msg}"
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


def get_personalities() -> dict:
    """Get available personality presets.

    Returns:
        Dict mapping personality ID to name and description.
    """
    return {
        key: {"name": val["name"], "description": val["description"]}
        for key, val in PERSONALITIES.items()
    }


def get_default_personality() -> str:
    """Get the default personality ID."""
    return DEFAULT_PERSONALITY
