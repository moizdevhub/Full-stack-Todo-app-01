"""Authentication and JWT validation middleware."""

import os
from functools import wraps
from typing import Callable

from fastapi import Depends, HTTPException, Header
from jose import JWTError, jwt


# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-super-secret-jwt-signing-key")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


async def validate_jwt(authorization: str = Header(None)) -> str:
    """
    Validate JWT token and extract user_id from sub claim.

    Args:
        authorization: Authorization header with Bearer token

    Returns:
        str: User UUID from JWT sub claim

    Raises:
        HTTPException: 401 if token is missing, invalid, or expired
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ")[1]

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid token: missing sub claim",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return user_id

    except JWTError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_auth(func: Callable) -> Callable:
    """
    Decorator for FastAPI endpoints requiring authentication.

    Usage:
        @app.post("/api/v1/{user_id}/chat")
        @require_auth
        async def chat_endpoint(
            user_id: str,
            authenticated_user_id: str = Depends(validate_jwt)
        ):
            # Verify path user_id matches authenticated user
            if user_id != authenticated_user_id:
                raise HTTPException(403, "Forbidden: user_id mismatch")
            ...

    Args:
        func: FastAPI endpoint function

    Returns:
        Wrapped function with authentication
    """

    @wraps(func)
    async def wrapper(*args, **kwargs):
        return await func(*args, **kwargs)

    return wrapper
