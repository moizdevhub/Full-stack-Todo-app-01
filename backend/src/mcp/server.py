"""FastMCP server for stateless task operations."""

import os
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from mcp.server import Server
from mcp.server.stdio import stdio_server
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..models.todo import Todo, Priority
from ..services.database import async_session_maker


# Initialize MCP server
server = Server("todo-mcp-server")


async def get_db_session() -> AsyncSession:
    """Get database session for MCP tools."""
    return async_session_maker()


@server.tool()
async def add_task(
    user_id: str, title: str, description: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a new todo for the user.

    Args:
        user_id: User UUID from JWT sub claim (required for data isolation)
        title: Todo title (1-500 characters)
        description: Optional additional details about the todo (max 5000 characters)

    Returns:
        Dict containing task_id, title, description, completed, priority, and created_at

    Raises:
        ValueError: If title is empty or too long
    """
    # Validate inputs
    if not title or not title.strip():
        raise ValueError("Todo title cannot be empty")

    if len(title) > 500:
        raise ValueError("Todo title must be 500 characters or less")

    if description and len(description) > 5000:
        raise ValueError("Todo description must be 5000 characters or less")

    # Create todo in database with default priority
    async with await get_db_session() as session:
        todo = Todo(
            user_id=UUID(user_id),
            title=title.strip(),
            description=description.strip() if description else None,
            priority=Priority.MEDIUM.value,  # Default priority
        )
        session.add(todo)
        await session.commit()
        await session.refresh(todo)

        return {
            "task_id": str(todo.id),
            "title": todo.title,
            "description": todo.description,
            "completed": todo.completed,
            "priority": todo.priority,
            "created_at": todo.created_at.isoformat(),
        }


@server.tool()
async def list_tasks(
    user_id: str, status: Literal["all", "pending", "completed"] = "all"
) -> Dict[str, Any]:
    """
    Retrieve todos for the user with optional filtering by completion status.

    Args:
        user_id: User UUID from JWT sub claim (required for data isolation)
        status: Filter todos by completion status (all, pending, or completed)

    Returns:
        Dict containing tasks list, total count, and status_filter applied
    """
    async with await get_db_session() as session:
        # Build query with user_id filter
        query = select(Todo).where(Todo.user_id == UUID(user_id))

        # Apply status filter
        if status == "pending":
            query = query.where(Todo.completed == False)
        elif status == "completed":
            query = query.where(Todo.completed == True)

        # Order by creation date (newest first)
        query = query.order_by(Todo.created_at.desc())

        # Execute query
        result = await session.execute(query)
        todos = result.scalars().all()

        # Format response
        return {
            "tasks": [
                {
                    "task_id": str(todo.id),
                    "title": todo.title,
                    "description": todo.description,
                    "completed": todo.completed,
                    "priority": todo.priority,
                    "due_date": todo.due_date.isoformat() if todo.due_date else None,
                    "created_at": todo.created_at.isoformat(),
                    "updated_at": todo.updated_at.isoformat(),
                }
                for todo in todos
            ],
            "total": len(todos),
            "status_filter": status,
        }


@server.tool()
async def complete_task(user_id: str, task_id: str) -> Dict[str, Any]:
    """
    Mark a todo as completed.

    Args:
        user_id: User UUID from JWT sub claim (required for data isolation)
        task_id: UUID of the todo to mark as completed

    Returns:
        Dict containing task_id, title, completed status, and updated_at

    Raises:
        ValueError: If todo not found or does not belong to user
    """
    async with await get_db_session() as session:
        # Fetch todo with ownership verification
        todo = await session.get(Todo, UUID(task_id))

        if not todo or str(todo.user_id) != user_id:
            raise ValueError("Todo not found or does not belong to user")

        # Mark as completed
        todo.completed = True
        todo.updated_at = datetime.utcnow()

        await session.commit()
        await session.refresh(todo)

        return {
            "task_id": str(todo.id),
            "title": todo.title,
            "completed": todo.completed,
            "updated_at": todo.updated_at.isoformat(),
        }


@server.tool()
async def delete_task(user_id: str, task_id: str) -> Dict[str, Any]:
    """
    Permanently delete a todo.

    Args:
        user_id: User UUID from JWT sub claim (required for data isolation)
        task_id: UUID of the todo to delete

    Returns:
        Dict containing task_id and deleted status

    Raises:
        ValueError: If todo not found or does not belong to user
    """
    async with await get_db_session() as session:
        # Fetch todo with ownership verification
        todo = await session.get(Todo, UUID(task_id))

        if not todo or str(todo.user_id) != user_id:
            raise ValueError("Todo not found or does not belong to user")

        # Delete todo
        await session.delete(todo)
        await session.commit()

        return {"task_id": task_id, "deleted": True}


@server.tool()
async def update_task(
    user_id: str,
    task_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    priority: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Update an existing todo's title, description, or priority.

    Args:
        user_id: User UUID from JWT sub claim (required for data isolation)
        task_id: UUID of the todo to update
        title: New todo title (optional)
        description: New todo description (optional, null to clear)
        priority: New priority level - low, medium, or high (optional)

    Returns:
        Dict containing task_id, title, description, completed, priority, and updated_at

    Raises:
        ValueError: If todo not found, does not belong to user, or no fields provided
    """
    # Validate at least one field is provided
    if title is None and description is None and priority is None:
        raise ValueError("At least one field (title, description, or priority) must be provided")

    async with await get_db_session() as session:
        # Fetch todo with ownership verification
        todo = await session.get(Todo, UUID(task_id))

        if not todo or str(todo.user_id) != user_id:
            raise ValueError("Todo not found or does not belong to user")

        # Update fields
        if title is not None:
            if not title.strip():
                raise ValueError("Todo title cannot be empty")
            if len(title) > 500:
                raise ValueError("Todo title must be 500 characters or less")
            todo.title = title.strip()

        if description is not None:
            if description and len(description) > 5000:
                raise ValueError("Todo description must be 5000 characters or less")
            todo.description = description.strip() if description else None

        if priority is not None:
            # Validate priority value
            valid_priorities = [p.value for p in Priority]
            if priority not in valid_priorities:
                raise ValueError(f"Priority must be one of: {', '.join(valid_priorities)}")
            todo.priority = priority

        todo.updated_at = datetime.utcnow()

        await session.commit()
        await session.refresh(todo)

        return {
            "task_id": str(todo.id),
            "title": todo.title,
            "description": todo.description,
            "completed": todo.completed,
            "priority": todo.priority,
            "updated_at": todo.updated_at.isoformat(),
        }


# Server entry point
async def run_mcp_server():
    """Run the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)
