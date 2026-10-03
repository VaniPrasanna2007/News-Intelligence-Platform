"""
Builds precomputed corpus index, source domain analysis, coverage gaps,
and story clusters across the 9,990 clean dataset articles.
Precomputed artifacts are stored in models/ and reports/ for sub-millisecond API response times.
"""
import os
import sys
import json
import logging
from urllib.parse import urlparse
from collections import Counter, defaultdict
import numpy as np
import pandas as pd
import joblib

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from app.ml.preprocessor import preprocess_text, clean_text

from sklearn.cluster import MiniBatchKMeans
from sklearn.decomposition import TruncatedSVD

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_CSV = os.path.join(BASE_DIR, "data", "processed", "news_dataset.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
REPORTS_DIR = os.path.join(BASE_DIR, "reports")

def extract_domain(url: str) -> str:
    if not url or not isinstance(url, str) or not url.startswith("http"):
        return "Unknown Source"
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        if domain.startswith("www."):
            domain = domain[4:]
        return domain or "Direct Feed"
    except Exception:
        return "Unknown Source"

def build_index():
    logging.info("Reading processed dataset...")
    df = pd.read_csv(DATA_CSV)
    logging.info(f"Loaded {len(df)} articles.")

    # 1. Load trained TF-IDF Vectorizer
    vec_path = os.path.join(MODELS_DIR, "tfidf_vectorizer.joblib")
    if not os.path.exists(vec_path):
        raise FileNotFoundError(f"Missing vectorizer: {vec_path}")
    vectorizer = joblib.load(vec_path)
    
    # 2. Vectorize entire corpus
    logging.info("Vectorizing 9,990 articles with preprocessor...")
    df["processed_text"] = df["combined_text"].apply(preprocess_text)
    corpus_tfidf = vectorizer.transform(df["processed_text"])
    
    # Save sparse corpus matrix
    corpus_index_path = os.path.join(MODELS_DIR, "corpus_tfidf.joblib")
    joblib.dump(corpus_tfidf, corpus_index_path)
    logging.info(f"Saved corpus TF-IDF matrix to {corpus_index_path} (shape: {corpus_tfidf.shape})")

    # 3. Source-Aware Analysis (URLs)
    logging.info("Performing Source-Aware Analysis...")
    df["domain"] = df["url"].apply(extract_domain)
    
    source_stats = {}
    for domain, group in df.groupby("domain"):
        cat_dist = group["category"].value_counts().to_dict()
        avg_len = float(group["combined_text"].str.len().mean())
        source_stats[domain] = {
            "domain": domain,
            "article_count": len(group),
            "percentage": round((len(group) / len(df)) * 100, 2),
            "avg_article_length": round(avg_len, 1),
            "category_distribution": cat_dist
        }
    
    # Sort sources by article volume
    sorted_sources = sorted(source_stats.values(), key=lambda x: x["article_count"], reverse=True)
    with open(os.path.join(REPORTS_DIR, "source_analysis.json"), "w", encoding="utf-8") as f:
        json.dump(sorted_sources, f, indent=2)
    logging.info(f"Analyzed {len(sorted_sources)} unique news domains.")

    # 4. Coverage Gap Analysis
    logging.info("Computing Coverage Gap Analysis & Topic Clustering...")
    # LSA Subtopic clustering across corpus
    n_clusters = 15
    kmeans = MiniBatchKMeans(n_clusters=n_clusters, random_state=42, batch_size=256)
    cluster_labels = kmeans.fit_predict(corpus_tfidf)
    df["cluster_id"] = cluster_labels
    
    # Find top terms for each subtopic cluster
    cluster_centers = kmeans.cluster_centers_
    terms = np.array(vectorizer.get_feature_names_out())
    
    clusters_info = []
    for c_id in range(n_clusters):
        c_articles = df[df["cluster_id"] == c_id]
        top_term_indices = cluster_centers[c_id].argsort()[::-1][:6]
        top_terms = [terms[i] for i in top_term_indices]
        topic_label = " / ".join(top_terms[:3]).title()
        
        # Dominant category in this cluster
        dom_cat = c_articles["category"].mode()[0] if not c_articles.empty else "general"
        
        clusters_info.append({
            "cluster_id": int(c_id),
            "topic_label": topic_label,
            "top_terms": top_terms,
            "dominant_category": dom_cat.capitalize(),
            "article_count": len(c_articles),
            "representation_percentage": round((len(c_articles) / len(df)) * 100, 2),
            "sample_headlines": c_articles["headlines"].head(3).tolist()
        })
        
    # Sort clusters from lowest representation to highest to highlight coverage gaps
    clusters_info.sort(key=lambda x: x["article_count"])
    
    # Category representation
    cat_counts = df["category"].value_counts().to_dict()
    category_coverage = [
        {
            "category": c.capitalize(),
            "count": count,
            "percentage": round((count / len(df)) * 100, 2),
            "coverage_level": "Standard Baseline"
        }
        for c, count in cat_counts.items()
    ]
    
    coverage_gaps_report = {
        "total_corpus_size": len(df),
        "category_coverage": category_coverage,
        "subtopic_representation": clusters_info,
        "least_represented_subtopics": clusters_info[:4],
        "most_represented_subtopics": clusters_info[-4:][::-1]
    }
    
    with open(os.path.join(REPORTS_DIR, "coverage_gaps.json"), "w", encoding="utf-8") as f:
        json.dump(coverage_gaps_report, f, indent=2)

    # 5. Category Constellation Map
    logging.info("Building Category Constellation Map...")
    kw_path = os.path.join(REPORTS_DIR, "category_keywords.json")
    with open(kw_path, "r", encoding="utf-8") as f:
        cat_kws = json.load(f)
        
    constellation = {}
    for cat, kws in cat_kws.items():
        constellation[cat.capitalize()] = {
            "name": cat.capitalize(),
            "count": int(cat_counts.get(cat.lower(), 0)),
            "keywords": [k["keyword"] for k in kws[:12]],
            "scores": [k["score"] for k in kws[:12]]
        }
        
    with open(os.path.join(REPORTS_DIR, "category_constellation.json"), "w", encoding="utf-8") as f:
        json.dump(constellation, f, indent=2)

    # 6. Precompute Corpus Metadata JSON for fast similarity lookup
    logging.info("Saving lightweight corpus metadata for fast retrieval...")
    meta_records = []
    for idx, row in df.iterrows():
        meta_records.append({
            "id": row.get("article_id", f"ART_{idx}"),
            "headline": str(row.get("headlines", ""))[:120],
            "category": str(row.get("category", "")).capitalize(),
            "domain": row.get("domain", "Source"),
            "url": str(row.get("url", "")),
            "length": len(str(row.get("combined_text", "")))
        })
        
    with open(os.path.join(MODELS_DIR, "corpus_metadata.json"), "w", encoding="utf-8") as f:
        json.dump(meta_records, f)
        
    logging.info("Corpus index, source analysis, and coverage gaps successfully built!")

if __name__ == "__main__":
    build_index()
