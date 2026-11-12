import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, assessment
from app.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="PAYMIND AI Service",
    description=(
        "Advisory procurement risk assessment service. "
        "This service provides AI-generated assessments only. "
        "It does NOT authorise, approve, or execute any financial transactions."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — only allow backend origin in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],  # Backend only
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Internal-Key"],
)

# Routers
app.include_router(health.router, tags=["health"])
app.include_router(assessment.router, tags=["assessment"])

logger.info(
    "PAYMIND AI Service starting — provider: %s, model: %s",
    settings.llm_provider,
    settings.gemini_model if settings.llm_provider == "gemini" else settings.openai_model,
)
