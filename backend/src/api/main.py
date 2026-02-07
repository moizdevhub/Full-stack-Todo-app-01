"""FastAPI application entry point with CORS middleware."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import router
from ..services.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup: Initialize database (development only)
    if os.getenv("ENVIRONMENT") == "development":
        await init_db()
    yield
    # Shutdown: cleanup if needed


# Create FastAPI application
app = FastAPI(
    title="AI-Powered Todo Chatbot API",
    description="REST API for conversational todo management with OpenAI Agents SDK",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "ai-todo-chatbot"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "AI-Powered Todo Chatbot API",
        "version": "1.0.0",
        "docs": "/docs",
    }
