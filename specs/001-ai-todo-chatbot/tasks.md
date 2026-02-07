# Tasks: AI-Powered Todo Chatbot

**Input**: Design documents from `/specs/001-ai-todo-chatbot/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT included in this task breakdown (not explicitly requested in specification)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- All paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure) ✅ COMPLETE

**Purpose**: Project initialization and basic structure

- [x] T001 Perform comprehensive project audit - review existing structure, SQLModel schemas, and frontend components to map chatbot integration points
- [x] T002 Create backend directory structure per plan.md (src/models, src/services, src/mcp, src/agent, src/api)
- [x] T003 [P] Create frontend directory structure per plan.md (src/app, src/components, src/services, src/types)
- [x] T004 [P] Initialize backend Python project with UV in backend/pyproject.toml
- [x] T005 [P] Initialize frontend Next.js project with TypeScript strict mode in frontend/package.json
- [x] T006 [P] Configure backend linting (ruff) and formatting (black) in backend/pyproject.toml
- [x] T007 [P] Configure frontend linting (ESLint) and formatting (Prettier) in frontend/.eslintrc.json
- [x] T008 Create backend/.env.example with required environment variables (DATABASE_URL, GEMINI_API_KEY, JWT_SECRET)
- [x] T009 [P] Create frontend/.env.local.example with required environment variables (NEXT_PUBLIC_API_URL, NEXT_PUBLIC_OPENAI_DOMAIN_KEY)

---

## Phase 2: Foundational (Blocking Prerequisites) ✅ COMPLETE

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & Models

- [x] T010 Setup Alembic migrations framework in backend/alembic/
- [x] T011 [P] Create Task SQLModel in backend/src/models/task.py with user_id, title, description, completed, timestamps
- [x] T012 [P] Create Conversation SQLModel in backend/src/models/conversation.py with user_id, timestamps, messages relationship
- [x] T013 [P] Create Message SQLModel in backend/src/models/message.py with user_id, conversation_id, role, content, timestamp
- [x] T014 Create initial Alembic migration (001_create_tables.py) for Task, Conversation, Message tables with indexes
- [x] T015 Setup Neon PostgreSQL connection with connection pooling in backend/src/services/database.py

### Authentication & Security

- [x] T016 Implement JWT validation middleware with Better Auth in backend/src/services/auth.py (extract user_id from sub claim)
- [x] T017 Create @require_auth decorator for FastAPI endpoints in backend/src/services/auth.py
- [x] T018 Implement standardized error response schema in backend/src/api/schemas.py (error, code, timestamp)

### MCP Server (Stateless)

- [x] T019 Setup FastMCP server structure in backend/src/mcp/server.py with stateless configuration
- [x] T020 [P] Implement add_task MCP tool in backend/src/mcp/server.py (requires user_id, title, description?)
- [x] T021 [P] Implement list_tasks MCP tool in backend/src/mcp/server.py (requires user_id, status filter)
- [x] T022 [P] Implement complete_task MCP tool in backend/src/mcp/server.py (requires user_id, task_id)
- [x] T023 [P] Implement delete_task MCP tool in backend/src/mcp/server.py (requires user_id, task_id)
- [x] T024 [P] Implement update_task MCP tool in backend/src/mcp/server.py (requires user_id, task_id, updates)
- [x] T025 Add user_id ownership verification to all MCP tools in backend/src/mcp/server.py
- [x] T026 Add error handling with standardized error codes to all MCP tools in backend/src/mcp/server.py

### AI Agent & Context Reconstruction

- [x] T027 Configure Gemini API with OpenAI-compatible endpoint in backend/src/agent/config.py (base_url, api_key)
- [x] T028 Implement OpenAI Agent setup with tool registration in backend/src/agent/runner.py
- [x] T029 Create agent instructions for natural language task management in backend/src/agent/runner.py
- [x] T030 Implement context reconstruction service in backend/src/services/context.py (fetch conversation history from DB)
- [x] T031 Implement conversation ownership verification in backend/src/services/context.py

### FastAPI Application

- [x] T032 Create FastAPI app entry point with CORS middleware in backend/src/api/main.py
- [x] T033 Create Pydantic request/response schemas in backend/src/api/schemas.py (ChatRequest, ChatResponse, ToolCall)
- [x] T034 Setup API routing structure in backend/src/api/routes.py

**Checkpoint**: ✅ Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create Task via Natural Language (Priority: P1) 🎯 MVP ✅ COMPLETE

**Goal**: Users can add tasks to their todo list by describing them in natural language

**Independent Test**: Send "I need to remember to buy milk" and verify task is created with confirmation "Done! I've added 'Buy milk' to your list."

### Implementation for User Story 1

- [x] T035 [US1] Implement POST /api/v1/{user_id}/chat endpoint in backend/src/api/routes.py with @require_auth decorator
- [x] T036 [US1] Integrate context reconstruction in chat endpoint (load conversation history from DB)
- [x] T037 [US1] Integrate OpenAI Agent runner in chat endpoint (initialize agent with MCP tools)
- [x] T038 [US1] Implement agent execution loop in chat endpoint (process message, call tools, generate response)
- [x] T039 [US1] Implement conversation and message persistence in chat endpoint (save to DB after agent response)
- [x] T040 [US1] Add natural language confirmation generation for add_task operations
- [x] T041 [US1] Add handling for incomplete information (ask clarifying questions when title missing)
- [x] T042 [US1] Add validation for user_id path parameter matches JWT sub claim in chat endpoint

**Checkpoint**: ✅ User Story 1 is fully functional - users can create tasks via natural language

---

## Phase 4: User Story 2 - View Tasks with Filtering (Priority: P1) ✅ COMPLETE

**Goal**: Users can view their tasks in different ways using natural language requests

**Independent Test**: Create several tasks, then ask "What's on my list?", "Show me pending tasks", "Show me completed tasks" to verify correct filtering

### Implementation for User Story 2

- [x] T043 [US2] Enhance agent instructions to handle list/view task intents in backend/src/agent/config.py
- [x] T044 [US2] Implement natural language response formatting for list_tasks results in backend/src/agent/config.py
- [x] T045 [US2] Add empty state handling (suggest creating task when list is empty) in backend/src/agent/config.py
- [x] T046 [US2] Add status filter interpretation (map "pending", "completed", "all" from natural language) in backend/src/agent/config.py

**Checkpoint**: ✅ User Stories 1 AND 2 should both work independently - users can create and view tasks

---

## Phase 5: User Story 3 - Complete Tasks (Priority: P2) ✅ COMPLETE

**Goal**: Users can mark tasks as complete using natural language

**Independent Test**: Create task "Buy milk", then say "I finished buying milk" and verify task is marked complete with confirmation

### Implementation for User Story 3

- [x] T047 [US3] Enhance agent instructions to handle complete task intents in backend/src/agent/config.py
- [x] T048 [US3] Implement task matching logic (find task by title/description from natural language) in backend/src/agent/config.py
- [x] T049 [US3] Add natural language confirmation generation for complete_task operations in backend/src/agent/config.py
- [x] T050 [US3] Add error handling for non-existent tasks (helpful message with suggestion) in backend/src/agent/config.py
- [x] T051 [US3] Add disambiguation handling for multiple similar tasks in backend/src/agent/config.py

**Checkpoint**: ✅ User Stories 1, 2, AND 3 should all work independently - full task lifecycle (create, view, complete)

---

## Phase 6: User Story 4 - Delete Tasks (Priority: P3) ✅ COMPLETE

**Goal**: Users can remove tasks from their list using natural language

**Independent Test**: Create task "Buy milk", then say "Delete the milk task" and verify it's removed with confirmation

### Implementation for User Story 4

- [x] T052 [US4] Enhance agent instructions to handle delete task intents in backend/src/agent/config.py
- [x] T053 [US4] Implement task matching logic for delete operations in backend/src/agent/config.py
- [x] T054 [US4] Add natural language confirmation generation for delete_task operations in backend/src/agent/config.py
- [x] T055 [US4] Add error handling for non-existent tasks in delete operations in backend/src/agent/config.py

**Checkpoint**: ✅ User Stories 1-4 should all work independently

---

## Phase 7: User Story 5 - Update Tasks (Priority: P3) ✅ COMPLETE

**Goal**: Users can modify existing task titles or descriptions using natural language

**Independent Test**: Create task "Buy milk", then say "Change the milk task to buy almond milk" and verify update with confirmation

### Implementation for User Story 5

- [x] T056 [US5] Enhance agent instructions to handle update task intents in backend/src/agent/config.py
- [x] T057 [US5] Implement task matching and field extraction logic for updates in backend/src/agent/config.py
- [x] T058 [US5] Add natural language confirmation generation for update_task operations in backend/src/agent/config.py
- [x] T059 [US5] Add validation for update operations (at least one field must be provided) in backend/src/agent/config.py

**Checkpoint**: ✅ All backend user stories (1-5) should now be independently functional

---

## Phase 8: Frontend - ChatKit UI Integration ✅ COMPLETE

**Purpose**: Build conversational UI for interacting with the AI todo chatbot

### ChatKit Scaffold & UI Logic

- [x] T060 [P] Install OpenAI ChatKit React package in frontend/package.json
- [x] T061 [P] Create TypeScript interfaces for chat types in frontend/src/types/chat.ts (Message, Conversation, ChatResponse)
- [x] T062 Create ChatInterface component in frontend/src/components/ChatInterface.tsx with OpenAI ChatKit integration
- [x] T063 [P] Create MessageList component in frontend/src/components/MessageList.tsx with message display and auto-scrolling
- [x] T064 [P] Create InputBox component in frontend/src/components/InputBox.tsx with user input handling
- [x] T065 Configure ChatKit to display "thinking" state during API calls in frontend/src/components/ChatInterface.tsx
- [x] T066 Configure ChatKit to display "tool-call" state when MCP tools are invoked in frontend/src/components/ChatInterface.tsx
- [x] T067 Configure ChatKit to display error states with user-friendly messages in frontend/src/components/ChatInterface.tsx

### API Contract Integration

- [x] T068 Create backend API client in frontend/src/services/api.ts with fetch wrapper
- [x] T069 Implement chat endpoint integration in frontend/src/services/api.ts (POST /api/v1/{user_id}/chat)
- [x] T070 Implement conversation management in frontend/src/services/api.ts (create, list, get conversations)
- [x] T071 Add JWT token handling in API client (Authorization header) in frontend/src/services/api.ts
- [x] T072 Add error handling and retry logic in API client in frontend/src/services/api.ts

### Better Auth Integration

- [x] T073 Install Better Auth package in frontend/package.json
- [x] T074 Create auth service in frontend/src/services/auth.ts with Better Auth integration
- [x] T075 Implement JWT token retrieval and storage in frontend/src/services/auth.ts
- [x] T076 Implement user_id extraction from JWT in frontend/src/services/auth.ts
- [x] T077 Add authentication guards to chat interface in frontend/src/app/page.tsx

### Main Chat Interface

- [x] T078 Create main chat page in frontend/src/app/page.tsx with ChatInterface component
- [x] T079 Implement conversation state management in frontend/src/app/page.tsx
- [x] T080 Add message sending and receiving logic in frontend/src/app/page.tsx
- [x] T081 Add conversation history loading on mount in frontend/src/app/page.tsx
- [x] T082 Configure app layout in frontend/src/app/layout.tsx with proper styling

**Checkpoint**: ✅ Frontend is fully functional and connected to backend

---

## Phase 9: Conversation Management Endpoints ✅ COMPLETE

**Purpose**: Additional endpoints for conversation management (optional but useful)

- [x] T083 [P] Implement GET /api/v1/{user_id}/conversations endpoint in backend/src/api/routes.py
- [x] T084 [P] Implement POST /api/v1/{user_id}/conversations endpoint in backend/src/api/routes.py
- [x] T085 [P] Implement GET /api/v1/{user_id}/conversations/{id} endpoint in backend/src/api/routes.py
- [x] T086 Add pagination support to conversation list endpoint in backend/src/api/routes.py

**Checkpoint**: ✅ Conversation management endpoints fully functional with pagination

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Type Safety & Validation

- [ ] T087 [P] Run mypy --strict on backend code and fix all type errors
- [ ] T088 [P] Run TypeScript type checking on frontend code and fix all errors
- [ ] T089 Add input validation to all Pydantic schemas in backend/src/api/schemas.py

### Error Handling & Logging

- [ ] T090 [P] Add comprehensive error logging to all backend services
- [ ] T091 [P] Add request/response logging middleware in backend/src/api/main.py
- [ ] T092 Verify all error responses follow standardized error contract

### Security Hardening

- [ ] T093 [P] Verify JWT secret is loaded from environment variables only
- [ ] T094 [P] Add rate limiting middleware to chat endpoint in backend/src/api/main.py
- [ ] T095 [P] Verify all database queries filter by user_id (data isolation audit)
- [ ] T096 Add CORS configuration for production domains in backend/src/api/main.py

### Performance Optimization

- [ ] T097 [P] Verify database connection pooling is configured correctly
- [ ] T098 [P] Add database query optimization (verify indexes are used)
- [ ] T099 Implement message history limiting (last 50 messages) in context reconstruction

### Documentation & Deployment

- [ ] T100 [P] Create deployment configuration for Vercel (frontend) in frontend/vercel.json
- [ ] T101 [P] Create deployment configuration for Railway/Render (backend) in backend/railway.json or render.yaml
- [ ] T102 [P] Update quickstart.md with any implementation-specific details
- [ ] T103 Verify all environment variables are documented in .env.example files
- [ ] T104 Run quickstart.md validation (follow setup instructions and verify they work)

### Code Quality

- [ ] T105 [P] Run black formatter on all backend Python code
- [ ] T106 [P] Run ruff linter on all backend Python code and fix issues
- [ ] T107 [P] Run Prettier formatter on all frontend TypeScript code
- [ ] T108 [P] Run ESLint on all frontend TypeScript code and fix issues
- [ ] T109 Remove any TODO/FIXME comments or convert to tracked issues

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Foundational phase completion
  - US1 (Phase 3): Can start after Foundational - No dependencies on other stories
  - US2 (Phase 4): Can start after Foundational - No dependencies on other stories (but logically follows US1)
  - US3 (Phase 5): Can start after Foundational - No dependencies on other stories (but logically follows US1+US2)
  - US4 (Phase 6): Can start after Foundational - No dependencies on other stories
  - US5 (Phase 7): Can start after Foundational - No dependencies on other stories
- **Frontend (Phase 8)**: Can start after US1 is complete (needs working backend endpoint)
- **Conversation Management (Phase 9)**: Can start after Foundational - Independent of user stories
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Logically follows US1 but technically independent
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Logically follows US1+US2 but technically independent
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Independent of other stories
- **User Story 5 (P3)**: Can start after Foundational (Phase 2) - Independent of other stories

### Within Each Phase

- Tasks marked [P] can run in parallel (different files, no dependencies)
- Tasks without [P] should run sequentially within their phase
- All tasks in a phase should complete before moving to next phase

### Parallel Opportunities

- **Phase 1 (Setup)**: T003-T009 can all run in parallel
- **Phase 2 (Foundational)**:
  - T011-T013 (models) can run in parallel
  - T020-T024 (MCP tools) can run in parallel after T019
- **Phase 8 (Frontend)**:
  - T060-T061 can run in parallel
  - T063-T064 can run in parallel after T062
- **Phase 10 (Polish)**: Most tasks can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# After T010 (Alembic setup), launch all model creation in parallel:
Task T011: "Create Task SQLModel in backend/src/models/task.py"
Task T012: "Create Conversation SQLModel in backend/src/models/conversation.py"
Task T013: "Create Message SQLModel in backend/src/models/message.py"

# After T019 (MCP server setup), launch all MCP tools in parallel:
Task T020: "Implement add_task MCP tool in backend/src/mcp/tools.py"
Task T021: "Implement list_tasks MCP tool in backend/src/mcp/tools.py"
Task T022: "Implement complete_task MCP tool in backend/src/mcp/tools.py"
Task T023: "Implement delete_task MCP tool in backend/src/mcp/tools.py"
Task T024: "Implement update_task MCP tool in backend/src/mcp/tools.py"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Create tasks)
4. Complete Phase 4: User Story 2 (View tasks)
5. Complete Phase 8: Frontend (ChatKit UI)
6. **STOP and VALIDATE**: Test US1+US2 independently via frontend
7. Deploy/demo if ready

**MVP Deliverable**: Users can create and view tasks via conversational interface

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + 2 + Frontend → Test independently → Deploy/Demo (MVP!)
3. Add User Story 3 → Test independently → Deploy/Demo (can complete tasks)
4. Add User Stories 4 + 5 → Test independently → Deploy/Demo (full CRUD)
5. Add Phase 10 (Polish) → Final production-ready release

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Stories 1 + 2 (backend)
   - Developer B: Frontend (Phase 8)
   - Developer C: User Stories 3-5 (backend)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All tasks include exact file paths for clarity
- No test tasks included (not explicitly requested in specification)
- Focus on stateless architecture - no in-memory sessions
- All operations must be scoped by user_id for data isolation
- Follow Section VIII production standards (type safety, error contracts, migrations, etc.)

---

## Task Count Summary

- **Total Tasks**: 109
- **Phase 1 (Setup)**: 9 tasks
- **Phase 2 (Foundational)**: 25 tasks (CRITICAL - blocks all stories)
- **Phase 3 (US1)**: 8 tasks
- **Phase 4 (US2)**: 4 tasks
- **Phase 5 (US3)**: 5 tasks
- **Phase 6 (US4)**: 4 tasks
- **Phase 7 (US5)**: 4 tasks
- **Phase 8 (Frontend)**: 23 tasks
- **Phase 9 (Conversation Management)**: 4 tasks
- **Phase 10 (Polish)**: 23 tasks

**Parallel Opportunities**: 45 tasks marked [P] can run in parallel within their phases

**MVP Scope**: Phases 1-4 + Phase 8 = 46 tasks for minimal viable product (create + view tasks with UI)
