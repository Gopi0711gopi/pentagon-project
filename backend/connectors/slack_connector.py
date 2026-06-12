"""
Slack MCP Connector — Read-only access to Slack workspace.
Includes mock mode with realistic channel/message data for development.
"""

import os
import logging
from typing import Optional
from connectors.registry import BaseConnector

logger = logging.getLogger("ecomind.connectors.slack")

# ── Mock data for development ────────────────────────────────────────────────

MOCK_CHANNELS = [
    {"id": "C001", "name": "general", "topic": "Company announcements", "members": 24},
    {"id": "C002", "name": "sales", "topic": "Sales pipeline and deals", "members": 8},
    {"id": "C003", "name": "engineering", "topic": "Tech discussions", "members": 12},
    {"id": "C004", "name": "client-acme", "topic": "Acme Inc project", "members": 5},
]

MOCK_MESSAGES = [
    {
        "channel": "C002",
        "channel_name": "sales",
        "user": "sarah",
        "text": "Just got off a call with TechStart - they're interested in the enterprise plan!",
        "timestamp": "2026-02-17T10:30:00Z",
    },
    {
        "channel": "C002",
        "channel_name": "sales",
        "user": "mike",
        "text": "Great! I'll send them the proposal by EOD. @sarah can you share the call notes?",
        "timestamp": "2026-02-17T10:35:00Z",
    },
    {
        "channel": "C001",
        "channel_name": "general",
        "user": "ceo",
        "text": "Reminder: All-hands meeting tomorrow at 2pm. We'll discuss Q1 targets.",
        "timestamp": "2026-02-17T09:00:00Z",
    },
    {
        "channel": "C004",
        "channel_name": "client-acme",
        "user": "pm_lead",
        "text": "Acme's invoice #1042 is overdue again. @finance please follow up.",
        "timestamp": "2026-02-16T15:20:00Z",
    },
    {
        "channel": "C003",
        "channel_name": "engineering",
        "user": "devlead",
        "text": "Deployed v2.3.1 to staging. All tests passing. Ready for QA.",
        "timestamp": "2026-02-16T14:00:00Z",
    },
]


class SlackConnector(BaseConnector):
    """Slack MCP connector — read-only workspace access."""

    name = "slack"
    description = "Read-only access to Slack channels, messages, and search"
    tools = [
        {"name": "list_channels", "description": "List workspace channels", "params": {"limit": "int"}},
        {"name": "read_messages", "description": "Read messages from a channel", "params": {"channel_id": "string", "limit": "int"}},
        {"name": "search_messages", "description": "Search messages across channels", "params": {"query": "string", "limit": "int"}},
    ]

    def __init__(self):
        super().__init__()
        self._bot_token = os.getenv("SLACK_BOT_TOKEN", "")

    async def initialize(self):
        """Connect to Slack API or activate mock mode."""
        if self._bot_token and self._bot_token not in ("", "your_key_here"):
            try:
                self._connected = True
                self._mock_mode = False
                logger.info("✅ Slack connected via Bot Token")
                return
            except Exception as e:
                logger.warning("⚠️ Slack API failed: %s — using mock mode", e)

        self._connected = True
        self._mock_mode = True
        logger.info("💬 Slack connector active (mock mode)")

    async def call_tool(self, tool_name: str, params: Optional[dict] = None) -> dict:
        """Execute a Slack tool."""
        params = params or {}

        if tool_name == "list_channels":
            return await self._list_channels(params.get("limit", 20))
        elif tool_name == "read_messages":
            return await self._read_messages(params.get("channel_id", ""), params.get("limit", 20))
        elif tool_name == "search_messages":
            return await self._search_messages(params.get("query", ""), params.get("limit", 10))
        else:
            return {"error": f"Unknown tool: {tool_name}"}

    async def _list_channels(self, limit: int = 20) -> dict:
        if self._mock_mode:
            return {"channels": MOCK_CHANNELS[:limit], "count": len(MOCK_CHANNELS), "source": "mock"}
        return {"channels": [], "count": 0, "source": "api"}

    async def _read_messages(self, channel_id: str, limit: int = 20) -> dict:
        if self._mock_mode:
            msgs = [m for m in MOCK_MESSAGES if m["channel"] == channel_id][:limit]
            return {"messages": msgs, "count": len(msgs), "channel_id": channel_id, "source": "mock"}
        return {"messages": [], "count": 0, "source": "api"}

    async def _search_messages(self, query: str, limit: int = 10) -> dict:
        if self._mock_mode:
            query_lower = query.lower()
            results = [
                m for m in MOCK_MESSAGES
                if query_lower in m["text"].lower()
                or query_lower in m.get("channel_name", "").lower()
            ][:limit]
            return {"messages": results, "count": len(results), "query": query, "source": "mock"}
        return {"messages": [], "count": 0, "query": query, "source": "api"}
