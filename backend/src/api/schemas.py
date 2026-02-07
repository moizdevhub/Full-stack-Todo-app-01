"""Pydantic schemas for API requests and responses."""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


# Error Response Schema (T018)
class ErrorResponse(BaseModel):
    """Standardized error response schema."""

    error: str = Field(..., description="Human-readable error message")
    code: str = Field(..., description="Machine-readable error code")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")
    details: Optional[Dict[str, Any]] = Field(
        default=None, description="Additional error context (optional)"
    )

    class Config:
        """Pydantic configuration."""

        json_schema_extra = {
            "example": {
                "error": "Invalid or expired token",
                "code": "INVALID_TOKEN",
                "timestamp": "2026-01-24T10:30:00Z",
            }
        }


# Chat Request/Response Schemas
class ChatRequest(BaseModel):
    """Request schema for chat endpoint."""

    message: str = Field(..., min_length=1, max_length=10000, description="User's message")
    conversation_id: Optional[int] = Field(
        default=None, description="Existing conversation ID (null to create new)"
    )

    class Config:
        """Pydantic configuration."""

        json_schema_extra = {
            "example": {
                "message": "Add a task to buy milk tomorrow",
                "conversation_id": 123,
            }
        }


class ToolCall(BaseModel):
    """Schema for MCP tool call information."""

    tool: str = Field(..., description="Name of the MCP tool called")
    arguments: Dict[str, Any] = Field(..., description="Arguments passed to the tool")
    result: Dict[str, Any] = Field(..., description="Result returned by the tool")

    class Config:
        """Pydantic configuration."""

        json_schema_extra = {
            "example": {
                "tool": "add_task",
                "arguments": {
                    "user_id": "550e8400-e29b-41d4-a716-446655440000",
                    "title": "Buy milk",
                },
                "result": {"task_id": 42, "title": "Buy milk"},
            }
        }


class ChatResponse(BaseModel):
    """Response schema for chat endpoint."""

    conversation_id: int = Field(..., description="Conversation ID for this exchange")
    message: str = Field(..., description="AI assistant's response")
    tool_calls: List[ToolCall] = Field(
        default_factory=list, description="List of tool operations performed"
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")

    class Config:
        """Pydantic configuration."""

        json_schema_extra = {
            "example": {
                "conversation_id": 123,
                "message": "Done! I've added 'Buy milk' to your list.",
                "tool_calls": [
                    {
                        "tool": "add_task",
                        "arguments": {
                            "user_id": "550e8400-e29b-41d4-a716-446655440000",
                            "title": "Buy milk",
                        },
                        "result": {"task_id": 42, "title": "Buy milk"},
                    }
                ],
                "timestamp": "2026-01-24T10:30:00Z",
            }
        }


# Conversation Schemas
class ConversationResponse(BaseModel):
    """Response schema for conversation."""

    id: int
    user_id: str
    created_at: datetime
    updated_at: datetime
    message_count: int = Field(..., description="Total number of messages in conversation")

    class Config:
        """Pydantic configuration."""

        json_schema_extra = {
            "example": {
                "id": 123,
                "user_id": "550e8400-e29b-41d4-a716-446655440000",
                "created_at": "2026-01-24T10:30:00Z",
                "updated_at": "2026-01-24T10:35:00Z",
                "message_count": 8,
            }
        }


class MessageResponse(BaseModel):
    """Response schema for message."""

    id: int
    conversation_id: int
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime

    class Config:
        """Pydantic configuration."""

        json_schema_extra = {
            "example": {
                "id": 456,
                "conversation_id": 123,
                "role": "user",
                "content": "Add a task to buy milk",
                "created_at": "2026-01-24T10:30:00Z",
            }
        }
