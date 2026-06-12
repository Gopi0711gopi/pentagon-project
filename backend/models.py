"""
Ecomind Models — Pydantic models for API requests, responses, and SSE events.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class AgentName(str, Enum):
    GUARDIAN = "guardian"
    FINANCIER = "financier"
    SCOUT = "scout"
    OPERATOR = "operator"
    LIAISON = "liaison"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ── Request Models ──────────────────────────────────────────────────────────

class TaskRequest(BaseModel):
    task: str
    user_id: str = "default"


class ApprovalAction(BaseModel):
    status: str = "approved"  # approved or rejected
    resolved_by: str = "user"


class ApiKeyUpdate(BaseModel):
    key: str


class UserSignup(BaseModel):
    username: str
    email: str
    password: str


class UserResponse(BaseModel):
    username: str
    email: str
    created_at: str


# ── Response Models ─────────────────────────────────────────────────────────

class AgentStatus(BaseModel):
    name: str
    display_name: str
    icon: str
    status: str = "idle"  # idle, working, complete, error
    description: str = ""
    last_active: Optional[str] = None


class ThoughtTraceEvent(BaseModel):
    """SSE event for agent thought traces."""
    event_type: str = "thought_trace"  # thought_trace, agent_action, status_update, approval_request, final_response
    agent: str
    agent_icon: str = ""
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    metadata: Optional[Dict[str, Any]] = None


class ApprovalResponse(BaseModel):
    id: int
    agent: str
    action_type: str
    description: str
    details: Optional[Dict[str, Any]] = None
    risk_level: str = "medium"
    status: str = "pending"
    timestamp: str = ""


class DailyBriefResponse(BaseModel):
    date: str
    greeting: str
    summary: str
    finance: Dict[str, Any]
    security: Dict[str, Any]
    operations: Dict[str, Any]
    leads: Dict[str, Any]
    pending_approvals: int
    agent_statuses: List[AgentStatus]


class TaskResponse(BaseModel):
    task: str
    user_id: str
    agents_chain: List[str]
    result: Dict[str, Any]
    thought_traces: List[ThoughtTraceEvent]
    approval_required: bool = False
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class MemoryStats(BaseModel):
    cache_entries: int
    vector_documents: int
    graph: Dict[str, int]
    audit: Dict[str, Any]