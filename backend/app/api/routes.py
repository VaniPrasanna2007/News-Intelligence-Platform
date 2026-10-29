"""
FastAPI Routes for News Category Classifier.
Exposes endpoints for predictions, dataset summary, reference articles,
model evaluation metrics, and live telemetry.
"""
import os
import io
import json
import logging
import re
import urllib.request
from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form

from app.schemas.schemas import (
    SinglePredictionRequest,
    SinglePredictionResponse,
    HealthResponse
)
from app.ml.classifier import classifier_service
from app.models.database import (
    get_recent_predictions,
    get_prediction_statistics,
    get_paginated_articles
)

router = APIRouter(prefix="/api")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
REPORTS_DIR = os.path.join(BASE_DIR, "reports")
MODELS_DIR = os.path.join(BASE_DIR, "models")

def read_json_report(filename: str) -> Any:
    path = os.path.join(REPORTS_DIR, filename)
    if not os.path.exists(path):
        alt_path = os.path.join(MODELS_DIR, filename)
        if os.path.exists(alt_path):
            path = alt_path
        else:
            return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logging.error(f"Error reading {filename}: {e}")
        return {}

# ==========================================
# 1. CORE HEALTH & DATASET ENDPOINTS
# ==========================================
@router.get("/health", response_model=HealthResponse)
def health_check():
    """Returns application health status and model availability."""
    models_ok = bool(classifier_service.models and classifier_service.vectorizer)
    return {
        "status": "healthy" if models_ok else "degraded",
        "version": "1.0.0",
        "models_loaded": models_ok,
        "production_model": classifier_service.best_model_name,
        "best_model": classifier_service.best_model_name,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@router.get("/dataset/summary")
def get_dataset_summary():
    """Returns dataset statistics, category distribution, and cleaning audit."""
    data = read_json_report("dataset_summary.json")
    if not data:
        raise HTTPException(status_code=404, detail="Dataset summary not found.")
    return data

@router.get("/articles")
@router.get("/dataset/articles")
def get_articles_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """
    Paginated search and category filtering for Existing Articles using SQLite database.
    """
    try:
        return get_paginated_articles(page=page, limit=limit, category=category, search=search)
    except Exception as e:
        logging.error(f"Error fetching articles: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")

@router.get("/categories")
def get_categories():
    """Returns canonical categories and per-category metrics."""
    summary = read_json_report("dataset_summary.json")
    keywords = read_json_report("category_keywords.json")
    
    categories = ["Business", "Education", "Entertainment", "Sports", "Technology"]
    cat_details = []
    
    counts = summary.get("category_counts", {})
    percentages = summary.get("category_percentages", {})
    
    for c in categories:
        c_key = c.lower()
        top_kws = [k["keyword"] for k in keywords.get(c_key, [])[:10]]
        cat_details.append({
            "name": c,
            "slug": c_key,
            "article_count": counts.get(c_key, 0),
            "percentage": percentages.get(c_key, 0.0),
            "top_keywords": top_kws
        })
        
    return {
        "categories": categories,
        "details": cat_details
    }

@router.get("/models")
def get_models():
    """Returns available trained models and their comparative metrics."""
    perf = read_json_report("model_performance.json")
    val_results = perf.get("validation", {})
    test_results = perf.get("test", {})
    best = perf.get("production_model") or perf.get("best_model") or classifier_service.metadata.get("production_model", "Logistic Regression")
    
    model_list = []
    for name in ["Naive Bayes", "Logistic Regression", "Support Vector Machine"]:
        val = val_results.get(name, {})
        test = test_results.get(name, {})
        model_list.append({
            "name": name,
            "slug": name.lower().replace(" ", "_"),
            "is_best": (name == best),
            "validation_accuracy": val.get("accuracy", 0.0),
            "validation_macro_f1": val.get("f1_macro", 0.0),
            "test_accuracy": test.get("accuracy", 0.0),
            "test_macro_f1": test.get("f1_macro", 0.0)
        })
        
    return {
        "production_model": best,
        "best_model": best,
        "models": model_list
    }

@router.get("/model-performance")
def get_model_performance():
    """Returns comprehensive evaluation reports (Accuracy, Precision, Recall, F1)."""
    perf = read_json_report("model_performance.json")
    if not perf:
        raise HTTPException(status_code=404, detail="Model performance reports not found.")
    return perf

@router.get("/keywords")
def get_keywords(category: Optional[str] = None):
    """Returns genuine top TF-IDF keywords for each category."""
    keywords = read_json_report("category_keywords.json")
    if category:
        c_key = category.lower()
        return {c_key: keywords.get(c_key, [])}
    return keywords

# ==========================================
# 2. INFERENCE & ARTICLE EXTRACTION
# ==========================================
@router.post("/predict", response_model=SinglePredictionResponse)
def predict_single(req: SinglePredictionRequest):
    """
    Classify a single news article with calibrated probabilities, confidence,
    and three-model comparison.
    """
    try:
        res = classifier_service.predict(
            text=req.text,
            headline=req.headline,
            model_name=req.model_name,
            source_type=req.source_type,
            save_to_db=True
        )
        return res
    except Exception as e:
        logging.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/extract")
async def extract_article_preview(
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None)
):
    """
    Extracts text and headline from an uploaded document (.txt, .pdf, .docx) or live URL.
    Does NOT run classification yet; returns content for user confirmation.
    """
    extracted_text = ""
    extracted_headline = ""
    orig_filename = None
    file_type = "URL" if url else "TXT"

    if url:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            with urllib.request.urlopen(req, timeout=10) as response:
                html = response.read().decode("utf-8", errors="replace")
                title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
                if title_match:
                    extracted_headline = title_match.group(1).strip()
                clean_h = re.sub(r'<(script|style).*?>.*?</\1>', ' ', html, flags=re.DOTALL)
                text = re.sub(r'<[^>]+>', ' ', clean_h)
                extracted_text = " ".join(text.split())[:8000]
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch content from URL: {str(e)}")

    elif file:
        orig_filename = file.filename
        fn_lower = orig_filename.lower()
        contents = await file.read()
        
        if fn_lower.endswith(".txt"):
            extracted_text = contents.decode("utf-8", errors="replace")
            file_type = "TXT"
        elif fn_lower.endswith(".pdf"):
            try:
                import pypdf
                reader = pypdf.PdfReader(io.BytesIO(contents))
                pages = [page.extract_text() for page in reader.pages if page.extract_text()]
                extracted_text = "\n\n".join(pages)
                file_type = "PDF"
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to extract text from PDF: {str(e)}")
                
        elif fn_lower.endswith(".docx"):
            try:
                import docx
                doc = docx.Document(io.BytesIO(contents))
                paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
                filtered_paras = [p for p in paragraphs if not p.lower().startswith("test category:")]
                extracted_text = "\n\n".join(filtered_paras if filtered_paras else paragraphs)
                file_type = "DOCX"
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to extract text from DOCX: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload .txt, .pdf, or .docx")

    if not extracted_text or len(extracted_text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Could not extract meaningful text from provided source.")

    first_line = extracted_text.split("\n")[0].strip()
    headline = extracted_headline or (first_line[:120] if len(first_line) > 5 else extracted_text[:80])

    return {
        "text": extracted_text,
        "headline": headline,
        "filename": orig_filename,
        "file_type": file_type,
        "url": url,
        "char_count": len(extracted_text),
        "word_count": len(extracted_text.split()),
        "source_type": "url" if url else ("file" if file else "text")
    }

# ==========================================
# 3. TELEMETRY & PERSISTED PREDICTIONS
# ==========================================
@router.get("/predictions/recent")
def get_recent(limit: int = Query(50, ge=1, le=200)):
    """Retrieve recent live predictions saved in SQLite database."""
    return get_recent_predictions(limit=limit)

@router.get("/statistics")
def get_system_statistics():
    """Returns aggregated live statistics combining dataset metrics and model inference."""
    pred_stats = get_prediction_statistics()
    dataset_summary = read_json_report("dataset_summary.json")
    model_perf = read_json_report("model_performance.json")
    
    best_model = model_perf.get("production_model") or model_perf.get("best_model", "Logistic Regression")
    test_metrics = model_perf.get("test", {}).get(best_model, {})
    
    return {
        "total_dataset_articles": dataset_summary.get("total_articles", 0),
        "total_categories": len(dataset_summary.get("categories", [])),
        "production_model": best_model,
        "best_model": best_model,
        "test_accuracy": test_metrics.get("accuracy", 0.0),
        "total_live_predictions": pred_stats.get("total_predictions", 0),
        "average_live_confidence": pred_stats.get("average_confidence", 0.0),
        "live_category_distribution": pred_stats.get("category_distribution", {})
    }
