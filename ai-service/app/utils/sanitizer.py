import re
import logging

logger = logging.getLogger(__name__)

# Patterns that indicate the AI is trying to take financial action
FINANCIAL_ACTION_PATTERNS = [
    r'\b(i\s+will|i\s+am|i\s+can|i\s+shall)\s+(approve|authoris|authorize|execute|process|initiate|complete|confirm)\b',
    r'\b(approved|authorized|authorised|executed|processed|confirmed)\b\s+(by\s+ai|automatically|this\s+request)',
    r'\bpayment\s+has\s+been\s+(initiated|started|triggered|executed)\b',
    r'\btransaction\s+(is\s+)?(approved|authorized|executed)\b',
    r'\bfunds?\s+(are\s+)?(released|transferred|sent|approved)\b',
]

FINANCIAL_ACTION_RE = re.compile(
    '|'.join(FINANCIAL_ACTION_PATTERNS),
    re.IGNORECASE
)

FINANCIAL_ACTION_INSTRUCTIONS = [
    r'\bdo\s+not\s+contact\b',
    r'\bignore\s+(previous|above|prior)\b',
    r'\bsystem\s*prompt\b',
    r'\bact\s+as\b',
    r'\bpretend\s+(you\s+are|to\s+be)\b',
]

INJECTION_RE = re.compile(
    '|'.join(FINANCIAL_ACTION_INSTRUCTIONS),
    re.IGNORECASE
)


def sanitize_response(text: str) -> str:
    """
    Remove any financial-action language from AI response text.
    Replace matched segments with safe neutral language.
    """
    if not text:
        return text

    original = text

    # Replace financial action language
    text = FINANCIAL_ACTION_RE.sub('[assessment only — no action taken]', text)

    if text != original:
        logger.warning(
            "Sanitizer removed financial-action language from AI response. "
            "Original snippet: %s",
            original[:200]
        )

    return text


def check_for_injection(input_text: str) -> bool:
    """
    Check if input contains prompt injection attempts.
    Returns True if suspicious content is found.
    """
    if not input_text:
        return False
    return bool(INJECTION_RE.search(input_text))


def sanitize_input(text: str, field_name: str = "input") -> str:
    """
    Basic sanitization of user-supplied text before including in prompts.
    Strips leading/trailing whitespace, limits length.
    """
    if not text:
        return ""
    text = str(text).strip()
    text = text[:500]  # Hard cap to prevent prompt inflation
    if check_for_injection(text):
        logger.warning("Potential prompt injection detected in field '%s'", field_name)
        return "[content redacted]"
    return text
