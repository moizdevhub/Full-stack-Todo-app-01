"""Message SQLModel for conversation messages."""

from datetime import datetime
from typing import TYPE_CHECKING, Literal, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .conversation import Conversation


class Message(SQLModel, table=True):
    """Message model representing a single message in a conversation."""

    __tablename__ = "messages"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(
        index=True, nullable=False, description="User UUID (for data isolation queries)"
    )
    conversation_id: int = Field(
        foreign_key="conversations.id", nullable=False, description="Reference to parent conversation"
    )
    role: Literal["user", "assistant"] = Field(
        nullable=False, description="Message sender role"
    )
    content: str = Field(max_length=10000, nullable=False, description="Message text content")
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Timestamp when message was sent"
    )

    # Relationship
    conversation: Optional["Conversation"] = Relationship(back_populates="messages")

    class Config:
        """Pydantic configuration."""

        json_schema_extra = {
            "example": {
                "user_id": "550e8400-e29b-41d4-a716-446655440000",
                "conversation_id": 1,
                "role": "user",
                "content": "Add a task to buy milk",
                "created_at": "2026-01-24T10:30:00Z",
            }
        }
