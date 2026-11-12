import json
import logging
import re
from typing import Optional
from app.config import settings
from app.schemas.assessment import AssessmentResponse, AIRecommendation
from app.services.prompt_builder import SYSTEM_INSTRUCTION, build_assessment_prompt
from app.utils.sanitizer import sanitize_response

logger = logging.getLogger(__name__)


def _extract_json(text: str) -> dict:
    """Extract JSON from LLM response, handling markdown code blocks and repairing minor syntax if needed."""
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s*```$', '', text, flags=re.MULTILINE)
    text = text.strip()

    try:
        return json.loads(text, strict=False)
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', text, flags=re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0), strict=False)
            except Exception:
                pass

        # Attempt to auto-close open strings, braces or brackets
        repaired = text
        if repaired.count('"') % 2 != 0:
            repaired += '"'
        open_brackets = repaired.count('[') - repaired.count(']')
        if open_brackets > 0:
            repaired += ']' * open_brackets
        open_braces = repaired.count('{') - repaired.count('}')
        if open_braces > 0:
            repaired += '}' * open_braces

        try:
            return json.loads(repaired, strict=False)
        except Exception:
            raise ValueError(f"Could not parse valid JSON from LLM response: {text[:200]}")


def _validate_assessment_data(data: dict, model_name: str, request_data) -> AssessmentResponse:
    """Validate and construct AssessmentResponse from raw LLM output."""
    risk_score = float(data.get('risk_score', 0.5))
    risk_score = max(0.0, min(1.0, risk_score))

    # Derive or sanitize risk_level
    risk_level_raw = str(data.get('risk_level', '')).lower()
    if risk_level_raw in ('low', 'medium', 'high'):
        risk_level = risk_level_raw
    else:
        risk_level = 'low' if risk_score < 0.3 else ('medium' if risk_score < 0.7 else 'high')

    recommendation_raw = data.get('recommendation', 'review').lower()
    try:
        recommendation = AIRecommendation(recommendation_raw)
    except ValueError:
        logger.warning("Invalid recommendation '%s', defaulting to 'review'", recommendation_raw)
        recommendation = AIRecommendation.review

    reasoning = sanitize_response(str(data.get('reasoning', 'No reasoning provided.')))
    category = sanitize_response(str(data.get('category') or getattr(request_data, 'category', 'General Procurement')))
    purpose = sanitize_response(str(data.get('purpose') or getattr(request_data, 'title', 'Procurement purchase')))
    business_justification = sanitize_response(
        str(data.get('business_justification') or getattr(request_data, 'justification', 'Operational requirement'))
    )

    risk_factors = [str(f) for f in data.get('risk_factors', []) if isinstance(f, str)][:10]
    duplicate_risk = str(data.get('duplicate_risk', 'low'))
    policy_observations = [str(o) for o in data.get('policy_observations', []) if isinstance(o, str)][:10]

    flags = [str(f) for f in data.get('flags', []) if isinstance(f, str)][:10]
    if not flags and risk_factors:
        flags = [rf.lower().replace(' ', '_')[:30] for rf in risk_factors[:5]]

    return AssessmentResponse(
        request_id=request_data.request_id,
        risk_score=risk_score,
        risk_level=risk_level,
        recommendation=recommendation,
        reasoning=reasoning,
        category=category,
        purpose=purpose,
        business_justification=business_justification,
        risk_factors=risk_factors,
        duplicate_risk=duplicate_risk,
        policy_observations=policy_observations,
        flags=flags,
        model_used=model_name,
    )


async def assess_with_gemini(prompt: str, request_data) -> AssessmentResponse:
    """Call the Gemini API and return a validated AssessmentResponse."""
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY is not configured in environment or ai-service/.env.")

    import google.generativeai as genai

    genai.configure(api_key=settings.gemini_api_key, transport="rest")

    generation_config = genai.types.GenerationConfig(
        temperature=0.2,
        max_output_tokens=2048,
        response_mime_type="application/json",
    )

    try:
        model = genai.GenerativeModel(
            model_name=settings.gemini_model,
            generation_config=generation_config,
            system_instruction=SYSTEM_INSTRUCTION,
        )
        response = model.generate_content(prompt)
        raw_text = response.text
    except Exception as e:
        err_msg = str(e)
        logger.error("Gemini API error with model '%s': %s", settings.gemini_model, err_msg)
        if "not found" in err_msg.lower() or "404" in err_msg or "unsupported" in err_msg.lower():
            raise ValueError(
                f"Configured Gemini model '{settings.gemini_model}' is unavailable or not supported by the API: {err_msg}. "
                f"Supported models typically include 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'."
            )
        raise

    logger.debug("Gemini raw response: %s", raw_text[:500])

    data = _extract_json(raw_text)
    return _validate_assessment_data(data, settings.gemini_model, request_data)


async def assess_with_openai(prompt: str, request_data) -> AssessmentResponse:
    """Call the OpenAI API and return a validated AssessmentResponse."""
    import httpx

    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not configured.")

    payload = {
        "model": settings.openai_model,
        "messages": [
            {"role": "system", "content": SYSTEM_INSTRUCTION},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 1024,
        "response_format": {"type": "json_object"},
    }

    async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
        )
        response.raise_for_status()

    raw_text = response.json()["choices"][0]["message"]["content"]
    data = _extract_json(raw_text)
    return _validate_assessment_data(data, settings.openai_model, request_data)


async def run_assessment(request_data, prompt: str) -> AssessmentResponse:
    """Route to the configured LLM provider."""
    provider = settings.llm_provider.lower()

    if provider == "gemini":
        return await assess_with_gemini(prompt, request_data)
    elif provider == "openai":
        return await assess_with_openai(prompt, request_data)
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}. Use 'gemini' or 'openai'.")

