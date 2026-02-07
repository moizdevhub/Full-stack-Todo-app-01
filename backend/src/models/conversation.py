"""Conversation SQLModel for chat sessions."""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .message import Message


class Conversation(SQLModel, table=True):
    """Conversation model representing a chat session between user and AI assistant."""

    __tablename__ = "conversations"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, nullable=False, description="User UUID from JWT sub claim")
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Timestamp when conversation started"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp of last message in conversation",
    )

    # Relationship
    messages: List["Message"] = Relationship(back_populates="conversation")

    class Config:
        """Pydantic configuration."""

        json_schema_extra = {
            "example": {
                "user_id": "550e8400-e29b-41d4-a716-446655440000",
                "created_at": "2026-01-24T10:30:00Z",
                "updated_at": "2026-01-24T10:35:00Z",
            }
        }
