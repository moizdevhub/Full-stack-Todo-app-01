"""Context reconstruction service for stateless architecture."""

from typing import Dict, List

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..models.conversation import Conversation
from ..models.message import Message


async def get_conversation_history(
    session: AsyncSession, user_id: str, conversation_id: int
) -> List[Dict[str, str]]:
    """
    Reconstruct conversation context from database.

    Args:
        session: Database session
        user_id: User UUID from JWT sub claim
        conversation_id: Conversation ID to retrieve

    Returns:
        List of messages in format [{"role": "user", "content": "..."}, ...]

    Raises:
        HTTPException: 401 if conversation doesn't exist or doesn't belong to user
    """
    # Verify conversation ownership
    conversation = await session.get(Conversation, conversation_id)

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if conversation.user_id != user_id:
        raise HTTPException(
            status_code=401, detail="Unauthorized: Conversation does not belong to user"
        )

    # Fetch messages in chronological order
    query = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )

    result = await session.execute(query)
    messages = result.scalars().all()

    # Format messages for agent
    return [{"role": msg.role, "content": msg.content} for msg in messages]


async def verify_conversation_ownership(
    session: AsyncSession, user_id: str, conversation_id: int
) -> Conversation:
    """
    Verify that a conversation belongs to the authenticated user.

    Args:
        session: Database session
        user_id: User UUID from JWT sub claim
        conversation_id: Conversation ID to verify

    Returns:
        Conversation: The verified conversation

    Raises:
        HTTPException: 401 if conversation doesn't exist or doesn't belong to user
    """
    conversation = await session.get(Conversation, conversation_id)

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if conversation.user_id != user_id:
        raise HTTPException(
            status_code=401, detail="Unauthorized: Conversation does not belong to user"
        )

    return conversation


async def create_conversation(session: AsyncSession, user_id: str) -> Conversation:
    """
    Create a new conversation for the user.

    Args:
        session: Database session
        user_id: User UUID from JWT sub claim

    Returns:
        Conversation: The newly created conversation
    """
    conversation = Conversation(user_id=user_id)
    session.add(conversation)
    await session.commit()
    await session.refresh(conversation)
    return conversation


async def save_message(
    session: AsyncSession, conversation_id: int, user_id: str, role: str, content: str
) -> Message:
    """
    Save a message to the database.

    Args:
        session: Database session
        conversation_id: Conversation ID
        user_id: User UUID from JWT sub claim
        role: Message role ("user" or "assistant")
        content: Message content

    Returns:
        Message: The saved message
    """
    message = Message(
        user_id=user_id, conversation_id=conversation_id, role=role, content=content
    )
    session.add(message)
    await session.commit()
    await session.refresh(message)
    return message


async def update_conversation_timestamp(session: AsyncSession, conversation_id: int) -> None:
    """
    Update conversation's updated_at timestamp.

    Args:
        session: Database session
        conversation_id: Conversation ID to update
    """
    from datetime import datetime

    conversation = await session.get(Conversation, conversation_id)
    if conversation:
        conversation.updated_at = datetime.utcnow()
        await session.commit()


async def list_user_conversations(
    session: AsyncSession, user_id: str, limit: int = 20, offset: int = 0
) -> tuple[List[Dict], int]:
    """
    List all conversations for a user with pagination.

    Args:
        session: Database session
        user_id: User UUID from JWT sub claim
        limit: Maximum number of conversations to return
        offset: Number of conversations to skip

    Returns:
        Tuple of (conversations list, total count)
    """
    from sqlalchemy import func

    # Get total count
    count_query = select(func.count(Conversation.id)).where(Conversation.user_id == user_id)
    count_result = await session.execute(count_query)
    total = count_result.scalar() or 0

    # Get conversations with pagination
    query = (
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )

    result = await session.execute(query)
    conversations = result.scalars().all()

    # Get message count for each conversation
    conversation_list = []
    for conv in conversations:
        msg_count_query = select(func.count(Message.id)).where(
            Message.conversation_id == conv.id
        )
        msg_count_result = await session.execute(msg_count_query)
        message_count = msg_count_result.scalar() or 0

        conversation_list.append(
            {
                "id": conv.id,
                "user_id": conv.user_id,
                "created_at": conv.created_at,
                "updated_at": conv.updated_at,
                "message_count": message_count,
            }
        )

    return conversation_list, total


async def get_conversation_detail(
    session: AsyncSession, user_id: str, conversation_id: int
) -> Dict:
    """
    Get full conversation details with message history.

    Args:
        session: Database session
        user_id: User UUID from JWT sub claim
        conversation_id: Conversation ID to retrieve

    Returns:
        Dict with conversation details and messages

    Raises:
        HTTPException: 404 if conversation doesn't exist or doesn't belong to user
    """
    from sqlalchemy import func

    # Verify conversation ownership
    conversation = await verify_conversation_ownership(session, user_id, conversation_id)

    # Get message count
    msg_count_query = select(func.count(Message.id)).where(
        Message.conversation_id == conversation_id
    )
    msg_count_result = await session.execute(msg_count_query)
    message_count = msg_count_result.scalar() or 0

    # Get messages
    query = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )

    result = await session.execute(query)
    messages = result.scalars().all()

    # Format response
    return {
        "id": conversation.id,
        "user_id": conversation.user_id,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at,
        "message_count": message_count,
        "messages": [
            {
                "id": msg.id,
                "conversation_id": msg.conversation_id,
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at,
            }
            for msg in messages
        ],
    }
