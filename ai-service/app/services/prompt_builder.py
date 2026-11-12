from app.schemas.assessment import AssessmentRequest
from app.utils.sanitizer import sanitize_input


SYSTEM_INSTRUCTION = """You are PAYMIND's procurement risk assessment assistant.

Your ONLY role is to provide an advisory risk assessment of purchase requests.

STRICT LIMITATIONS — YOU MUST FOLLOW THESE WITHOUT EXCEPTION:
1. You MUST NOT approve, authorise, execute, initiate, or complete any financial transaction.
2. You MUST NOT make binding decisions. Your output is advisory only.
3. You MUST NOT suggest you have taken any action on the request.
4. All final approval and payment decisions are made by human managers and the backend system.
5. You MUST respond in valid JSON only — no markdown, no prose outside JSON.
6. You MUST NOT invent unavailable budget information or claim to have verified a vendor independently.

Your assessment informs humans. It does not replace them."""


def build_assessment_prompt(request: AssessmentRequest) -> str:
    """
    Build a structured prompt for procurement risk assessment.
    All user-supplied text is sanitized before inclusion.
    """
    title = sanitize_input(request.title, "title")
    vendor = sanitize_input(request.vendor, "vendor")
    category = sanitize_input(request.category, "category")
    description = sanitize_input(request.description or "", "description")
    justification = sanitize_input(request.justification or "", "justification")

    policy_section = ""
    if request.policy_context:
        pc = request.policy_context
        policy_section = f"""
ORGANISATION POLICY CONTEXT (for reference only — policy enforcement is done by the backend):
- Single purchase limit: ${pc.single_purchase_limit:.2f}
- Allowed categories: {', '.join(pc.allowed_categories) if pc.allowed_categories else 'All categories allowed'}
- Blocked vendors: {', '.join(pc.blocked_vendors) if pc.blocked_vendors else 'None blocked'}
"""

    recent_section = ""
    if request.recent_purchases:
        recent_lines = []
        for p in request.recent_purchases[:10]:
            recent_lines.append(
                f"- Vendor: {sanitize_input(p.vendor, 'vendor')}, Title: {sanitize_input(p.title, 'title')}, "
                f"Amount: ${p.amount:.2f} {p.currency}, Status: {p.status}"
            )
        recent_section = f"""
RECENT ORGANISATION PURCHASES (for duplicate and pattern detection):
{chr(10).join(recent_lines)}
"""

    prompt = f"""Assess the following procurement request and return a structured JSON object.

PURCHASE REQUEST DETAILS:
- Title: {title}
- Vendor: {vendor}
- Category: {category}
- Amount: ${request.amount:.2f} {request.currency}
- Description: {description or 'Not provided'}
- Business Justification: {justification or 'Not provided'}
{policy_section}{recent_section}
INSTRUCTIONS:
Evaluate the purchase purpose, business justification legitimacy, procurement category suitability, vendor risk, potential duplicate purchases against recent orders, and alignment with corporate spending governance.
Do not invent unavailable budget balance information or claim to have verified a vendor off-platform.

YOU ARE PROVIDING AN ADVISORY ASSESSMENT ONLY. DO NOT APPROVE OR EXECUTE ANYTHING.

Respond with ONLY this JSON structure (no markdown code fences, no text outside JSON):
{{
  "category": "<evaluated or confirmed procurement category>",
  "purpose": "<concise summary of purchase purpose and intent>",
  "business_justification": "<evaluation of business necessity and validity>",
  "risk_level": "<'low' | 'medium' | 'high'>",
  "risk_score": <float between 0.0 (no risk) and 1.0 (critical risk)>,
  "risk_factors": ["<specific risk factor 1>", "<specific risk factor 2>"],
  "duplicate_risk": "<'none' | 'low' | 'medium' | 'high' with brief context if duplicate suspected>",
  "policy_observations": ["<observation 1 regarding spending limits, category or vendor>"],
  "recommendation": <"approve" | "review" | "reject">,
  "reasoning": "<2-4 sentence executive summary of your risk assessment>",
  "flags": ["<flag1>", "<flag2>"]
}}

Guidelines for recommendation:
- "approve": Low risk (score < 0.3), clear business necessity, no duplicate risk, standard vendor.
- "review": Medium risk (score 0.3–0.7), high amount, weak justification, or minor policy questions.
- "reject": High risk (score > 0.7), obvious policy violation (e.g. blocked vendor), suspicious duplicate, or severe fraud pattern.
"""
    return prompt

