"""
Ecomind Graph Store — In-memory relationship graph.
Tracks entities and relationships (Client→Invoice, Employee→Task, etc.)
"""

import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger("ecomind.memory.graph")


class GraphStore:
    """In-memory graph store using adjacency lists for entity relationships."""

    def __init__(self):
        self._nodes: dict[str, dict] = {}       # node_id -> {type, name, properties}
        self._edges: list[dict] = []             # [{from, to, relation, properties}]
        logger.info("🕸️ Graph store initialized (in-memory mode)")

    def add_node(self, node_id: str, node_type: str, name: str, properties: Optional[dict] = None):
        """Add or update a node."""
        self._nodes[node_id] = {
            "type": node_type,
            "name": name,
            "properties": properties or {},
            "created": datetime.now().isoformat(),
        }

    def add_relationship(self, from_id: str, relation: str, to_id: str, properties: Optional[dict] = None):
        """Add a directed relationship between two nodes."""
        self._edges.append({
            "from": from_id,
            "to": to_id,
            "relation": relation,
            "properties": properties or {},
            "created": datetime.now().isoformat(),
        })
        logger.debug("🔗 Relationship: %s -[%s]-> %s", from_id, relation, to_id)

    def get_node(self, node_id: str) -> Optional[dict]:
        """Get a node by ID."""
        return self._nodes.get(node_id)

    def get_neighbors(self, node_id: str, relation: Optional[str] = None) -> list[dict]:
        """Get all nodes connected to this node."""
        results = []
        for edge in self._edges:
            if edge["from"] == node_id:
                if relation is None or edge["relation"] == relation:
                    target = self._nodes.get(edge["to"], {})
                    results.append({**target, "id": edge["to"], "relation": edge["relation"]})
            elif edge["to"] == node_id:
                if relation is None or edge["relation"] == relation:
                    source = self._nodes.get(edge["from"], {})
                    results.append({**source, "id": edge["from"], "relation": edge["relation"]})
        return results

    def query_by_type(self, node_type: str) -> list[dict]:
        """Get all nodes of a specific type."""
        return [
            {**data, "id": nid}
            for nid, data in self._nodes.items()
            if data["type"] == node_type
        ]

    def stats(self) -> dict:
        return {"nodes": len(self._nodes), "edges": len(self._edges)}


graph_store = GraphStore()