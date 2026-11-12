import logging
from fastapi import APIRouter, HTTPException, Request
from app.schemas.assessment import AssessmentRequest, AssessmentResponse, AIRecommendation
from app.services.prompt_builder import build_assessment_prompt
from app.services.llm_client import run_assessment
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


def _verify_internal_key(request: Request):
    """
    Verify that the request comes from an authenticated internal service (e.g. Node.js backend).
    Security Policy: FAIL CLOSED.
    - If no backend_api_key is configured on the server, reject all requests (503).
    - If the caller supplies a missing or invalid key, reject with 403 Forbidden.
    """
    configured_key = settings.backend_api_key
    if not configured_key or not configured_key.strip():
        logger.error("Security failure: AI service internal authentication key is not configured.")
        raise HTTPException(
            status_code=503,
            detail="Security configuration error: AI service internal authentication key is not configured.",
        )

    api_key = request.headers.get("X-Internal-Key")
    if not api_key or api_key.strip() != configured_key.strip():
        logger.warning("Unauthorized access attempt to AI service: invalid or missing X-Internal-Key header.")
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Invalid or missing internal authentication key.",
        )


@router.post("/assess", response_model=AssessmentResponse)
async def assess_request(payload: AssessmentRequest, request: Request):
    """
    Assess a purchase request and return an advisory risk assessment.

    This endpoint is INTERNAL ONLY — called exclusively by the Node.js backend.
    The AI assessment is ADVISORY. It does not approve or execute any transaction.
    """
    _verify_internal_key(request)

    logger.info(
        "Assessment request received: id=%s vendor=%s amount=%.2f %s",
        payload.request_id, payload.vendor, payload.amount, payload.currency
    )

    try:
        prompt = build_assessment_prompt(payload)
        result = await run_assessment(payload, prompt)

        logger.info(
            "Assessment complete: id=%s risk=%.2f recommendation=%s flags=%s",
            payload.request_id, result.risk_score, result.recommendation, result.flags
        )

        return result

    except ValueError as e:
        # Configuration error (missing API key, unsupported provider)
        logger.error("AI configuration error: %s", str(e))
        raise HTTPException(status_code=503, detail=f"AI service configuration error: {str(e)}")
    except Exception as e:
        logger.exception("Unexpected error during assessment: %s", str(e))
        raise HTTPException(status_code=500, detail="AI assessment failed due to an internal error.")
