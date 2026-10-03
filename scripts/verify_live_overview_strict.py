"""
Strict automated test and audit verification for Live Overview.
Tests all requirements:
1. Baseline stats check (Real predictions, real confidence, real category counts)
2. Refresh consistency test (1 analysis -> exactly +1 record; re-read -> exactly 0 additional records)
3. Duplicate prevention test (repeat identical analysis -> 0 additional records)
4. Source type test (Existing Article, Text, Document, URL)
5. Failure test (invalid input -> 0 records created, error handled)
6. Forbidden source test (Demo/Sample/Test/Mock/Seed/Unknown rejected from live history)
7. Mathematical verification of average confidence
8. Database consistency verification (Single source of truth)
"""
import urllib.request
import urllib.parse
import json
import sqlite3
import os
import sys

BASE_URL = "http://127.0.0.1:8000/api"
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "app.db"))

def http_get(endpoint):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, headers={"User-Agent": "TestClient/1.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.getcode(), json.loads(resp.read().decode())

def http_post(endpoint, data):
    url = f"{BASE_URL}{endpoint}"
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json", "User-Agent": "TestClient/1.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.getcode(), json.loads(resp.read().decode())

def run_tests():
    print("=" * 70)
    print("STRICT LIVE OVERVIEW AUDIT & VERIFICATION SUITE")
    print("=" * 70)

    # 1. BASELINE STATS
    print("\n--- TEST 1: Baseline Health & Live Statistics ---")
    status, health = http_get("/health")
    assert status == 200, f"Health returned {status}"
    assert health["status"] == "healthy", f"Health status not healthy: {health}"
    print(f"[OK] Health: healthy | Best Model: {health['best_model']}")

    status, initial_stats = http_get("/statistics")
    assert status == 200
    base_count = initial_stats["total_live_predictions"]
    base_avg_conf = initial_stats["average_live_confidence"]
    base_cats = initial_stats["live_category_distribution"]
    print(f"[OK] Baseline Live Predictions: {base_count}")
    print(f"[OK] Baseline Avg Confidence: {base_avg_conf:.4f} ({base_avg_conf * 100:.2f}%)")
    print(f"[OK] Baseline Categories: {base_cats}")
    print(f"[OK] Baseline Corpus Size: {initial_stats['total_dataset_articles']} (Expected: 9990)")
    assert initial_stats['total_dataset_articles'] == 9990, "Corpus size mismatch!"

    # 2. MATHEMATICAL & DATABASE CONSISTENCY VERIFICATION
    print("\n--- TEST 2: Mathematical & Single Source of Truth Verification ---")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    db_count, db_avg = c.execute("SELECT COUNT(*), AVG(confidence) FROM predictions WHERE source_type IN ('Existing Article', 'Text', 'Document', 'URL')").fetchone()
    print(f"Database direct count: {db_count} | API total_live_predictions: {base_count}")
    assert db_count == base_count, f"Database count {db_count} != API stats count {base_count}"
    assert abs(db_avg - base_avg_conf) < 0.001, f"Database avg {db_avg} != API avg {base_avg_conf}"
    print(f"[OK] Single Source of Truth verified: Database == API Statistics ({db_count} records)")

    # 3. EXISTING ARTICLE ANALYSIS TEST
    print("\n--- TEST 3: Ingest 1 New Existing Article (Refresh Consistency Test Part 1) ---")
    # Dynamically select an unanalyzed article from the 9,990 corpus
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    unanalyzed = c.execute("""
        SELECT article_id, headlines, content, description, category
        FROM articles
        WHERE headlines NOT IN (SELECT COALESCE(headline, '') FROM predictions)
        LIMIT 1
    """).fetchone()
    conn.close()
    
    sample_art = {
        "article_id": unanalyzed[0],
        "headline": unanalyzed[1],
        "content": unanalyzed[2],
        "description": unanalyzed[3],
        "category": unanalyzed[4]
    }
    print(f"Selected Article: {sample_art['article_id']} | Category: {sample_art['category']} | Headline: {sample_art['headline'][:50]}")

    status, pred_res = http_post("/predict", {
        "text": sample_art["content"] or sample_art["description"],
        "headline": sample_art["headline"],
        "model_name": "best",
        "source_type": "Existing Article"
    })
    assert status == 200
    print(f"[OK] Analysis Completed: ID={pred_res['prediction_id']} | Category={pred_res['predicted_category']} | Conf={pred_res['confidence']:.4f} | Source={pred_res['source_type']}")
    assert pred_res["source_type"] == "Existing Article"

    # Check stats immediately after 1 analysis
    status, new_stats = http_get("/statistics")
    assert new_stats["total_live_predictions"] == base_count + 1, f"Expected {base_count + 1}, got {new_stats['total_live_predictions']}"
    print(f"[OK] Articles Analyzed increased by EXACTLY 1: {base_count} -> {new_stats['total_live_predictions']}")

    # Check recent predictions table has this article as first row
    status, recent_list = http_get("/predictions/recent?limit=5")
    assert recent_list[0]["prediction_id"] == pred_res["prediction_id"], "Newest prediction is not first!"
    assert recent_list[0]["source_type"] == "Existing Article", "Source badge mismatch!"
    print(f"[OK] Recent Live Predictions table has newest article at Index 0 ({recent_list[0]['headline'][:45]})")

    # 4. REFRESH CONSISTENCY TEST PART 2 (Page refresh / Polling must NOT create duplicates)
    print("\n--- TEST 4: Page Refresh & Polling Invariance (NO Duplicates Created) ---")
    for poll_step in range(3):
        status, poll_stats = http_get("/statistics")
        status, poll_recent = http_get("/predictions/recent?limit=10")
        assert poll_stats["total_live_predictions"] == base_count + 1, f"Polling altered count to {poll_stats['total_live_predictions']}"
    print(f"[OK] Polling / Page Refresh invariance verified: count remains EXACTLY {base_count + 1}")

    # 5. DUPLICATE PREVENTION TEST (React re-render / double-click / repeated analysis)
    print("\n--- TEST 5: Duplicate Prevention on Repeated Ingestion ---")
    status, repeat_pred = http_post("/predict", {
        "text": sample_art["content"] or sample_art["description"],
        "headline": sample_art["headline"],
        "model_name": "best",
        "source_type": "Existing Article"
    })
    assert status == 200
    # ID should be identical
    assert repeat_pred["prediction_id"] == pred_res["prediction_id"], f"Expected duplicate to reuse id, got {repeat_pred['prediction_id']}"
    status, after_repeat_stats = http_get("/statistics")
    assert after_repeat_stats["total_live_predictions"] == base_count + 1, "Duplicate was incorrectly inserted into database!"
    print(f"[OK] Duplicate ingestion blocked: Count remains {after_repeat_stats['total_live_predictions']}")

    # 6. SOURCE TYPES VERIFICATION (Text, Document, URL)
    print("\n--- TEST 6: Verify Distinct Source Types (Text, Document, URL) ---")
    # Ingest a Text article
    t_text = "Global central banks and monetary authorities announced new coordination protocols for international liquidity reserves."
    t_head = "Global Monetary Authorities Coordinate Reserve Protocols"
    status, t_pred = http_post("/predict", {
        "text": t_text,
        "headline": t_head,
        "model_name": "best",
        "source_type": "Text"
    })
    assert t_pred["source_type"] == "Text"
    print(f"[OK] Text Source verified: ID={t_pred['prediction_id']} | Source={t_pred['source_type']}")

    # Ingest a Document article
    d_text = "Clinical trial results published in leading medical journal reveal 94% efficacy for novel targeted immunotherapy."
    d_head = "Oncology Clinical Trial Demonstrates High Efficacy Rate"
    status, d_pred = http_post("/predict", {
        "text": d_text,
        "headline": d_head,
        "model_name": "best",
        "source_type": "Document"
    })
    assert d_pred["source_type"] == "Document"
    print(f"[OK] Document Source verified: ID={d_pred['prediction_id']} | Source={d_pred['source_type']}")

    # Ingest a URL article
    u_text = "Autonomous orbital satellites successfully deployed solar sail propulsion systems for deep space exploration mission."
    u_head = "Deep Space Probe Deploys Advanced Solar Sail Propulsion"
    status, u_pred = http_post("/predict", {
        "text": u_text,
        "headline": u_head,
        "model_name": "best",
        "source_type": "URL"
    })
    assert u_pred["source_type"] == "URL"
    print(f"[OK] URL Source verified: ID={u_pred['prediction_id']} | Source={u_pred['source_type']}")

    # 7. FORBIDDEN SOURCE REJECTION TEST
    print("\n--- TEST 7: Forbidden Source Rejection (Demo/Sample/Test/Mock/Seed/Unknown) ---")
    status, cur_stats = http_get("/statistics")
    count_before_forbidden = cur_stats["total_live_predictions"]
    for bad_source in ["Demo", "Sample", "Test", "Mock", "Seed", "Unknown"]:
        http_post("/predict", {
            "text": f"This is a dummy test article for testing forbidden source filtering mechanism for {bad_source}.",
            "headline": f"Mock Headline {bad_source}",
            "model_name": "best",
            "source_type": bad_source
        })
    status, after_forbidden_stats = http_get("/statistics")
    assert after_forbidden_stats["total_live_predictions"] == count_before_forbidden, "Forbidden source was saved to live analytics!"
    print(f"[OK] All forbidden sources (Demo, Sample, Test, Mock, Seed, Unknown) rejected from live analytics! Count remained {count_before_forbidden}")

    # 8. FAILURE TEST
    print("\n--- TEST 8: Failure Handling (Failed predictions do not count) ---")
    try:
        http_post("/predict", {"text": "hi", "headline": "", "model_name": "best"})
        assert False, "Should have failed on short text"
    except urllib.error.HTTPError as e:
        assert e.code in (400, 422), f"Expected 400 or 422, got {e.code}"
        print(f"[OK] Failed prediction returned HTTP {e.code} as expected")

    status, fail_stats = http_get("/statistics")
    assert fail_stats["total_live_predictions"] == count_before_forbidden, "Failed prediction incremented live count!"
    print(f"[OK] Failed prediction did not increment Articles Analyzed ({fail_stats['total_live_predictions']})")

    # Final DB audit
    status, final_stats = http_get("/statistics")
    final_avg = final_stats["average_live_confidence"]
    print("\n=======================================================")
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print(f"Final Live Predictions Count: {final_stats['total_live_predictions']}")
    print(f"Final Average Confidence:     {final_avg:.4f} ({final_avg * 100:.2f}%)")
    print(f"Final Category Distribution:  {final_stats['live_category_distribution']}")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()
