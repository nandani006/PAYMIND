import pytest
import asyncio
from app.schemas.assessment import AssessmentRequest, AIRecommendation
from app.services.llm_client import _validate_assessment_data, _extract_json, assess_with_gemini
from app.config import settings


@pytest.fixture
def sample_request():
    return AssessmentRequest(
        request_id="req-uuid-1234",
        title="Figma Annual Enterprise Licenses",
        vendor="Figma Inc",
        category="Software & SaaS",
        amount=540.00,
        currency="USD",
        justification="Mandatory design tooling for 3 product designers",
    )


def test_validate_assessment_data_full_fields(sample_request):
    raw_data = {
        "category": "Software & SaaS",
        "purpose": "Figma Enterprise subscription",
        "business_justification": "Legitimate business tool for product team",
        "risk_level": "low",
        "risk_score": 0.12,
        "risk_factors": ["Known SaaS provider", "Under departmental approval limit"],
        "duplicate_risk": "none",
        "policy_observations": ["Category allowed by company policy"],
        "recommendation": "approve",
        "reasoning": "Low risk software purchase with direct alignment to role.",
        "flags": ["low_risk", "standard_saas"],
    }
    res = _validate_assessment_data(raw_data, "gemini-1.5-flash", sample_request)

    assert res.request_id == "req-uuid-1234"
    assert res.risk_score == 0.12
    assert res.risk_level == "low"
    assert res.recommendation == AIRecommendation.approve
    assert res.duplicate_risk == "none"
    assert len(res.risk_factors) == 2
    assert len(res.policy_observations) == 1
    assert "low_risk" in res.flags


def test_validate_assessment_data_high_risk(sample_request):
    raw_data = {
        "category": "Miscellaneous",
        "purpose": "Unverified overseas payment",
        "business_justification": "No clear necessity",
        "risk_level": "high",
        "risk_score": 0.88,
        "risk_factors": ["Unknown unverified vendor", "Missing cost breakdown"],
        "duplicate_risk": "high",
        "policy_observations": ["Vendor not on approved list"],
        "recommendation": "reject",
        "reasoning": "High risk of fraud or non-business expenditure.",
        "flags": ["high_risk", "unverified_vendor"],
    }
    res = _validate_assessment_data(raw_data, "gemini-1.5-flash", sample_request)

    assert res.risk_score == 0.88
    assert res.risk_level == "high"
    assert res.recommendation == AIRecommendation.reject
    assert res.duplicate_risk == "high"


def test_extract_json_with_code_fences():
    text = "```json\n{\"risk_score\": 0.2, \"recommendation\": \"approve\"}\n```"
    data = _extract_json(text)
    assert data["risk_score"] == 0.2
    assert data["recommendation"] == "approve"


def test_missing_api_key_setting():
    orig_key = settings.gemini_api_key
    try:
        settings.gemini_api_key = None
        assert settings.gemini_api_key is None
    finally:
        settings.gemini_api_key = orig_key
