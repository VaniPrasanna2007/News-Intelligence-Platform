"""
Pydantic Schemas for API requests, predictions, models, analytics, and intelligence signals.
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class SinglePredictionRequest(BaseModel):
    text: str = Field(..., min_length=5, description="Raw news article headline, description, or content.")
    headline: Optional[str] = Field(default=None, description="Optional headline for alignment analysis.")
    model_name: Optional[str] = Field(default="best", description="Specific model to use (default: best).")
    source_type: Optional[str] = Field(default="Text", description="Input mode: Existing Article, Text, Document, URL.")
    model_config = {"protected_namespaces": ()}

class SinglePredictionResponse(BaseModel):
    prediction_id: str
    predicted_category: str
    confidence: float
    probabilities: Dict[str, float]
    model_used: str
    timestamp: Optional[str] = None
    source_type: Optional[str] = None
    headline: Optional[str] = None
    news_dna: Optional[Dict[str, Any]] = None
    contributing_words: Optional[List[str]] = None
    article_summary: Optional[str] = None
    article_profile: Optional[Dict[str, Any]] = None
    model_info: Optional[Dict[str, Any]] = None
    models_predictions: Optional[Dict[str, Any]] = None
    production_model: Optional[str] = None
    model_agreement: Optional[Dict[str, Any]] = None
    model_config = {"protected_namespaces": ()}

class BatchArticleItem(BaseModel):
    id: Optional[str] = None
    text: str

class BatchPredictionItemResult(BaseModel):
    id: str
    headline: str
    predicted_category: str
    confidence: float
    probabilities: Dict[str, float]

class BatchPredictionResponse(BaseModel):
    total_articles: int
    model_used: str
    results: List[BatchPredictionItemResult]
    model_config = {"protected_namespaces": ()}

class ModelInfo(BaseModel):
    name: str
    slug: str
    is_best: bool
    validation_accuracy: float
    test_accuracy: float

class DatasetSummary(BaseModel):
    total_articles: int
    categories: List[str]
    category_counts: Dict[str, int]
    category_percentages: Dict[str, float]
    text_length_chars: Dict[str, Any]
    cleaning_decisions: List[str]

class KeywordItem(BaseModel):
    keyword: str
    score: float

class HealthResponse(BaseModel):
    status: str
    version: str
    models_loaded: bool
    best_model: str
    production_model: Optional[str] = None
    timestamp: str

# --- Intelligence Schemas ---

class NewsDNARequest(BaseModel):
    text: str = Field(..., min_length=5)
    headline: Optional[str] = None
    source_url: Optional[str] = None
    model_name: Optional[str] = "best"
    model_config = {"protected_namespaces": ()}

class SimilarityRequest(BaseModel):
    text: str = Field(..., min_length=5)
    top_k: Optional[int] = 8

class NoveltyRequest(BaseModel):
    text: str = Field(..., min_length=5)

class HeadlineAlignmentRequest(BaseModel):
    headline: str = Field(..., min_length=3)
    body: str = Field(..., min_length=10)

class HumanReviewRequest(BaseModel):
    prediction_id: Optional[str] = None
    article_snippet: str
    model_predicted_category: str
    confidence: float
    is_correct: bool
    user_corrected_category: Optional[str] = None
    status: Optional[str] = None
    model_config = {"protected_namespaces": ()}

class HumanReviewStatsResponse(BaseModel):
    predictions_reviewed: int
    agreements: int
    corrections: int
    queued: Optional[int] = 0
    applied: Optional[int] = 0
    failed: Optional[int] = 0
    agreement_rate_pct: float
    recent_reviews: List[Dict[str, Any]]
