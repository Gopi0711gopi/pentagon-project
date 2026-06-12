"""
Ecomind Context Engine — Provides recent conversation context to agents.
Detects follow-up commands and injects relevant history into LLM prompts.
"""

import re
import logging
from services.history import conversation_history

logger = logging.getLogger("ecomind.services.context")

# Patterns that indicate a follow-up command
FOLLOW_UP_PATTERNS = [
    r'\bfollow\s*up\b',
    r'\bthat\s+(invoice|lead|report|client|customer|balance)\b',
    r'\bprevious\b',
    r'\blast\s+(time|command|request|result|one)\b',
    r'\bagain\b',
    r'\bmore\s+detail\b',
    r'\bwhat\s+about\b',
    r'\band\s+also\b',
    r'\bcontinue\b',
    r'\bresume\b',
    r'\bsame\s+(thing|task|command)\b',
]


def is_follow_up(task: str) -> bool:
    """Detect if a task references a previous conversation."""
    task_lower = task.lower()
    return any(re.search(pattern, task_lower) for pattern in FOLLOW_UP_PATTERNS)


def get_context(task: str, max_conversations: int = 3) -> dict:
    """
    Build context from recent conversation history.
    Returns a context dict with:
    - is_follow_up: bool
    - recent_commands: list of recent command strings
    - recent_summary: human-readable summary of recent activity
    - context_prompt: formatted string for LLM injection
    """
    recent = conversation_history.list_all(limit=max_conversations)

    if not recent:
        return {
            "is_follow_up": False,
            "recent_commands": [],
            "recent_summary": None,
            "context_prompt": None,
            "memory_active": False,
        }

    follow_up = is_follow_up(task)
    recent_commands = [c["command"] for c in recent]

    # Build a compact summary of recent conversations
    summaries = []
    for conv in recent:
        agents = ", ".join(conv.get("agents_used", []))
        summaries.append(
            f"- \"{conv['command']}\" → {agents} ({conv['trace_count']} traces, {conv.get('duration_ms', 0)}ms)"
        )
    recent_summary = "\n".join(summaries)

    # Build context prompt for LLM injection
    context_lines = ["## Recent Conversation Context"]
    context_lines.append(f"The user has had {len(recent)} recent conversations:")
    context_lines.append(recent_summary)

    if follow_up:
        context_lines.append("\n⚠️ The current request appears to be a FOLLOW-UP to a previous command.")
        context_lines.append("Use the context above to understand what the user is referring to.")

        # Get full traces from the most recent conversation for deeper context
        if recent:
            latest = conversation_history.get(recent[0]["id"])
            if latest:
                # Extract key outputs from the last conversation
                key_outputs = []
                for trace in latest.get("traces", []):
                    if trace.get("event_type") in ("agent_action", "final_response"):
                        content = trace.get("content", "")[:200]
                        key_outputs.append(f"  [{trace.get('agent', 'unknown')}]: {content}")

                if key_outputs:
                    context_lines.append("\nKey outputs from the last conversation:")
                    context_lines.extend(key_outputs[:5])  # Cap at 5 for prompt size

    context_prompt = "\n".join(context_lines)

    logger.info("🧠 Context engine: follow_up=%s, recent=%d conversations", follow_up, len(recent))

    return {
        "is_follow_up": follow_up,
        "recent_commands": recent_commands,
        "recent_summary": recent_summary,
        "context_prompt": context_prompt,
        "memory_active": True,
    }
