"""
Deduplicates and cleans predictions table in data/app.db.
- Retains only unique real news articles (keeps newest record per unique article text).
- Removes duplicate rows caused by repetitive test script runs.
- Removes synthetic/mock test snippets.
- Ensures all records have proper headlines and valid source_type.
"""
import sqlite3
import os

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "app.db"))

def clean_database():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    total_before = cursor.execute("SELECT COUNT(*) FROM predictions").fetchone()[0]
    print(f"Total predictions before cleaning: {total_before}")
    
    # 1. Identify rows to keep: newest row per trimmed article_text
    all_rows = cursor.execute("SELECT * FROM predictions ORDER BY id ASC").fetchall()
    
    unique_map = {}
    for r in all_rows:
        t = r["article_text"].strip()
        unique_map[t] = r # Latest row overwrites earlier
        
    print(f"Unique article texts: {len(unique_map)}")
    
    # 2. Filter out non-news/fake/mock test snippets
    to_keep = []
    excluded = []
    for t, r in unique_map.items():
        lower_t = t.lower()
        if "moby-dick" in lower_t:
            excluded.append((r["id"], "Moby-Dick test snippet"))
            continue
        if "company reports strong financial earnings" in lower_t and len(t) < 150:
            excluded.append((r["id"], "Synthetic financial test snippet"))
            continue
        to_keep.append(r)
        
    print(f"Excluded mock/test rows ({len(excluded)}): {excluded}")
    print(f"Valid unique news records to retain: {len(to_keep)}")
    
    keep_ids = set(r["id"] for r in to_keep)
    
    # Delete rows not in keep_ids
    cursor.execute(f"DELETE FROM predictions WHERE id NOT IN ({','.join(str(i) for i in keep_ids)})")
    conn.commit()
    
    # 3. Fix missing headlines and source types for remaining rows
    for r in to_keep:
        row_id = r["id"]
        headline = (r["headline"] or "").strip()
        source_type = (r["source_type"] or "Text").strip()
        
        # Populate headline from first line if missing
        if not headline:
            first_line = r["article_text"].split("\n")[0].strip()
            headline = first_line[:120] if len(first_line) > 5 else "Untitled Article"
            
        # Ensure canonical source_type
        if source_type.lower() in ("existing article", "existing", "corpus", "database"):
            source_type = "Existing Article"
        elif source_type.lower() in ("document", "file", "docx", "pdf", "txt"):
            source_type = "Document"
        elif source_type.lower() in ("url", "link", "web"):
            source_type = "URL"
        else:
            source_type = "Text"
            
        cursor.execute(
            "UPDATE predictions SET headline = ?, source_type = ? WHERE id = ?",
            (headline, source_type, row_id)
        )
        
    conn.commit()
    
    # 4. Verify results
    total_after = cursor.execute("SELECT COUNT(*) FROM predictions").fetchone()[0]
    avg_conf = cursor.execute("SELECT AVG(confidence) FROM predictions").fetchone()[0]
    cats = cursor.execute("SELECT predicted_category, COUNT(*) FROM predictions GROUP BY predicted_category").fetchall()
    sources = cursor.execute("SELECT source_type, COUNT(*) FROM predictions GROUP BY source_type").fetchall()
    
    print(f"\n--- Cleaned Database Verification ---")
    print(f"Total predictions after cleaning: {total_after}")
    print(f"Average confidence: {avg_conf:.4f} ({avg_conf * 100:.2f}%)")
    print(f"Categories: {dict(cats)}")
    print(f"Sources: {dict(sources)}")
    
    conn.close()

if __name__ == "__main__":
    clean_database()
