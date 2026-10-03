import sqlite3

conn = sqlite3.connect('data/app.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

rows = c.execute("""
    SELECT p.* FROM predictions p
    INNER JOIN (
        SELECT MAX(id) as max_id
        FROM predictions
        GROUP BY TRIM(article_text)
    ) latest ON p.id = latest.max_id
    ORDER BY p.id ASC
""").fetchall()

print(f"Total distinct articles: {len(rows)}")
for r in rows:
    first_line = (r['headline'] or r['article_text'].split('\n')[0]).strip()
    print(f"ID {r['id']:3d} | [{str(r['source_type']):16s}] | [{str(r['predicted_category']):13s}] | Conf={r['confidence']:.4f} | {first_line[:70]}")
