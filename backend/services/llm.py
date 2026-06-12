import json
import logging
import os
from typing import Dict, Any, List, Optional
from openai import AsyncOpenAI

# Configure logger
logger = logging.getLogger("ecomind.llm")

class LLMService:
    """
    Service for interacting with Large Language Models (LLM).
    Currently configured for Groq via OpenAI SDK compatibility.
    """
    
    def __init__(self, settings_service):
        self.settings = settings_service
        self.client = None
        self.provider = "groq"
        self._initialize_client()

    def _initialize_client(self):
        """Initialize the LLM client if API key is available."""
        api_config = self.settings.get_api_key('groq')
        
        # Also check env var if not in settings (feature parity)
        api_key = api_config or os.getenv("GROQ_API_KEY")

        if api_key:
            try:
                self.client = AsyncOpenAI(
                    base_url="https://api.groq.com/openai/v1",
                    api_key=api_key
                )
                logger.info("✅ LLM Service initialized with Groq")
            except Exception as e:
                logger.error(f"❌ Failed to initialize LLM client: {e}")
                self.client = None
        else:
            logger.warning("⚠️ No Groq API Key found. LLM Service running in MOCK mode.")

    def is_configured(self) -> bool:
        return self.client is not None

    async def chat(self, messages: List[Dict[str, str]], model: str = "llama3-8b-8192") -> str:
        """
        Send a chat completion request.
        """
        if not self.client:
            self._initialize_client()

        if not self.client:
            return "I am running in mock mode. Please configure a Groq API key in settings to enable my brain."

        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.7,
                max_tokens=1024,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"LLM Chat Error: {e}")
            return f"I encountered an error thinking about that: {e}"

    async def parse_intent(self, query: str) -> Dict[str, Any]:
        """
        Parse a natural language query into a structured intent using JSON mode.
        """
        if not self.client:
            self._initialize_client()

        if not self.client:
            # Simple fallback mock parsing
            query_lower = query.lower()
            if "invoice" in query_lower:
                return {"intent": "finance_action", "agent": "financier", "confidence": 0.5, "details": "keyword_match"}
            elif "lead" in query_lower or "customer" in query_lower:
                return {"intent": "growth_action", "agent": "scout", "confidence": 0.5, "details": "keyword_match"}
            return {"intent": "general_query", "agent": "liaison", "confidence": 0.5, "details": "fallback"}

        system_prompt = """
        You are the brain of the Ecomind system. Your job is to classify user queries into specific agent actions.
        
        AGENTS:
        - Financier: Invoices, payments, revenue, money, stripe.
        - Scout: Leads, customers, sales, outreach, growth.
        - Operator: Tasks, scheduling, deadlines, project management.
        - Guardian: Security, permissions, audit logs.
        - Liaison: General queries, summaries, "hello", "help".

        OUTPUT FORMAT:
        Return a JSON object with:
        - "agent": The name of the agent (lowercase).
        - "intent": Short description of what the user wants.
        - "parameters": Any entities extracted (e.g., name="Acme", amount=500).
        - "thought": A very brief internal monologue explaining why you chose this.
        """

        try:
            response = await self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",  # Use supported model
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            content = response.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            logger.error(f"LLM Parsing Error: {e}")
            # Fallback
            return {"agent": "liaison", "intent": "error_fallback", "error": str(e)}

    async def decide_tool(self, query: str, tools: List[Dict[str, Any]], context: str = None) -> Optional[Dict[str, Any]]:
        """
        Ask the LLM to select a tool from the provided list.
        Returns {"tool": "name", "params": {...}} or None.
        Optionally includes conversation context for follow-ups.
        """
        if not self.client:
            self._initialize_client()
        
        if not self.client:
            return None

        # Build messages with optional context
        messages = []
        if context:
            messages.append({"role": "system", "content": context})
        messages.append({"role": "user", "content": query})

        # Convert registry format to OpenAI tool format
        openai_tools = []
        for tool in tools:
            # Simple schema generation (in production use Pydantic)
            params_schema = {
                "type": "object",
                "properties": {},
                "required": []
            }
            # Heuristic param parsing from description string "type (optional)"
            for p_name, p_desc in tool.get("parameters", {}).items():
                p_type = "string"
                if "int" in p_desc: p_type = "integer"
                if "float" in p_desc: p_type = "number"
                params_schema["properties"][p_name] = {"type": p_type, "description": p_desc}
                if "optional" not in p_desc:
                    params_schema["required"].append(p_name)

            openai_tools.append({
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool["description"],
                    "parameters": params_schema
                }
            })

        try:
            response = await self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                tools=openai_tools,
                tool_choice="auto"
            )
            
            tool_calls = response.choices[0].message.tool_calls
            if tool_calls:
                call = tool_calls[0]
                return {
                    "tool": call.function.name,
                    "params": json.loads(call.function.arguments)
                }
            return None

        except Exception as e:
            logger.error(f"LLM Tool Decision Error: {e}")
            return None

# Global instance will be initialized in main.py
llm_service = None
