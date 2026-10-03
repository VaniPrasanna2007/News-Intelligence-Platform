import sqlite3

conn = sqlite3.connect('data/app.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()
rows = c.execute("""
    SELECT MIN(id) as first_id, MAX(id) as last_id, COUNT(*) as cnt, 
           predicted_category, confidence, model_used, source_type, headline, article_text
    FROM predictions 
    GROUP BY TRIM(article_text) 
    ORDER BY first_id ASC
""").fetchall()

print(f"Total unique article texts: {len(rows)}")
for i, r in enumerate(rows, 1):
    h = (r['headline'] or r['article_text'].split('\n')[0][:80]).strip()
    st = r['source_type']
    cat = r['predicted_category']
    conf = r['confidence']
    cnt = r['cnt']
    print(f"{i:2d}. [IDs {r['first_id']:3d}-{r['last_id']:3d}, n={cnt:2d}] [{str(st):16s}] [{str(cat):13s}] Conf={conf:.4f} | {h[:70]}")
