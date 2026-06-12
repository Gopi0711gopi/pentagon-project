"""
Pre-Execution Hooks — Scans every agent action before it executes.
Implements the "thought → filter → action" pipeline.
"""

import logging
from dataclasses import dataclass, field
from typing import Optional


def security_check(task, user_id):
    """Legacy compatibility wrapper — real security now in HookPipeline."""
    from security.prompt_guard import prompt_guard
    prompt_guard.validate(task)
    return True

logger = logging.getLogger("ecomind.security.hooks")


@dataclass
class HookResult:
    """Result of a pre-execution hook check."""
    allowed: bool
    reason: str = ""
    severity: str = "info"  # info, warning, critical
    hook_name: str = ""
    details: Optional[dict] = field(default_factory=dict)


class PreExecutionHook:
    """Base class for all pre-execution hooks."""

    name: str = "base_hook"

    async def check(self, action: dict) -> HookResult:
        """
        Check if an action should be allowed.

        Args:
            action: Dict with keys: agent, action_type, tool, params, raw_input
        Returns:
            HookResult with allowed=True/False
        """
        raise NotImplementedError


class HookPipeline:
    """
    Runs all registered hooks in sequence.
    If ANY hook blocks, the entire action is blocked.
    """

    def __init__(self):
        self._hooks: list[PreExecutionHook] = []
        self._event_log: list[dict] = []

    def register(self, hook: PreExecutionHook):
        """Add a hook to the pipeline."""
        self._hooks.append(hook)
        logger.info("🔗 Registered security hook: %s", hook.name)

    async def execute(self, action: dict) -> HookResult:
        """
        Run all hooks against the proposed action.

        Returns the first blocking result, or an allow result if all pass.
        """
        results = []

        for hook in self._hooks:
            try:
                result = await hook.check(action)
                result.hook_name = hook.name
                results.append(result)

                if not result.allowed:
                    logger.warning(
                        "🚫 Hook BLOCKED action: [%s] %s — reason: %s (severity: %s)",
                        hook.name,
                        action.get("action_type", "unknown"),
                        result.reason,
                        result.severity,
                    )
                    self._event_log.append({
                        "hook": hook.name,
                        "action": action,
                        "result": "blocked",
                        "reason": result.reason,
                        "severity": result.severity,
                    })
                    return result
            except Exception as e:
                logger.error("❌ Hook error: [%s] — %s", hook.name, e)
                # Fail-safe: block on hook errors
                return HookResult(
                    allowed=False,
                    reason=f"Hook '{hook.name}' errored: {e}",
                    severity="critical",
                    hook_name=hook.name,
                )

        logger.debug("✅ All hooks passed for action: %s", action.get("action_type", "unknown"))
        self._event_log.append({
            "action": action,
            "result": "allowed",
            "hooks_passed": len(self._hooks),
        })

        return HookResult(
            allowed=True,
            reason="All hooks passed",
            severity="info",
        )

    def get_event_log(self, limit: int = 50) -> list[dict]:
        """Return recent hook events."""
        return self._event_log[-limit:]

    def stats(self) -> dict:
        """Return hook pipeline statistics."""
        blocked = sum(1 for e in self._event_log if e.get("result") == "blocked")
        return {
            "hooks_registered": len(self._hooks),
            "total_checks": len(self._event_log),
            "blocked_actions": blocked,
            "allowed_actions": len(self._event_log) - blocked,
        }
