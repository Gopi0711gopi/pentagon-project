"""
Ecomind Daily Brief Service — Aggregates data from all agents and connectors
to generate the morning "State of the Union" briefing.
"""

import logging
from datetime import datetime

logger = logging.getLogger("ecomind.services.brief")


class DailyBriefService:
    """Generates the Ecomind Daily Brief — a unified business summary."""

    def generate(self, user_id: str = "default") -> dict:
        """Generate the daily briefing from all data sources."""

        now = datetime.now()
        hour = now.hour
        if hour < 12:
            greeting = "Good morning"
        elif hour < 17:
            greeting = "Good afternoon"
        else:
            greeting = "Good evening"

        # Finance summary (from mock data)
        finance = {
            "total_revenue_mtd": 1235000,  # $12,350.00
            "total_overdue": 2600000,       # $26,000.00
            "overdue_count": 3,
            "paid_this_week": 2,
            "cash_flow_status": "positive",
            "invoices": [
                {"customer": "Acme Inc", "amount": 350000, "status": "overdue", "days_overdue": 8},
                {"customer": "TechStart LLC", "amount": 750000, "status": "overdue", "days_overdue": 6},
                {"customer": "StartupXYZ", "amount": 1500000, "status": "overdue", "days_overdue": 13},
                {"customer": "GlobalRetail Corp", "amount": 210000, "status": "paid", "days_overdue": 0},
                {"customer": "MediaGroup", "amount": 420000, "status": "open", "days_overdue": 0},
            ],
        }

        # Security summary
        security = {
            "threats_blocked": 7,
            "threats_today": 1,
            "last_scan": now.isoformat(),
            "status": "nominal",
            "alerts": [
                {"type": "phishing_attempt", "source": "external_email", "severity": "medium", "blocked": True},
            ],
            "compliance_score": 96,
        }

        # Operations summary
        operations = {
            "active_tasks": 3,
            "completed_today": 2,
            "upcoming_deadlines": [
                {"task": "Website redesign - Phase 2", "due": "2026-02-20", "assignee": "Dev Team", "priority": "high"},
                {"task": "Client onboarding - NewVenture", "due": "2026-02-22", "assignee": "Sarah", "priority": "medium"},
            ],
            "meetings_today": 2,
        }

        # Leads summary
        leads = {
            "new_leads": 5,
            "qualified_leads": 2,
            "pipeline_value": 4500000,  # $45,000
            "top_prospect": {
                "name": "TechStart LLC",
                "score": 92,
                "signal": "Interested in enterprise plan",
                "next_action": "Book demo meeting",
            },
            "conversion_rate": 34,
        }

        # Pending approvals
        from memory.audit_log import audit_log
        pending = audit_log.get_pending_approvals()

        # Agent statuses
        from agents import ALL_AGENTS
        agent_statuses = [
            {
                "name": a.name,
                "display_name": a.display_name,
                "icon": a.icon,
                "status": a.status,
                "description": a.description,
                "last_active": a.last_active,
            }
            for a in ALL_AGENTS.values()
        ]

        summary = (
            f"{len(finance['invoices'])} invoices tracked, {finance['overdue_count']} overdue "
            f"(${finance['total_overdue']/100:,.2f}). "
            f"{security['threats_blocked']} threats blocked this week. "
            f"{leads['new_leads']} new leads, {leads['qualified_leads']} qualified. "
            f"{operations['active_tasks']} tasks in progress."
        )

        return {
            "date": now.strftime("%A, %B %d, %Y"),
            "greeting": greeting,
            "summary": summary,
            "finance": finance,
            "security": security,
            "operations": operations,
            "leads": leads,
            "pending_approvals": len(pending),
            "agent_statuses": agent_statuses,
        }


daily_brief_service = DailyBriefService()