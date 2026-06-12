# Pentagon Project - Quick Start Guide

## Setup Instructions

### Backend Setup
```bash
cd ~/pentagon-project/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run server
python main.py
```

Backend will run on: http://localhost:8000

### Frontend Setup
```bash
cd ~/pentagon-project/frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will run on: http://localhost:3000

## Project Structure

```
pentagon-project/
├── backend/
│   ├── main.py           # FastAPI entry point
│   ├── orchestrator.py   # Pentagon orchestration logic
│   ├── agents.py         # Five agent implementations
│   ├── models.py         # Data models
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── app/
│   │   ├── page.js       # Main interface
│   │   └── layout.js     # Root layout
│   └── components/
│       └── WarRoom.js    # Agent dashboard
└── docs/
```

## Next Steps

1. **Add API Keys:** Configure `.env` with your Anthropic/OpenAI keys
2. **Test Connection:** Visit http://localhost:3000 and execute a command
3. **Week 1 Goals:**
   - Set up Pinecone vector database
   - Implement Redis for short-term memory
   - Add PostgreSQL for audit logs
   - Build first MCP connector (Gmail)

## Current Status

✅ Project structure created
✅ Backend API operational
✅ Frontend War Room interface
⏳ Memory systems (Week 1)
⏳ Agent intelligence (Week 2)
⏳ Security hardening (Week 3)

---

**Phase:** Month 1, Week 1 - Infrastructure Setup
**Status:** Foundation Complete
