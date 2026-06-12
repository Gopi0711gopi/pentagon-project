"""
Ecomind — FastAPI Backend
The Agentic Workflow Orchestrator API.

20+ endpoints: task execution, daily brief, approvals, analytics,
reports, settings, search, activity log, notifications, and more.
"""

import asyncio
import json
import logging
import random
from datetime import datetime, timedelta
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, APIRouter, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import os
from fastapi.security import OAuth2PasswordRequestForm
from models import TaskRequest, ApprovalAction, ApiKeyUpdate, UserSignup, UserResponse
from orchestrator import orchestrator
from services.daily_brief import daily_brief_service
from services.analytics import AnalyticsService
from services.reports import ReportGenerator
from services.settings import SettingsService
from memory.manager import memory_manager
from connectors.registry import registry
from connectors.stripe_connector import StripeConnector
from connectors.slack_connector import SlackConnector
from connectors.sheets_connector import GoogleSheetsConnector
from connectors.hubspot_connector import HubSpotConnector
from connectors.sendgrid_connector import SendGridConnector
from connectors.notion_connector import NotionConnector
from connectors.github_connector import github_instance
from services.scheduler import scheduler
from services.background import background_queue
from services.history import conversation_history

# ── Services ────────────────────────────────────────────────────────────────

# ── Services ────────────────────────────────────────────────────────────────

from services.llm import LLMService
from services.auth import AuthService
from services.user_db import user_db
from agents import liaison, financier, scout, architect
from tools.registry import tool_registry
from services.document_parser import DocumentParserService

# ── Services ────────────────────────────────────────────────────────────────

analytics_service = AnalyticsService()
settings_service = SettingsService()
llm_service = LLMService(settings_service)
report_generator = ReportGenerator(analytics_service, daily_brief_service, memory_manager)
notification_queue = []  # In-memory notification storage

# Inject services
liaison.set_llm_service(llm_service)
financier.set_tools(tool_registry)
financier.set_llm_service(llm_service)
scout.set_tools(tool_registry)
scout.set_llm_service(llm_service)
architect.set_tools(tool_registry)
architect.set_llm_service(llm_service)

# ── Live Agent Status ───────────────────────────────────────────────────────

agent_health_state = {
    'guardian':  {'status': 'idle', 'cpu': 12, 'memory': 34, 'tasks_running': 0, 'last_active': None, 'uptime_sec': 0},
    'financier': {'status': 'idle', 'cpu': 8,  'memory': 28, 'tasks_running': 0, 'last_active': None, 'uptime_sec': 0},
    'scout':     {'status': 'idle', 'cpu': 15, 'memory': 41, 'tasks_running': 0, 'last_active': None, 'uptime_sec': 0},
    'operator':  {'status': 'idle', 'cpu': 5,  'memory': 22, 'tasks_running': 0, 'last_active': None, 'uptime_sec': 0},
    'liaison':   {'status': 'idle', 'cpu': 10, 'memory': 30, 'tasks_running': 0, 'last_active': None, 'uptime_sec': 0},
}
_start_time = datetime.now()

COMMAND_SUGGESTIONS = [
    {'label': 'Show me overdue invoices', 'icon': '💰', 'category': 'finance'},
    {'label': 'Generate weekly report', 'icon': '📑', 'category': 'reports'},
    {'label': 'Run security scan', 'icon': '🛡️', 'category': 'security'},
    {'label': 'Analyze revenue trend', 'icon': '📊', 'category': 'analytics'},
    {'label': 'Check agent status', 'icon': '🤖', 'category': 'agents'},
    {'label': 'Find new leads', 'icon': '🔍', 'category': 'scout'},
    {'label': 'Create invoice for client', 'icon': '📄', 'category': 'finance'},
    {'label': 'Summarize Slack messages', 'icon': '💬', 'category': 'comms'},
    {'label': 'Update customer record', 'icon': '👤', 'category': 'crm'},
    {'label': 'Schedule team standup', 'icon': '📅', 'category': 'ops'},
    {'label': 'Review pending approvals', 'icon': '✅', 'category': 'approvals'},
    {'label': 'Deploy latest build', 'icon': '🚀', 'category': 'ops'},
    {'label': 'Backup database', 'icon': '💾', 'category': 'ops'},
    {'label': 'Send payment reminder', 'icon': '📧', 'category': 'finance'},
    {'label': 'Audit user permissions', 'icon': '🔐', 'category': 'security'},
]

SLASH_COMMANDS = [
    {'label': '/agents', 'description': 'Show agent status', 'icon': '🤖'},
    {'label': '/report', 'description': 'Generate report', 'icon': '📑'},
    {'label': '/search', 'description': 'Search everything', 'icon': '🔍'},
    {'label': '/settings', 'description': 'Open settings', 'icon': '⚙️'},
    {'label': '/health', 'description': 'System health check', 'icon': '💚'},
    {'label': '/clear', 'description': 'Clear trace log', 'icon': '🧹'},
]

# ── Logging ─────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("ecomind.api")


# ── Startup / Shutdown ──────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize connectors on startup."""
    logger.info("🧠 Ecomind Orchestrator starting...")

    # Register connectors
    stripe_conn = StripeConnector()
    slack_conn = SlackConnector()
    sheets_conn = GoogleSheetsConnector()
    hubspot_conn = HubSpotConnector()
    sendgrid_conn = SendGridConnector()
    notion_conn = NotionConnector()

    registry.register(stripe_conn)
    registry.register(slack_conn)
    registry.register(sheets_conn)
    registry.register(hubspot_conn)
    registry.register(sendgrid_conn)
    registry.register(notion_conn)
    registry.register(github_instance)

    # Initialize all connectors (loads keys from settings)
    await registry.initialize_all()

    # Initialize Agent Tools
    from tools import init_tools
    init_tools()

    # Start background heartbeat broadcaster
    heartbeat_task = asyncio.create_task(_heartbeat_loop())

    # ── Register Scheduled Jobs ────────────────────────────────────────
    scheduler.register_job(
        name="daily_brief",
        interval_seconds=86400,  # 24 hours
        callback=lambda: daily_brief_service.generate(),
        description="Generate the Daily Brief summary",
    )
    scheduler.register_job(
        name="invoice_check",
        interval_seconds=21600,  # 6 hours
        callback=lambda: daily_brief_service.generate().get('finance', {}),
        description="Check for overdue invoices and alert",
    )
    scheduler.register_job(
        name="weekly_report",
        interval_seconds=604800,  # 7 days
        callback=lambda: report_generator.generate_weekly_report(),
        description="Auto-generate weekly performance report",
    )
    scheduler.start()
    background_queue.start()

    logger.info("🧠 Ecomind ready. Five Agents. One Mission. Total Sovereignty.")
    yield
    heartbeat_task.cancel()
    scheduler.stop()
    background_queue.stop()
    logger.info("🧠 Ecomind shutting down.")


# ── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Ecomind — Agentic Workflow Orchestrator",
    description="Five Agents. One Mission. Total Sovereignty.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Active WebSocket connections ────────────────────────────────────────────

active_connections: list[WebSocket] = []


async def broadcast_event(event: dict):
    """Send an event to all connected WebSocket clients."""
    for ws in active_connections[:]:
        try:
            await ws.send_json(event)
        except Exception:
            active_connections.remove(ws)


async def _heartbeat_loop():
    """Background task: broadcast agent health every 3s."""
    while True:
        try:
            await asyncio.sleep(3)
            # Simulate subtle metric fluctuation
            for name, state in agent_health_state.items():
                uptime = (datetime.now() - _start_time).total_seconds()
                state['uptime_sec'] = int(uptime)
                if state['status'] == 'idle':
                    state['cpu'] = max(2, min(25, state['cpu'] + random.randint(-3, 3)))
                    state['memory'] = max(15, min(50, state['memory'] + random.randint(-2, 2)))
                elif state['status'] == 'active':
                    state['cpu'] = max(40, min(95, state['cpu'] + random.randint(-5, 8)))
                    state['memory'] = max(45, min(85, state['memory'] + random.randint(-3, 5)))

            payload = {
                'type': 'agent_status',
                'agents': {
                    name: {**state, 'agent': name}
                    for name, state in agent_health_state.items()
                },
                'timestamp': datetime.now().isoformat(),
            }
            await broadcast_event(payload)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("Heartbeat error: %s", e)


def _set_agent_status(agent_name: str, status: str):
    """Update an agent's live status."""
    if agent_name in agent_health_state:
        agent_health_state[agent_name]['status'] = status
        if status == 'active':
            agent_health_state[agent_name]['tasks_running'] += 1
            agent_health_state[agent_name]['last_active'] = datetime.now().isoformat()
        elif status == 'idle':
            agent_health_state[agent_name]['tasks_running'] = max(0, agent_health_state[agent_name]['tasks_running'] - 1)


# ── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {
        "status": "operational",
        "service": "Ecomind Orchestrator",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "agents": 5,
    }

# Global Protected Router for Dashboard APIs
api_router = APIRouter(dependencies=[Depends(AuthService.get_current_user)])

@app.post("/api/auth/signup", response_model=UserResponse)
async def signup(user: UserSignup):
    hashed_password = AuthService.hash_password(user.password)
    success = user_db.create_user(user.username, user.email, hashed_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    return {
        "username": user.username,
        "email": user.email,
        "created_at": datetime.now().isoformat()
    }

@app.post("/api/auth/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = user_db.get_user(form_data.username)
    if not user or not AuthService.verify_password(form_data.password, user['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_db.update_last_login(form_data.username)
    access_token = AuthService.create_access_token(data={"sub": form_data.username})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/api/task")
async def execute_task_streaming(request: TaskRequest):
    """Execute a task with SSE streaming response. Auto-saves to conversation history."""

    async def event_stream():
        all_traces = []
        agents_chain = []
        start_time = datetime.now()

        async for event in orchestrator.execute_streaming(request.task, request.user_id):
            all_traces.append(event)
            if event.get("agent") and event["agent"] != "system":
                if event["agent"] not in agents_chain:
                    agents_chain.append(event["agent"])
            # Also broadcast to WebSocket clients
            await broadcast_event(event)
            yield f"data: {json.dumps(event)}\n\n"

        # Auto-save conversation to history
        duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        try:
            conversation_history.save(
                command=request.task,
                traces=all_traces,
                agents_used=agents_chain,
                duration_ms=duration_ms,
            )
        except Exception as e:
            logger.error("Failed to save conversation: %s", e)

        yield f"data: {json.dumps({'event_type': 'done', 'agent': 'system', 'content': 'Pipeline complete'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@api_router.post("/api/task/sync")
async def execute_task_sync(request: TaskRequest):
    """Execute a task synchronously and return full result."""
    result = await orchestrator.execute(request.task, request.user_id)
    return {
        "task": request.task,
        "user_id": request.user_id,
        "agents_chain": result.get("agents_chain", []),
        "traces": result.get("traces", []),
        "final_summary": result.get("final_summary", ""),
        "blocked": result.get("blocked", False),
        "timestamp": datetime.now().isoformat(),
    }


@api_router.get("/api/daily-brief")
async def get_daily_brief():
    """Get the Ecomind Daily Brief."""
    return daily_brief_service.generate()


@api_router.get("/api/agents/status")
async def get_agent_statuses():
    """Get the current status of all 5 agents."""
    return {"agents": orchestrator.get_agent_statuses()}


@api_router.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a document for Agent analysis."""
    import os
    os.makedirs("uploads", exist_ok=True)
    file_path = os.path.join("uploads", file.filename)
    
    with open(file_path, "wb") as f:
        f.write(await file.read())
        
    text = DocumentParserService.parse_file(file_path)
    
    # Store in short-term memory for the Researcher agent
    memory_manager.store("recent_upload", {"filename": file.filename, "text": text[:5000]}) # Limit text length
    
    return {"filename": file.filename, "status": "parsed", "text_preview": text[:200] + "..."}


@api_router.get("/api/agents/health")
async def get_agent_health():
    """Get real-time agent health metrics."""
    return {
        'agents': agent_health_state,
        'connected_clients': len(active_connections),
        'uptime_sec': int((datetime.now() - _start_time).total_seconds()),
        'timestamp': datetime.now().isoformat(),
    }


@api_router.get("/api/command-suggestions")
async def command_suggestions(q: str = ""):
    """Get command suggestions for autocomplete."""
    if not q.strip():
        return {'suggestions': COMMAND_SUGGESTIONS[:6], 'slash': SLASH_COMMANDS}

    q_lower = q.lower().strip()

    # Slash command mode
    if q_lower.startswith('/'):
        matches = [s for s in SLASH_COMMANDS if q_lower in s['label'].lower()]
        return {'suggestions': [], 'slash': matches}

    # Natural language suggestions
    matches = [s for s in COMMAND_SUGGESTIONS if q_lower in s['label'].lower()]
    return {'suggestions': matches[:8], 'slash': []}


@api_router.get("/api/approvals")
async def get_approvals():
    """Get all pending approval requests."""
    pending = memory_manager.audit.get_pending_approvals()
    return {"approvals": pending, "count": len(pending)}


@api_router.post("/api/approvals/{approval_id}/resolve")
async def resolve_approval(approval_id: int, action: ApprovalAction):
    """Approve or reject a pending action."""
    memory_manager.audit.resolve_approval(approval_id, action.status, action.resolved_by)
    memory_manager.audit.log("system", f"approval_{action.status}", {
        "approval_id": approval_id,
        "resolved_by": action.resolved_by,
    })
    return {"status": "resolved", "approval_id": approval_id, "action": action.status}


@api_router.get("/api/memory/stats")
async def get_memory_stats():
    """Get memory system statistics."""
    return memory_manager.stats()


@api_router.get("/api/connectors")
async def list_connectors():
    """List all registered connectors."""
    return {"connectors": registry.list_all()}


@api_router.get("/api/audit")
async def get_audit_log(limit: int = 50, agent: str = None):
    """Get recent audit events."""
    events = memory_manager.audit.get_recent_events(limit=limit, agent=agent)
    return {"events": events, "count": len(events)}


# ── WebSocket ───────────────────────────────────────────────────────────────

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    """Real-time WebSocket connection for agent events."""
    await websocket.accept()
    active_connections.append(websocket)
    logger.info("🔌 WebSocket client connected (%d total)", len(active_connections))

    try:
        while True:
            data = await websocket.receive_json()

            # Handle incoming task from WebSocket
            if data.get("type") == "task":
                task = data.get("task", "")
                user_id = data.get("user_id", "default")
                start_time = datetime.now()
                all_traces = []
                agents_chain = []
                shared_data = {}

                async for event in orchestrator.execute_streaming(task, user_id):
                    all_traces.append(event)
                    if event.get("agent") and event["agent"] != "system":
                        if event["agent"] not in agents_chain:
                            agents_chain.append(event["agent"])
                    if "shared_data" in event:
                        shared_data.update(event["shared_data"])
                    await websocket.send_json(event)

                duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)

                # Auto-save conversation
                conversation_history.save(
                    command=task,
                    traces=all_traces,
                    agents_used=agents_chain,
                    shared_data=shared_data,
                    duration_ms=duration_ms,
                )

                await websocket.send_json({
                    "event_type": "done",
                    "agent": "system",
                    "content": "Pipeline complete",
                    "timestamp": datetime.now().isoformat(),
                })

            elif data.get("type") == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.now().isoformat()})

    except WebSocketDisconnect:
        active_connections.remove(websocket)
        logger.info("🔌 WebSocket client disconnected (%d remaining)", len(active_connections))


# ── Conversation History Endpoints ──────────────────────────────────────────

@api_router.get("/api/history")
async def get_history(limit: int = 50, offset: int = 0):
    """List all conversations (most recent first)."""
    conversations = conversation_history.list_all(limit=limit, offset=offset)
    stats = conversation_history.get_stats()
    return {"conversations": conversations, **stats}

@api_router.get("/api/history/{conv_id}")
async def get_conversation(conv_id: int):
    """Get a full conversation with traces."""
    conv = conversation_history.get(conv_id)
    if not conv:
        return {"error": "Conversation not found"}
    return conv

@api_router.delete("/api/history/{conv_id}")
async def delete_conversation(conv_id: int):
    """Delete a conversation."""
    deleted = conversation_history.delete(conv_id)
    return {"deleted": deleted}

@api_router.delete("/api/history")
async def clear_history():
    """Clear all conversation history."""
    count = conversation_history.clear_all()
    return {"cleared": count}


# ── Analytics Endpoints ─────────────────────────────────────────────────────

@api_router.get("/api/analytics/overview")
async def analytics_overview():
    """Get high-level analytics overview."""
    return analytics_service.get_overview()

@api_router.get("/api/analytics/agents")
async def analytics_agents(agent: str = None):
    """Get per-agent performance metrics."""
    if agent:
        m = analytics_service.get_agent_metrics(agent)
        return m if m else {"error": "Agent not found"}
    return analytics_service.get_agent_metrics()

@api_router.get("/api/analytics/history")
async def analytics_history(limit: int = 20, offset: int = 0, agent: str = None, status: str = None, date: str = None):
    """Get paginated task history."""
    return analytics_service.get_task_history(limit, offset, agent, status, date)


@api_router.get("/api/analytics/heatmap")
async def analytics_heatmap():
    """Get activity heatmap data (last 6 months)."""
    return analytics_service.get_activity_heatmap()


# ── Reports Endpoints ──────────────────────────────────────────────────────

@api_router.get("/api/reports/weekly")
async def weekly_report():
    """Generate weekly summary report (JSON)."""
    return report_generator.generate_weekly_report()

@api_router.get("/api/reports/monthly")
async def monthly_report():
    """Generate monthly summary report (JSON)."""
    return report_generator.generate_monthly_report()

@api_router.get("/api/reports/weekly/html", response_class=HTMLResponse)
async def weekly_report_html():
    """Generate weekly report as printable HTML."""
    report = report_generator.generate_weekly_report()
    return report_generator.generate_report_html(report)

@api_router.get("/api/reports/monthly/html", response_class=HTMLResponse)
async def monthly_report_html():
    """Generate monthly report as printable HTML."""
    report = report_generator.generate_monthly_report()
    return report_generator.generate_report_html(report)


# ── Settings Endpoints ─────────────────────────────────────────────────────

@api_router.get("/api/settings")
async def get_settings():
    """Get all system settings."""
    return settings_service.get_all()

@api_router.get("/api/settings/{section}")
async def get_settings_section(section: str):
    """Get a specific settings section."""
    s = settings_service.get_section(section)
    return s if s else {"error": f"Section '{section}' not found"}

@api_router.put("/api/settings/{section}")
async def update_settings_section(section: str, updates: dict):
    """Update a settings section."""
    result = settings_service.update_section(section, updates)
    _push_notification('settings', f'Settings updated: {section}', 'info')
    return result if result else {"error": f"Section '{section}' not found"}

@api_router.post("/api/settings/agents/{agent_name}/toggle")
async def toggle_agent(agent_name: str, enabled: bool = True):
    """Enable or disable an agent."""
    result = settings_service.toggle_agent(agent_name, enabled)
    _push_notification('settings', f'{agent_name.title()} agent {"enabled" if enabled else "disabled"}', 'warning' if not enabled else 'info')
    return result if result else {"error": f"Agent '{agent_name}' not found"}


@api_router.put("/api/settings/api-keys/{service}")
async def update_api_key(service: str, update: ApiKeyUpdate):
    """Update an API key and re-initialize the connector."""
    result = settings_service.update_api_key(service, update.key)
    if not result:
        return {"error": f"Service '{service}' not found in API keys configuration"}

    # Attempt to re-initialize connector if it exists
    connector = registry.get(service)
    if connector:
        try:
            await connector.initialize()
            logger.info(f"🔄 Connector '{service}' re-initialized with new key")
        except Exception as e:
            logger.error(f"❌ Failed to re-initialize connector '{service}': {e}")
            return {"status": "saved_but_failed_init", "error": str(e), "config": result}
    
    _push_notification('settings', f'API Key updated for {service}', 'security_alert')
    return {"status": "updated", "config": result}


# ── Search Endpoints ───────────────────────────────────────────────────────

@api_router.get("/api/search")
async def global_search(q: str = ""):
    """Global search across tasks, invoices, and agents."""
    if not q.strip():
        return {"results": [], "query": q}

    q_lower = q.lower()

    # Search tasks
    task_results = analytics_service.search(q)

    # Search invoices
    brief = daily_brief_service.generate()
    invoices = brief.get('finance', {}).get('invoices', [])
    invoice_results = [inv for inv in invoices if q_lower in inv.get('customer', '').lower() or q_lower in inv.get('status', '').lower()]

    # Search agents
    agents = ['guardian', 'financier', 'scout', 'operator', 'liaison']
    agent_results = [a for a in agents if q_lower in a]

    return {
        'query': q,
        'results': {
            'tasks': task_results[:10],
            'invoices': invoice_results,
            'agents': agent_results,
        },
        'total': len(task_results) + len(invoice_results) + len(agent_results),
    }


# ── Activity Log Endpoints ─────────────────────────────────────────────────

@api_router.get("/api/activity")
async def activity_log(limit: int = 50, offset: int = 0, agent: str = None):
    """Get the full activity/audit log."""
    history = analytics_service.get_task_history(limit, offset, agent)
    audit_events = memory_manager.audit.get_recent_events(limit=limit, agent=agent)
    return {
        'tasks': history['tasks'],
        'audit': audit_events,
        'total_tasks': history['total'],
    }


# ── Notifications Endpoints ────────────────────────────────────────────────

@api_router.get("/api/notifications")
async def get_notifications(unread_only: bool = False):
    """Get notification queue."""
    if unread_only:
        return [n for n in notification_queue if not n.get('read')]
    return notification_queue

@api_router.post("/api/notifications/{index}/read")
async def mark_notification_read(index: int):
    """Mark a notification as read."""
    if 0 <= index < len(notification_queue):
        notification_queue[index]['read'] = True
        return {"ok": True}
    return {"error": "Notification not found"}

@api_router.post("/api/notifications/read-all")
async def mark_all_read():
    """Mark all notifications as read."""
    for n in notification_queue:
        n['read'] = True
    return {"ok": True, "count": len(notification_queue)}


# ── Approval Endpoints ─────────────────────────────────────────────────────

@api_router.post("/api/approvals/{approval_id}/resolve")
async def resolve_approval(approval_id: str, payload: dict):
    """Resolve a pending approval request."""
    status = payload.get('status')
    resolved_by = payload.get('resolved_by', 'system')
    
    logger.info(f"✅ Approval {approval_id} resolved as {status} by {resolved_by}")
    
    # Audit trail
    memory_manager.audit.log_event(
        agent='operator',
        event_type='approval_resolution',
        content=f"Approval {approval_id} was {status}.",
        metadata={'approval_id': approval_id, 'status': status, 'user': resolved_by}
    )

    if status == 'approved':
        _push_notification('operator', f'Action approved by {resolved_by}. Resuming execution...', 'success')
        # In a real system, we would signal the agent to resume here.
        # For this demo, the frontend will just show the approval state.
    else:
        _push_notification('operator', f'Action rejected by {resolved_by}.', 'error')

    return {"status": "resolved", "outcome": status}


# ── Scheduler Endpoints ────────────────────────────────────────────────────

@api_router.get("/api/scheduler/jobs")
async def list_scheduled_jobs():
    """List all scheduled cron jobs."""
    return scheduler.list_jobs()

@api_router.post("/api/scheduler/trigger/{job_name}")
async def trigger_job(job_name: str):
    """Manually trigger a scheduled job."""
    result = await scheduler.trigger(job_name)
    _push_notification('scheduler', f'Job "{job_name}" triggered manually', 'info')
    return result

@api_router.post("/api/scheduler/toggle/{job_name}")
async def toggle_job(job_name: str, enabled: bool = True):
    """Enable or disable a scheduled job."""
    return scheduler.toggle_job(job_name, enabled)


# ── Background Task Endpoints ──────────────────────────────────────────────

@api_router.get("/api/background/tasks")
async def list_background_tasks(limit: int = 20):
    """List recent background tasks."""
    return background_queue.list_tasks(limit)


# ── Preferences Endpoints ──────────────────────────────────────────────────

@api_router.get("/api/preferences")
async def get_preferences():
    """Get all user preferences."""
    return memory_manager.get_preferences()

@api_router.put("/api/preferences")
async def update_preferences(updates: dict):
    """Update user preferences."""
    results = {}
    for key, value in updates.items():
        results.update(memory_manager.set_preference(key, value))
    return results


def _push_notification(source, message, level='info', category='general', priority='medium', actions=None):
    """Push a notification to the in-memory queue and broadcast via WebSocket."""
    notif = {
        'id': len(notification_queue),
        'source': source,
        'message': message,
        'level': level,
        'category': category,
        'priority': priority,
        'actions': actions or [],
        'read': False,
        'timestamp': datetime.now().isoformat(),
    }
    notification_queue.insert(0, notif)
    # Keep last 100
    if len(notification_queue) > 100:
        notification_queue.pop()

    # Broadcast to WebSocket clients
    asyncio.ensure_future(_broadcast_notification(notif))


async def _broadcast_notification(notif):
    """Send notification to all connected WebSocket clients."""
    for conn in active_connections[:]:
        try:
            await conn.send_json({"type": "notification", "data": notif})
        except Exception:
            pass


# Seed a few demo notifications
_push_notification('guardian', '🛡️ Security scan completed — all clear', 'info', category='security', priority='low')
_push_notification('financier', '⚠️ 3 invoices are overdue totaling $26,000', 'warning', category='finance', priority='high',
                   actions=[{'label': 'View Invoices', 'command': 'Show overdue invoices'}, {'label': 'Send Chasers', 'command': 'Send chaser emails for overdue invoices'}])
_push_notification('scout', '🔍 New high-value lead detected: TechStart LLC', 'info', category='growth', priority='medium',
                   actions=[{'label': 'View Lead', 'command': 'Show details for TechStart LLC'}])
_push_notification('operator', '✅ Weekly backup completed successfully', 'info', category='ops', priority='low')
_push_notification('system', '🧠 Ecomind v2.0.0 initialized', 'info', category='system', priority='low')

app.include_router(api_router)

# ── Run ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")