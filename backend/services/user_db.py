"""
Ecomind User Database — Persistent user storage using SQLite.
"""
import sqlite3
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger("ecomind.auth.db")

class UserDB:
    def __init__(self, db_path: str = "pentagon_users.db"):
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._create_tables()
        logger.info("🔐 User database initialized (%s)", db_path)

    def _create_tables(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_login TEXT
            )
        """)
        self.conn.commit()

    def create_user(self, username: str, email: str, password_hash: str) -> bool:
        try:
            self.conn.execute(
                "INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (username, email, password_hash, datetime.now().isoformat())
            )
            self.conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False

    def get_user(self, identifier: str) -> Optional[dict]:
        """Retrieve a user by either their username or email."""
        row = self.conn.execute(
            "SELECT * FROM users WHERE username = ? OR email = ?", 
            (identifier, identifier)
        ).fetchone()
        return dict(row) if row else None

    def update_last_login(self, username: str):
        self.conn.execute(
            "UPDATE users SET last_login = ? WHERE username = ?",
            (datetime.now().isoformat(), username)
        )
        self.conn.commit()

user_db = UserDB()
