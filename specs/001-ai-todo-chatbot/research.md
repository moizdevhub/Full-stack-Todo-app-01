# Research: AI-Powered Todo Chatbot

**Feature**: 001-ai-todo-chatbot
**Date**: 2026-01-24
**Purpose**: Document technology choices, best practices, and architectural decisions for implementation

## Research Areas

### 1. Gemini API via OpenAI-Compatible Endpoint

**Decision**: Use Gemini API through OpenAI-compatible base URL

**Configuration**:
```python
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["GEMINI_API_KEY"],
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)
```

**Rationale**:
- Gemini provides OpenAI-compatible endpoint for seamless integration
- Allows use of OpenAI Agents SDK without modification
- Cost-effective alternative to OpenAI API
- Supports chat completions and function calling

**Alternatives Considered**:
- Direct OpenAI API: More expensive, but better documented
- Anthropic Claude: Different API structure, would require custom integration
- Local LLM: Insufficient quality for production natural language understanding

**Best Practices**:
- Store API key in environment variables only
- Implement retry logic with exponential backoff
- Monitor API usage and rate limits
- Cache responses where appropriate (not applicable for chat)

---

### 2. FastMCP (Official Python MCP SDK) - Stateless Mode

**Decision**: Use FastMCP for stateless MCP server implementation

**Implementation Pattern**:
```python
from mcp.server import Server
from mcp.server.stdio import stdio_server

server = Server("todo-mcp-server")

@server.tool()
async def add_task(user_id: str, title: str, description: str = None):
    """Create a new task for the user"""
    # All state fetched from DB using user_id
    async with get_db_session() as session:
        task = Task(user_id=user_id, title=title, description=description)
        session.add(task)
        await session.commit()
        return {"task_id": task.id, "title": task.title}
```

**Rationale**:
- Official Python SDK ensures compatibility and support
- Stateless design aligns with constitutional requirements
- Each tool call receives user_id for data isolation
- No in-memory state between tool invocations

**Alternatives Considered**:
- Custom tool implementation: More control but higher maintenance
- Stateful MCP server: Violates constitutional stateless requirement
- REST API instead of MCP: Less structured, no tool schema validation

**Best Practices**:
- Every tool must require user_id parameter
- Use async/await for database operations
- Validate all inputs before database operations
- Return structured responses with error codes
- Log all tool invocations for debugging

---

### 3. OpenAI Agents SDK - Agent + Runner Setup

**Decision**: Use OpenAI Agents SDK with Agent + Runner pattern

**Implementation Pattern**:
```python
from openai import OpenAI
from openai.agents import Agent, Runner

client = OpenAI(
    api_key=os.environ["GEMINI_API_KEY"],
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

agent = Agent(
    name="todo-assistant",
    instructions="""You are a helpful todo list assistant.
    Help users manage their tasks using natural language.
    Always confirm actions with friendly messages.""",
    tools=[add_task, list_tasks, complete_task, delete_task, update_task]
)

runner = Runner(client=client, agent=agent)
```

**Rationale**:
- Agent encapsulates system instructions and tool definitions
- Runner handles conversation flow and tool execution
- Automatic function calling and response generation
- Maintains conversation context across turns

**Alternatives Considered**:
- Direct chat completions API: More manual tool handling required
- LangChain: Heavier framework, unnecessary complexity
- Custom agent loop: Reinventing the wheel, error-prone

**Best Practices**:
- Clear, specific agent instructions
- Tool descriptions must be detailed for accurate intent mapping
- Handle tool errors gracefully in agent instructions
- Stream responses for better UX (if supported)

---

### 4. OpenAI ChatKit UI - React Integration

**Decision**: Use OpenAI ChatKit UI for frontend chat interface

**Implementation Pattern**:
```typescript
import { ChatInterface } from '@openai/chatkit-react';

export default function TodoChat() {
  const handleMessage = async (message: string) => {
    const response = await fetch(`/api/v1/${userId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversation_id: convId })
    });
    return response.json();
  };

  return (
    <ChatInterface
      onMessage={handleMessage}
      placeholder="Tell me what you need to do..."
      showThinking={true}
      showToolCalls={true}
    />
  );
}
```

**Rationale**:
- Pre-built chat UI components optimized for AI interactions
- Built-in support for thinking indicators and tool call display
- Handles message states (pending, success, error)
- Responsive design out of the box

**Alternatives Considered**:
- Custom React chat UI: More control but significant development time
- Vercel AI SDK UI: Good alternative but less specialized for OpenAI patterns
- Plain textarea + message list: Too basic, poor UX

**Best Practices**:
- Show thinking indicators during API calls
- Display tool calls for transparency
- Handle errors with user-friendly messages
- Implement optimistic UI updates where possible
- Persist conversation history in backend

---

### 5. Stateless Architecture - Context Reconstruction

**Decision**: Reconstruct conversation context from database on every request

**Implementation Pattern**:
```python
async def reconstruct_context(user_id: str, conversation_id: int):
    """Load conversation history from DB to rebuild context"""
    async with get_db_session() as session:
        # Fetch conversation
        conversation = await session.get(Conversation, conversation_id)
        if not conversation or conversation.user_id != user_id:
            raise HTTPException(401, "Unauthorized")

        # Fetch all messages in chronological order
        messages = await session.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
        )

        return [
            {"role": msg.role, "content": msg.content}
            for msg in messages.scalars()
        ]
```

**Rationale**:
- No server-side session state required
- Enables horizontal scaling without sticky sessions
- Database is single source of truth
- Simplifies deployment and recovery

**Alternatives Considered**:
- In-memory sessions: Violates constitutional requirements, not scalable
- Redis session store: Adds complexity, still requires state management
- Stateful WebSocket connections: Harder to scale, connection management overhead

**Best Practices**:
- Always validate user_id matches conversation ownership
- Limit message history to recent N messages for performance
- Index conversation_id and created_at for fast queries
- Cache conversation metadata (not messages) if needed
- Use database connection pooling

---

### 6. Better Auth JWT Validation in FastAPI

**Decision**: Implement JWT validation middleware for all protected endpoints

**Implementation Pattern**:
```python
from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError

async def require_auth(authorization: str = Header(None)):
    """Validate JWT and extract user_id from sub claim"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid authorization header")

    token = authorization.split(" ")[1]

    try:
        payload = jwt.decode(
            token,
            os.environ["JWT_SECRET"],
            algorithms=["HS256"]
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(401, "Invalid token: missing sub claim")
        return user_id
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")

@app.post("/api/v1/{user_id}/chat")
async def chat(
    user_id: str,
    request: ChatRequest,
    authenticated_user_id: str = Depends(require_auth)
):
    # Verify path user_id matches authenticated user
    if user_id != authenticated_user_id:
        raise HTTPException(403, "Forbidden: user_id mismatch")

    # Process chat request...
```

**Rationale**:
- Validates JWT signature using shared secret
- Extracts user_id from sub claim for data isolation
- Prevents token tampering and unauthorized access
- Enforces authentication at API boundary

**Alternatives Considered**:
- OAuth2 with external provider: Overkill for this use case
- API keys: Less secure, no user identity
- Session cookies: Requires server-side session state

**Best Practices**:
- Validate JWT on every request (no caching)
- Verify path parameters match authenticated user
- Return 401 for authentication failures
- Return 403 for authorization failures
- Rotate JWT secret periodically
- Use short token expiration (15-60 minutes)

---

## Technology Stack Summary

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Backend Framework | FastAPI | 0.109+ | REST API server |
| MCP Server | FastMCP | 1.0+ | Tool-based operations |
| AI Agent | OpenAI Agents SDK | 1.0+ | Natural language understanding |
| LLM Provider | Gemini API | v1beta | Language model |
| Database | Neon PostgreSQL | Latest | Persistent storage |
| ORM | SQLModel | 0.0.14+ | Database models |
| Migrations | Alembic | 1.13+ | Schema versioning |
| Auth | Better Auth | Latest | JWT validation |
| Frontend Framework | Next.js | 14+ | React application |
| UI Library | OpenAI ChatKit | Latest | Chat interface |
| Type Checking | mypy + TypeScript | Latest | Static type safety |
| Package Manager | UV | Latest | Python dependencies |
| Testing | pytest + Jest | Latest | Unit/integration tests |

---

## Architectural Decisions

### AD-1: Stateless Backend Architecture

**Context**: Need to support multiple concurrent users with conversation history

**Decision**: Reconstruct all context from database on every request

**Consequences**:
- ✅ Horizontal scaling without sticky sessions
- ✅ Simple deployment and recovery
- ✅ Database is single source of truth
- ⚠️ Increased database load (mitigated by connection pooling)
- ⚠️ Slightly higher latency (acceptable for chat use case)

---

### AD-2: MCP for Tool Operations

**Context**: Need structured, validated tool definitions for AI agent

**Decision**: Use FastMCP (Official Python MCP SDK) for all task operations

**Consequences**:
- ✅ Structured tool schemas with validation
- ✅ Automatic error handling and response formatting
- ✅ Compatible with OpenAI function calling
- ✅ Easier to test and debug tool operations
- ⚠️ Additional abstraction layer (minimal overhead)

---

### AD-3: Gemini via OpenAI-Compatible Endpoint

**Context**: Need cost-effective LLM with function calling support

**Decision**: Use Gemini API through OpenAI-compatible base URL

**Consequences**:
- ✅ Lower cost than OpenAI
- ✅ Compatible with OpenAI Agents SDK
- ✅ Good performance for chat use cases
- ⚠️ Less mature than OpenAI API
- ⚠️ Potential compatibility issues with future SDK updates

---

### AD-4: Separate Frontend/Backend Deployment

**Context**: Need independent scaling and deployment of UI and API

**Decision**: Deploy frontend (Vercel) and backend (Railway/Render) separately

**Consequences**:
- ✅ Independent scaling based on load
- ✅ Frontend CDN distribution for global performance
- ✅ Backend can be upgraded without frontend redeployment
- ✅ Clear API boundaries and contracts
- ⚠️ CORS configuration required
- ⚠️ Two deployment pipelines to manage

---

## Implementation Priorities

### Phase 1: Core Infrastructure (P0)
1. Database models (Task, Conversation, Message)
2. Neon PostgreSQL connection and migrations
3. JWT validation middleware
4. Basic FastAPI app structure

### Phase 2: MCP Server (P0)
1. FastMCP server setup
2. Implement 5 MCP tools (add, list, complete, delete, update)
3. User_id scoping for all operations
4. Error handling and validation

### Phase 3: AI Agent (P0)
1. OpenAI Agents SDK integration
2. Gemini API configuration
3. Agent instructions and tool registration
4. Context reconstruction logic

### Phase 4: API Endpoint (P0)
1. /api/v1/{user_id}/chat endpoint
2. Request/response schemas
3. Conversation management
4. Message persistence

### Phase 5: Frontend (P1)
1. Next.js app setup
2. OpenAI ChatKit integration
3. API client implementation
4. Better Auth integration

### Phase 6: Testing & Deployment (P1)
1. Unit tests (80%+ coverage)
2. Integration tests (E2E flows)
3. Deployment configuration
4. Environment variable setup

---

## Risk Mitigation

### Risk 1: Gemini API Compatibility Issues
**Mitigation**: Test thoroughly with OpenAI Agents SDK; have fallback to direct OpenAI API

### Risk 2: Database Performance with Context Reconstruction
**Mitigation**: Implement connection pooling; limit message history; add database indexes

### Risk 3: JWT Secret Exposure
**Mitigation**: Environment variables only; pre-commit hooks to scan for secrets; rotate regularly

### Risk 4: Cross-User Data Leakage
**Mitigation**: Mandatory user_id filtering in all queries; integration tests for data isolation

### Risk 5: OpenAI ChatKit UI Limitations
**Mitigation**: Evaluate early; have fallback to custom React components if needed

---

## Next Steps

1. ✅ Research complete
2. ⏭️ Create data-model.md (Phase 1)
3. ⏭️ Generate API contracts (Phase 1)
4. ⏭️ Create quickstart.md (Phase 1)
5. ⏭️ Update agent context (Phase 1)
6. ⏭️ Generate tasks.md (/sp.tasks command)
