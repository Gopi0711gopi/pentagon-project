"""
Ecomind Security — Pre-execution hook to scan every agent action.
"""

from security.hooks import HookPipeline, PreExecutionHook, HookResult
from security.prompt_guard import prompt_guard
from security.permission_manager import permission_manager

__all__ = ["HookPipeline", "PreExecutionHook", "HookResult", "prompt_guard", "permission_manager"]
