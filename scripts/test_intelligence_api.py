import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000/api"

def get(endpoint):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))

def post(endpoint, data):
    url = f"{BASE_URL}{endpoint}"
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("Testing AI News Intelligence Platform Endpoints...\n")

    # 1. Health
    health = get("/health")
    print("[1] Health check:", health)
    assert health["status"] == "healthy"

    # 2. Source Analysis
    sources = get("/source-analysis")
    print(f"[2] Source analysis: {len(sources.get('sources', []))} domains found. Primary: {sources['sources'][0]['domain']}")

    # 3. Coverage Gaps
    gaps = get("/coverage-gaps")
    print(f"[3] Coverage gaps: {len(gaps.get('subtopic_representation', []))} subtopic clusters.")

    # 4. Category Constellation
    constellation = get("/category-constellation")
    print(f"[4] Category constellation nodes: {list(constellation.keys())}")

    # 5. Predict with News DNA
    sample_article = {
        "headline": "Nvidia launches next-gen Blackwell AI chips with record GPU performance",
        "text": "Nvidia CEO Jensen Huang unveiled the new Blackwell architecture GPU designed for training massive frontier artificial intelligence models in cloud hyperscale data centers. Major tech giants including Microsoft, Google, and Amazon have placed multi-billion dollar orders for the new tensor processor units."
    }
    pred = post("/predict", sample_article)
    print(f"[5] Predict & DNA: Category={pred['predicted_category']}, Confidence={pred['confidence']}")
    assert pred["news_dna"] is not None
    dna = pred["news_dna"]
    print(f"    - Novelty score: {dna['novelty']['score']} ({dna['novelty']['level']})")
    print(f"    - Extracted entities: {dna['entities']}")
    print(f"    - Headline alignment: {dna['headline_alignment']['alignment_percentage']}%")
    print(f"    - Top signals: {[s['term'] for s in dna['classification_signals'][:4]]}")
    print(f"    - Related corpus stories: {len(dna['related_articles'])} matches")
    print(f"    - Story cluster graph: {dna['story_cluster']['node_count']} nodes, {dna['story_cluster']['edge_count']} edges")

    # 6. Similarity Search
    sim_res = post("/similarity", {"text": "Lionel Messi scores championship winning goal for Inter Miami in MLS final", "top_k": 5})
    print(f"[6] Similarity search: Found {len(sim_res['top_matches'])} matches. Top match: {sim_res['top_matches'][0]['headline']} (similarity: {sim_res['top_matches'][0]['similarity_pct']}%)")

    # 7. Novelty Check
    nov_res = post("/novelty", {"text": "Astrophysicists detect gravitational waves from neutron star collision in deep space"})
    print(f"[7] Novelty check: {nov_res['score']}/100 - {nov_res['label']}")

    # 8. Article Profile
    profile = post("/article-profile", {"text": sample_article["text"], "headline": sample_article["headline"]})
    print(f"[8] Article profile: {profile['length_profile']}, Vocab diversity: {profile['vocabulary_diversity']}, Word count: {profile['word_count']}")

    # 9. Headline Alignment
    align = post("/headline-alignment", {"headline": "AI Revolutionizes Medicine", "body": "Doctors use AI to discover new antibiotics and speed clinical trials."})
    print(f"[9] Headline alignment: {align['alignment_percentage']}% - {align['explanation']}")

    # 10. Human Review Loop
    review_submission = {
        "prediction_id": pred["prediction_id"],
        "article_snippet": sample_article["text"][:100],
        "model_predicted_category": pred["predicted_category"],
        "confidence": pred["confidence"],
        "is_correct": True,
        "user_corrected_category": None
    }
    rev_res = post("/review", review_submission)
    print(f"[10] Review submission: {rev_res['status']}")

    # 11. Review Stats
    rev_stats = get("/review/stats")
    print(f"[11] Review stats: Reviewed={rev_stats['predictions_reviewed']}, Agreements={rev_stats['agreements']}, Agreement Rate={rev_stats['agreement_rate_pct']}%")

    print("\nALL INTELLIGENCE ENDPOINTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
