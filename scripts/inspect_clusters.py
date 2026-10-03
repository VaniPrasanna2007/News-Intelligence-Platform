import json

with open('reports/coverage_gaps.json', 'r', encoding='utf-8') as f:
    gaps = json.load(f)

clusters = gaps['subtopic_representation']
print(f"Total clusters: {len(clusters)}")
for c in clusters:
    cnt = c['article_count']
    pct = c['representation_percentage']
    cat = c['dominant_category']
    lbl = c['topic_label']
    print(f"ID {c['cluster_id']:2d} | Count: {cnt:4d} ({pct:5.2f}%) | Cat: {cat:13s} | Label: {lbl}")
