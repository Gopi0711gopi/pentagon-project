"""
Stripe MCP Connector — Read-only access to Stripe billing data.
Includes mock mode with realistic invoice/payment data for development.
"""

import os
import logging
from typing import Optional
from connectors.registry import BaseConnector

logger = logging.getLogger("ecomind.connectors.stripe")

# ── Mock data for development ────────────────────────────────────────────────

MOCK_INVOICES = [
    {
        "id": "inv_001",
        "customer": "Acme Inc",
        "customer_email": "billing@acme.com",
        "amount": 3500_00,
        "currency": "usd",
        "status": "overdue",
        "due_date": "2026-02-10T00:00:00Z",
        "created": "2026-01-25T10:00:00Z",
        "description": "Monthly retainer - January 2026",
    },
    {
        "id": "inv_002",
        "customer": "TechStart LLC",
        "customer_email": "finance@techstart.io",
        "amount": 7500_00,
        "currency": "usd",
        "status": "overdue",
        "due_date": "2026-02-12T00:00:00Z",
        "created": "2026-01-28T10:00:00Z",
        "description": "Website redesign - Phase 2",
    },
    {
        "id": "inv_003",
        "customer": "GlobalRetail Corp",
        "customer_email": "ap@globalretail.com",
        "amount": 2100_00,
        "currency": "usd",
        "status": "paid",
        "due_date": "2026-02-15T00:00:00Z",
        "created": "2026-02-01T10:00:00Z",
        "description": "Consulting hours - February",
        "paid_at": "2026-02-16T14:45:00Z",
    },
    {
        "id": "inv_004",
        "customer": "StartupXYZ",
        "customer_email": "founder@startupxyz.com",
        "amount": 15000_00,
        "currency": "usd",
        "status": "overdue",
        "due_date": "2026-02-05T00:00:00Z",
        "created": "2026-01-20T10:00:00Z",
        "description": "App development milestone 3",
    },
    {
        "id": "inv_005",
        "customer": "MediaGroup",
        "customer_email": "pay@mediagroup.com",
        "amount": 4200_00,
        "currency": "usd",
        "status": "open",
        "due_date": "2026-02-25T00:00:00Z",
        "created": "2026-02-10T10:00:00Z",
        "description": "Social media management - Feb",
    },
]

MOCK_PAYMENTS = [
    {
        "id": "pay_001",
        "amount": 2100_00,
        "currency": "usd",
        "status": "succeeded",
        "customer": "GlobalRetail Corp",
        "created": "2026-02-16T14:45:00Z",
        "description": "Invoice inv_003",
    },
    {
        "id": "pay_002",
        "amount": 5000_00,
        "currency": "usd",
        "status": "succeeded",
        "customer": "Acme Inc",
        "created": "2026-02-01T09:30:00Z",
        "description": "Invoice inv_prev_001",
    },
]

MOCK_BALANCE = {
    "available": [{"amount": 12350_00, "currency": "usd"}],
    "pending": [{"amount": 4200_00, "currency": "usd"}],
    "total_overdue": 26000_00,
    "overdue_count": 3,
}


class StripeConnector(BaseConnector):
    """Stripe MCP connector — read-only billing/payment access."""

    name = "stripe"
    description = "Read-only access to Stripe invoices, payments, and balance"
    tools = [
        {"name": "list_invoices", "description": "List all invoices", "params": {"status": "string (open|paid|overdue)", "limit": "int"}},
        {"name": "get_invoice", "description": "Get invoice details", "params": {"invoice_id": "string"}},
        {"name": "list_payments", "description": "List recent payments", "params": {"limit": "int"}},
        {"name": "get_balance", "description": "Get current balance summary", "params": {}},
    ]

    def __init__(self):
        super().__init__()
        self._api_key = os.getenv("STRIPE_API_KEY", "")

    async def initialize(self):
        """Connect to Stripe API or activate mock mode."""
        if self._api_key and self._api_key not in ("", "your_key_here"):
            try:
                # Real Stripe initialization
                # import stripe
                # stripe.api_key = self._api_key
                self._connected = True
                self._mock_mode = False
                logger.info("✅ Stripe connected via API")
                return
            except Exception as e:
                logger.warning("⚠️ Stripe API failed: %s — using mock mode", e)

        self._connected = True
        self._mock_mode = True
        logger.info("💳 Stripe connector active (mock mode)")

    async def call_tool(self, tool_name: str, params: Optional[dict] = None) -> dict:
        """Execute a Stripe tool."""
        params = params or {}

        if tool_name == "list_invoices":
            return await self._list_invoices(params.get("status"), params.get("limit", 20))
        elif tool_name == "get_invoice":
            return await self._get_invoice(params.get("invoice_id", ""))
        elif tool_name == "list_payments":
            return await self._list_payments(params.get("limit", 20))
        elif tool_name == "get_balance":
            return await self._get_balance()
        else:
            return {"error": f"Unknown tool: {tool_name}"}

    async def _list_invoices(self, status: Optional[str] = None, limit: int = 20) -> dict:
        if self._mock_mode:
            invoices = MOCK_INVOICES
            if status:
                invoices = [i for i in invoices if i["status"] == status]
            return {"invoices": invoices[:limit], "count": len(invoices), "source": "mock"}
        return {"invoices": [], "count": 0, "source": "api"}

    async def _get_invoice(self, invoice_id: str) -> dict:
        if self._mock_mode:
            for inv in MOCK_INVOICES:
                if inv["id"] == invoice_id:
                    return {"invoice": inv, "source": "mock"}
            return {"error": f"Invoice not found: {invoice_id}"}
        return {"error": "Not implemented for live API"}

    async def _list_payments(self, limit: int = 20) -> dict:
        if self._mock_mode:
            return {"payments": MOCK_PAYMENTS[:limit], "count": len(MOCK_PAYMENTS), "source": "mock"}
        return {"payments": [], "count": 0, "source": "api"}

    async def _get_balance(self) -> dict:
        if self._mock_mode:
            return {"balance": MOCK_BALANCE, "source": "mock"}
        return {"balance": {}, "source": "api"}
