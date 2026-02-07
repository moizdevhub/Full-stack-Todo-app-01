# Data Model: AI-Powered Todo Chatbot

**Feature**: 001-ai-todo-chatbot
**Date**: 2026-01-24
**Purpose**: Define database entities, relationships, and validation rules

## Entity Definitions

### 1. Task

**Purpose**: Represents a todo item belonging to a specific user

**Fields**:
- `id` (int, PK, auto-increment): Unique task identifier
- `user_id` (str, indexed, required): User UUID from JWT sub claim
- `title` (str, required, max 200 chars): Task title/description
- `description` (str, optional, max 2000 chars): Additional task details
- `completed` (bool, default False): Task completion status
- `created_at` (datetime, auto): Timestamp when task was created
- `updated_at` (datetime, auto): Timestamp when task was last modified

**Validation Rules**:
- `title` must not be empty or whitespace-only
- `title` length: 1-200 characters
- `description` length: 0-2000 characters (optional)
- `user_id` must be valid UUID format
- `completed` defaults to False on creation

**Indexes**:
- Primary: `id`
- Composite: `(user_id, created_at)` for efficient user task queries
- Composite: `(user_id, completed)` for filtering by status

**State Transitions**:
```
[Created] → completed=False
[Completed] → completed=True (can be toggled back to False)
[Deleted] → Record removed from database
```

**SQLModel Definition**:
```python
from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional

class Task(SQLModel, table=True):
    __tablename__ = "tasks"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, nullable=False)
    title: str = Field(max_length=200, nullable=False)
    description: Optional[str] = Field(default=None, max_length=2000)
    completed: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "550e8400-e29b-41d4-a716-446655440000",
                "title": "Buy groceries",
                "description": "Milk, eggs, bread",
                "completed": False
            }
        }
```

---

### 2. Conversation

**Purpose**: Represents a chat session between a user and the AI assistant

**Fields**:
- `id` (int, PK, auto-increment): Unique conversation identifier
- `user_id` (str, indexed, required): User UUID from JWT sub claim
- `created_at` (datetime, auto): Timestamp when conversation started
- `updated_at` (datetime, auto): Timestamp of last message in conversation

**Validation Rules**:
- `user_id` must be valid UUID format
- Each user can have multiple conversations
- Conversations are never deleted (soft delete if needed in future)

**Indexes**:
- Primary: `id`
- Composite: `(user_id, updated_at DESC)` for recent conversations

**Relationships**:
- One-to-many with Message (one conversation has many messages)

**SQLModel Definition**:
```python
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional, List

class Conversation(SQLModel, table=True):
    __tablename__ = "conversations"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationship
    messages: List["Message"] = Relationship(back_populates="conversation")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "550e8400-e29b-41d4-a716-446655440000",
                "created_at": "2026-01-24T10:30:00Z",
                "updated_at": "2026-01-24T10:35:00Z"
            }
        }
```

---

### 3. Message

**Purpose**: Represents a single message in a conversation (user or assistant)

**Fields**:
- `id` (int, PK, auto-increment): Unique message identifier
- `user_id` (str, indexed, required): User UUID (for data isolation queries)
- `conversation_id` (int, FK, required): Reference to parent conversation
- `role` (str, required): Message sender role ("user" or "assistant")
- `content` (text, required): Message text content
- `created_at` (datetime, auto): Timestamp when message was sent

**Validation Rules**:
- `role` must be either "user" or "assistant"
- `content` must not be empty
- `content` max length: 10,000 characters
- `conversation_id` must reference existing conversation
- `user_id` must match conversation's user_id

**Indexes**:
- Primary: `id`
- Foreign key: `conversation_id` references `conversations.id`
- Composite: `(conversation_id, created_at)` for chronological message retrieval
- Index: `user_id` for data isolation queries

**Relationships**:
- Many-to-one with Conversation (many messages belong to one conversation)

**SQLModel Definition**:
```python
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional, Literal

class Message(SQLModel, table=True):
    __tablename__ = "messages"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, nullable=False)
    conversation_id: int = Field(foreign_key="conversations.id", nullable=False)
    role: Literal["user", "assistant"] = Field(nullable=False)
    content: str = Field(max_length=10000, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationship
    conversation: Optional[Conversation] = Relationship(back_populates="messages")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "550e8400-e29b-41d4-a716-446655440000",
                "conversation_id": 1,
                "role": "user",
                "content": "Add a task to buy milk",
                "created_at": "2026-01-24T10:30:00Z"
            }
        }
```

---

## Entity Relationships

```
User (external, from JWT)
  │
  ├─── 1:N ──→ Task
  │              └─ Scoped by user_id
  │
  └─── 1:N ──→ Conversation
                 │
                 └─── 1:N ──→ Message
                                └─ Scoped by user_id + conversation_id
```

**Key Relationships**:
1. **User → Task**: One user has many tasks (1:N)
2. **User → Conversation**: One user has many conversations (1:N)
3. **Conversation → Message**: One conversation has many messages (1:N)

**Data Isolation**:
- All entities include `user_id` for filtering
- All queries MUST filter by authenticated user's `user_id`
- Foreign key constraints enforce referential integrity

---

## Database Constraints

### Primary Keys
- All entities use auto-incrementing integer primary keys
- Simple, efficient, and database-agnostic

### Foreign Keys
- `messages.conversation_id` → `conversations.id` (CASCADE on delete)
- Ensures messages are deleted when conversation is deleted

### Unique Constraints
- None required (users can have duplicate task titles)

### Check Constraints
- `tasks.title`: NOT NULL, length > 0
- `messages.role`: IN ('user', 'assistant')
- `messages.content`: NOT NULL, length > 0

### Indexes
```sql
-- Task indexes
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_user_created ON tasks(user_id, created_at DESC);
CREATE INDEX idx_tasks_user_completed ON tasks(user_id, completed);

-- Conversation indexes
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_user_updated ON conversations(user_id, updated_at DESC);

-- Message indexes
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
```

---

## Data Access Patterns

### Pattern 1: List User Tasks (Filtered)
```python
async def list_user_tasks(user_id: str, status: str = "all"):
    query = select(Task).where(Task.user_id == user_id)

    if status == "pending":
        query = query.where(Task.completed == False)
    elif status == "completed":
        query = query.where(Task.completed == True)

    query = query.order_by(Task.created_at.desc())

    result = await session.execute(query)
    return result.scalars().all()
```

### Pattern 2: Reconstruct Conversation Context
```python
async def get_conversation_history(user_id: str, conversation_id: int):
    # Verify conversation ownership
    conversation = await session.get(Conversation, conversation_id)
    if not conversation or conversation.user_id != user_id:
        raise HTTPException(401, "Unauthorized")

    # Fetch messages in chronological order
    query = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )

    result = await session.execute(query)
    messages = result.scalars().all()

    return [{"role": msg.role, "content": msg.content} for msg in messages]
```

### Pattern 3: Create Task with User Isolation
```python
async def create_task(user_id: str, title: str, description: str = None):
    task = Task(
        user_id=user_id,
        title=title.strip(),
        description=description.strip() if description else None
    )

    session.add(task)
    await session.commit()
    await session.refresh(task)

    return task
```

### Pattern 4: Update Task with Ownership Verification
```python
async def update_task(user_id: str, task_id: int, **updates):
    task = await session.get(Task, task_id)

    if not task or task.user_id != user_id:
        raise HTTPException(404, "Task not found")

    for key, value in updates.items():
        setattr(task, key, value)

    task.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(task)

    return task
```

---

## Migration Strategy

### Initial Migration (001_create_tables.py)
```python
"""Create initial tables

Revision ID: 001
Create Date: 2026-01-24
"""

def upgrade():
    # Create tasks table
    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.String(2000), nullable=True),
        sa.Column('completed', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )

    # Create conversations table
    op.create_table(
        'conversations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )

    # Create messages table
    op.create_table(
        'messages',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'])
    )

    # Create indexes
    op.create_index('idx_tasks_user_id', 'tasks', ['user_id'])
    op.create_index('idx_tasks_user_created', 'tasks', ['user_id', 'created_at'])
    op.create_index('idx_tasks_user_completed', 'tasks', ['user_id', 'completed'])
    op.create_index('idx_conversations_user_id', 'conversations', ['user_id'])
    op.create_index('idx_conversations_user_updated', 'conversations', ['user_id', 'updated_at'])
    op.create_index('idx_messages_user_id', 'messages', ['user_id'])
    op.create_index('idx_messages_conversation', 'messages', ['conversation_id', 'created_at'])

def downgrade():
    op.drop_table('messages')
    op.drop_table('conversations')
    op.drop_table('tasks')
```

---

## Data Validation Rules Summary

| Entity | Field | Validation |
|--------|-------|------------|
| Task | user_id | Required, UUID format |
| Task | title | Required, 1-200 chars, not whitespace-only |
| Task | description | Optional, max 2000 chars |
| Task | completed | Boolean, default False |
| Conversation | user_id | Required, UUID format |
| Message | user_id | Required, UUID format |
| Message | conversation_id | Required, must exist in conversations |
| Message | role | Required, must be "user" or "assistant" |
| Message | content | Required, 1-10000 chars |

---

## Security Considerations

### Data Isolation
- **CRITICAL**: All queries MUST filter by `user_id` from authenticated JWT
- Never trust `user_id` from request body or path parameters alone
- Always verify ownership before updates/deletes

### SQL Injection Prevention
- Use SQLModel/SQLAlchemy parameterized queries exclusively
- Never construct SQL strings with user input
- ORM handles escaping automatically

### Data Retention
- Messages and conversations persist indefinitely (no automatic deletion)
- Future enhancement: Add soft delete or archival after N days
- Tasks persist until explicitly deleted by user

---

## Performance Optimization

### Query Optimization
- Use composite indexes for common query patterns
- Limit message history to recent N messages (e.g., last 50)
- Use `select_related` / `joinedload` for relationships when needed

### Connection Pooling
```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True
)
```

### Caching Strategy
- **DO NOT cache**: Task data (must be real-time)
- **DO NOT cache**: Message history (stateless requirement)
- **CAN cache**: User metadata (if added in future)

---

## Testing Strategy

### Unit Tests
- Model validation (field constraints, defaults)
- Relationship integrity (cascade deletes)
- Data access pattern functions

### Integration Tests
- Cross-user data isolation (user A cannot access user B's data)
- Conversation ownership verification
- Task CRUD operations with user_id scoping

### Test Data Fixtures
```python
@pytest.fixture
async def test_user_id():
    return "550e8400-e29b-41d4-a716-446655440000"

@pytest.fixture
async def test_task(session, test_user_id):
    task = Task(
        user_id=test_user_id,
        title="Test task",
        description="Test description"
    )
    session.add(task)
    await session.commit()
    return task
```

---

## Next Steps

1. ✅ Data model defined
2. ⏭️ Generate API contracts (OpenAPI spec)
3. ⏭️ Create quickstart.md
4. ⏭️ Update agent context
5. ⏭️ Implement models in code (/sp.implement)
