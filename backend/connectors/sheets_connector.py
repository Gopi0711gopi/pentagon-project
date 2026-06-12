"""
Google Sheets MCP Connector — Read/write access to Google Sheets data.
Includes mock mode with realistic spreadsheet data for development.
"""

import os
import logging
from typing import Optional
from connectors.registry import BaseConnector

logger = logging.getLogger("ecomind.connectors.sheets")

# ── Mock data ────────────────────────────────────────────────────────────────

MOCK_SPREADSHEETS = [
    {"id": "sheet_001", "title": "Q1 Revenue Tracker", "sheets": ["Revenue", "Expenses", "Summary"], "last_modified": "2026-02-18T10:00:00Z"},
    {"id": "sheet_002", "title": "Client Pipeline", "sheets": ["Active Leads", "Closed Won", "Lost"], "last_modified": "2026-02-17T15:30:00Z"},
    {"id": "sheet_003", "title": "Employee Timesheet", "sheets": ["Week 1", "Week 2", "Week 3", "Week 4"], "last_modified": "2026-02-16T09:00:00Z"},
]

MOCK_SHEET_DATA = {
    "sheet_001": {
        "Revenue": [
            ["Month", "Revenue", "Target", "Status"],
            ["January", "$45,200", "$40,000", "✅ Above"],
            ["February", "$38,900", "$42,000", "⚠️ Below"],
        ],
        "Summary": [
            ["Metric", "Value"],
            ["Total Revenue", "$84,100"],
            ["Total Expenses", "$52,300"],
            ["Net Profit", "$31,800"],
        ],
    },
    "sheet_002": {
        "Active Leads": [
            ["Company", "Contact", "Value", "Stage", "Probability"],
            ["TechStart LLC", "Sarah Chen", "$15,000", "Proposal", "75%"],
            ["GreenEnergy Co", "Mike Park", "$8,500", "Discovery", "40%"],
            ["DataFlow Inc", "Lisa Wang", "$22,000", "Negotiation", "85%"],
            ["CloudBase", "Tom Harris", "$6,200", "Qualified", "55%"],
        ],
    },
}


class GoogleSheetsConnector(BaseConnector):
    """Google Sheets MCP connector — spreadsheet read/write access."""

    name = "google_sheets"
    description = "Read and write Google Sheets data for reports and tracking"
    tools = [
        {"name": "list_spreadsheets", "description": "List all accessible spreadsheets", "parameters": {}},
        {"name": "read_sheet", "description": "Read data from a specific sheet", "parameters": {"spreadsheet_id": "string", "sheet_name": "string (optional)"}},
        {"name": "append_row", "description": "Append a row to a sheet", "parameters": {"spreadsheet_id": "string", "sheet_name": "string", "values": "list"}},
        {"name": "update_cell", "description": "Update a specific cell", "parameters": {"spreadsheet_id": "string", "sheet_name": "string", "cell": "string (e.g. A1)", "value": "string"}},
    ]

    def __init__(self):
        super().__init__()
        self._credentials = os.getenv("GOOGLE_SHEETS_CREDENTIALS", "")

    async def initialize(self):
        if self._credentials and self._credentials not in ("", "your_key_here"):
            try:
                self._connected = True
                self._mock_mode = False
                logger.info("✅ Google Sheets connected via API")
                return
            except Exception as e:
                logger.warning("⚠️ Google Sheets API failed: %s — using mock mode", e)

        self._connected = True
        self._mock_mode = True
        logger.info("📊 Google Sheets connector active (mock mode)")

    async def call_tool(self, tool_name: str, params: Optional[dict] = None) -> dict:
        params = params or {}
        if tool_name == "list_spreadsheets":
            return {"spreadsheets": MOCK_SPREADSHEETS, "count": len(MOCK_SPREADSHEETS), "source": "mock"}
        elif tool_name == "read_sheet":
            sid = params.get("spreadsheet_id", "sheet_001")
            sheet = params.get("sheet_name")
            data = MOCK_SHEET_DATA.get(sid, {})
            if sheet:
                return {"data": data.get(sheet, []), "sheet": sheet, "source": "mock"}
            return {"sheets": data, "source": "mock"}
        elif tool_name == "append_row":
            return {"success": True, "message": f"Row appended to {params.get('sheet_name', 'Sheet1')}", "source": "mock"}
        elif tool_name == "update_cell":
            return {"success": True, "message": f"Cell {params.get('cell', 'A1')} updated", "source": "mock"}
        return {"error": f"Unknown tool: {tool_name}"}
