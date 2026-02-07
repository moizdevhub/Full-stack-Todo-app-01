# Quickstart Guide: AI-Powered Todo Chatbot

**Feature**: 001-ai-todo-chatbot
**Date**: 2026-01-24
**Purpose**: Get the AI Todo Chatbot running locally for development

## Prerequisites

### Required Software
- **Python**: 3.13 or higher
- **Node.js**: 18 or higher
- **UV**: Latest version (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- **PostgreSQL**: Neon account (free tier available at https://neon.tech)
- **Git**: For version control

### Required API Keys
- **Gemini API Key**: Get from https://ai.google.dev/
- **Better Auth JWT Secret**: Generate a secure random string (32+ characters)

---

## Backend Setup

### 1. Clone and Navigate
```bash
cd backend
```

### 2. Install Dependencies
```bash
# Create virtual environment and install dependencies
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv sync
```

### 3. Configure Environment Variables
Create `.env` file in `backend/` directory:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:password@host/database?sslmode=require

# Gemini API (via OpenAI-compatible endpoint)
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/

# Authentication
JWT_SECRET=your_jwt_secret_here_minimum_32_characters

# Server
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
```

### 4. Setup Database
```bash
# Run Alembic migrations
alembic upgrade head

# Verify tables created
psql $DATABASE_URL -c "\dt"
# Should show: tasks, conversations, messages
```

### 5. Start Backend Server
```bash
# Development mode with auto-reload
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Verify**: Visit http://localhost:8000/api/v1/health
- Should return: `{"status": "healthy", "timestamp": "..."}`

---

## Frontend Setup

### 1. Navigate to Frontend
```bash
cd frontend
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Configure Environment Variables
Create `.env.local` file in `frontend/` directory:

```bash
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Better Auth (if using separate auth service)
NEXT_PUBLIC_AUTH_URL=http://localhost:3000/api/auth

# OpenAI ChatKit (if required)
NEXT_PUBLIC_OPENAI_DOMAIN_KEY=your_domain_key_here
```

### 4. Start Development Server
```bash
npm run dev
# or
yarn dev
```

**Verify**: Visit http://localhost:3000
- Should see chat interface
- Try sending a message (requires authentication)

---

## Testing the System

### 1. Get Authentication Token

For development, generate a test JWT:

```python
# backend/scripts/generate_test_token.py
import jwt
from datetime import datetime, timedelta
import os

user_id = "550e8400-e29b-41d4-a716-446655440000"  # Test user UUID
secret = os.environ["JWT_SECRET"]

payload = {
    "sub": user_id,
    "exp": datetime.utcnow() + timedelta(hours=24)
}

token = jwt.encode(payload, secret, algorithm="HS256")
print(f"Test Token: {token}")
```

Run:
```bash
python backend/scripts/generate_test_token.py
```

### 2. Test Chat Endpoint

Using curl:
```bash
export TOKEN="your_test_token_here"
export USER_ID="550e8400-e29b-41d4-a716-446655440000"

curl -X POST http://localhost:8000/api/v1/${USER_ID}/chat \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Add a task to buy milk",
    "conversation_id": null
  }'
```

Expected response:
```json
{
  "conversation_id": 1,
  "message": "Done! I've added 'Buy milk' to your list.",
  "tool_calls": [
    {
      "tool": "add_task",
      "arguments": {
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Buy milk"
      },
      "result": {
        "task_id": 1,
        "title": "Buy milk"
      }
    }
  ],
  "timestamp": "2026-01-24T10:30:00Z"
}
```

### 3. Test MCP Tools Directly

Using MCP Inspector (optional):
```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Run MCP server
cd backend
python -m src.mcp.server

# In another terminal, run inspector
mcp-inspector
```

### 4. Run Automated Tests

Backend tests:
```bash
cd backend
pytest tests/ -v --cov=src --cov-report=html

# View coverage report
open htmlcov/index.html
```

Frontend tests:
```bash
cd frontend
npm test
# or
yarn test
```

---

## Common Development Tasks

### Add a New Database Migration
```bash
cd backend
alembic revision --autogenerate -m "Description of changes"
alembic upgrade head
```

### Reset Database (Development Only)
```bash
cd backend
alembic downgrade base
alembic upgrade head
```

### Check Type Safety
```bash
# Backend (Python)
cd backend
mypy src/ --strict

# Frontend (TypeScript)
cd frontend
npm run type-check
```

### Format Code
```bash
# Backend
cd backend
black src/ tests/
isort src/ tests/

# Frontend
cd frontend
npm run format
```

### Run Linters
```bash
# Backend
cd backend
ruff check src/ tests/

# Frontend
cd frontend
npm run lint
```

---

## Troubleshooting

### Backend Issues

**Problem**: `ModuleNotFoundError: No module named 'fastapi'`
**Solution**: Ensure virtual environment is activated and dependencies installed:
```bash
source .venv/bin/activate
uv sync
```

**Problem**: `sqlalchemy.exc.OperationalError: could not connect to server`
**Solution**: Verify DATABASE_URL is correct and Neon database is accessible:
```bash
psql $DATABASE_URL -c "SELECT 1"
```

**Problem**: `401 Unauthorized` on all requests
**Solution**: Check JWT_SECRET matches between token generation and validation. Verify token is not expired.

**Problem**: MCP tools not being called
**Solution**: Check Gemini API key is valid. Verify agent instructions are clear. Check tool descriptions in mcp-tools.json.

### Frontend Issues

**Problem**: `CORS error` when calling backend
**Solution**: Add CORS middleware to FastAPI:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Problem**: ChatKit UI not rendering
**Solution**: Verify OpenAI ChatKit package is installed:
```bash
npm list @openai/chatkit-react
```

**Problem**: Messages not persisting
**Solution**: Check backend logs for database errors. Verify conversation_id is being passed correctly.

### Database Issues

**Problem**: Migration fails with "relation already exists"
**Solution**: Reset migrations (development only):
```bash
alembic downgrade base
rm alembic/versions/*.py
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

**Problem**: Slow query performance
**Solution**: Check indexes are created:
```sql
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename IN ('tasks', 'conversations', 'messages');
```

---

## Development Workflow

### 1. Start Development Session
```bash
# Terminal 1: Backend
cd backend
source .venv/bin/activate
uvicorn src.api.main:app --reload

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Database (if needed)
psql $DATABASE_URL
```

### 2. Make Changes
- Edit code in `backend/src/` or `frontend/src/`
- Auto-reload will pick up changes
- Check browser console and terminal for errors

### 3. Test Changes
```bash
# Run relevant tests
cd backend && pytest tests/unit/test_your_change.py -v
cd frontend && npm test -- YourComponent.test.tsx
```

### 4. Commit Changes
```bash
# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat: add new feature description"

# Push to feature branch
git push origin 001-ai-todo-chatbot
```

---

## Production Deployment

### Backend (Railway/Render)

1. **Create new service** on Railway or Render
2. **Connect GitHub repository**
3. **Set environment variables**:
   - `DATABASE_URL` (from Neon)
   - `GEMINI_API_KEY`
   - `JWT_SECRET`
   - `ENVIRONMENT=production`
4. **Deploy**: Automatic on git push

### Frontend (Vercel)

1. **Import project** from GitHub
2. **Configure build settings**:
   - Framework: Next.js
   - Build command: `npm run build`
   - Output directory: `.next`
3. **Set environment variables**:
   - `NEXT_PUBLIC_API_URL` (backend URL)
   - `NEXT_PUBLIC_OPENAI_DOMAIN_KEY`
4. **Deploy**: Automatic on git push

### Database (Neon)

1. **Create production branch** in Neon dashboard
2. **Run migrations**:
   ```bash
   DATABASE_URL=<production_url> alembic upgrade head
   ```
3. **Enable connection pooling** in Neon settings

---

## Monitoring & Debugging

### Backend Logs
```bash
# Development
tail -f backend/logs/app.log

# Production (Railway)
railway logs

# Production (Render)
render logs
```

### Database Queries
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT query, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::text)) as size
FROM pg_tables
WHERE schemaname = 'public';
```

### API Performance
```bash
# Test endpoint latency
time curl -X POST http://localhost:8000/api/v1/${USER_ID}/chat \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"message": "List my tasks"}'
```

---

## Next Steps

1. ✅ Backend and frontend running locally
2. ⏭️ Implement authentication flow (Better Auth)
3. ⏭️ Add error boundaries and loading states
4. ⏭️ Implement conversation history UI
5. ⏭️ Add task management UI (optional)
6. ⏭️ Deploy to production
7. ⏭️ Set up monitoring and alerts

---

## Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **FastMCP Docs**: https://github.com/modelcontextprotocol/python-sdk
- **OpenAI Agents SDK**: https://platform.openai.com/docs/agents
- **Gemini API**: https://ai.google.dev/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Neon Docs**: https://neon.tech/docs
- **Better Auth**: https://www.better-auth.com/docs

---

## Support

For issues or questions:
1. Check this quickstart guide
2. Review error logs (backend and frontend)
3. Consult API documentation (OpenAPI spec)
4. Check constitution.md for project standards
5. Create issue in GitHub repository
