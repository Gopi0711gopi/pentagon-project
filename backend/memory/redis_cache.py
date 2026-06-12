"""
Ecomind Redis Cache — In-memory session cache.
Falls back to dict when Redis is not available.
"""

import json
import logging
from datetime import datetime
from typing import Optional, Any

logger = logging.getLogger("ecomind.memory.cache")


class RedisCache:
    """In-memory cache replacing Redis for development."""

    def __init__(self):
        self._store: dict[str, dict] = {}  # key -> {value, ttl, created}
        logger.info("⚡ Cache initialized (in-memory mode)")

    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """Store a value with optional TTL (seconds)."""
        self._store[key] = {
            "value": json.dumps(value) if not isinstance(value, str) else value,
            "ttl": ttl,
            "created": datetime.now().isoformat(),
        }

    def get(self, key: str) -> Optional[str]:
        """Retrieve a value."""
        entry = self._store.get(key)
        if entry is None:
            return None
        return entry["value"]

    def get_json(self, key: str) -> Optional[Any]:
        """Retrieve and JSON-parse a value."""
        raw = self.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return raw

    def delete(self, key: str):
        """Delete a key."""
        self._store.pop(key, None)

    def exists(self, key: str) -> bool:
        return key in self._store

    def keys(self, pattern: str = "*") -> list[str]:
        """List keys matching pattern (simple prefix match)."""
        if pattern == "*":
            return list(self._store.keys())
        prefix = pattern.rstrip("*")
        return [k for k in self._store.keys() if k.startswith(prefix)]

    def flush(self):
        """Clear all keys."""
        self._store.clear()

    def count(self) -> int:
        return len(self._store)


redis_cache = RedisCache()