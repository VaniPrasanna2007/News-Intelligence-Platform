import requests
import json

BASE_BACKEND = "http://127.0.0.1:8000/api"
BASE_FRONTEND = "http://127.0.0.1:5173"

def test_platform():
    print("=" * 70)
    print("RUNNING VERIFICATION: TEXT & URL INTELLIGENCE PLATFORM")
    print("=" * 70)

    # 1. Check Frontend Availability
    print(">>> 1. Verifying Frontend Web Server")
    r_front = requests.get(BASE_FRONTEND)
    assert r_front.status_code == 200, f"Frontend failed: {r_front.status_code}"
    assert "News Category Classification" in r_front.text or "root" in r_front.text
    print(f"  [PASS] Frontend is running on {BASE_FRONTEND} (HTTP 200 OK)")

    # 2. Check Backend Health
    print("\n>>> 2. Verifying Backend API Server")
    r_health = requests.get(f"{BASE_BACKEND}/health")
    assert r_health.status_code == 200, f"Health check failed: {r_health.status_code}"
    health_json = r_health.json()
    assert health_json.get("status") == "healthy"
    print(f"  [PASS] Backend is running on port 8000: {health_json}")

    # 3. Test Text Article Input Classification
    print("\n>>> 3. Verifying Text Article Input & Intelligence Pipeline")
    test_articles = [
        {
            "category": "Business",
            "headline": "Federal Reserve Signals Interest Rate Stability Amid Economic Growth",
            "text": "Wall Street closed sharply higher today following the Federal Reserve's announcement of declining inflation rates and lower treasury yields. Major indices including the S&P 500 and Dow Jones recorded steep gains, driven by a rally in retail banking, debt securities, and enterprise manufacturing stocks across domestic markets."
        },
        {
            "category": "Technology",
            "headline": "Semiconductor Consortium Demonstrates Scalable Quantum Processor Unit",
            "text": "Leading semiconductor designers AMD and Nvidia announced breakthrough silicon architectures engineered for hyperscale data centers. The high-bandwidth tensor accelerators deliver fourfold improvements in inference throughput while reducing cooling energy demands."
        }
    ]

    for item in test_articles:
        payload = {
            "text": item["text"],
            "headline": item["headline"],
            "model_name": "best"
        }
        res = requests.post(f"{BASE_BACKEND}/predict", json=payload)
        assert res.status_code == 200, f"Predict failed: {res.text}"
        data = res.json()

        pred_cat = data.get("predicted_category")
        conf = data.get("confidence")
        dna = data.get("news_dna")
        keywords = data.get("contributing_words")

        print(f"  [PASS] Text Classification: Expected {item['category']} -> Got {pred_cat} (Confidence: {conf})")
        assert pred_cat == item["category"], f"Expected {item['category']}, got {pred_cat}"
        assert dna is not None, "News DNA must be present"
        assert len(keywords) > 0, "Contributing keywords must be present"
        print(f"         Keywords: {keywords}")
        print(f"         News DNA Integrity Score: {dna.get('content_integrity', {}).get('overall_score')}")

    # 4. Test URL Extraction & Subsequent Intelligence Classification
    print("\n>>> 4. Verifying URL Extraction & Classification Pipeline")
    test_url = "https://httpbin.org/html"
    res_url = requests.post(f"{BASE_BACKEND}/extract", data={"url": test_url})
    assert res_url.status_code == 200, f"URL extraction failed: {res_url.text}"
    url_data = res_url.json()

    print(f"  [PASS] URL Ingested successfully from: {test_url}")
    print(f"         Extracted Headline: '{url_data.get('headline')}'")
    print(f"         Extracted Length: {url_data.get('char_count')} chars, {url_data.get('word_count')} words")
    assert len(url_data.get("text", "")) > 50

    # Now classify the URL extracted text
    url_pred_res = requests.post(f"{BASE_BACKEND}/predict", json={
        "text": url_data["text"],
        "headline": url_data["headline"],
        "model_name": "best"
    })
    assert url_pred_res.status_code == 200, f"URL text classification failed: {url_pred_res.text}"
    url_pred_data = url_pred_res.json()
    print(f"  [PASS] URL Article Classification: {url_pred_data.get('predicted_category')} (Confidence: {url_pred_data.get('confidence')})")
    print(f"         Contributing Words: {url_pred_data.get('contributing_words')}")

    print("\n" + "=" * 70)
    print("ALL TEXT & URL PLATFORM VERIFICATIONS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    test_platform()
