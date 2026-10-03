import os
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"
FRONTEND_URL = "http://127.0.0.1:5173"
BUSINESS_DOCX = r"C:\Users\srivi\Downloads\Business_Test_Article.docx"
TECH_DOCX = r"C:\Users\srivi\Downloads\Technology_Test_Article.docx"

def run_four_mode_tests():
    print("=" * 75)
    print("RUNNING FINAL COMMAND CENTER 4-MODE VERIFICATION")
    print("=" * 75)

    # 0. Check web services
    print("\n>>> 0. Verifying Health of Services")
    r_front = requests.get(FRONTEND_URL)
    assert r_front.status_code == 200, f"Frontend failed: {r_front.status_code}"
    print(f"  [PASS] Frontend is running on {FRONTEND_URL}")

    r_health = requests.get(f"{BASE_URL}/health")
    assert r_health.status_code == 200, f"Backend failed: {r_health.status_code}"
    print(f"  [PASS] Backend is running on port 8000: {r_health.json()['status']}")

    # -------------------------------------------------------------
    # TEST 1: TEXT ARTICLE INPUT
    # -------------------------------------------------------------
    print("\n>>> TEST 1: Mode 1 — Text Article Input")
    text_payload = {
        "headline": "Federal Reserve Holds Benchmark Rate Steady Following Policy Meeting",
        "text": "The Federal Reserve concluded its two-day monetary policy meeting by deciding to keep its key interest rate unchanged. Central bankers noted that economic indicators remain robust, with healthy payroll gains and resilient consumer spending, while inflation continues to trend down toward the target rate.",
        "model_name": "best"
    }
    r1 = requests.post(f"{BASE_URL}/predict", json=text_payload)
    assert r1.status_code == 200, f"Mode 1 predict failed: {r1.text}"
    res1 = r1.json()
    print(f"  [PASS] Mode 1 Predicted Category: {res1.get('predicted_category')} (Confidence: {res1.get('confidence')})")
    print(f"         Contributing Keywords: {res1.get('contributing_words')}")
    assert res1.get("predicted_category") == "Business"
    assert res1.get("confidence") > 0.5

    # -------------------------------------------------------------
    # TEST 2: DOCUMENT INPUT (DOCX)
    # -------------------------------------------------------------
    print("\n>>> TEST 2: Mode 2 — Document Upload & Intelligence Analysis")
    assert os.path.exists(BUSINESS_DOCX), f"Missing: {BUSINESS_DOCX}"
    
    # Step 2a: Extract Preview (No prediction before Run)
    with open(BUSINESS_DOCX, "rb") as f:
        r2_ext = requests.post(
            f"{BASE_URL}/extract",
            files={"file": ("Business_Test_Article.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        )
    assert r2_ext.status_code == 200, f"Mode 2 extract failed: {r2_ext.text}"
    doc_data = r2_ext.json()
    print(f"  [PASS] Document Extracted: '{doc_data.get('filename')}' ({doc_data.get('file_type')})")
    print(f"         Extracted Headline: '{doc_data.get('headline')}'")
    print(f"         Extracted Text Length: {doc_data.get('char_count')} chars")
    assert "predicted_category" not in doc_data, "Extract endpoint must NOT return predicted category!"

    # Step 2b: Run Analysis on extracted text
    r2_pred = requests.post(f"{BASE_URL}/predict", json={
        "text": doc_data["text"],
        "headline": doc_data["headline"],
        "model_name": "best"
    })
    assert r2_pred.status_code == 200, f"Mode 2 predict failed: {r2_pred.text}"
    res2 = r2_pred.json()
    print(f"  [PASS] Document Predicted Category: {res2.get('predicted_category')} (Confidence: {res2.get('confidence')})")
    print(f"         Contributing Keywords: {res2.get('contributing_words')}")
    assert res2.get("predicted_category") == "Business", f"Expected Business, got {res2.get('predicted_category')}"

    # -------------------------------------------------------------
    # TEST 3: URL INPUT
    # -------------------------------------------------------------
    print("\n>>> TEST 3: Mode 3 — URL Article Fetch & Analysis")
    test_url = "https://httpbin.org/html"
    r3_fetch = requests.post(f"{BASE_URL}/extract", data={"url": test_url})
    assert r3_fetch.status_code == 200, f"Mode 3 URL fetch failed: {r3_fetch.text}"
    url_data = r3_fetch.json()
    print(f"  [PASS] URL Fetched: '{url_data.get('url')}'")
    print(f"         Headline: '{url_data.get('headline')}'")
    print(f"         Content Length: {url_data.get('char_count')} chars")
    assert "predicted_category" not in url_data, "Fetch endpoint must NOT return predicted category!"

    # Run Analysis on fetched URL content
    r3_pred = requests.post(f"{BASE_URL}/predict", json={
        "text": url_data["text"],
        "headline": url_data["headline"],
        "model_name": "best"
    })
    assert r3_pred.status_code == 200, f"Mode 3 predict failed: {r3_pred.text}"
    res3 = r3_pred.json()
    print(f"  [PASS] URL Predicted Category: {res3.get('predicted_category')} (Confidence: {res3.get('confidence')})")

    # -------------------------------------------------------------
    # TEST 4: EXISTING ARTICLE (9,990 CORPUS DATABASE)
    # -------------------------------------------------------------
    print("\n>>> TEST 4: Mode 4 — Existing Database Article Browser & Evaluation")
    
    # 4a: Browse paginated articles from database
    r4_browse = requests.get(f"{BASE_URL}/dataset/articles?page=1&limit=5&category=technology")
    assert r4_browse.status_code == 200, f"Browse articles failed: {r4_browse.text}"
    browse_data = r4_browse.json()
    total_articles = browse_data.get("total", 0)
    print(f"  [PASS] Retrieved paginated articles (Total corpus matches: {total_articles})")
    assert total_articles > 0, "Corpus must have articles"
    
    selected_art = browse_data["articles"][0]
    print(f"  [PASS] Selected Article from Database:")
    print(f"         Article ID: {selected_art.get('article_id')}")
    print(f"         Headline: {selected_art.get('headline')[:60]}...")
    print(f"         Dataset Category: {selected_art.get('category')}")
    print(f"         Content Length: {len(selected_art.get('content', ''))} chars")

    # 4b: Analyze Existing Article through the SAME NLP Pipeline
    content_to_test = selected_art.get("content") or selected_art.get("description")
    r4_pred = requests.post(f"{BASE_URL}/predict", json={
        "text": content_to_test,
        "headline": selected_art.get("headline"),
        "model_name": "best"
    })
    assert r4_pred.status_code == 200, f"Analyze existing article failed: {r4_pred.text}"
    res4 = r4_pred.json()
    
    model_cat = res4.get("predicted_category")
    dataset_cat = selected_art.get("category")
    is_match = model_cat.lower() == dataset_cat.lower()
    
    print(f"  [PASS] Existing Article Evaluation:")
    print(f"         DATASET CATEGORY: {dataset_cat}")
    print(f"         MODEL PREDICTION: {model_cat}")
    print(f"         CONFIDENCE:       {(res4.get('confidence') * 100):.2f}%")
    print(f"         MATCH STATUS:     {'[MATCH] Prediction matches dataset label' if is_match else '[DIFFER] Prediction differs from dataset label'}")
    print(f"         Contributing Keywords: {res4.get('contributing_words')}")

    print("\n" + "=" * 75)
    print("ALL 4 COMMAND CENTER INPUT MODES VERIFIED SUCCESSFULLY!")
    print("=" * 75)

if __name__ == "__main__":
    run_four_mode_tests()
