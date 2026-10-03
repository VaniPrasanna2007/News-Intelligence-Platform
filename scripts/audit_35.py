import sqlite3

conn = sqlite3.connect('data/app.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

all_rows = c.execute('SELECT * FROM predictions ORDER BY id ASC').fetchall()
unique_texts = {}
for r in all_rows:
    t = r['article_text'].strip()
    unique_texts[t] = r

cleaned = []
for t, r in unique_texts.items():
    lower_t = t.lower()
    if 'moby-dick' in lower_t or ('company reports strong financial earnings' in lower_t and len(t) < 150):
        continue
    cleaned.append(r)

print(f"Total valid unique news articles: {len(cleaned)}")
for i, r in enumerate(cleaned, 1):
    h = (r['headline'] or r['article_text'].split('\n')[0][:80]).strip()
    st = r['source_type']
    cat = r['predicted_category']
    conf = r['confidence']
    print(f"{i:2d}. [ID {r['id']:3d}] [{str(st):16s}] [{str(cat):13s}] Conf={conf:.4f} | {h[:60]}")
