"""
End-to-end verification script for AI News Intelligence Platform.
Tests all 12 intelligence features across backend API and precomputed indices.
"""
import requests
import json
import os

BASE_URL = "http://127.0.0.1:8000/api"

def test_health():
    print("\n--- 1. Testing Backend Health ---")
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    data = r.json()
    print(f"Status: {data['status']}, Models loaded: {data['models_loaded']}, Best model: {data.get('best_model')}")
    assert data['status'] == "healthy"

def test_news_dna_and_intelligence():
    print("\n--- 2. Testing News DNA & Full Intelligence Pipeline ---")
    payload = {
        "headline": "Nvidia unveils next-generation Blackwell GPUs for AI model training and data center acceleration",
        "text": "Nvidia CEO Jensen Huang announced the new Blackwell B200 GPU architecture designed to accelerate massive artificial intelligence and deep learning workloads in enterprise cloud datacenters. The processor features 208 billion transistors and delivers unprecedented computing speed for training large language models while reducing energy consumption significantly.",
        "source_url": "https://indianexpress.com/article/technology/artificial-intelligence/nvidia-blackwell-gpu-ai/",
        "model_name": "best"
    }

    # 1. Test POST /api/predict
    r_pred = requests.post(f"{BASE_URL}/predict", json={"text": payload["text"], "headline": payload["headline"], "model_name": payload["model_name"]})
    assert r_pred.status_code == 200, f"Predict failed: {r_pred.text}"
    pred_res = r_pred.json()

    print(f"Predicted Category: {pred_res['predicted_category']} (Confidence: {pred_res['confidence']:.2%})")
    assert pred_res['predicted_category'] == "Technology", f"Expected Technology, got {pred_res['predicted_category']}"
    assert "news_dna" in pred_res, "Expected news_dna in predict response"

    dna = pred_res['news_dna']
    print(f"News DNA Fingerprint:")
    print(f"  - Vocabulary Diversity (TTR): {dna['article_structure']['vocabulary_diversity']:.2f}")
    print(f"  - Entity Density: {dna['article_structure']['entity_density_per_100_words']:.2f} per 100 words")
    print(f"  - Headline Alignment: {dna['headline_alignment']['alignment_percentage']:.1f}%")
    print(f"  - Novelty Score: {dna['novelty']['score']:.1f}/100")
    print(f"  - Top Classification Signals: {[s['term'] for s in dna['classification_signals'][:4]]}")

    # Verify Story Cluster Graph
    clusters = dna['story_cluster']
    print(f"Story Cluster Graph: {len(clusters['nodes'])} nodes, {len(clusters['edges'])} edges")
    assert len(clusters['nodes']) >= 2, "Expected at least query node + 1 match"

    # Verify Claim Comparison
    claims = dna['claim_comparisons']
    print(f"Claim Comparison: {len(claims)} comparison pairs generated")

    # 2. Test POST /api/news-dna with source_url
    r_dna = requests.post(f"{BASE_URL}/news-dna", json=payload)
    assert r_dna.status_code == 200, f"News DNA route failed: {r_dna.text}"
    dna_res = r_dna.json()
    assert dna_res.get("domain") == "indianexpress.com"
    print(f"Direct News DNA Endpoint domain: {dna_res.get('domain')}")

    return pred_res

def test_novelty_gauge():
    print("\n--- 3. Testing Novelty Gauge ---")
    # Highly novel text
    novel_payload = {
        "text": "Extraterrestrial quantum tachyons detected orbiting Andromeda galaxy utilizing zero-point neutrino telescopics."
    }
    r = requests.post(f"{BASE_URL}/novelty", json=novel_payload)
    assert r.status_code == 200
    nov_res = r.json()
    print(f"Novelty Score: {nov_res['score']:.1f}/100 ({nov_res['level']})")
    print(f"Interpretation: {nov_res['label']}")
    print(f"Disclaimer: {nov_res['disclaimer']}")
    assert nov_res['score'] > 70.0, "Expected high novelty for unrelated synthetic query"

def test_human_review_loop():
    print("\n--- 4. Testing Human Correction & Review Loop ---")
    # Fetch initial stats
    r_stats_before = requests.get(f"{BASE_URL}/review/stats")
    stats_before = r_stats_before.json()
    init_total = stats_before['predictions_reviewed']
    print(f"Initial Review Count: {init_total}")

    # Submit agreement review
    review_payload = {
        "prediction_id": "test-eval-uuid-001",
        "article_snippet": "Google DeepMind announced new reasoning capabilities for Gemini models...",
        "model_predicted_category": "Technology",
        "confidence": 0.985,
        "is_correct": True,
        "user_corrected_category": None
    }
    r_rev = requests.post(f"{BASE_URL}/review", json=review_payload)
    assert r_rev.status_code == 200, f"Submit review failed: {r_rev.text}"

    # Submit correction review
    correct_payload = {
        "prediction_id": "test-eval-uuid-002",
        "article_snippet": "The Reserve Bank of India reduced the benchmark repo rate...",
        "model_predicted_category": "Technology",
        "confidence": 0.52,
        "is_correct": False,
        "user_corrected_category": "Business"
    }
    r_corr = requests.post(f"{BASE_URL}/review", json=correct_payload)
    assert r_corr.status_code == 200

    # Fetch updated stats
    r_stats_after = requests.get(f"{BASE_URL}/review/stats")
    stats_after = r_stats_after.json()
    print(f"Updated Total Reviews: {stats_after['predictions_reviewed']}, Agreement Rate: {stats_after['agreement_rate_pct']:.1f}%")
    assert stats_after['predictions_reviewed'] == init_total + 2

def test_file_upload():
    print("\n--- 5. Testing Multi-Modal File Upload ---")
    test_txt_path = "scripts/test_upload.txt"
    with open(test_txt_path, "w", encoding="utf-8") as f:
        f.write("Virat Kohli scores another century in thrilling cricket test match against England at Lord's cricket ground.")

    with open(test_txt_path, "rb") as f:
        files = {"file": ("test_upload.txt", f, "text/plain")}
        r = requests.post(f"{BASE_URL}/predict/file", files=files)
    assert r.status_code == 200, f"File upload failed: {r.text}"
    res = r.json()
    print(f"File Upload Predicted: {res['predicted_category']} (Confidence: {res['confidence']:.2%})")
    assert res['predicted_category'] == "Sports"
    assert "news_dna" in res

    if os.path.exists(test_txt_path):
        os.remove(test_txt_path)

def test_telemetry_endpoints():
    print("\n--- 6. Testing Telemetry & Knowledge Graph Endpoints ---")
    r1 = requests.get(f"{BASE_URL}/coverage-gaps")
    assert r1.status_code == 200
    cov = r1.json()
    print(f"Coverage Gaps: {len(cov['subtopic_representation'])} subtopics, {len(cov['category_coverage'])} categories")

    r2 = requests.get(f"{BASE_URL}/source-analysis")
    assert r2.status_code == 200
    src = r2.json()
    print(f"Source Analysis: {len(src['sources'])} source domain records")

    r3 = requests.get(f"{BASE_URL}/category-constellation")
    assert r3.status_code == 200
    const = r3.json()
    cats = list(const.keys())
    print(f"Constellation: {len(cats)} central categories: {cats}")
    assert set(cats) == {"Business", "Education", "Entertainment", "Sports", "Technology"}

if __name__ == "__main__":
    test_health()
    test_news_dna_and_intelligence()
    test_novelty_gauge()
    test_human_review_loop()
    test_file_upload()
    test_telemetry_endpoints()
    print("\n=======================================================")
    print("ALL 6 END-TO-END VERIFICATION SUITES PASSED SUCCESSFULLY")
    print("=======================================================")
