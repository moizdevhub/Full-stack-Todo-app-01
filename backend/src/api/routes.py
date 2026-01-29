"""API routing structure for chat and conversation endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from .schemas import ChatRequest, ChatResponse, ErrorResponse
from ..agent.runner import get_agent_runner
from ..services.auth import validate_jwt
from ..services.context import (
    create_conversation,
    get_conversation_detail,
    get_conversation_history,
    list_user_conversations,
    save_message,
    update_conversation_timestamp,
)
from ..services.database import get_session

# Create API router
router = APIRouter()


@router.post(
    "/{user_id}/chat",
    response_model=ChatResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden"},
        422: {"model": ErrorResponse, "description": "Validation Error"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"},
    },
)
async def chat_endpoint(
    user_id: str,
    request: ChatRequest,
    authenticated_user_id: str = Depends(validate_jwt),
    session: AsyncSession = Depends(get_session),
):
    """
    Main chat endpoint for conversational todo management.

    This endpoint:
    1. Validates JWT and verifies user_id matches authenticated user
    2. Reconstructs conversation context from database (stateless)
    3. Runs OpenAI Agent with MCP tools
    4. Persists user message and assistant response to database
    5. Returns assistant response with tool call information

    Args:
        user_id: User UUID from path parameter
        request: Chat request with message and optional conversation_id
        authenticated_user_id: User UUID from JWT (injected by auth middleware)
        session: Database session (injected by dependency)

    Returns:
        ChatResponse: Assistant response with conversation_id, message, and tool_calls

    Raises:
        HTTPException: 403 if user_id doesn't match authenticated user
        HTTPException: 401 if conversation doesn't belong to user
        HTTPException: 500 if agent execution fails
    """
    # Verify path user_id matches authenticated user
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Forbidden: user_id mismatch")

    try:
        # Get or create conversation
        if request.conversation_id:
            # Reconstruct context from existing conversation
            conversation_history = await get_conversation_history(
                session, user_id, request.conversation_id
            )
            conversation_id = request.conversation_id
        else:
            # Create new conversation
            conversation = await create_conversation(session, user_id)
            conversation_id = conversation.id
            conversation_history = []

        # Save user message
        await save_message(session, conversation_id, user_id, "user", request.message)

        # Run agent with conversation history
        agent_runner = get_agent_runner()
        agent_response = await agent_runner.run(user_id, request.message, conversation_history)

        # Save assistant response
        await save_message(
            session, conversation_id, user_id, "assistant", agent_response["message"]
        )

        # Update conversation timestamp
        await update_conversation_timestamp(session, conversation_id)

        # Return response
        return ChatResponse(
            conversation_id=conversation_id,
            message=agent_response["message"],
            tool_calls=agent_response["tool_calls"],
        )

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log error and return 500
        import logging

        logging.error(f"Chat endpoint error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{user_id}/conversations")
async def list_conversations(
    user_id: str,
    authenticated_user_id: str = Depends(validate_jwt),
    session: AsyncSession = Depends(get_session),
    limit: int = 20,
    offset: int = 0,
):
    """
    List user conversations with pagination.

    Args:
        user_id: User UUID from path parameter
        authenticated_user_id: User UUID from JWT
        session: Database session
        limit: Maximum number of conversations to return (1-100)
        offset: Number of conversations to skip

    Returns:
        Dict with conversations list and pagination info
    """
    # Verify user_id matches authenticated user
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Forbidden: user_id mismatch")

    # Validate pagination parameters
    limit = max(1, min(limit, 100))
    offset = max(0, offset)

    try:
        # Get conversations with pagination
        conversations, total = await list_user_conversations(session, user_id, limit, offset)

        # Convert datetime objects to ISO format strings
        for conv in conversations:
            conv["created_at"] = conv["created_at"].isoformat()
            conv["updated_at"] = conv["updated_at"].isoformat()

        return {
            "conversations": conversations,
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    except Exception as e:
        import logging

        logging.error(f"List conversations error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{user_id}/conversations")
async def create_conversation_endpoint(
    user_id: str,
    authenticated_user_id: str = Depends(validate_jwt),
    session: AsyncSession = Depends(get_session),
):
    """
    Create a new conversation.

    Args:
        user_id: User UUID from path parameter
        authenticated_user_id: User UUID from JWT
        session: Database session

    Returns:
        Created conversation with message_count
    """
    # Verify user_id matches authenticated user
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Forbidden: user_id mismatch")

    try:
        # Create new conversation
        conversation = await create_conversation(session, user_id)

        return {
            "id": conversation.id,
            "user_id": conversation.user_id,
            "created_at": conversation.created_at.isoformat(),
            "updated_at": conversation.updated_at.isoformat(),
            "message_count": 0,
        }

    except Exception as e:
        import logging

        logging.error(f"Create conversation error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{user_id}/conversations/{conversation_id}")
async def get_conversation(
    user_id: str,
    conversation_id: int,
    authenticated_user_id: str = Depends(validate_jwt),
    session: AsyncSession = Depends(get_session),
):
    """
    Get conversation details with message history.

    Args:
        user_id: User UUID from path parameter
        conversation_id: Conversation ID
        authenticated_user_id: User UUID from JWT
        session: Database session

    Returns:
        Conversation with messages
    """
    # Verify user_id matches authenticated user
    if user_id != authenticated_user_id:
        raise HTTPException(status_code=403, detail="Forbidden: user_id mismatch")

    try:
        # Get conversation detail with messages
        conversation_detail = await get_conversation_detail(session, user_id, conversation_id)

        # Convert datetime objects to ISO format strings
        conversation_detail["created_at"] = conversation_detail["created_at"].isoformat()
        conversation_detail["updated_at"] = conversation_detail["updated_at"].isoformat()

        for msg in conversation_detail["messages"]:
            msg["created_at"] = msg["created_at"].isoformat()

        return conversation_detail

    except HTTPException:
        # Re-raise HTTP exceptions (404, 401)
        raise
    except Exception as e:
        import logging

        logging.error(f"Get conversation error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
