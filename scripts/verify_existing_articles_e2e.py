"""
End-to-End Verification of Existing Articles API, CORS, Database Query, and NLP Pipeline.
Tests:
1. Vite dev server proxy: GET http://localhost:5173/api/articles?page=1&limit=20
2. Backend direct with CORS: GET http://127.0.0.1:8000/api/articles?page=1&limit=20 with Origin http://localhost:5173
3. All 5 canonical categories: Business, Education, Entertainment, Sports, Technology
4. Search functionality with keyword query
5. Pagination: Page 1, Page 2, Page total calculation
6. Pipeline Execution: [ ANALYZE ARTICLE ] feeding real content to /api/predict
"""
import urllib.request
import json
import sys

def run_tests():
    print("=" * 70)
    print("STEP 1: TESTING VITE PROXY (http://localhost:5173/api/articles)")
    print("=" * 70)
    try:
        req = urllib.request.Request("http://localhost:5173/api/articles?page=1&limit=20")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"[OK] Vite Proxy Status: {resp.status}")
            print(f"     Total Articles:    {data.get('total')}")
            print(f"     Page Limit:        {data.get('limit')}")
            print(f"     Articles Returned: {len(data.get('articles', []))}")
            print(f"     Total Pages:       {data.get('total_pages')}")
            first_art = data['articles'][0]
            print(f"     Sample Article:    ID={first_art.get('article_id')}, Category={first_art.get('category')}")
            print(f"     Headline:          {first_art.get('headline')[:60]}...")
            assert data.get('total') == 9990, f"Expected 9990, got {data.get('total')}"
            assert len(data.get('articles', [])) == 20, f"Expected 20, got {len(data.get('articles', []))}"
    except Exception as e:
        print(f"[FAIL] Vite proxy test failed: {e}")
        return False

    print("\n" + "=" * 70)
    print("STEP 2: TESTING BACKEND DIRECT WITH CORS (http://127.0.0.1:8000)")
    print("=" * 70)
    try:
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/articles?page=1&limit=20",
            headers={"Origin": "http://localhost:5173"}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            cors_origin = resp.headers.get("Access-Control-Allow-Origin")
            cors_cred = resp.headers.get("Access-Control-Allow-Credentials")
            print(f"[OK] Backend Direct Status: {resp.status}")
            print(f"     Access-Control-Allow-Origin:      {cors_origin}")
            print(f"     Access-Control-Allow-Credentials: {cors_cred}")
            # Ensure it does NOT return wildcard '*' when credentials are true
            assert cors_origin != "*", "CORS specification violation: origin cannot be wildcard '*' with credentials!"
            assert "localhost:5173" in cors_origin, f"Expected localhost:5173 in allow-origin, got {cors_origin}"
    except Exception as e:
        print(f"[FAIL] Backend CORS test failed: {e}")
        return False

    print("\n" + "=" * 70)
    print("STEP 3: TESTING ALL 5 CANONICAL CATEGORIES (20 ARTICLES EACH)")
    print("=" * 70)
    categories = ["Business", "Education", "Entertainment", "Sports", "Technology"]
    for cat in categories:
        url = f"http://127.0.0.1:8000/api/articles?category={cat}&page=1&limit=20"
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            count = len(data.get("articles", []))
            total = data.get("total")
            sample_cat = data["articles"][0]["category"]
            print(f"  [OK] Category '{cat}': Total={total}, Returned={count}, Sample Category={sample_cat}")
            assert count == 20, f"Expected 20 articles for {cat}, got {count}"
            assert sample_cat.lower() == cat.lower(), f"Mismatch in category: {sample_cat} vs {cat}"

    print("\n" + "=" * 70)
    print("STEP 4: TESTING SEARCH AND PAGINATION")
    print("=" * 70)
    # Search
    search_url = "http://127.0.0.1:8000/api/articles?search=market&page=1&limit=20"
    with urllib.request.urlopen(search_url, timeout=5) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print(f"  [OK] Search 'market': Total={data.get('total')}, Returned={len(data.get('articles', []))}")
        assert len(data.get("articles", [])) == 20
    # Pagination Page 2
    page2_url = "http://127.0.0.1:8000/api/articles?page=2&limit=20"
    with urllib.request.urlopen(page2_url, timeout=5) as resp:
        data2 = json.loads(resp.read().decode("utf-8"))
        print(f"  [OK] Page 2: Total={data2.get('total')}, Page={data2.get('page')}, Returned={len(data2.get('articles', []))}")
        assert data2.get("page") == 2
        assert len(data2.get("articles", [])) == 20

    print("\n" + "=" * 70)
    print("STEP 5: TESTING [ ANALYZE ARTICLE ] VIA NLP PREDICTION PIPELINE")
    print("=" * 70)
    # Pick a real article from Technology
    tech_url = "http://127.0.0.1:8000/api/articles?category=Technology&page=1&limit=5"
    with urllib.request.urlopen(tech_url, timeout=5) as resp:
        tech_data = json.loads(resp.read().decode("utf-8"))
        test_art = tech_data["articles"][0]
        
    print(f"  Target Article ID:       {test_art.get('article_id')}")
    print(f"  Dataset Category:        {test_art.get('category')}")
    print(f"  Headline:                {test_art.get('headline')[:70]}...")
    
    # Send to /api/predict
    pred_req = urllib.request.Request(
        "http://127.0.0.1:8000/api/predict",
        data=json.dumps({
            "text": test_art.get("content") or test_art.get("description"),
            "headline": test_art.get("headline"),
            "model_name": "best"
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(pred_req, timeout=10) as resp:
        pred_res = json.loads(resp.read().decode("utf-8"))
        print(f"  [OK] Prediction Result:")
        print(f"       Model Used:         {pred_res.get('model_used')}")
        print(f"       Predicted Category: {pred_res.get('predicted_category')}")
        print(f"       Confidence:         {pred_res.get('confidence'):.4f} ({pred_res.get('confidence')*100:.2f}%)")
        print(f"       All Probabilities:  {pred_res.get('probabilities')}")
        print(f"       News DNA Present:   {bool(pred_res.get('news_dna'))}")
        print(f"       Dataset Category:   {test_art.get('category')}")
        match = test_art.get('category').lower() == pred_res.get('predicted_category').lower()
        print(f"       Match Status:       {'[MATCH] Prediction matches dataset label' if match else '[DIFFERS] Prediction differs from dataset label'}")

    print("\n" + "=" * 70)
    print("ALL 5 VERIFICATION SUITES PASSED SUCCESSFULLY (100% OPERATIONAL)!")
    print("=" * 70)
    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
