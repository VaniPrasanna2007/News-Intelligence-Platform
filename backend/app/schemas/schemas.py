"""
Pydantic Schemas for API requests, prediction output, and system metadata.
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class SinglePredictionRequest(BaseModel):
    text: str = Field(..., min_length=5, description="Raw news article headline, description, or content.")
    headline: Optional[str] = Field(default=None, description="Optional headline for the article.")
    model_name: Optional[str] = Field(default="best", description="Model to use (default: best).")
    source_type: Optional[str] = Field(default="Text", description="Input source: Text, Document, URL, Existing Article.")
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
    contributing_words: Optional[List[str]] = None
    article_summary: Optional[str] = None
    article_profile: Optional[Dict[str, Any]] = None
    model_info: Optional[Dict[str, Any]] = None
    models_predictions: Optional[Dict[str, Any]] = None
    production_model: Optional[str] = None
    model_agreement: Optional[Dict[str, Any]] = None
    dataset_category: Optional[str] = None
    model_config = {"protected_namespaces": ()}

class HealthResponse(BaseModel):
    status: str
    version: str
    models_loaded: bool
    best_model: str
    production_model: Optional[str] = None
    timestamp: str

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
