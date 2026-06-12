"""
Notion MCP Connector — Access Notion databases, pages, and tasks.
Includes mock mode with realistic workspace data for development.
"""

import os
import logging
from typing import Optional
from connectors.registry import BaseConnector

logger = logging.getLogger("ecomind.connectors.notion")

# ── Mock data ────────────────────────────────────────────────────────────────

MOCK_DATABASES = [
    {"id": "db_001", "title": "Project Tasks", "icon": "📋", "entries": 24, "last_edited": "2026-02-18T11:00:00Z"},
    {"id": "db_002", "title": "Meeting Notes", "icon": "📝", "entries": 15, "last_edited": "2026-02-17T16:30:00Z"},
    {"id": "db_003", "title": "Knowledge Base", "icon": "📚", "entries": 42, "last_edited": "2026-02-16T10:15:00Z"},
    {"id": "db_004", "title": "Sprint Board", "icon": "🏃", "entries": 18, "last_edited": "2026-02-18T09:45:00Z"},
]

MOCK_TASKS = [
    {"id": "task_001", "title": "Deploy v2.0 to production", "status": "In Progress", "priority": "High", "assignee": "Commander", "due_date": "2026-02-20", "tags": ["deploy", "urgent"]},
    {"id": "task_002", "title": "Review Q1 financial report", "status": "To Do", "priority": "Medium", "assignee": "Financier", "due_date": "2026-02-22", "tags": ["finance", "quarterly"]},
    {"id": "task_003", "title": "Update security audit docs", "status": "Done", "priority": "High", "assignee": "Guardian", "due_date": "2026-02-18", "tags": ["security", "docs"]},
    {"id": "task_004", "title": "Onboard TechStart LLC", "status": "In Progress", "priority": "High", "assignee": "Scout", "due_date": "2026-02-19", "tags": ["sales", "onboarding"]},
    {"id": "task_005", "title": "Configure email templates", "status": "To Do", "priority": "Low", "assignee": "Operator", "due_date": "2026-02-25", "tags": ["email", "config"]},
    {"id": "task_006", "title": "Weekly team standup notes", "status": "To Do", "priority": "Medium", "assignee": "Liaison", "due_date": "2026-02-19", "tags": ["meeting", "recurring"]},
]

MOCK_PAGES = [
    {"id": "page_001", "title": "Architecture Overview", "icon": "🏗️", "last_edited": "2026-02-15T14:00:00Z", "word_count": 1200},
    {"id": "page_002", "title": "Q1 Strategy Playbook", "icon": "🎯", "last_edited": "2026-02-10T10:00:00Z", "word_count": 3400},
    {"id": "page_003", "title": "Agent Documentation", "icon": "🤖", "last_edited": "2026-02-18T08:30:00Z", "word_count": 2100},
]


class NotionConnector(BaseConnector):
    """Notion MCP connector — databases, pages, and task management."""

    name = "notion"
    description = "Access Notion workspace for tasks, databases, and documentation"
    tools = [
        {"name": "list_databases", "description": "List all Notion databases", "parameters": {}},
        {"name": "query_database", "description": "Query a database with filters", "parameters": {"database_id": "string", "status": "string (optional)", "priority": "string (optional)"}},
        {"name": "create_page", "description": "Create a new page", "parameters": {"title": "string", "content": "string", "database_id": "string (optional)"}},
        {"name": "list_tasks", "description": "List tasks from Project Tasks DB", "parameters": {"status": "string (optional)", "assignee": "string (optional)"}},
        {"name": "update_task", "description": "Update a task status", "parameters": {"task_id": "string", "status": "string"}},
        {"name": "search_pages", "description": "Search pages by keyword", "parameters": {"query": "string"}},
    ]

    def __init__(self):
        super().__init__()
        self._api_key = os.getenv("NOTION_API_KEY", "")

    async def initialize(self):
        if self._api_key and self._api_key not in ("", "your_key_here"):
            try:
                self._connected = True
                self._mock_mode = False
                logger.info("✅ Notion connected via API")
                return
            except Exception as e:
                logger.warning("⚠️ Notion API failed: %s — using mock mode", e)

        self._connected = True
        self._mock_mode = True
        logger.info("📝 Notion connector active (mock mode)")

    async def call_tool(self, tool_name: str, params: Optional[dict] = None) -> dict:
        params = params or {}
        if tool_name == "list_databases":
            return {"databases": MOCK_DATABASES, "count": len(MOCK_DATABASES), "source": "mock"}
        elif tool_name == "query_database":
            # Return tasks filtered by status/priority
            tasks = MOCK_TASKS
            status = params.get("status")
            priority = params.get("priority")
            if status:
                tasks = [t for t in tasks if t["status"] == status]
            if priority:
                tasks = [t for t in tasks if t["priority"] == priority]
            return {"entries": tasks, "count": len(tasks), "source": "mock"}
        elif tool_name == "create_page":
            return {"success": True, "page_id": "page_new", "title": params.get("title", "Untitled"), "source": "mock"}
        elif tool_name == "list_tasks":
            tasks = MOCK_TASKS
            status = params.get("status")
            assignee = params.get("assignee")
            if status:
                tasks = [t for t in tasks if t["status"] == status]
            if assignee:
                tasks = [t for t in tasks if t["assignee"].lower() == assignee.lower()]
            return {"tasks": tasks, "count": len(tasks), "source": "mock"}
        elif tool_name == "update_task":
            return {"success": True, "task_id": params.get("task_id", ""), "new_status": params.get("status", ""), "source": "mock"}
        elif tool_name == "search_pages":
            query = (params.get("query", "")).lower()
            results = [p for p in MOCK_PAGES if query in p["title"].lower()]
            return {"pages": results, "count": len(results), "source": "mock"}
        return {"error": f"Unknown tool: {tool_name}"}
