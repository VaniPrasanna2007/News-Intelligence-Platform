import json

with open('reports/coverage_gaps.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for c in data['subtopic_representation']:
    cnt = c['article_count']
    pct = c['representation_percentage']
    cat = c['dominant_category']
    coh = c['coherence_score']
    print(f"ID {c['cluster_id']:2d} | Count: {cnt:4d} ({pct:5.2f}%) | Cat: {cat:13s} | Coherence: {coh:4.1f}/100 ({c['coherence_grade']})")
    print(f"   Terms: {', '.join(c['top_terms'][:6])}")
    for h in c['sample_headlines'][:2]:
        print(f"   - {h[:75]}")
