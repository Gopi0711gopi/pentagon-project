"""
Ecomind Connector Registry — Base connector class + registry for all MCP connectors.
"""

import logging
from typing import Optional

logger = logging.getLogger("ecomind.connectors.registry")


class BaseConnector:
    """Abstract base class for all Ecomind MCP connectors."""

    name: str = "base"
    description: str = ""
    tools: list = []

    def __init__(self):
        self._connected = False
        self._mock_mode = True

    async def initialize(self):
        """Initialize the connector (connect to API or activate mock mode)."""
        raise NotImplementedError

    async def call_tool(self, tool_name: str, params: Optional[dict] = None) -> dict:
        """Execute a tool on this connector."""
        raise NotImplementedError

    @property
    def is_connected(self) -> bool:
        return self._connected

    @property
    def is_mock(self) -> bool:
        return self._mock_mode

    def status(self) -> dict:
        return {
            "name": self.name,
            "connected": self._connected,
            "mock_mode": self._mock_mode,
            "tools": [t["name"] for t in self.tools],
        }


class ConnectorRegistry:
    """Central registry for all Ecomind connectors."""

    def __init__(self):
        self._connectors: dict[str, BaseConnector] = {}

    def register(self, connector: BaseConnector):
        """Register a connector."""
        self._connectors[connector.name] = connector
        logger.info("🔌 Registered connector: %s", connector.name)

    def get(self, name: str) -> Optional[BaseConnector]:
        """Get a connector by name."""
        return self._connectors.get(name)

    async def initialize_all(self):
        """Initialize all registered connectors."""
        for name, connector in self._connectors.items():
            try:
                await connector.initialize()
                logger.info("✅ Connector ready: %s (mock=%s)", name, connector.is_mock)
            except Exception as e:
                logger.error("❌ Connector failed: %s — %s", name, e)

    def list_all(self) -> list[dict]:
        """List all registered connectors and their status."""
        return [c.status() for c in self._connectors.values()]

    async def call_tool(self, connector_name: str, tool_name: str, params: Optional[dict] = None) -> dict:
        """Call a tool on a specific connector."""
        connector = self.get(connector_name)
        if not connector:
            return {"error": f"Unknown connector: {connector_name}"}
        if not connector.is_connected:
            return {"error": f"Connector not connected: {connector_name}"}
        return await connector.call_tool(tool_name, params)


# Global registry instance
registry = ConnectorRegistry()