# Pentagon Project - Multi-Agent AI Workflow Orchestration Platform

A sophisticated multi-agent AI workflow orchestration platform built with LangGraph, FastAPI, Next.js, and OpenAI that enables seamless coordination of multiple AI agents for complex task automation.

## 🤖 Overview

Pentagon Project is an enterprise-grade platform designed to orchestrate multiple AI agents working together on complex workflows. It combines the power of LangGraph for workflow management, FastAPI for robust backend services, and Next.js for an intuitive user interface.

## ✨ Key Features

### Core Features
- **Multi-Agent Orchestration** - Coordinate up to 5+ specialized AI agents
- **Workflow Builder** - Visual workflow design and management
- **Agent Communication** - Seamless inter-agent messaging
- **Task Distribution** - Intelligent task routing and scheduling
- **State Management** - Persistent workflow state across sessions
- **Error Handling** - Automatic retry logic and fallback mechanisms
- **Monitoring & Analytics** - Real-time workflow execution tracking
- **API Integration** - Connect external services and APIs
- **Audit Logging** - Complete audit trail of all actions

### Agent Types
- **Research Agent** - Information gathering and analysis
- **Analysis Agent** - Data processing and insights
- **Writing Agent** - Content generation and refinement
- **Validation Agent** - Quality assurance and verification
- **Decision Agent** - Logic-based decision making

### Workflow Features
- **Visual Designer** - Drag-and-drop workflow creation
- **Templates** - Pre-built workflow templates
- **Versioning** - Track workflow versions
- **Execution History** - Monitor past executions
- **Performance Metrics** - Track success rates and performance
- **Conditional Logic** - Branch workflows based on conditions
- **Parallel Processing** - Run multiple agents simultaneously
- **Webhooks** - Trigger workflows via webhooks

## 🛠 Tech Stack

**Backend:**
- **LangGraph** - Workflow orchestration framework
- **FastAPI** - High-performance Python web framework
- **LangChain** - LLM integration framework
- **OpenAI API** - GPT models for AI capabilities
- **PostgreSQL** - Persistent data storage
- **Redis** - Caching and message queue
- **Pydantic** - Data validation
- **SQLAlchemy** - ORM

**Frontend:**
- **Next.js 14** - React framework
- **TypeScript** - Type-safe development
- **TailwindCSS** - Styling
- **Redux** - State management
- **React Flow** - Workflow visualization
- **Socket.io** - Real-time updates

**Development:**
- **Docker** - Containerization
- **Pytest** - Testing framework
- **GitHub Actions** - CI/CD

## 📋 Prerequisites

- Python 3.9+
- Node.js 16.x or higher
- PostgreSQL 12.x or higher
- Redis 6.x or higher
- OpenAI API key
- Docker (optional)

## 🚀 Getting Started

### Installation

```bash
# Clone repository
git clone https://github.com/Gopi0711gopi/pentagon-project.git
cd pentagon-project

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install
```

### Configuration

**Backend (.env)**
```env
OPENAI_API_KEY=your-openai-api-key
DATABASE_URL=postgresql://user:password@localhost:5432/pentagon
REDIS_URL=redis://localhost:6379
FASTAPI_ENV=development
API_PORT=8000
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### Development

```bash
# Start backend
cd backend
uvicorn main:app --reload --port 8000

# In another terminal, start frontend
cd frontend
npm run dev

# Access at http://localhost:3000
```

## 📁 Project Structure

```
pentagon-project/
├── backend/
│   ├── app/
│   │   ├── main.py                  # Entry point
│   │   ├── agents/                  # Agent implementations
│   │   │   ├── base_agent.py
│   │   │   ├── research_agent.py
│   │   │   ├── analysis_agent.py
│   │   │   ├── writing_agent.py
│   │   │   ├── validation_agent.py
│   │   │   └── decision_agent.py
│   │   ├── workflows/               # Workflow definitions
│   │   │   ├── workflow_engine.py
│   │   │   ├── task_executor.py
│   │   │   └── state_manager.py
│   │   ├── api/                     # API routes
│   │   │   ├── agents.py
│   │   │   ├── workflows.py
│   │   │   └── executions.py
│   │   ├── models/                  # Database models
│   │   ├── services/                # Business logic
│   │   ├── schemas/                 # Pydantic schemas
│   │   ├── utils/                   # Utilities
│   │   ├── middleware/              # Custom middleware
│   │   └── config/                  # Configuration
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # Home page
│   │   │   ├── dashboard/          # Dashboard pages
│   │   │   ├── workflows/          # Workflow pages
│   │   │   ├── builder/            # Workflow builder
│   │   │   └── execution/          # Execution details
│   │   ├── components/
│   │   │   ├── WorkflowCanvas.tsx
│   │   │   ├── AgentPanel.tsx
│   │   │   ├── ExecutionMonitor.tsx
│   │   │   └── Analytics.tsx
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── redux/
│   │   └── styles/
│   ├── public/
│   ├── package.json
│   └── next.config.js
├── docker-compose.yml
└── README.md
```

## 🔌 API Endpoints

### Agent Management
```bash
GET /api/agents                      # List all agents
POST /api/agents                     # Create agent
GET /api/agents/{agent_id}          # Get agent details
PUT /api/agents/{agent_id}          # Update agent
DELETE /api/agents/{agent_id}       # Delete agent
GET /api/agents/{agent_id}/status   # Get agent status
```

### Workflow Management
```bash
GET /api/workflows                   # List workflows
POST /api/workflows                  # Create workflow
GET /api/workflows/{workflow_id}    # Get workflow details
PUT /api/workflows/{workflow_id}    # Update workflow
DELETE /api/workflows/{workflow_id} # Delete workflow
```

### Workflow Execution
```bash
POST /api/workflows/{workflow_id}/execute    # Start execution
GET /api/executions/{execution_id}          # Get execution status
GET /api/executions/{execution_id}/logs     # Get execution logs
POST /api/executions/{execution_id}/cancel  # Cancel execution
GET /api/workflows/{workflow_id}/history    # Execution history
```

### Analytics
```bash
GET /api/analytics/overview         # Dashboard metrics
GET /api/analytics/agents           # Agent performance
GET /api/analytics/workflows        # Workflow metrics
GET /api/analytics/timeline         # Execution timeline
```

## 🎯 Workflow Example

```python
from app.workflows import WorkflowEngine, WorkflowDefinition
from app.agents import ResearchAgent, AnalysisAgent, WritingAgent

# Define workflow
workflow = WorkflowDefinition(
    name="Market Research Workflow",
    agents=[
        ResearchAgent(name="researcher"),
        AnalysisAgent(name="analyzer"),
        WritingAgent(name="writer")
    ],
    steps=[
        {
            "agent": "researcher",
            "task": "Research market trends",
            "output": "research_data"
        },
        {
            "agent": "analyzer",
            "task": "Analyze research data",
            "input_from": "research_data",
            "output": "analysis_results"
        },
        {
            "agent": "writer",
            "task": "Write report",
            "input_from": "analysis_results",
            "output": "final_report"
        }
    ]
)

# Execute workflow
engine = WorkflowEngine()
result = await engine.execute(workflow, context={...})
```

## 📊 Dashboard Features

### Overview Dashboard
- Active workflows count
- Success rate metrics
- Recent executions
- Agent utilization
- Performance trends

### Workflow Builder
- Visual drag-and-drop interface
- Agent configuration
- Connection management
- Conditional branching
- Template library

### Execution Monitor
- Real-time status updates
- Agent logs and outputs
- Execution timeline
- Error handling and retry
- Performance metrics

## 🧪 Testing

```bash
# Run backend tests
cd backend
pytest

# Run with coverage
pytest --cov=app

# Run frontend tests
cd ../frontend
npm run test
```

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📈 Performance Optimization

- Agent connection pooling
- Workflow caching
- Parallel agent execution
- Redis-based state management
- Database query optimization
- Async/await patterns

## 🔐 Security

- JWT authentication
- Role-based access control (RBAC)
- API rate limiting
- Input validation
- Data encryption
- Audit logging
- CORS configuration

## 🐛 Troubleshooting

### Agent Connection Issues
```
Solution: Check agent health status
GET /api/agents/{agent_id}/health
```

### Workflow Execution Failures
```
Solution: Review execution logs
GET /api/executions/{execution_id}/logs
```

### Performance Issues
```
Solution: Monitor agent workload
GET /api/analytics/agents
Implement result caching
```

## 📚 Documentation

- [API Documentation](./docs/API.md)
- [Agent Development Guide](./docs/AGENT_GUIDE.md)
- [Workflow Creation Guide](./docs/WORKFLOW_GUIDE.md)
- [Architecture](./docs/ARCHITECTURE.md)

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Run tests
5. Submit pull request

## 📝 License

MIT License

## 👨‍💻 Author

**Gopikanta Shill** - [GitHub Profile](https://github.com/Gopi0711gopi)

---

**Last Updated:** June 2026
