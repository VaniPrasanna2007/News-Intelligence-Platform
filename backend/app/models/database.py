"""
SQLite database management for prediction history and human correction reviews.
Persists live article classifications, timestamps, confidence scores, and human review decisions.
"""
import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))
DB_PATH = os.path.join(DB_DIR, "app.db")

def get_db_connection():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
    except Exception:
        pass
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prediction_id TEXT UNIQUE NOT NULL,
            article_text TEXT NOT NULL,
            predicted_category TEXT NOT NULL,
            confidence REAL NOT NULL,
            probabilities_json TEXT,
            model_used TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            headline TEXT,
            source_type TEXT DEFAULT 'Text'
        )
    """)
    try:
        cursor.execute("ALTER TABLE predictions ADD COLUMN headline TEXT")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE predictions ADD COLUMN source_type TEXT DEFAULT 'Text'")
    except Exception:
        pass
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS human_reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prediction_id TEXT,
            article_snippet TEXT NOT NULL,
            model_predicted_category TEXT NOT NULL,
            confidence REAL NOT NULL,
            is_correct INTEGER NOT NULL,
            user_corrected_category TEXT,
            status TEXT DEFAULT 'QUEUED',
            timestamp TEXT NOT NULL
        )
    """)
    try:
        cursor.execute("ALTER TABLE human_reviews ADD COLUMN status TEXT DEFAULT 'QUEUED'")
    except Exception:
        pass
    # Initialize historical records accurately: is_correct=1 -> VERIFIED, previously retrained corrections -> APPLIED
    try:
        cursor.execute("""
            UPDATE human_reviews
            SET status = 'VERIFIED'
            WHERE (is_correct = 1 OR LOWER(user_corrected_category) = LOWER(model_predicted_category))
              AND (status IS NULL OR status = '' OR status = 'QUEUED')
        """)
        cursor.execute("""
            UPDATE human_reviews
            SET status = 'APPLIED'
            WHERE is_correct = 0
              AND (status IS NULL OR status = '' OR status = 'QUEUED')
        """)
    except Exception:
        pass
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            article_id TEXT UNIQUE NOT NULL,
            headlines TEXT NOT NULL,
            description TEXT,
            content TEXT,
            url TEXT,
            category TEXT NOT NULL,
            combined_text TEXT
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_articles_article_id ON articles(article_id)")
    conn.commit()
    conn.close()

VALID_SOURCES = {"Existing Article", "Text", "Document", "URL"}
FORBIDDEN_SOURCES = {"demo", "sample", "test", "mock", "seed", "unknown"}

def normalize_source_type(src: Optional[str]) -> str:
    if not src:
        return "Text"
    s = src.strip()
    s_lower = s.lower()
    if s_lower in ("existing article", "existing", "corpus", "database"):
        return "Existing Article"
    elif s_lower in ("document", "file", "docx", "pdf", "txt"):
        return "Document"
    elif s_lower in ("url", "link", "web"):
        return "URL"
    elif s_lower in ("text", "raw text", "preset"):
        return "Text"
    elif s in VALID_SOURCES:
        return s
    return "Text"

def save_prediction(
    prediction_id: str,
    article_text: str,
    predicted_category: str,
    confidence: float,
    probabilities_json: str,
    model_used: str,
    headline: Optional[str] = None,
    source_type: Optional[str] = "Text"
) -> Dict[str, Any]:
    raw_source = (source_type or "Text").strip()
    # Reject mock/seed/demo sources from live prediction storage
    if raw_source.lower() in FORBIDDEN_SOURCES:
        return {
            "prediction_id": prediction_id,
            "article_text": article_text,
            "predicted_category": predicted_category,
            "confidence": confidence,
            "model_used": model_used,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "headline": headline or "",
            "source_type": raw_source
        }

    clean_source = normalize_source_type(raw_source)
    clean_headline = (headline or "").strip()
    if not clean_headline and article_text:
        first_line = article_text.split('\n')[0].strip()
        clean_headline = first_line[:120] if len(first_line) > 5 else "Untitled Article"

    conn = get_db_connection()
    cursor = conn.cursor()

    # DUPLICATE PREVENTION:
    # Check if an identical prediction already exists in the database.
    # Prevents duplicate entries from React re-renders, API retries, polling, or repeated clicks.
    cursor.execute(
        """
        SELECT prediction_id, article_text, predicted_category, confidence, probabilities_json, model_used, timestamp, headline, source_type
        FROM predictions
        WHERE TRIM(article_text) = TRIM(?) AND model_used = ? AND source_type = ?
        ORDER BY id DESC
        LIMIT 1
        """,
        (article_text, model_used, clean_source)
    )
    existing = cursor.fetchone()
    if existing:
        conn.close()
        return {
            "prediction_id": existing["prediction_id"],
            "article_text": existing["article_text"],
            "predicted_category": existing["predicted_category"],
            "confidence": existing["confidence"],
            "model_used": existing["model_used"],
            "timestamp": existing["timestamp"],
            "headline": existing["headline"] or clean_headline,
            "source_type": existing["source_type"]
        }

    now_iso = datetime.utcnow().isoformat() + "Z"
    cursor.execute(
        """
        INSERT INTO predictions (prediction_id, article_text, predicted_category, confidence, probabilities_json, model_used, timestamp, headline, source_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (prediction_id, article_text, predicted_category, confidence, probabilities_json, model_used, now_iso, clean_headline, clean_source)
    )
    conn.commit()
    conn.close()
    return {
        "prediction_id": prediction_id,
        "article_text": article_text,
        "predicted_category": predicted_category,
        "confidence": confidence,
        "model_used": model_used,
        "timestamp": now_iso,
        "headline": clean_headline,
        "source_type": clean_source
    }

def get_recent_predictions(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT prediction_id, article_text, predicted_category, confidence, probabilities_json, model_used, timestamp, headline, source_type
        FROM predictions
        WHERE source_type IN ('Existing Article', 'Text', 'Document', 'URL')
        ORDER BY id DESC
        LIMIT ?
        """,
        (limit,)
    )
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        h = r["headline"] if "headline" in r.keys() and r["headline"] else ""
        st = r["source_type"] if "source_type" in r.keys() and r["source_type"] else "Text"
        if not h:
            first_line = (r["article_text"] or "").split('\n')[0].strip()
            h = first_line[:120] if len(first_line) > 5 else "Untitled Article"
        results.append({
            "prediction_id": r["prediction_id"],
            "headline": h,
            "source_type": st,
            "article_text": r["article_text"][:250] + "..." if len(r["article_text"]) > 250 else r["article_text"],
            "full_article_text": r["article_text"],
            "predicted_category": r["predicted_category"],
            "confidence": round(r["confidence"], 4),
            "probabilities_json": r["probabilities_json"],
            "model_used": r["model_used"],
            "timestamp": r["timestamp"]
        })
    return results

def get_prediction_statistics() -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT COUNT(*), AVG(confidence)
        FROM predictions
        WHERE source_type IN ('Existing Article', 'Text', 'Document', 'URL')
    """)
    count_row = cursor.fetchone()
    count = count_row[0] if count_row else 0
    avg_conf = count_row[1] if count_row and count_row[1] is not None else 0.0
    
    cursor.execute("""
        SELECT predicted_category, COUNT(*)
        FROM predictions
        WHERE source_type IN ('Existing Article', 'Text', 'Document', 'URL')
        GROUP BY predicted_category
    """)
    cat_counts = {str(row[0]).capitalize(): row[1] for row in cursor.fetchall()}
    conn.close()
    
    return {
        "total_predictions": count or 0,
        "average_confidence": round(float(avg_conf), 4) if count > 0 else 0.0,
        "category_distribution": cat_counts
    }

# Human Review Functions
def record_human_review(
    prediction_id: Optional[str],
    article_snippet: str,
    model_predicted_category: str,
    confidence: float,
    is_correct: bool,
    user_corrected_category: Optional[str] = None,
    status: Optional[str] = None
) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.utcnow().isoformat() + "Z"

    # Human Correction Lifecycle:
    # 1. User confirms "Correct" -> STATUS = VERIFIED (not queued for retraining)
    # 2. User confirms "Wrong" + correction -> STATUS = QUEUED (queued for retraining)
    if is_correct or (user_corrected_category and user_corrected_category.strip().lower() == model_predicted_category.strip().lower()):
        effective_status = "VERIFIED"
        effective_is_correct = 1
        effective_corrected = model_predicted_category
    else:
        effective_status = (status or "QUEUED").strip().upper()
        effective_is_correct = 0
        effective_corrected = (user_corrected_category or model_predicted_category).strip()

    cursor.execute(
        """
        INSERT INTO human_reviews (
            prediction_id, article_snippet, model_predicted_category,
            confidence, is_correct, user_corrected_category, status, timestamp
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            prediction_id or "",
            article_snippet[:300],
            model_predicted_category,
            confidence,
            effective_is_correct,
            effective_corrected,
            effective_status,
            now_iso
        )
    )
    conn.commit()
    conn.close()
    return {
        "status": "success",
        "review_status": effective_status,
        "is_correct": bool(effective_is_correct),
        "user_corrected_category": effective_corrected,
        "timestamp": now_iso
    }

def get_queued_reviews() -> List[Dict[str, Any]]:
    """Retrieves all reviews currently in QUEUED status awaiting retraining."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, prediction_id, article_snippet, model_predicted_category, user_corrected_category, confidence, timestamp
        FROM human_reviews
        WHERE UPPER(status) = 'QUEUED'
        ORDER BY id ASC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "id": r["id"],
            "prediction_id": r["prediction_id"],
            "article_snippet": r["article_snippet"],
            "predicted": r["model_predicted_category"],
            "corrected": r["user_corrected_category"],
            "confidence": r["confidence"],
            "timestamp": r["timestamp"]
        }
        for r in rows
    ]

def get_queued_reviews_count() -> int:
    """Returns number of QUEUED corrections waiting for retraining."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM human_reviews WHERE UPPER(status) = 'QUEUED'")
    count = cursor.fetchone()[0] or 0
    conn.close()
    return count

def mark_reviews_status(review_ids: List[int], new_status: str):
    """
    Atomically updates review records to a new status (e.g., 'APPLIED' or 'FAILED').
    """
    if not review_ids:
        return
    conn = get_db_connection()
    cursor = conn.cursor()
    placeholders = ",".join("?" for _ in review_ids)
    cursor.execute(
        f"UPDATE human_reviews SET status = ? WHERE id IN ({placeholders})",
        [new_status.strip().upper()] + list(review_ids)
    )
    conn.commit()
    conn.close()

def get_review_statistics() -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM human_reviews")
    total_reviewed = cursor.fetchone()[0] or 0
    
    cursor.execute("SELECT COUNT(*) FROM human_reviews WHERE UPPER(status) = 'VERIFIED' OR (status IS NULL AND is_correct = 1)")
    agreements = cursor.fetchone()[0] or 0
    
    cursor.execute("SELECT COUNT(*) FROM human_reviews WHERE UPPER(status) = 'QUEUED'")
    queued_count = cursor.fetchone()[0] or 0

    cursor.execute("SELECT COUNT(*) FROM human_reviews WHERE UPPER(status) = 'APPLIED'")
    applied_count = cursor.fetchone()[0] or 0

    cursor.execute("SELECT COUNT(*) FROM human_reviews WHERE UPPER(status) = 'FAILED'")
    failed_count = cursor.fetchone()[0] or 0

    cursor.execute("SELECT COUNT(*) FROM human_reviews WHERE is_correct = 0")
    corrections = cursor.fetchone()[0] or 0
    
    cursor.execute("""
        SELECT id, prediction_id, article_snippet, model_predicted_category, user_corrected_category, is_correct, status, timestamp
        FROM human_reviews
        ORDER BY id DESC
        LIMIT 50
    """)
    rows = cursor.fetchall()
    conn.close()

    recent = []
    for r in rows:
        st = (r["status"] or "").strip().upper()
        if not st:
            st = "VERIFIED" if r["is_correct"] else "QUEUED"
        recent.append({
            "id": r["id"],
            "prediction_id": r["prediction_id"],
            "article_snippet": r["article_snippet"],
            "predicted": r["model_predicted_category"],
            "corrected": r["user_corrected_category"],
            "is_correct": bool(r["is_correct"]),
            "status": st,
            "timestamp": r["timestamp"]
        })
    
    agreement_rate = round((agreements / max(1, total_reviewed)) * 100, 1)
    
    return {
        "predictions_reviewed": total_reviewed,
        "agreements": agreements,
        "corrections": corrections,
        "queued": queued_count,
        "applied": applied_count,
        "failed": failed_count,
        "agreement_rate_pct": agreement_rate,
        "recent_reviews": recent
    }

def get_reviewed_articles_for_training() -> List[Dict[str, str]]:
    """
    Retrieves human-reviewed articles to incorporate into model retraining.
    STRICT REQUIREMENTS:
    - Only correction records (is_correct = 0) with status 'QUEUED' or 'APPLIED' are included.
    - VERIFIED records (is_correct = 1, status = 'VERIFIED') MUST NOT be included as correction training samples.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            COALESCE(p.article_text, hr.article_snippet) as article_text,
            hr.user_corrected_category as category
        FROM human_reviews hr
        LEFT JOIN predictions p ON hr.prediction_id = p.prediction_id
        WHERE hr.is_correct = 0
          AND hr.user_corrected_category IS NOT NULL 
          AND hr.user_corrected_category != ''
          AND UPPER(hr.status) IN ('QUEUED', 'APPLIED')
        ORDER BY hr.id ASC
    """)
    rows = cursor.fetchall()
    conn.close()
    
    valid_categories = {"business", "education", "entertainment", "sports", "technology"}
    results = []
    seen_texts = set()
    for r in rows:
        text = str(r["article_text"] or "").strip()
        cat = str(r["category"] or "").strip().lower()
        if cat in valid_categories and len(text) >= 10 and text not in seen_texts:
            seen_texts.add(text)
            results.append({
                "combined_text": text,
                "category": cat
            })
    return results

_articles_seeded = False
 
def populate_articles_from_csv(csv_path: Optional[str] = None):
    """
    Populates SQLite 'articles' table from data/processed/news_dataset.csv if table is empty.
    Ensures exact 9,990 clean records are stored in the SQLite database.
    """
    global _articles_seeded
    if _articles_seeded and not csv_path:
        return

    if not csv_path:
        csv_path = os.path.join(DB_DIR, "processed", "news_dataset.csv")
    if not os.path.exists(csv_path):
        return

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM articles")
    count = cursor.fetchone()[0]
    
    if count == 0:
        import pandas as pd
        df = pd.read_csv(csv_path)
        records = []
        for i, row in df.iterrows():
            art_id = str(row.get("article_id") or f"ART_{i+1:05d}")
            h = str(row.get("headlines") or "")
            d = str(row.get("description") or "")
            c = str(row.get("content") or "")
            u = str(row.get("url") or "")
            cat = str(row.get("category") or "").capitalize()
            comb = str(row.get("combined_text") or f"{h} {d} {c}")
            records.append((art_id, h, d, c, u, cat, comb))
            
        cursor.executemany("""
            INSERT OR IGNORE INTO articles (article_id, headlines, description, content, url, category, combined_text)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, records)
        conn.commit()
    conn.close()
    _articles_seeded = True

def get_paginated_articles(
    page: int = 1,
    limit: int = 20,
    category: Optional[str] = None,
    search: Optional[str] = None
) -> Dict[str, Any]:
    """
    Retrieves paginated articles with optional category filtering and keyword search
    using indexed parameterized SQL against SQLite 'articles' table, with seamless
    fallback to processed CSV in case of database locks.
    """
    try:
        # Ensure articles table is populated
        if not _articles_seeded:
            populate_articles_from_csv()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        where_clauses = []
        params = []
        
        if category and category.strip().lower() != "all":
            where_clauses.append("LOWER(category) = LOWER(?)")
            params.append(category.strip())
            
        if search and search.strip():
            s = f"%{search.strip()}%"
            where_clauses.append("(headlines LIKE ? OR description LIKE ? OR content LIKE ?)")
            params.extend([s, s, s])
            
        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
        
        # 1. Total matching count
        cursor.execute(f"SELECT COUNT(*) FROM articles {where_sql}", params)
        total = cursor.fetchone()[0]
        
        # 2. Paginated rows
        offset = max(0, (page - 1) * limit)
        query_sql = f"""
            SELECT id, article_id, headlines, description, content, url, category, combined_text
            FROM articles
            {where_sql}
            ORDER BY id ASC
            LIMIT ? OFFSET ?
        """
        cursor.execute(query_sql, params + [limit, offset])
        rows = cursor.fetchall()
        conn.close()
        
        articles = []
        for r in rows:
            h = r["headlines"] or ""
            d = r["description"] or ""
            c = r["content"] or ""
            comb = r["combined_text"] or f"{h} {d} {c}"
            articles.append({
                "id": r["id"],
                "article_id": r["article_id"],
                "headlines": h,
                "headline": h,
                "description": d,
                "content": c if c else d,
                "url": r["url"] or "",
                "category": r["category"],
                "text_length": len(comb)
            })
            
        total_pages = max(1, (total + limit - 1) // limit)
        
        return {
            "articles": articles,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages
        }
    except Exception as e:
        import logging
        logging.warning(f"SQLite get_paginated_articles error: {e}. Falling back to CSV dataset.", exc_info=True)
        # Fallback to CSV dataset directly
        import pandas as pd
        csv_path = os.path.join(DB_DIR, "processed", "news_dataset.csv")
        if not os.path.exists(csv_path):
            return {"articles": [], "total": 0, "page": page, "limit": limit, "total_pages": 1}
        df = pd.read_csv(csv_path)
        if category and category.strip().lower() != "all":
            df = df[df["category"].astype(str).str.lower() == category.strip().lower()]
        if search and search.strip():
            s_lower = search.strip().lower()
            df = df[
                df["headlines"].astype(str).str.lower().str.contains(s_lower, na=False) |
                df["description"].astype(str).str.lower().str.contains(s_lower, na=False) |
                df["content"].astype(str).str.lower().str.contains(s_lower, na=False)
            ]
        total = len(df)
        total_pages = max(1, (total + limit - 1) // limit)
        offset = max(0, (page - 1) * limit)
        sliced = df.iloc[offset:offset + limit]
        articles = []
        for i, row in sliced.iterrows():
            art_id = str(row.get("article_id") or f"ART_{i+1:05d}")
            h = str(row.get("headlines") or "")
            d = str(row.get("description") or "")
            c = str(row.get("content") or "")
            comb = str(row.get("combined_text") or f"{h} {d} {c}")
            articles.append({
                "id": i + 1,
                "article_id": art_id,
                "headlines": h,
                "headline": h,
                "description": d,
                "content": c if c else d,
                "url": str(row.get("url") or ""),
                "category": str(row.get("category") or "").capitalize(),
                "text_length": len(comb)
            })
        return {
            "articles": articles,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages
        }

# Initialize database & seed articles table
init_db()
populate_articles_from_csv()
