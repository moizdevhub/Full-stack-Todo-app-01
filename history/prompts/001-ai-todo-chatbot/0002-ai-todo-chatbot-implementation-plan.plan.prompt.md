---
id: 0002
title: ai-todo-chatbot-implementation-plan
stage: plan
date: 2026-01-24
surface: claude-code
model: claude-sonnet-4-5-20250929
feature: 001-ai-todo-chatbot
branch: 001-ai-todo-chatbot
user: developer
command: /sp.plan
labels: [planning, architecture, web-application, fastapi, nextjs, mcp, openai-agents]
links:
  spec: specs/001-ai-todo-chatbot/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - path: specs/001-ai-todo-chatbot/plan.md
    status: created
    lines: 372
  - path: specs/001-ai-todo-chatbot/research.md
    status: created
    lines: 450
  - path: specs/001-ai-todo-chatbot/data-model.md
    status: created
    lines: 380
  - path: specs/001-ai-todo-chatbot/contracts/api.openapi.yaml
    status: created
    lines: 350
  - path: specs/001-ai-todo-chatbot/contracts/mcp-tools.json
    status: created
    lines: 280
  - path: specs/001-ai-todo-chatbot/quickstart.md
    status: created
    lines: 520
  - path: CLAUDE.md
    status: updated
    lines: updated
tests:
  - type: validation
    name: Constitution Check
    status: passed
    details: All Section VIII production standards validated and compliant
---

## Prompt

Todo AI Chatbot (Concise)

1. Verification
Docs: Validate Gemini-OpenAI base URL, FastMCP (Python) stateless mode, and ChatKit React integration.
Auth: Configure api_key=GEMINI_API_KEY with Google's OpenAI-compatible endpoint.

2. Design-First Sequence
Frontend: Build ChatKit UI with message states (thinking, tool-call, error).
API Contract: Define /api/{user_id}/chat (Request: {message, conv_id} | Response: {text, tool_calls}).
Backend: Implement MCP tools and Agent reasoning.

3. Execution Roadmap
Task A (Frontend): Scaffold Next.js + ChatKit; mock API for UI testing.
Task B (Database): Setup Neon Postgres; define SQLModel schemas for Tasks and Conversations.
Task C (MCP Server): Build stateless tools (CRUD) using Official Python SDK; verify with MCP Inspector.
Task D (Agent & API): Create FastAPI chat endpoint. Implement context reconstruction (load DB history -> run Agent -> save response).
Task E (Deploy): Vercel/Railway deployment; configure OpenAI domain allowlist.

4. Key Constraints
Stateless: No in-memory sessions; DB is the sole source of truth.
Isolation: Every tool and API call must strictly use user_id.

## Response snapshot

Created comprehensive implementation plan for AI-powered Todo chatbot with complete architecture design:

**Phase 0 - Research (Complete)**:
- Evaluated Gemini API via OpenAI-compatible endpoint for cost-effective LLM
- Researched FastMCP stateless mode for tool-based operations
- Analyzed OpenAI Agents SDK integration patterns
- Designed stateless architecture with context reconstruction
- Documented JWT validation and Better Auth integration
- Identified risk mitigation strategies for all major components

**Phase 1 - Design & Contracts (Complete)**:
- Defined data model with 3 entities (Task, Conversation, Message)
- Created OpenAPI specification for REST endpoints
- Documented 5 MCP tools with complete schemas (add, list, complete, delete, update)
- Generated quickstart guide for development setup
- Updated agent context (CLAUDE.md) with new technologies

**Constitution Check**: All Section VIII production standards validated and compliant (AuthN/AuthZ, data segregation, secret management, API stability, error contracts, type safety, UV package manager, DB migrations, testing gates).

**Project Structure**: Web application with separate backend (FastAPI + FastMCP + OpenAI Agents SDK) and frontend (Next.js + OpenAI ChatKit UI) for independent deployment.

## Outcome

- ✅ Impact: Complete implementation plan with research, data model, API contracts, and development guide ready for task breakdown
- 🧪 Tests: Constitution Check passed (14/14 items) - All production standards compliant
- 📁 Files: 7 files created/updated (plan.md, research.md, data-model.md, 2 contracts, quickstart.md, CLAUDE.md)
- 🔁 Next prompts: `/sp.tasks` to generate task breakdown, then `/sp.implement` to execute implementation
- 🧠 Reflection: Successfully translated user's concise technical requirements into comprehensive architecture plan. Key achievements: (1) Validated all technology choices with research, (2) Designed stateless architecture meeting constitutional requirements, (3) Created complete API and MCP tool contracts, (4) Documented development workflow in quickstart guide. The plan maintains strict data isolation (user_id scoping), enforces type safety (TypeScript strict + mypy), and complies with all Section VIII production standards. Ready for task breakdown and implementation.

## Evaluation notes (flywheel)

- Failure modes observed: None - planning completed without blockers
- Graders run and results (PASS/FAIL): Constitution Check - PASS (14/14 production standards)
- Prompt variant (if applicable): Standard /sp.plan workflow with user-provided execution roadmap
- Next experiment (smallest change to try): Consider adding ADR (Architectural Decision Record) for stateless architecture choice in future planning phases
