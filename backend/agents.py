"""
Ecomind Agents — The Five Specialized AI Agents.
Each agent has a role, system prompt, and simulated reasoning capabilities.
Uses mock LLM responses to demonstrate the multi-agent architecture.
"""

import asyncio
import logging
import random
from datetime import datetime
from typing import Optional

from security.hooks import HookPipeline, PreExecutionHook, HookResult
from security.prompt_guard import prompt_guard
from memory.manager import memory_manager

logger = logging.getLogger("ecomind.agents")

# ── Agent Icons ──────────────────────────────────────────────────────────────

AGENT_ICONS = {
    "guardian": "/avatars/guardian.png",
    "financier": "/avatars/financier.png",
    "scout": "/avatars/scout.png",
    "operator": "/avatars/operator.png",
    "liaison": "/avatars/liaison.png",
    "architect": "/avatars/architect.png",
    "researcher": "/avatars/researcher.png",
}

# ── Security Hook Implementation ────────────────────────────────────────────

class PromptInjectionHook(PreExecutionHook):
    name = "prompt_injection_guard"

    async def check(self, action: dict) -> HookResult:
        raw_input = action.get("raw_input", "")
        forbidden = ["ignore previous", "system prompt", "jailbreak", "disregard", "override instructions"]
        for term in forbidden:
            if term in raw_input.lower():
                return HookResult(
                    allowed=False,
                    reason=f"Prompt injection detected: '{term}'",
                    severity="critical",
                )
        return HookResult(allowed=True, reason="Input clean")


class FinancialSafetyHook(PreExecutionHook):
    name = "financial_safety"

    async def check(self, action: dict) -> HookResult:
        action_type = action.get("action_type", "")
        if action_type in ("send_payment", "wire_transfer", "refund"):
            amount = action.get("params", {}).get("amount", 0)
            if amount > 500000:  # $5,000+
                return HookResult(
                    allowed=False,
                    reason=f"High-value financial action (${amount/100:.2f}) requires manual approval",
                    severity="critical",
                )
        return HookResult(allowed=True, reason="Financial check passed")


# Initialize the global hook pipeline
hook_pipeline = HookPipeline()
hook_pipeline.register(PromptInjectionHook())
hook_pipeline.register(FinancialSafetyHook())


# ── Base Agent Class ────────────────────────────────────────────────────────

class BaseAgent:
    """Base class for all Ecomind agents."""

    name: str = "base"
    display_name: str = "Base Agent"
    icon: str = "🤖"
    description: str = ""
    status: str = "idle"

    def __init__(self):
        self.last_active: Optional[str] = None
        self.llm_service = None
        self.tool_registry = None

    def set_llm_service(self, service):
        self.llm_service = service

    def set_tools(self, registry):
        self.tool_registry = registry

    def get_status(self) -> dict:
        return {
            "name": self.name,
            "display_name": self.display_name,
            "icon": self.icon,
            "status": self.status,
            "description": self.description,
            "last_active": self.last_active,
        }

    async def execute(self, state: dict) -> dict:
        """Execute agent logic. Override in subclasses."""
        raise NotImplementedError

    async def _think(self, thought: str, duration: float = 0.3):
        """Simulate thinking time."""
        await asyncio.sleep(duration)
        logger.debug("[%s] 💭 %s", self.name, thought)

    def _log(self, action: str, details: dict = None):
        """Log action to audit."""
        self.last_active = datetime.now().isoformat()
        memory_manager.audit.log(self.name, action, details)


# ── Guardian Agent (Security & Trust) ───────────────────────────────────────

class Guardian(BaseAgent):
    name = "guardian"
    display_name = "The Guardian"
    icon = "/avatars/guardian.png"
    description = "Preemptive security & compliance scanning"

    async def execute(self, state: dict) -> dict:
        self.status = "working"
        task = state.get("task", "")
        traces = state.get("traces", [])

        # Step 1: Prompt injection scan
        traces.append({
            "event_type": "thought_trace",
            "agent": self.name,
            "agent_icon": self.icon,
            "content": "Scanning input for prompt injection attacks and malicious patterns...",
        })
        await self._think("Scanning for prompt injection")

        # Run through hook pipeline
        hook_result = await hook_pipeline.execute({
            "agent": self.name,
            "action_type": "process_input",
            "raw_input": task,
        })

        if not hook_result.allowed:
            traces.append({
                "event_type": "agent_action",
                "agent": self.name,
                "agent_icon": self.icon,
                "content": f"🚫 BLOCKED: {hook_result.reason}",
                "metadata": {"severity": hook_result.severity},
            })
            self._log("blocked_input", {"reason": hook_result.reason})
            self.status = "complete"
            return {
                **state,
                "traces": traces,
                "blocked": True,
                "block_reason": hook_result.reason,
            }

        # Step 2: Identity verification
        traces.append({
            "event_type": "agent_action",
            "agent": self.name,
            "agent_icon": self.icon,
            "content": "✅ Input sanitized — no injection detected. Verifying user identity...",
        })
        await self._think("Verifying identity")

        # Step 3: Context security check
        traces.append({
            "event_type": "thought_trace",
            "agent": self.name,
            "agent_icon": self.icon,
            "content": "Cross-referencing request against known threat patterns. Checking data access permissions for requested scope.",
        })
        await self._think("Cross-referencing threats")

        # Step 4: Clearance
        traces.append({
            "event_type": "status_update",
            "agent": self.name,
            "agent_icon": self.icon,
            "content": "🟢 Security clearance GRANTED. All hooks passed. Routing to specialist agent.",
            "metadata": {"hooks_passed": hook_pipeline.stats()},
        })

        self._log("security_scan", {"result": "cleared", "task": task[:100]})
        self.status = "complete"

        return {
            **state,
            "traces": traces,
            "blocked": False,
            "security_cleared": True,
        }


# ── Financier Agent (Revenue & Cash Flow) ───────────────────────────────────

class Financier(BaseAgent):
    name = "financier"
    display_name = "The Financier"
    icon = "/avatars/financier.png"
    description = "Revenue tracking, invoicing & cash flow management"

    async def execute(self, state: dict) -> dict:
        self.status = "working"
        task = state.get("task", "")
        traces = state.get("traces", [])

        # Step 1: Analyze task with LLM (if available)
        tool_result = None
        if self.llm_service and self.tool_registry:
            traces.append({
                "event_type": "thought_trace",
                "agent": self.name,
                "agent_icon": self.icon,
                "content": "Consulting LLM to select the appropriate financial tool...",
            })
            # Get available tools
            tools = self.tool_registry.list_tools()
            # Decide
            decision = await self.llm_service.decide_tool(task, tools)
            
            if decision:
                tool_name = decision["tool"]
                params = decision["params"]

                # ⚠️ APPROVAL CHECK (Simulation)
                # If creating an invoice over $1000, request human approval
                amount_val = params.get('amount', 0)
                print(f"DEBUG: tool={tool_name}, amount={amount_val}, type={type(amount_val)}")
                print(f"DEBUG: Cond 1 (name): {tool_name == 'create_invoice'}")
                print(f"DEBUG: Cond 2 (amt): {int(amount_val) > 1000}")
                
                if tool_name == 'create_invoice' and int(amount_val) > 1000:
                    print("DEBUG: ENTERED APPROVAL BLOCK")
                    approval_id = f"app_{int(datetime.now().timestamp())}"
                    traces.append({
                        "event_type": "approval_request",
                        "agent": self.name,
                        "agent_icon": self.icon,
                        "content": f"⚠️ Invoice amount ${params.get('amount')} exceeds auto-approval limit ($1000). Requesting confirmation.",
                        "tool_name": tool_name,
                        "params": params,
                        "approval_id": approval_id,
                    })
                    return {
                        **state,
                        "traces": traces,
                        "status": "waiting_for_approval",
                        "approval_id": approval_id
                    }

                traces.append({
                    "event_type": "thought_trace",
                    "agent": self.name,
                    "agent_icon": self.icon,
                    "content": f"LLM selected tool: `{tool_name}` with params: {params}",
                })
                
                # Execute
                result = await self.tool_registry.run_tool(tool_name, **params)
                tool_result = result
                
                traces.append({
                    "event_type": "agent_action",
                    "agent": self.name,
                    "agent_icon": self.icon,
                    "content": f"🔧 Executed `{tool_name}`. Result:\n{str(result)[:200]}...", # Truncate for display
                    "tool_output": result, # Pass full JSON for UI
                    "tool_name": tool_name,
                })
            else:
                 traces.append({
                    "event_type": "thought_trace",
                    "agent": self.name,
                    "agent_icon": self.icon,
                    "content": "LLM did not select a specific tool. Proceeding with standard analysis.",
                })

        # Fallback to Mock Logic if no tool execution (or just continue for enriched data)
        if not tool_result:
             # ... existing logic ...
             traces.append({
                "event_type": "thought_trace",
                "agent": self.name,
                "agent_icon": self.icon,
                "content": "Analyzing financial context... Connecting to Stripe billing data via MCP connector.",
            })
             await self._think("Connecting to Stripe")

             # Step 2: Pull invoice data from connector
             from connectors.stripe_connector import StripeConnector
             stripe = StripeConnector()
             await stripe.initialize()
             invoices_data = await stripe.call_tool("list_invoices", {"status": "overdue"})
             balance_data = await stripe.call_tool("get_balance")

             overdue = invoices_data.get("invoices", [])
             balance = balance_data.get("balance", {})

             traces.append({
                "event_type": "agent_action",
                "agent": self.name,
                "agent_icon": self.icon,
                "content": f"📊 Found {len(overdue)} overdue invoices totaling ${sum(i['amount'] for i in overdue)/100:,.2f}. Available balance: ${balance.get('available', [{}])[0].get('amount', 0)/100:,.2f}.",
                "metadata": {"overdue_count": len(overdue), "total_overdue": sum(i['amount'] for i in overdue)},
             })
             await self._think("Analyzing cash flow")

        # Step 3: Prioritize actions (Common)
        # Note: In a real agent, we'd use tool_result to drive this. 
        # For now, we keep the mock logic as a "simulation" unless tool_result overrides it.
        # But wait, if I executed `get_balance`, I have the balance!
        
        # Let's simple return if tool executed for now, to verify the tool path.
        if tool_result:
             self.status = "complete"
             return {
                **state,
                "traces": traces,
                "finance_result": {
                    "tool_output": tool_result,
                    "actions_prepared": [], # No actions yet for simple tool calls
                },
             }

        # ... existing fallback logic for full simulation ...

        # Step 4: Draft chaser emails
        chaser_actions = []
        for inv in overdue[:3]:
            action_desc = f"Draft chaser email to {inv['customer']} for ${inv['amount']/100:,.2f} ({inv['description']})"
            chaser_actions.append(action_desc)

            # Create approval for high-value actions
            if inv["amount"] > 500000:  # > $5,000
                approval_id = memory_manager.audit.create_approval(
                    agent=self.name,
                    action_type="send_chaser_email",
                    description=f"Send payment reminder to {inv['customer']} for ${inv['amount']/100:,.2f}",
                    details={"invoice_id": inv["id"], "customer": inv["customer"], "amount": inv["amount"]},
                    risk_level="high",
                )
                traces.append({
                    "event_type": "approval_request",
                    "agent": self.name,
                    "agent_icon": self.icon,
                    "content": f"⏳ APPROVAL REQUIRED: Send payment reminder to {inv['customer']} for ${inv['amount']/100:,.2f}",
                    "metadata": {"approval_id": approval_id, "risk_level": "high"},
                })

        traces.append({
            "event_type": "agent_action",
            "agent": self.name,
            "agent_icon": self.icon,
            "content": "📧 Prepared " + str(len(chaser_actions)) + " chaser emails:\n" + "\n".join(f"  • {a}" for a in chaser_actions),
        })

        # Step 5: Cash flow summary
        traces.append({
            "event_type": "status_update",
            "agent": self.name,
            "agent_icon": self.icon,
            "content": "💵 Cash flow analysis complete. Recommendation: Follow up on overdue invoices to recover $26,000 in receivables.",
            "metadata": {
                "overdue_invoices": len(overdue),
                "total_receivable": sum(i["amount"] for i in overdue),
                "actions_prepared": len(chaser_actions),
            },
        })

        self._log("financial_analysis", {
            "overdue_count": len(overdue),
            "total_overdue": sum(i["amount"] for i in overdue),
            "actions": len(chaser_actions),
        })
        self.status = "complete"

        return {
            **state,
            "traces": traces,
            "finance_result": {
                "overdue_invoices": overdue,
                "balance": balance,
                "actions_prepared": chaser_actions,
            },
        }


# ── Scout Agent (Growth & Lead Discovery) ──────────────────────────────────

class Scout(BaseAgent):
    name = "scout"
    display_name = "The Scout"
    icon = "/avatars/scout.png"
    description = "Lead discovery, qualification & outreach"

    async def execute(self, state: dict) -> dict:
        self.status = "working"
        task = state.get("task", "")
        traces = state.get("traces", [])

        # Step 1: Analyze task with LLM (if available)
        tool_result = None
        if self.llm_service and self.tool_registry:
            traces.append({
                "event_type": "thought_trace",
                "agent": self.name,
                "agent_icon": self.icon,
                "content": "Consulting LLM to identify growth opportunities...",
            })
            # Get available tools
            tools = self.tool_registry.list_tools()
            # Decide
            decision = await self.llm_service.decide_tool(task, tools)
            
            if decision:
                tool_name = decision["tool"]
                params = decision["params"]
                traces.append({
                    "event_type": "thought_trace",
                    "agent": self.name,
                    "agent_icon": self.icon,
                    "content": f"LLM selected tool: `{tool_name}` with params: {params}",
                })
                
                # Execute
                result = await self.tool_registry.run_tool(tool_name, **params)
                tool_result = result
                
                traces.append({
                    "event_type": "agent_action",
                    "agent": self.name,
                    "agent_icon": self.icon,
                    "content": f"🔧 Executed `{tool_name}`. Result:\n{str(result)[:200]}...",
                    "tool_output": result, # Pass full JSON for UI
                    "tool_name": tool_name,
                })
            else:
                 traces.append({
                    "event_type": "thought_trace",
                    "agent": self.name,
                    "agent_icon": self.icon,
                    "content": "LLM did not select a specific tool. Proceeding with standard scan.",
                })

        # Return tool result directly if available (for now)
        if tool_result:
             self.status = "complete"
             return {
                **state,
                "traces": traces,
                "scout_result": {
                    "tool_output": tool_result,
                    "recommended_actions": ["Review tool output"],
                },
             }

        # Step 1: Scan channels (Fallback)
        traces.append({
            "event_type": "thought_trace",
            "agent": self.name,
            "agent_icon": self.icon,
            "content": "Scanning Slack channels and email for new lead signals...",
        })
        await self._think("Scanning channels")

        # Step 2: Pull Slack data
        from connectors.slack_connector import SlackConnector
        slack = SlackConnector()
        await slack.initialize()
        messages = await slack.call_tool("search_messages", {"query": "interested"})

        traces.append({
            "event_type": "agent_action",
            "agent": self.name,
            "agent_icon": self.icon,
            "content": f"📡 Scanned {messages.get('count', 0)} channels. Found {len(messages.get('messages', []))} messages mentioning potential leads.",
        })
        await self._think("Analyzing leads")

        # Step 3: Qualify leads
        mock_leads = [
            {"name": "TechStart LLC", "score": 92, "source": "Slack #sales", "signal": "Interested in enterprise plan", "budget": "high"},
            {"name": "NewVenture Co", "score": 78, "source": "LinkedIn", "signal": "Series A announcement", "budget": "medium"},
            {"name": "LocalShop Pro", "score": 45, "source": "Website form", "signal": "Pricing inquiry", "budget": "low"},
        ]

        traces.append({
            "event_type": "thought_trace",
            "agent": self.name,
            "agent_icon": self.icon,
            "content": f"Qualified {len(mock_leads)} leads by engagement score:\n" +
                       "\n".join(f"  • {l['name']}: Score {l['score']}/100 ({l['budget']} budget)" for l in mock_leads),
        })
        await self._think("Scoring leads")

        # Step 4: Recommend actions
        high_value = [l for l in mock_leads if l["score"] >= 70]
        traces.append({
            "event_type": "agent_action",
            "agent": self.name,
            "agent_icon": self.icon,
            "content": f"🎯 {len(high_value)} high-value leads identified. Recommendation:\n" +
                       "  • TechStart LLC → Book demo meeting (CEO calendar)\n" +
                       "  • NewVenture Co → Send personalized intro email",
        })

        traces.append({
            "event_type": "status_update",
            "agent": self.name,
            "agent_icon": self.icon,
            "content": "✅ Lead pipeline updated. 2 high-value prospects ready for engagement.",
            "metadata": {"total_leads": len(mock_leads), "high_value": len(high_value)},
        })

        self._log("lead_discovery", {"leads_found": len(mock_leads), "high_value": len(high_value)})
        self.status = "complete"

        return {
            **state,
            "traces": traces,
            "scout_result": {
                "leads": mock_leads,
                "high_value_count": len(high_value),
                "recommended_actions": ["Book demo for TechStart", "Send intro to NewVenture"],
            },
        }


# ── Operator Agent (Task Coordination) ──────────────────────────────────────

class Operator(BaseAgent):
    name = "operator"
    display_name = "The Operator"
    icon = "/avatars/operator.png"
    description = "Task coordination, scheduling & workflow management"

    async def execute(self, state: dict) -> dict:
        self.status = "working"
        task = state.get("task", "")
        traces = state.get("traces", [])

        # Step 1: Parse scheduling context
        traces.append({
            "event_type": "thought_trace",
            "agent": self.name,
            "agent_icon": self.icon,
            "content": "Analyzing operational context... Checking calendar, task queue, and resource availability.",
        })
        await self._think("Checking calendar")

        # Step 2: Current workload
        mock_tasks = [
            {"id": "T001", "title": "Website redesign - Phase 2 delivery", "assignee": "Dev Team", "due": "2026-02-20", "status": "in_progress", "priority": "high"},
            {"id": "T002", "title": "Client onboarding - NewVenture", "assignee": "Sarah", "due": "2026-02-22", "status": "pending", "priority": "medium"},
            {"id": "T003", "title": "Q1 report preparation", "assignee": "Finance", "due": "2026-03-01", "status": "not_started", "priority": "low"},
        ]

        traces.append({
            "event_type": "agent_action",
            "agent": self.name,
            "agent_icon": self.icon,
            "content": f"📋 Active tasks: {len(mock_tasks)}\n" +
                       "\n".join(f"  • [{t['priority'].upper()}] {t['title']} — {t['status'].replace('_', ' ')} (due {t['due']})" for t in mock_tasks),
        })
        await self._think("Analyzing workload")

        # Step 3: Schedule optimization
        traces.append({
            "event_type": "thought_trace",
            "agent": self.name,
            "agent_icon": self.icon,
            "content": "Cross-referencing with Financier's invoice data... Phase 2 delivery for TechStart is linked to invoice inv_002 ($7,500 overdue). Recommend prioritizing delivery to unlock payment.",
        })
        await self._think("Optimizing schedule")

        # Step 4: Recommendations
        traces.append({
            "event_type": "status_update",
            "agent": self.name,
            "agent_icon": self.icon,
            "content": "⚡ Operations summary: 3 active tasks, 1 deadline approaching (Phase 2 delivery in 2 days). Recommended priority shift to unblock $7,500 payment.",
            "metadata": {"active_tasks": len(mock_tasks), "urgent": 1},
        })

        self._log("operations_review", {"tasks": len(mock_tasks)})
        self.status = "complete"

        return {
            **state,
            "traces": traces,
            "operator_result": {
                "active_tasks": mock_tasks,
                "recommendations": ["Prioritize Phase 2 delivery to unlock TechStart payment"],
            },
        }


# ── Architect Agent (Engineering & Infrastructure) ──────────────────────────

class Architect(BaseAgent):
    name = "architect"
    display_name = "The Architect"
    icon = "/avatars/architect.png"
    description = "Code review, GitHub management, & infrastructure"

    async def execute(self, state: dict) -> dict:
        self.status = "working"
        task = state.get("task", "")
        traces = state.get("traces", [])

        # Analyze task with LLM
        tool_result = None
        if self.llm_service and self.tool_registry:
            traces.append({
                "event_type": "thought_trace",
                "agent": self.name,
                "agent_icon": self.icon,
                "content": "Consulting LLM to select the appropriate engineering tool...",
            })
            
            tools = self.tool_registry.list_tools()
            decision = await self.llm_service.decide_tool(task, tools)
            
            if decision:
                tool_name = decision["tool"]
                params = decision["params"]
                
                # Check if it's a github tool
                if not tool_name.startswith("get_github") and not tool_name.startswith("list_github") and not tool_name.startswith("get_pr"):
                     traces.append({
                        "event_type": "thought_trace",
                        "agent": self.name,
                        "agent_icon": self.icon,
                        "content": f"LLM selected non-engineering tool: `{tool_name}`. Executing anyway.",
                    })

                traces.append({
                    "event_type": "thought_trace",
                    "agent": self.name,
                    "agent_icon": self.icon,
                    "content": f"LLM selected tool: `{tool_name}` with params: {params}",
                })
                
                # Execute
                result = await self.tool_registry.run_tool(tool_name, **params)
                tool_result = result
                
                traces.append({
                    "event_type": "agent_action",
                    "agent": self.name,
                    "agent_icon": self.icon,
                    "content": f"🔧 Executed `{tool_name}`. Result:\n{str(result)[:200]}...",
                    "tool_output": result, # Pass full JSON for UI
                    "tool_name": tool_name,
                })
            else:
                 traces.append({
                    "event_type": "thought_trace",
                    "agent": self.name,
                    "agent_icon": self.icon,
                    "content": "LLM did not select a specific tool. Proceeding with standard scan.",
                })

        # Return tool result directly
        if tool_result:
             self.status = "complete"
             return {
                **state,
                "traces": traces,
                "architect_result": {
                    "tool_output": tool_result,
                    "recommended_actions": ["Review GitHub changes"],
                },
             }

        # Step 1: Default fallback if LLM/Tools fail
        traces.append({
            "event_type": "thought_trace",
            "agent": self.name,
            "agent_icon": self.icon,
            "content": "Awaiting valid GitHub API keys to retrieve code context.",
        })
        await self._think("Awaiting instructions")

        self.status = "complete"
        return {
            **state,
            "traces": traces,
            "architect_result": {"status": "Awaiting instructions"}
        }


# ── Researcher Agent (Document Intelligence) ────────────────────────────────

class Researcher(BaseAgent):
    name = "researcher"
    display_name = "The Researcher"
    icon = "/avatars/researcher.png"
    description = "Document ingestion, analysis & summarization"

    async def execute(self, state: dict) -> dict:
        self.status = "working"
        task = state.get("task", "")
        traces = state.get("traces", [])
        
        # Analyze task with LLM
        tool_result = None
        if self.llm_service and self.tool_registry:
            traces.append({
                "event_type": "thought_trace",
                "agent": self.name,
                "agent_icon": self.icon,
                "content": "Consulting LLM to select the appropriate document analysis tool...",
            })
            
            tools = self.tool_registry.list_tools()
            decision = await self.llm_service.decide_tool(task, tools)
            
            if decision:
                tool_name = decision["tool"]
                params = decision["params"]
                
                traces.append({
                    "event_type": "thought_trace",
                    "agent": self.name,
                    "agent_icon": self.icon,
                    "content": f"LLM selected tool: `{tool_name}` with params: {params}",
                })
                
                # Execute
                result = await self.tool_registry.run_tool(tool_name, **params)
                tool_result = result
                
                traces.append({
                    "event_type": "agent_action",
                    "agent": self.name,
                    "agent_icon": self.icon,
                    "content": f"📝 Executed `{tool_name}`. Result:\n{str(result)[:500]}...",
                    "tool_output": result, # Pass full JSON for UI
                    "tool_name": tool_name,
                })
            else:
                 traces.append({
                    "event_type": "thought_trace",
                    "agent": self.name,
                    "agent_icon": self.icon,
                    "content": "LLM did not select a specific tool. Checking for uploaded documents in context.",
                })

        # Return tool result directly if available 
        if tool_result:
             self.status = "complete"
             return {
                **state,
                "traces": traces,
                "researcher_result": {
                    "tool_output": tool_result,
                    "recommended_actions": ["Review document summary"],
                },
             }

        # Fallback simulation
        traces.append({
            "event_type": "thought_trace",
            "agent": self.name,
            "agent_icon": self.icon,
            "content": "Scanning attached documents for relevant context...",
        })
        await self._think("Scanning documents")

        traces.append({
            "event_type": "status_update",
            "agent": self.name,
            "agent_icon": self.icon,
            "content": "✅ Document scan complete (Simulation mode). No new insights found.",
            "metadata": {"docs_scanned": 0},
        })

        self._log("document_analysis", {"docs": 0})
        self.status = "complete"

        return {
            **state,
            "traces": traces,
            "researcher_result": {"status": "Complete"}
        }


# ── Liaison Agent (Communication & Final Response) ──────────────────────────

class Liaison(BaseAgent):
    name = "liaison"
    display_name = "The Liaison"
    icon = "/avatars/liaison.png"
    description = "Interprets commands, routes tasks & compiles final briefings"

    def set_llm_service(self, service):
        self.llm_service = service

    async def classify_task(self, task: str) -> list[str]:
        """Classify the task using LLM if available, otherwise keywords."""
        if hasattr(self, 'llm_service') and self.llm_service:
            try:
                intent_data = await self.llm_service.parse_intent(task)
                agent = intent_data.get("agent")
                if agent and agent in ["financier", "scout", "operator", "guardian", "architect", "researcher"]:
                    logger.info(f"🧠 LLM routed '{task}' to {agent} (Reason: {intent_data.get('thought')})")
                    return [agent]
            except Exception as e:
                logger.error(f"LLM Classification failed: {e}")

        # Fallback to keyword matching
        task_lower = task.lower()
        agents = []

        finance_keywords = ["invoice", "payment", "money", "cash", "billing", "overdue", "revenue", "financial", "stripe", "pay"]
        scout_keywords = ["lead", "prospect", "client", "sale", "outreach", "growth", "pipeline", "customer", "new business"]
        operator_keywords = ["schedule", "task", "calendar", "meeting", "deadline", "project", "assign", "coordinate", "workflow"]
        architect_keywords = ["github", "repo", "pr", "pull request", "code", "issue", "branch", "commit", "bug"]
        researcher_keywords = ["document", "pdf", "csv", "summarize", "analyze", "read", "file", "upload", "research"]

        if any(kw in task_lower for kw in finance_keywords):
            agents.append("financier")
        if any(kw in task_lower for kw in scout_keywords):
            agents.append("scout")
        if any(kw in task_lower for kw in operator_keywords):
            agents.append("operator")
        if any(kw in task_lower for kw in architect_keywords):
            agents.append("architect")
        if any(kw in task_lower for kw in researcher_keywords):
            agents.append("researcher")

        # Default: run all agents for general queries
        if not agents or any(kw in task_lower for kw in ["status", "brief", "report", "everything", "all", "overview", "how", "what"]):
            agents = ["financier", "scout", "operator"]

        return agents

    async def execute(self, state: dict) -> dict:
        self.status = "working"
        task = state.get("task", "")
        traces = state.get("traces", [])
        agents_used = state.get("agents_chain", [])

        # Compile final response
        traces.append({
            "event_type": "thought_trace",
            "agent": self.name,
            "agent_icon": self.icon,
            "content": f"Compiling final briefing from {len(agents_used)} agents: {', '.join(agents_used)}...",
        })
        await self._think("Compiling response")

        # Build summary from agent results
        summary_parts = []
        if state.get("finance_result"):
            fr = state["finance_result"]
            overdue_count = len(fr.get("overdue_invoices", []))
            total_overdue = sum(i.get("amount", 0) for i in fr.get("overdue_invoices", []))
            
            balance_str = ""
            if "balance" in fr:
                avail = fr["balance"].get("available", [{}])[0].get("amount", 0)
                balance_str = f" Available Balance: ${avail/100:,.2f}."

            summary_parts.append(f"💰 Finance:{balance_str} {overdue_count} overdue invoices (${total_overdue/100:,.2f}). {len(fr.get('actions_prepared', []))} chaser emails prepared.")

        if state.get("scout_result"):
            sr = state["scout_result"]
            summary_parts.append(f"🔍 Growth: {sr.get('high_value_count', 0)} high-value leads identified. Actions: {', '.join(sr.get('recommended_actions', []))}")

        if state.get("operator_result"):
            opr = state["operator_result"]
            summary_parts.append(f"⚙️ Ops: {len(opr.get('active_tasks', []))} active tasks. {', '.join(opr.get('recommendations', []))}")

        final_summary = "\n\n".join(summary_parts) if summary_parts else "All systems nominal. No urgent actions required."

        traces.append({
            "event_type": "final_response",
            "agent": self.name,
            "agent_icon": self.icon,
            "content": f"📋 **Ecomind Briefing Complete**\n\n{final_summary}",
            "metadata": {"agents_consulted": agents_used},
        })

        self._log("briefing_compiled", {"agents": agents_used, "task": task[:100]})
        self.status = "complete"

        return {
            **state,
            "traces": traces,
            "final_summary": final_summary,
        }


# ── Global Agent Instances ──────────────────────────────────────────────────

guardian = Guardian()
financier = Financier()
scout = Scout()
operator = Operator()
architect = Architect()
liaison = Liaison()
researcher = Researcher()

ALL_AGENTS = {
    "guardian": guardian,
    "financier": financier,
    "scout": scout,
    "operator": operator,
    "architect": architect,
    "liaison": liaison,
    "researcher": researcher,
}