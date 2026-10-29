"""
SQLite database management for prediction history and reference articles.
Persists live article classifications, timestamps, confidence scores, and reference corpus.
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

    # Prevent duplicate records from immediate re-clicks
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

_articles_seeded = False

def populate_articles_from_csv(csv_path: Optional[str] = None):
    """
    Populates SQLite 'articles' table from data/processed/news_dataset.csv if table is empty.
    Ensures 9,990 clean reference records are stored.
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
    from the reference articles database.
    """
    try:
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
        
        cursor.execute(f"SELECT COUNT(*) FROM articles {where_sql}", params)
        total = cursor.fetchone()[0]
        
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
        logging.warning(f"Database query error: {e}. Falling back to CSV.", exc_info=True)
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

init_db()
populate_articles_from_csv()
