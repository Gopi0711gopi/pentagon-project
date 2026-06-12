"""
Ecomind Audit Log — Immutable action log using SQLite.
Every agent action is recorded for compliance and debugging.
"""

import sqlite3
import json
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger("ecomind.memory.audit")


class AuditLog:
    """SQLite-backed immutable audit log for all agent actions."""

    def __init__(self, db_path: str = "pentagon_audit.db"):
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._create_tables()
        logger.info("📋 Audit log initialized (%s)", db_path)

    def _create_tables(self):
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS audit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                agent TEXT NOT NULL,
                action TEXT NOT NULL,
                details TEXT,
                user_id TEXT,
                severity TEXT DEFAULT 'info',
                status TEXT DEFAULT 'completed'
            );
            CREATE TABLE IF NOT EXISTS approvals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                agent TEXT NOT NULL,
                action_type TEXT NOT NULL,
                description TEXT NOT NULL,
                details TEXT,
                risk_level TEXT DEFAULT 'low',
                status TEXT DEFAULT 'pending',
                resolved_at TEXT,
                resolved_by TEXT
            );
        """)
        self.conn.commit()

    def log(self, agent: str, action: str, details: Optional[dict] = None,
            user_id: str = "system", severity: str = "info"):
        """Record an agent action."""
        self.conn.execute(
            "INSERT INTO audit (timestamp, agent, action, details, user_id, severity) VALUES (?, ?, ?, ?, ?, ?)",
            (datetime.now().isoformat(), agent, action, json.dumps(details or {}), user_id, severity),
        )
        self.conn.commit()

    def create_approval(self, agent: str, action_type: str, description: str,
                        details: Optional[dict] = None, risk_level: str = "medium") -> int:
        """Create a pending approval request. Returns the approval ID."""
        cursor = self.conn.execute(
            "INSERT INTO approvals (timestamp, agent, action_type, description, details, risk_level) VALUES (?, ?, ?, ?, ?, ?)",
            (datetime.now().isoformat(), agent, action_type, description, json.dumps(details or {}), risk_level),
        )
        self.conn.commit()
        return cursor.lastrowid

    def resolve_approval(self, approval_id: int, status: str, resolved_by: str = "user"):
        """Approve or reject a pending approval."""
        self.conn.execute(
            "UPDATE approvals SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?",
            (status, datetime.now().isoformat(), resolved_by, approval_id),
        )
        self.conn.commit()

    def get_pending_approvals(self) -> list[dict]:
        """Get all pending approval requests."""
        rows = self.conn.execute(
            "SELECT * FROM approvals WHERE status = 'pending' ORDER BY timestamp DESC"
        ).fetchall()
        return [self._row_to_dict(r) for r in rows]

    def get_recent_events(self, limit: int = 50, agent: Optional[str] = None) -> list[dict]:
        """Get recent audit events."""
        if agent:
            rows = self.conn.execute(
                "SELECT * FROM audit WHERE agent = ? ORDER BY timestamp DESC LIMIT ?",
                (agent, limit),
            ).fetchall()
        else:
            rows = self.conn.execute(
                "SELECT * FROM audit ORDER BY timestamp DESC LIMIT ?", (limit,)
            ).fetchall()
        return [self._row_to_dict(r) for r in rows]

    def get_stats(self) -> dict:
        """Get audit statistics."""
        total = self.conn.execute("SELECT COUNT(*) FROM audit").fetchone()[0]
        pending = self.conn.execute("SELECT COUNT(*) FROM approvals WHERE status = 'pending'").fetchone()[0]
        by_agent = {}
        for row in self.conn.execute("SELECT agent, COUNT(*) as cnt FROM audit GROUP BY agent").fetchall():
            by_agent[row[0]] = row[1]
        return {"total_events": total, "pending_approvals": pending, "by_agent": by_agent}

    def _row_to_dict(self, row) -> dict:
        d = dict(row)
        if "details" in d and d["details"]:
            try:
                d["details"] = json.loads(d["details"])
            except (json.JSONDecodeError, TypeError):
                pass
        return d


audit_log = AuditLog()