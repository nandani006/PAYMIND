from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class AIRecommendation(str, Enum):
    approve = "approve"
    review = "review"
    reject = "reject"


class PolicyContext(BaseModel):
    single_purchase_limit: float
    allowed_categories: List[str] = []
    blocked_vendors: List[str] = []


class RecentPurchase(BaseModel):
    id: Optional[str] = None
    title: str
    vendor: str
    category: Optional[str] = None
    amount: float
    currency: str = "USD"
    status: Optional[str] = None
    created_at: Optional[str] = None


class AssessmentRequest(BaseModel):
    request_id: str
    title: str
    vendor: str
    category: str
    amount: float = Field(..., gt=0)
    currency: str = "USD"
    description: Optional[str] = None
    justification: Optional[str] = None
    policy_context: Optional[PolicyContext] = None
    org_context: Optional[dict] = None
    recent_purchases: Optional[List[RecentPurchase]] = []


class AssessmentResponse(BaseModel):
    request_id: str
    risk_score: float = Field(..., ge=0.0, le=1.0)
    risk_level: str = "medium"  # "low", "medium", "high"
    recommendation: AIRecommendation
    reasoning: str
    category: str
    purpose: str
    business_justification: str
    risk_factors: List[str] = Field(default_factory=list)
    duplicate_risk: str = "low"  # "none", "low", "medium", "high"
    policy_observations: List[str] = Field(default_factory=list)
    flags: List[str] = Field(default_factory=list)
    model_used: str

