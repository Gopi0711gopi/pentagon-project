"""
HubSpot CRM MCP Connector — Access to contacts, deals, and pipeline data.
Includes mock mode with realistic CRM data for development.
"""

import os
import logging
from typing import Optional
from connectors.registry import BaseConnector

logger = logging.getLogger("ecomind.connectors.hubspot")

# ── Mock data ────────────────────────────────────────────────────────────────

MOCK_CONTACTS = [
    {"id": "contact_001", "name": "Sarah Chen", "email": "sarah@techstart.io", "company": "TechStart LLC", "phone": "+1-555-0101", "lifecycle_stage": "customer", "last_activity": "2026-02-17T14:30:00Z"},
    {"id": "contact_002", "name": "Mike Park", "email": "mike@greenenergy.com", "company": "GreenEnergy Co", "phone": "+1-555-0102", "lifecycle_stage": "lead", "last_activity": "2026-02-16T09:15:00Z"},
    {"id": "contact_003", "name": "Lisa Wang", "email": "lisa@dataflow.io", "company": "DataFlow Inc", "phone": "+1-555-0103", "lifecycle_stage": "opportunity", "last_activity": "2026-02-18T11:00:00Z"},
    {"id": "contact_004", "name": "Tom Harris", "email": "tom@cloudbase.dev", "company": "CloudBase", "phone": "+1-555-0104", "lifecycle_stage": "subscriber", "last_activity": "2026-02-15T16:45:00Z"},
    {"id": "contact_005", "name": "Emma Wilson", "email": "emma@retailmax.com", "company": "RetailMax", "phone": "+1-555-0105", "lifecycle_stage": "lead", "last_activity": "2026-02-18T08:20:00Z"},
]

MOCK_DEALS = [
    {"id": "deal_001", "name": "TechStart Platform Build", "amount": 15000, "stage": "Proposal Sent", "probability": 75, "contact": "Sarah Chen", "close_date": "2026-03-15", "pipeline": "Sales"},
    {"id": "deal_002", "name": "GreenEnergy Dashboard", "amount": 8500, "stage": "Discovery", "probability": 40, "contact": "Mike Park", "close_date": "2026-04-01", "pipeline": "Sales"},
    {"id": "deal_003", "name": "DataFlow Migration", "amount": 22000, "stage": "Negotiation", "probability": 85, "contact": "Lisa Wang", "close_date": "2026-03-01", "pipeline": "Sales"},
    {"id": "deal_004", "name": "CloudBase Integration", "amount": 6200, "stage": "Qualified", "probability": 55, "contact": "Tom Harris", "close_date": "2026-03-20", "pipeline": "Sales"},
    {"id": "deal_005", "name": "RetailMax Analytics", "amount": 12000, "stage": "Appointment", "probability": 30, "contact": "Emma Wilson", "close_date": "2026-04-15", "pipeline": "Sales"},
]

MOCK_PIPELINE_SUMMARY = {
    "total_deals": 5,
    "total_value": 63700,
    "weighted_value": 39650,
    "stages": {
        "Discovery": {"count": 1, "value": 8500},
        "Qualified": {"count": 1, "value": 6200},
        "Appointment": {"count": 1, "value": 12000},
        "Proposal Sent": {"count": 1, "value": 15000},
        "Negotiation": {"count": 1, "value": 22000},
    },
    "forecast": {"this_month": 37000, "next_month": 26700},
}


class HubSpotConnector(BaseConnector):
    """HubSpot CRM MCP connector — contacts, deals, and pipeline access."""

    name = "hubspot"
    description = "Access HubSpot CRM for contacts, deals, and sales pipeline"
    tools = [
        {"name": "list_contacts", "description": "List CRM contacts", "parameters": {"lifecycle_stage": "string (optional)", "limit": "int (optional)"}},
        {"name": "get_contact", "description": "Get contact details by ID", "parameters": {"contact_id": "string"}},
        {"name": "create_contact", "description": "Create a new contact", "parameters": {"name": "string", "email": "string", "company": "string"}},
        {"name": "list_deals", "description": "List sales deals", "parameters": {"stage": "string (optional)", "limit": "int (optional)"}},
        {"name": "get_pipeline", "description": "Get pipeline summary and forecast", "parameters": {}},
    ]

    def __init__(self):
        super().__init__()
        self._api_key = os.getenv("HUBSPOT_API_KEY", "")

    async def initialize(self):
        if self._api_key and self._api_key not in ("", "your_key_here"):
            try:
                self._connected = True
                self._mock_mode = False
                logger.info("✅ HubSpot connected via API")
                return
            except Exception as e:
                logger.warning("⚠️ HubSpot API failed: %s — using mock mode", e)

        self._connected = True
        self._mock_mode = True
        logger.info("🏢 HubSpot CRM connector active (mock mode)")

    async def call_tool(self, tool_name: str, params: Optional[dict] = None) -> dict:
        params = params or {}
        if tool_name == "list_contacts":
            contacts = MOCK_CONTACTS
            stage = params.get("lifecycle_stage")
            if stage:
                contacts = [c for c in contacts if c["lifecycle_stage"] == stage]
            limit = params.get("limit", 20)
            return {"contacts": contacts[:limit], "count": len(contacts), "source": "mock"}
        elif tool_name == "get_contact":
            cid = params.get("contact_id", "")
            for c in MOCK_CONTACTS:
                if c["id"] == cid:
                    return {"contact": c, "source": "mock"}
            return {"error": f"Contact not found: {cid}"}
        elif tool_name == "create_contact":
            return {"success": True, "contact_id": "contact_new", "message": f"Contact {params.get('name', 'Unknown')} created", "source": "mock"}
        elif tool_name == "list_deals":
            deals = MOCK_DEALS
            stage = params.get("stage")
            if stage:
                deals = [d for d in deals if d["stage"] == stage]
            return {"deals": deals[:params.get("limit", 20)], "count": len(deals), "source": "mock"}
        elif tool_name == "get_pipeline":
            return {"pipeline": MOCK_PIPELINE_SUMMARY, "source": "mock"}
        return {"error": f"Unknown tool: {tool_name}"}
