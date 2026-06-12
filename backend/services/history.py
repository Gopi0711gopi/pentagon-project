"""
Ecomind Conversation History — SQLite-backed persistent conversation storage.
Stores every command and its resulting traces for recall and context.
"""

import json
import sqlite3
import logging
from datetime import datetime
from threading import Lock

logger = logging.getLogger("ecomind.services.history")


class ConversationHistory:
    """Persistent conversation storage using SQLite."""

    def __init__(self, db_path: str = "ecomind_history.db"):
        self.db_path = db_path
        self._lock = Lock()
        self._init_db()
        logger.info("💬 Conversation history initialized (%s)", db_path)

    def _init_db(self):
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    command TEXT NOT NULL,
                    agents_used TEXT DEFAULT '[]',
                    trace_count INTEGER DEFAULT 0,
                    traces TEXT DEFAULT '[]',
                    shared_data TEXT DEFAULT '{}',
                    status TEXT DEFAULT 'complete',
                    created_at TEXT NOT NULL,
                    duration_ms INTEGER DEFAULT 0
                )
            """)
            conn.commit()
            conn.close()

    def save(self, command: str, traces: list, agents_used: list = None,
             shared_data: dict = None, status: str = "complete", duration_ms: int = 0) -> int:
        """Save a conversation and return its ID."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.execute(
                """INSERT INTO conversations 
                   (command, agents_used, trace_count, traces, shared_data, status, created_at, duration_ms)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    command,
                    json.dumps(agents_used or []),
                    len(traces),
                    json.dumps(traces, default=str),
                    json.dumps(shared_data or {}),
                    status,
                    datetime.now().isoformat(),
                    duration_ms,
                )
            )
            conn.commit()
            conv_id = cursor.lastrowid
            conn.close()
            logger.info("💬 Saved conversation #%d: '%s' (%d traces)", conv_id, command[:50], len(traces))
            return conv_id

    def list_all(self, limit: int = 50, offset: int = 0) -> list:
        """List conversations (most recent first), without full traces."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                """SELECT id, command, agents_used, trace_count, status, created_at, duration_ms
                   FROM conversations ORDER BY id DESC LIMIT ? OFFSET ?""",
                (limit, offset)
            ).fetchall()
            conn.close()
            return [
                {
                    "id": r["id"],
                    "command": r["command"],
                    "agents_used": json.loads(r["agents_used"]),
                    "trace_count": r["trace_count"],
                    "status": r["status"],
                    "created_at": r["created_at"],
                    "duration_ms": r["duration_ms"],
                }
                for r in rows
            ]

    def get(self, conv_id: int) -> dict | None:
        """Get a full conversation by ID (including traces)."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            row = conn.execute("SELECT * FROM conversations WHERE id = ?", (conv_id,)).fetchone()
            conn.close()
            if not row:
                return None
            return {
                "id": row["id"],
                "command": row["command"],
                "agents_used": json.loads(row["agents_used"]),
                "trace_count": row["trace_count"],
                "traces": json.loads(row["traces"]),
                "shared_data": json.loads(row["shared_data"]),
                "status": row["status"],
                "created_at": row["created_at"],
                "duration_ms": row["duration_ms"],
            }

    def delete(self, conv_id: int) -> bool:
        """Delete a conversation by ID."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
            conn.commit()
            deleted = cursor.rowcount > 0
            conn.close()
            return deleted

    def clear_all(self) -> int:
        """Clear all conversations. Returns count deleted."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.execute("DELETE FROM conversations")
            conn.commit()
            count = cursor.rowcount
            conn.close()
            logger.info("💬 Cleared %d conversations", count)
            return count

    def get_stats(self) -> dict:
        """Get conversation statistics."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            row = conn.execute(
                "SELECT COUNT(*) as total, SUM(trace_count) as total_traces FROM conversations"
            ).fetchone()
            conn.close()
            return {
                "total_conversations": row[0] or 0,
                "total_traces": row[1] or 0,
            }


# Global instance
conversation_history = ConversationHistory()
