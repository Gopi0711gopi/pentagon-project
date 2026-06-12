import logging
import inspect
from typing import Callable, Dict, Any, List

logger = logging.getLogger("ecomind.tools")

class Tool:
    """
    Represents an executable capability for an agent.
    """
    def __init__(self, name: str, description: str, func: Callable, parameters: Dict[str, Any] = None):
        self.name = name
        self.description = description
        self.func = func
        self.parameters = parameters or {}

    async def run(self, **kwargs):
        try:
            if inspect.iscoroutinefunction(self.func):
                return await self.func(**kwargs)
            return self.func(**kwargs)
        except Exception as e:
            logger.error(f"Tool execution failed ({self.name}): {e}")
            return f"Error: {str(e)}"

    def to_dict(self):
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters
        }


class ToolRegistry:
    """
    Central repository for all agent tools.
    """
    def __init__(self):
        self._tools: Dict[str, Tool] = {}

    def register(self, tool: Tool):
        self._tools[tool.name] = tool
        logger.info(f"🛠️ Registered tool: {tool.name}")

    def get_tool(self, name: str) -> Tool:
        return self._tools.get(name)

    def list_tools(self) -> List[Dict[str, Any]]:
        return [t.to_dict() for t in self._tools.values()]

    async def run_tool(self, name: str, **kwargs):
        tool = self.get_tool(name)
        if not tool:
            return f"Error: Tool '{name}' not found."
        
        logger.info(f"🔧 Executing tool: {name} with {kwargs}")
        return await tool.run(**kwargs)

# Global registry instance
tool_registry = ToolRegistry()
