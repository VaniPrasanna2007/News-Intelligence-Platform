"""
FastAPI Routes for AI News Intelligence Platform.
Exposes endpoints for predictions, News DNA, story clusters, semantic similarity,
novelty computation, headline alignment, claim comparison, source analysis,
coverage gaps, and human review loop.
"""
import os
import io
import json
import logging
import subprocess
import sys
import re
import urllib.request
from typing import Optional, List, Dict, Any
from datetime import datetime

import pandas as pd
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form, Body
from pydantic import BaseModel

from app.schemas.schemas import (
    SinglePredictionRequest,
    SinglePredictionResponse,
    BatchPredictionResponse,
    HealthResponse,
    NewsDNARequest,
    SimilarityRequest,
    NoveltyRequest,
    HeadlineAlignmentRequest,
    HumanReviewRequest,
    HumanReviewStatsResponse
)
from app.ml.classifier import classifier_service
from app.ml.intelligence import intelligence_service
from app.models.database import (
    get_recent_predictions,
    get_prediction_statistics,
    record_human_review,
    get_review_statistics,
    get_paginated_articles
)

router = APIRouter(prefix="/api")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
REPORTS_DIR = os.path.join(BASE_DIR, "reports")
MODELS_DIR = os.path.join(BASE_DIR, "models")
PROCESSED_CSV = os.path.join(BASE_DIR, "data", "processed", "news_dataset.csv")

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
        "version": "2.0.0-intelligence",
        "models_loaded": models_ok,
        "production_model": classifier_service.best_model_name,
        "best_model": classifier_service.best_model_name,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@router.get("/dataset/summary")
def get_dataset_summary():
    """Returns dynamic dataset statistics, category distribution, and cleaning audit."""
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
    Paginated search and category filtering for Existing Articles using indexed SQLite database.
    Supports ?page=1&limit=20, ?category=Technology, and ?search=keyword.
    """
    try:
        return get_paginated_articles(page=page, limit=limit, category=category, search=search)
    except Exception as e:
        logging.error(f"Error fetching articles from SQLite database: {e}", exc_info=True)
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

@router.get("/confusion-matrix")
def get_confusion_matrix(model_name: Optional[str] = None):
    """Returns confusion matrices for models evaluated on the test set."""
    cms = read_json_report("confusion_matrix.json")
    if model_name and model_name in cms:
        return {model_name: cms[model_name]}
    return cms

# ==========================================
# 2. INTELLIGENCE & NEWS DNA ENDPOINTS
# ==========================================
@router.post("/predict", response_model=SinglePredictionResponse)
def predict_single(req: SinglePredictionRequest):
    """
    Classify a single news article with calibrated probabilities, confidence,
    and attached News DNA fingerprint.
    """
    try:
        res = classifier_service.predict(
            text=req.text,
            headline=req.headline,
            model_name=req.model_name,
            source_type=req.source_type,
            save_to_db=True
        )
        # Compute News DNA
        dna = intelligence_service.generate_news_dna(
            text=req.text,
            headline=req.headline,
            classification_result=res
        )
        res["news_dna"] = dna
        return res
    except Exception as e:
        logging.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/news-dna")
def get_news_dna(req: NewsDNARequest):
    """Generates the full News DNA fingerprint for an article."""
    try:
        pred_res = classifier_service.predict(text=req.text, headline=req.headline, model_name=req.model_name, save_to_db=False)
        dna = intelligence_service.generate_news_dna(
            text=req.text,
            headline=req.headline,
            source_url=req.source_url,
            classification_result=pred_res
        )
        return dna
    except Exception as e:
        logging.error(f"News DNA calculation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/extract")
async def extract_article_preview(
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None)
):
    """
    Extracts text and headline from an uploaded document (.txt, .pdf, .docx) or live URL.
    Does NOT run classification or prediction.
    Used for STATE 2 (Article Ready / Preview) before explicit analysis.
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
                # Exclude testing label hints if present at the end
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

@router.post("/predict/file")
async def predict_file(
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    model_name: Optional[str] = Form("best")
):
    """
    Classifies article from uploaded file (.txt, .pdf, .docx) or URL.
    Extracts text and returns prediction and News DNA.
    """
    extracted_text = ""
    extracted_headline = ""
    orig_filename = "Document"
    file_type = "DOCX"

    if url:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            with urllib.request.urlopen(req, timeout=10) as response:
                html = response.read().decode("utf-8", errors="replace")
                # Title extraction
                title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
                if title_match:
                    extracted_headline = title_match.group(1).strip()
                # Remove scripts and tags
                clean_h = re.sub(r'<(script|style).*?>.*?</\1>', ' ', html, flags=re.DOTALL)
                text = re.sub(r'<[^>]+>', ' ', clean_h)
                extracted_text = " ".join(text.split())[:8000]
                orig_filename = url
                file_type = "URL"
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

    # Run Prediction & DNA
    first_line = extracted_text.split("\n")[0].strip()
    headline = extracted_headline or (first_line[:120] if len(first_line) > 5 else extracted_text[:80])
    src_type = "URL" if url else "Document"
    pred = classifier_service.predict(text=extracted_text, headline=headline, model_name=model_name or "best", source_type=src_type, save_to_db=True)
    
    # Document Extraction Debug Logging (as explicitly requested)
    debug_log = (
        f"[DOCUMENT EXTRACTION & INFERENCE]\n"
        f"  filename:                 {orig_filename}\n"
        f"  extracted_text_length:    {len(extracted_text)} chars\n"
        f"  first 300 characters:     {repr(extracted_text[:300])}\n"
        f"  model name:               {pred.get('model_used')}\n"
        f"  predicted category:       {pred.get('predicted_category')}\n"
        f"  probability for each category: {pred.get('probabilities')}"
    )
    try:
        logging.getLogger("uvicorn.error").info(debug_log)
    except Exception:
        pass
    try:
        encoding = sys.stdout.encoding or "utf-8"
        print(debug_log.encode(encoding, errors="replace").decode(encoding, errors="replace"), flush=True)
    except Exception:
        pass

    dna = intelligence_service.generate_news_dna(
        text=extracted_text,
        headline=headline,
        source_url=url,
        classification_result=pred
    )
    pred["news_dna"] = dna
    pred["extracted_text"] = extracted_text
    pred["filename"] = orig_filename
    pred["file_type"] = file_type
    pred["headline"] = headline
    return pred

@router.post("/similarity")
def search_similarity(req: SimilarityRequest):
    """Searches top matching articles from the 9,990 corpus using cosine similarity."""
    matches, max_sim = intelligence_service.search_similar_articles(req.text, top_k=req.top_k or 8)
    return {
        "query_snippet": req.text[:120],
        "top_matches": matches,
        "max_similarity": round(max_sim, 4),
        "total_corpus_scanned": 9990
    }

@router.post("/novelty")
def calculate_novelty(req: NoveltyRequest):
    """Calculates novelty score relative to the available news dataset."""
    _, max_sim = intelligence_service.search_similar_articles(req.text, top_k=1)
    res = intelligence_service.calculate_novelty(max_sim)
    return res

@router.post("/article-profile")
def get_article_profile(req: Dict[str, Any]):
    """Analyzes text structure: vocabulary diversity, entity density, repetition ratio."""
    text = req.get("text", "")
    headline = req.get("headline", None)
    if not text:
        raise HTTPException(status_code=400, detail="Text is required.")
    return intelligence_service.analyze_article_structure(text, headline)

@router.post("/headline-alignment")
def check_headline_alignment(req: HeadlineAlignmentRequest):
    """Evaluates semantic consistency between headline and article body."""
    return intelligence_service.calculate_headline_alignment(req.headline, req.body)

@router.post("/entities")
def extract_named_entities(req: Dict[str, str]):
    """Extracts named entities from article text."""
    text = req.get("text", "")
    return {"entities": intelligence_service.extract_entities(text)}

@router.post("/claim-comparison")
def compare_article_claims(req: Dict[str, Any]):
    """Compares claims between query text and related corpus articles."""
    text = req.get("text", "")
    matches, _ = intelligence_service.search_similar_articles(text, top_k=4)
    claims = intelligence_service.compare_claims(text, matches)
    return {"claims": claims}

@router.get("/story-clusters")
def get_story_clusters():
    """Returns precomputed corpus topic clusters."""
    data = read_json_report("coverage_gaps.json")
    return {
        "clusters": data.get("subtopic_representation", []),
        "total_clusters": len(data.get("subtopic_representation", []))
    }

@router.get("/coverage-gaps")
def get_coverage_gaps():
    """Returns dataset representation analysis and coverage gaps."""
    data = read_json_report("coverage_gaps.json")
    if not data:
        raise HTTPException(status_code=404, detail="Coverage gap analysis not found.")
    return data

@router.get("/source-analysis")
def get_source_analysis():
    """Returns source-aware URL and domain analytics."""
    data = read_json_report("source_analysis.json")
    return {"sources": data if isinstance(data, list) else []}

@router.get("/category-constellation")
def get_category_constellation():
    """Returns visual category constellation node map data."""
    data = read_json_report("category_constellation.json")
    return data

@router.get("/cluster-constellation")
def get_cluster_constellation():
    """Returns visual cluster constellation graph data with nodes and semantic similarity edges."""
    data = read_json_report("cluster_constellation.json")
    return data

# ==========================================
# 3. HUMAN CORRECTION & REVIEW LOOP
# ==========================================
@router.post("/review")
def submit_human_review(req: HumanReviewRequest):
    """Records human review: agreement (VERIFIED) or correction (QUEUED)."""
    res = record_human_review(
        prediction_id=req.prediction_id,
        article_snippet=req.article_snippet,
        model_predicted_category=req.model_predicted_category,
        confidence=req.confidence,
        is_correct=req.is_correct,
        user_corrected_category=req.user_corrected_category,
        status=req.status
    )
    return res

@router.get("/review/stats", response_model=HumanReviewStatsResponse)
def get_review_stats():
    """Returns Model vs Human Review metrics."""
    return get_review_statistics()

# ==========================================
# 4. BATCH & HISTORY ENDPOINTS
# ==========================================
@router.post("/predict/batch", response_model=BatchPredictionResponse)
def predict_batch_json(items: List[dict]):
    """Classify a list of articles provided as JSON."""
    try:
        results = classifier_service.predict_batch(items=items)
        return {
            "total_articles": len(results),
            "model_used": classifier_service.best_model_name,
            "results": results
        }
    except Exception as e:
        logging.error(f"Batch prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict/batch-upload")
async def predict_batch_file(file: UploadFile = File(...)):
    """Upload CSV file, classify all articles, and return results."""
    try:
        df = pd.read_csv(file.file)
        text_col = None
        for candidate in ["combined_text", "content", "headlines", "headline", "text", "description"]:
            if candidate in df.columns:
                text_col = candidate
                break
        if not text_col:
            text_col = df.columns[0]
            
        items = []
        for idx, row in df.iterrows():
            text = str(row[text_col])
            headline = str(row.get("headlines", row.get("headline", text[:80])))
            items.append({
                "id": str(idx + 1),
                "text": text,
                "headline": headline
            })
            
        results = classifier_service.predict_batch(items)
        return {
            "filename": file.filename,
            "total_rows": len(results),
            "results": results
        }
    except Exception as e:
        logging.error(f"CSV upload batch classification failed: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to process CSV file: {str(e)}")

@router.get("/predictions/recent")
def get_recent(limit: int = Query(50, ge=1, le=200)):
    """Retrieve recent live predictions saved in SQLite database."""
    return get_recent_predictions(limit=limit)

@router.get("/statistics")
def get_system_statistics():
    """Returns aggregated live statistics combining dataset metrics, inference, and human reviews."""
    pred_stats = get_prediction_statistics()
    review_stats = get_review_statistics()
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
        "live_category_distribution": pred_stats.get("category_distribution", {}),
        "human_reviews": {
            "total": review_stats["predictions_reviewed"],
            "agreements": review_stats["agreements"],
            "corrections": review_stats["corrections"],
            "agreement_rate_pct": review_stats["agreement_rate_pct"]
        }
    }

from app.ml.retrain_service import retrain_manager

@router.post("/retrain")
def retrain_models():
    """Trigger non-blocking background retraining pipeline with human feedback incorporated."""
    result = retrain_manager.trigger_retrain(source="manual")
    return result

@router.get("/retrain/status")
def get_retrain_status():
    """Get live progress, 3-minute countdown, model completion statuses, and last completed timestamp."""
    return retrain_manager.get_status()
