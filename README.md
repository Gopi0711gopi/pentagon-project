# Pentagon — Multi-Agent AI Workflow Orchestration Platform

> An autonomous five-agent AI system that automates complex business workflows end-to-end.

## Overview

Pentagon is a production-grade multi-agent AI platform built with LangGraph and OpenAI. It coordinates five specialized agents — Guardian, Financier, Scout, Operator, and Liaison — to handle business processes autonomously with real-time monitoring.

## Features

- 🧠 **5 Specialized Agents** — Guardian (security), Financier (finance), Scout (research), Operator (execution), Liaison (communication)
- 🔗 **LangGraph Orchestration** — Stateful agent graphs with conditional routing and memory
- 📡 **Real-Time War Room** — Next.js dashboard with SSE streaming and WebSocket live updates
- 🗄️ **Vector Memory** — Pinecone integration for long-term agent context retrieval
- 🔐 **JWT Authentication** — Secure user auth with bcrypt password hashing
- 📂 **File Processing** — Multi-part upload with PyPDF2 document ingestion
- 🔁 **Audit Logging** — Full action trail stored in PostgreSQL

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, LangGraph, OpenAI API |
| Frontend | Next.js 14, React, Tailwind CSS, Spline 3D |
| Database | PostgreSQL, Redis (session cache) |
| Vector DB | Pinecone |
| Auth | JWT, bcrypt, python-jose |
| Transport | WebSockets, SSE (Server-Sent Events) |
| Deploy | Docker, Docker Compose |

## Architecture

```
pentagon-project/
├── backend/
│   ├── agents/          # 5 agent definitions
│   ├── orchestrator.py  # LangGraph workflow
│   ├── models.py        # Pydantic schemas
│   ├── memory/          # Vector memory handlers
│   ├── services/        # Business logic
│   ├── tools/           # Agent tools
│   └── main.py          # FastAPI entry point
└── frontend/
    ├── app/             # Next.js App Router pages
    └── utils/           # Client utilities
```

## Getting Started

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Add OPENAI_API_KEY, DATABASE_URL, PINECONE_API_KEY
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```env
OPENAI_API_KEY=your_key
DATABASE_URL=postgresql://user:pass@localhost/pentagon
REDIS_URL=redis://localhost:6379
PINECONE_API_KEY=your_key
JWT_SECRET=your_secret
```

## License

MIT
