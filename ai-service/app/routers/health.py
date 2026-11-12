from fastapi import APIRouter
from app.config import settings
import time

router = APIRouter()

START_TIME = time.time()


@router.get("/health")
async def health_check():
    """Health check endpoint for the AI service."""
    uptime_seconds = int(time.time() - START_TIME)
    return {
        "status": "ok",
        "service": "paymind-ai-service",
        "llm_provider": settings.llm_provider,
        "model": settings.gemini_model if settings.llm_provider == "gemini" else settings.openai_model,
        "uptime_seconds": uptime_seconds,
    }
