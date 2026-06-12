"""
Ecomind Memory Manager — Unified tri-layer memory system.
Combines: short-term cache, semantic vector store, entity graph, and audit log.
"""

import logging
from typing import Optional, Any
from .vector_store import vector_store
from .graph_store import graph_store
from .redis_cache import redis_cache
from .audit_log import audit_log

logger = logging.getLogger("ecomind.memory")


class MemoryManager:
    """Unified memory interface for all Ecomind agents."""

    def __init__(self):
        self.cache = redis_cache
        self.vectors = vector_store
        self.graph = graph_store
        self.audit = audit_log
        self._seed_initial_data()
        logger.info("🧠 Memory Manager initialized (tri-layer)")

    def _seed_initial_data(self):
        """Pre-populate the graph with demo business entities."""
        # Clients
        self.graph.add_node("client_acme", "client", "Acme Inc",
                          {"email": "billing@acme.com", "payment_terms": "net-30", "priority": "high"})
        self.graph.add_node("client_techstart", "client", "TechStart LLC",
                          {"email": "finance@techstart.io", "payment_terms": "net-15", "priority": "high"})
        self.graph.add_node("client_globalretail", "client", "GlobalRetail Corp",
                          {"email": "ap@globalretail.com", "payment_terms": "net-30", "priority": "medium"})
        self.graph.add_node("client_startupxyz", "client", "StartupXYZ",
                          {"email": "founder@startupxyz.com", "payment_terms": "net-30", "priority": "medium"})
        self.graph.add_node("client_mediagroup", "client", "MediaGroup",
                          {"email": "pay@mediagroup.com", "payment_terms": "net-45", "priority": "low"})

        # Link clients to invoices
        self.graph.add_relationship("client_acme", "HAS_INVOICE", "inv_001", {"status": "overdue"})
        self.graph.add_relationship("client_techstart", "HAS_INVOICE", "inv_002", {"status": "overdue"})
        self.graph.add_relationship("client_globalretail", "HAS_INVOICE", "inv_003", {"status": "paid"})
        self.graph.add_relationship("client_startupxyz", "HAS_INVOICE", "inv_004", {"status": "overdue"})
        self.graph.add_relationship("client_mediagroup", "HAS_INVOICE", "inv_005", {"status": "open"})

        # Seed vector store with business context
        self.vectors.upsert("ctx_acme", "Acme Inc is a high-priority client with net-30 terms. They often pay late but always respond to reminders.")
        self.vectors.upsert("ctx_techstart", "TechStart LLC recently raised Series A funding. They are expanding rapidly and may need additional services.")
        self.vectors.upsert("ctx_cash", "Current cash flow is positive but tight. Three overdue invoices totaling $26,000 need urgent follow-up.")
        self.vectors.upsert("ctx_security", "No security incidents in the last 30 days. All systems nominal.")
        self.vectors.upsert("ctx_leads", "Five new inbound leads from LinkedIn campaign. Two are enterprise-grade prospects.")

        logger.info("🌱 Seeded initial business data (5 clients, 5 invoices, 5 context docs)")

    # ── High-Level API ──────────────────────────────────────────────────────

    def store(self, key: str, value: Any, context: str = "", metadata: Optional[dict] = None):
        """Store data across all memory layers."""
        self.cache.set(key, value)
        if context:
            self.vectors.upsert(key, context, metadata)
        self.audit.log("memory", "store", {"key": key})

    def retrieve(self, key: str) -> Optional[Any]:
        """Retrieve from cache first, then vector store."""
        cached = self.cache.get_json(key)
        if cached is not None:
            return cached
        results = self.vectors.query(key, top_k=1)
        return results[0] if results else None

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        """Semantic search across stored knowledge."""
        return self.vectors.query(query, top_k=top_k)

    def get_client(self, client_id: str) -> Optional[dict]:
        """Get client info from graph."""
        return self.graph.get_node(client_id)

    def get_client_relationships(self, client_id: str) -> list[dict]:
        """Get all relationships for a client."""
        return self.graph.get_neighbors(client_id)

    def stats(self) -> dict:
        """Get memory system statistics."""
        return {
            "cache_entries": self.cache.count(),
            "vector_documents": self.vectors.count(),
            "graph": self.graph.stats(),
            "audit": self.audit.get_stats(),
        }

    # ── User Preferences ────────────────────────────────────────────────────

    _PREF_PREFIX = "pref:"
    _DEFAULT_PREFS = {
        "daily_brief_time": "09:00",
        "report_format": "html",
        "notification_level": "all",
        "auto_follow_up_overdue": True,
        "theme": "dark",
    }

    def get_preferences(self) -> dict:
        """Get all user preferences (with defaults)."""
        prefs = {}
        for key, default in self._DEFAULT_PREFS.items():
            cached = self.cache.get_json(f"{self._PREF_PREFIX}{key}")
            prefs[key] = cached if cached is not None else default
        return prefs

    def set_preference(self, key: str, value) -> dict:
        """Set a single user preference."""
        self.cache.set(f"{self._PREF_PREFIX}{key}", value)
        self.audit.log("memory", "set_preference", {"key": key, "value": value})
        logger.info(f"📝 Preference updated: {key} = {value}")
        return {key: value}


memory_manager = MemoryManager()