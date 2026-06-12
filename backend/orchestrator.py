"""
Ecomind Orchestrator — Multi-agent command pipeline with collaboration.
Guardian → [Specialist Agents (parallel)] → Liaison

Routes tasks through the appropriate agents based on the Liaison's classification,
with the Guardian always running first for security and the Liaison always running last.
Agents share data via a `shared_data` dict for cross-agent intelligence.
"""

import asyncio
import logging
from datetime import datetime
from agents import guardian, financier, scout, operator, liaison, ALL_AGENTS
from services.context import get_context

logger = logging.getLogger("ecomind.orchestrator")


class Orchestrator:
    """
    The Ecomind Command Pipeline with Multi-Agent Collaboration.

    Flow:
    1. Liaison classifies the incoming task
    2. Guardian runs security scan
    3. Specialist agents execute in parallel (sharing data via shared_data)
    4. Cross-agent synthesis (agents can react to each other's outputs)
    5. Liaison compiles the final briefing
    """

    def __init__(self):
        self.agents = ALL_AGENTS

    async def execute(self, task: str, user_id: str = "default") -> dict:
        """
        Execute a task through the full Ecomind pipeline.
        Returns the final state with all thought traces.
        """
        logger.info("🎯 New task: '%s' from user '%s'", task[:80], user_id)

        state = {
            "task": task,
            "user_id": user_id,
            "traces": [],
            "agents_chain": [],
            "blocked": False,
            "timestamp": datetime.now().isoformat(),
            "shared_data": {},  # Cross-agent data sharing layer
            "collaborations": [],  # Track agent-to-agent handoffs
        }

        # Step 1: Liaison classifies the task
        target_agents = await liaison.classify_task(task)
        logger.info("📋 Task classified → agents: %s", target_agents)

        state["traces"].append({
            "event_type": "status_update",
            "agent": "liaison",
            "agent_icon": "👑",
            "content": f"Task received: \"{task}\"\nRouting to: Guardian → {' → '.join(a.title() for a in target_agents)} → Liaison",
        })

        # Step 2: Guardian security scan (always first)
        state["agents_chain"].append("guardian")
        state = await guardian.execute(state)

        if state.get("blocked"):
            logger.warning("🚫 Task blocked by Guardian: %s", state.get("block_reason"))
            return state

        # Step 3: Execute specialist agents in parallel (when multiple)
        non_guardian = [a for a in target_agents if a != "guardian"]
        if len(non_guardian) > 1:
            state = await self._execute_parallel(state, non_guardian)
        else:
            for agent_name in non_guardian:
                agent = self.agents.get(agent_name)
                if agent:
                    state["agents_chain"].append(agent_name)
                    state = await agent.execute(state)

        # Step 4: Cross-agent synthesis (if multiple agents contributed data)
        if len(non_guardian) > 1 and state.get("shared_data"):
            state = await self._synthesize(state, non_guardian)

        # Step 5: Liaison compiles final response
        state["agents_chain"].append("liaison")
        state = await liaison.execute(state)

        logger.info("✅ Task complete. Agents: %s, Collaborations: %d",
                     state["agents_chain"], len(state.get("collaborations", [])))
        return state

    async def _execute_parallel(self, state: dict, agent_names: list) -> dict:
        """Execute multiple agents concurrently, sharing state."""
        logger.info("⚡ Parallel execution: %s", agent_names)

        # Add collaboration trace
        state["traces"].append({
            "event_type": "collaboration",
            "agent": "system",
            "agent_icon": "🤝",
            "content": f"Initiating parallel execution: {', '.join(a.title() for a in agent_names)}\nAgents will share data in real-time via the collaboration layer.",
        })

        # Run each agent with a copy of state, then merge
        tasks = []
        for agent_name in agent_names:
            agent = self.agents.get(agent_name)
            if agent:
                state["agents_chain"].append(agent_name)
                # Each agent gets a shallow copy of state but shares shared_data by reference
                agent_state = {**state, "traces": list(state["traces"])}
                tasks.append(agent.execute(agent_state))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Merge results back into state
        merged_traces = list(state["traces"])
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error("Agent %s failed: %s", agent_names[i], result)
                continue
            # Merge new traces
            for trace in result.get("traces", []):
                if trace not in merged_traces:
                    merged_traces.append(trace)
            # Merge shared_data
            state["shared_data"].update(result.get("shared_data", {}))
            # Merge agent-specific results
            for key in result:
                if key.endswith("_result") and key not in state:
                    state[key] = result[key]

        state["traces"] = merged_traces
        return state

    async def _synthesize(self, state: dict, agent_names: list) -> dict:
        """Cross-agent synthesis: let agents react to each other's outputs."""
        shared = state.get("shared_data", {})
        traces = state.get("traces", [])

        # Check for cross-agent intelligence opportunities
        has_finance = "finance" in shared
        has_leads = "leads" in shared

        if has_finance and has_leads:
            # Scout found leads AND Financier found financial data
            leads = shared.get("leads", [])
            overdue_clients = [inv.get("customer", "") for inv in shared.get("finance", {}).get("invoices", [])
                              if inv.get("status") == "overdue"]

            # Cross-reference: flag leads that are also overdue
            flagged = []
            for lead in leads:
                lead_name = lead.get("company", lead.get("name", ""))
                if any(client.lower() in lead_name.lower() or lead_name.lower() in client.lower()
                       for client in overdue_clients):
                    flagged.append(lead_name)

            collab_record = {
                "from_agent": "scout",
                "to_agent": "financier",
                "data_shared": f"{len(leads)} leads cross-referenced with {len(overdue_clients)} overdue clients",
                "findings": f"{len(flagged)} leads flagged as having overdue invoices" if flagged else "No overlaps found",
                "timestamp": datetime.now().isoformat(),
            }
            state["collaborations"].append(collab_record)

            insight = f"🤝 **Cross-Agent Intelligence**\n"
            insight += f"Scout found {len(leads)} leads, Financier identified {len(overdue_clients)} overdue clients.\n"
            if flagged:
                insight += f"⚠️ **Flagged:** {', '.join(flagged)} appear in both lead pipeline and overdue invoices."
            else:
                insight += f"✅ No overlap between new leads and overdue clients — clean pipeline."

            traces.append({
                "event_type": "collaboration",
                "agent": "system",
                "agent_icon": "🤝",
                "content": insight,
            })

        elif has_finance:
            traces.append({
                "event_type": "collaboration",
                "agent": "system",
                "agent_icon": "🤝",
                "content": f"💰 Financial data shared: {len(shared.get('finance', {}).get('invoices', []))} invoices available for cross-reference.",
            })

        elif has_leads:
            traces.append({
                "event_type": "collaboration",
                "agent": "system",
                "agent_icon": "🤝",
                "content": f"🔍 Lead data shared: {len(shared.get('leads', []))} leads available for cross-reference.",
            })

        state["traces"] = traces
        return state

    async def execute_streaming(self, task: str, user_id: str = "default"):
        """
        Execute a task and yield SSE events as agents produce thought traces.
        Yields dict events suitable for Server-Sent Events.
        """
        logger.info("🎯 [STREAM] New task: '%s'", task[:80])

        state = {
            "task": task,
            "user_id": user_id,
            "traces": [],
            "agents_chain": [],
            "blocked": False,
            "timestamp": datetime.now().isoformat(),
            "shared_data": {},
            "collaborations": [],
        }

        # Memory: retrieve context from recent conversations
        context = get_context(task)
        state["context"] = context

        if context.get("memory_active"):
            memory_msg = f"🧠 Memory active: {len(context.get('recent_commands', []))} recent conversations loaded."
            if context.get("is_follow_up"):
                memory_msg += "\n⚡ Follow-up detected — referencing previous results."
            state["traces"].append({
                "event_type": "memory",
                "agent": "system",
                "agent_icon": "🧠",
                "content": memory_msg,
            })

        # Yield memory traces before routing
        for trace in state["traces"]:
            trace["timestamp"] = datetime.now().isoformat()
            yield trace

        # Classify
        target_agents = await liaison.classify_task(task)

        routing_event = {
            "event_type": "status_update",
            "agent": "liaison",
            "agent_icon": "👑",
            "content": f"Task received: \"{task}\"\nRouting to: Guardian → {' → '.join(a.title() for a in target_agents)} → Liaison",
            "timestamp": datetime.now().isoformat(),
        }
        state["traces"].append(routing_event)
        yield routing_event

        # Guardian
        state["agents_chain"].append("guardian")
        pre_count = len(state["traces"])
        state = await guardian.execute(state)
        for trace in state["traces"][pre_count:]:
            trace["timestamp"] = datetime.now().isoformat()
            yield trace

        if state.get("blocked"):
            return

        # Specialist agents (parallel if multiple)
        non_guardian = [a for a in target_agents if a != "guardian"]

        if len(non_guardian) > 1:
            # Emit collaboration start event
            collab_event = {
                "event_type": "collaboration",
                "agent": "system",
                "agent_icon": "🤝",
                "content": f"Initiating parallel execution: {', '.join(a.title() for a in non_guardian)}",
                "timestamp": datetime.now().isoformat(),
            }
            state["traces"].append(collab_event)
            yield collab_event

        for agent_name in non_guardian:
            agent = self.agents.get(agent_name)
            if agent:
                state["agents_chain"].append(agent_name)
                pre_count = len(state["traces"])
                state = await agent.execute(state)
                for trace in state["traces"][pre_count:]:
                    trace["timestamp"] = datetime.now().isoformat()
                    yield trace

        # Cross-agent synthesis
        if len(non_guardian) > 1 and state.get("shared_data"):
            pre_count = len(state["traces"])
            state = await self._synthesize(state, non_guardian)
            for trace in state["traces"][pre_count:]:
                trace["timestamp"] = datetime.now().isoformat()
                yield trace

        # Liaison final
        state["agents_chain"].append("liaison")
        pre_count = len(state["traces"])
        state = await liaison.execute(state)
        for trace in state["traces"][pre_count:]:
            trace["timestamp"] = datetime.now().isoformat()
            yield trace

    def get_agent_statuses(self) -> list[dict]:
        """Get status of all agents."""
        return [agent.get_status() for agent in self.agents.values()]

    def reset_statuses(self):
        """Reset all agents to idle."""
        for agent in self.agents.values():
            agent.status = "idle"


# Global orchestrator instance
orchestrator = Orchestrator()