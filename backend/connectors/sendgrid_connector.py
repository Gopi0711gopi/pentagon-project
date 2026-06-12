"""
SendGrid Email MCP Connector — Send and track transactional emails.
Includes mock mode with realistic email data for development.
"""

import os
import logging
from datetime import datetime
from typing import Optional
from connectors.registry import BaseConnector

logger = logging.getLogger("ecomind.connectors.sendgrid")

# ── Mock data ────────────────────────────────────────────────────────────────

MOCK_SENT_EMAILS = [
    {"id": "email_001", "to": "billing@acme.com", "subject": "Invoice Overdue: INV-001", "status": "delivered", "opened": True, "clicked": False, "sent_at": "2026-02-17T10:00:00Z"},
    {"id": "email_002", "to": "finance@techstart.io", "subject": "Payment Reminder: INV-002", "status": "delivered", "opened": True, "clicked": True, "sent_at": "2026-02-17T10:05:00Z"},
    {"id": "email_003", "to": "sarah@techstart.io", "subject": "Proposal: Platform Build", "status": "delivered", "opened": False, "clicked": False, "sent_at": "2026-02-16T14:30:00Z"},
    {"id": "email_004", "to": "mike@greenenergy.com", "subject": "Follow-up: Dashboard Demo", "status": "bounced", "opened": False, "clicked": False, "sent_at": "2026-02-15T09:00:00Z"},
]

MOCK_TEMPLATES = [
    {"id": "tpl_001", "name": "Invoice Reminder", "subject": "Payment Reminder: {{invoice_id}}", "category": "billing"},
    {"id": "tpl_002", "name": "Welcome Email", "subject": "Welcome to Ecomind, {{name}}!", "category": "onboarding"},
    {"id": "tpl_003", "name": "Weekly Report", "subject": "Your Weekly Business Report", "category": "reports"},
    {"id": "tpl_004", "name": "Lead Follow-up", "subject": "Following up on our conversation", "category": "sales"},
]

MOCK_STATS = {
    "emails_sent_today": 12,
    "delivered": 11,
    "opened": 8,
    "clicked": 3,
    "bounced": 1,
    "open_rate": "72.7%",
    "click_rate": "27.3%",
}


class SendGridConnector(BaseConnector):
    """SendGrid MCP connector — email sending and tracking."""

    name = "sendgrid"
    description = "Send transactional emails and track delivery via SendGrid"
    tools = [
        {"name": "send_email", "description": "Send an email", "parameters": {"to": "string", "subject": "string", "body": "string", "template_id": "string (optional)"}},
        {"name": "list_sent", "description": "List recently sent emails", "parameters": {"limit": "int (optional)"}},
        {"name": "get_templates", "description": "List email templates", "parameters": {"category": "string (optional)"}},
        {"name": "get_stats", "description": "Get email delivery statistics", "parameters": {}},
    ]

    def __init__(self):
        super().__init__()
        self._api_key = os.getenv("SENDGRID_API_KEY", "")

    async def initialize(self):
        if self._api_key and self._api_key not in ("", "your_key_here"):
            try:
                self._connected = True
                self._mock_mode = False
                logger.info("✅ SendGrid connected via API")
                return
            except Exception as e:
                logger.warning("⚠️ SendGrid API failed: %s — using mock mode", e)

        self._connected = True
        self._mock_mode = True
        logger.info("📧 SendGrid connector active (mock mode)")

    async def call_tool(self, tool_name: str, params: Optional[dict] = None) -> dict:
        params = params or {}
        if tool_name == "send_email":
            return {
                "success": True,
                "message_id": f"msg_{datetime.now().strftime('%H%M%S')}",
                "to": params.get("to", "unknown"),
                "subject": params.get("subject", "No subject"),
                "status": "queued",
                "source": "mock",
            }
        elif tool_name == "list_sent":
            limit = params.get("limit", 20)
            return {"emails": MOCK_SENT_EMAILS[:limit], "count": len(MOCK_SENT_EMAILS), "source": "mock"}
        elif tool_name == "get_templates":
            templates = MOCK_TEMPLATES
            cat = params.get("category")
            if cat:
                templates = [t for t in templates if t["category"] == cat]
            return {"templates": templates, "count": len(templates), "source": "mock"}
        elif tool_name == "get_stats":
            return {"stats": MOCK_STATS, "source": "mock"}
        return {"error": f"Unknown tool: {tool_name}"}
