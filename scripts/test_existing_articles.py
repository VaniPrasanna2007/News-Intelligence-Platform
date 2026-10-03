import urllib.request
import json
import sys

def test_endpoint(url, desc):
    print(f"Testing: {desc}")
    print(f"URL: {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            status = res.status
            data = json.loads(res.read().decode('utf-8'))
            print(f"-> Status: {status} OK")
            return data
    except Exception as e:
        print(f"-> FAILED: {e}")
        return None

results = {}

# 1. Health endpoint
data = test_endpoint("http://127.0.0.1:8000/api/health", "1. Health Endpoint")
assert data and data.get("status") in ["healthy", "degraded"], "Health check failed"
print(f"   Status: {data.get('status')}, Best Model: {data.get('best_model')}")

# 2. Articles page 1, limit 20
data = test_endpoint("http://127.0.0.1:8000/api/articles?page=1&limit=20", "2. Articles Page 1 (limit 20)")
assert data and len(data.get("articles", [])) == 20, "Expected 20 articles"
assert data.get("total") == 9990, f"Expected total 9990, got {data.get('total')}"
print(f"   Total: {data.get('total')}, Page: {data.get('page')}, Total Pages: {data.get('total_pages')}")
print(f"   Sample: ID={data['articles'][0].get('article_id')}, Category={data['articles'][0].get('category')}")
print(f"   Headline: {data['articles'][0].get('headline')[:60]}...")

# 3. Category: Business
data = test_endpoint("http://127.0.0.1:8000/api/articles?category=Business&page=1&limit=20", "3. Category Filter: Business")
assert data and len(data.get("articles", [])) == 20
assert all(a.get("category").lower() == "business" for a in data["articles"]), "All articles must be Business"
print(f"   Total Business Articles: {data.get('total')}, Returned: {len(data['articles'])}")

# 4. Category: Education
data = test_endpoint("http://127.0.0.1:8000/api/articles?category=Education&page=1&limit=20", "4. Category Filter: Education")
assert data and len(data.get("articles", [])) == 20
assert all(a.get("category").lower() == "education" for a in data["articles"]), "All articles must be Education"
print(f"   Total Education Articles: {data.get('total')}, Returned: {len(data['articles'])}")

# 5. Category: Entertainment
data = test_endpoint("http://127.0.0.1:8000/api/articles?category=Entertainment&page=1&limit=20", "5. Category Filter: Entertainment")
assert data and len(data.get("articles", [])) == 20
assert all(a.get("category").lower() == "entertainment" for a in data["articles"]), "All articles must be Entertainment"
print(f"   Total Entertainment Articles: {data.get('total')}, Returned: {len(data['articles'])}")

# 6. Category: Sports
data = test_endpoint("http://127.0.0.1:8000/api/articles?category=Sports&page=1&limit=20", "6. Category Filter: Sports")
assert data and len(data.get("articles", [])) == 20
assert all(a.get("category").lower() == "sports" for a in data["articles"]), "All articles must be Sports"
print(f"   Total Sports Articles: {data.get('total')}, Returned: {len(data['articles'])}")

# 7. Category: Technology
data = test_endpoint("http://127.0.0.1:8000/api/articles?category=Technology&page=1&limit=20", "7. Category Filter: Technology")
assert data and len(data.get("articles", [])) == 20
assert all(a.get("category").lower() == "technology" for a in data["articles"]), "All articles must be Technology"
print(f"   Total Technology Articles: {data.get('total')}, Returned: {len(data['articles'])}")

# 8. Search: AI
data = test_endpoint("http://127.0.0.1:8000/api/articles?search=AI&page=1&limit=20", "8. Search Keyword: 'AI'")
assert data and len(data.get("articles", [])) > 0
print(f"   Total Search Matches for 'AI': {data.get('total')}, Returned on Page 1: {len(data['articles'])}")
print(f"   Sample Match: {data['articles'][0].get('headline')[:60]}... [{data['articles'][0].get('category')}]")

# 9. Search + Category: AI in Technology
data = test_endpoint("http://127.0.0.1:8000/api/articles?category=Technology&search=AI&page=1&limit=20", "9. Search + Category: 'AI' in Technology")
assert data and len(data.get("articles", [])) > 0
assert all(a.get("category").lower() == "technology" for a in data["articles"]), "All articles must be Technology"
print(f"   Total Tech Articles matching 'AI': {data.get('total')}")

# 10. Pagination: Page 2
data = test_endpoint("http://127.0.0.1:8000/api/articles?page=2&limit=20", "10. Pagination: Page 2")
assert data and len(data.get("articles", [])) == 20
assert data.get("page") == 2
print(f"   Page 2 Sample ID: {data['articles'][0].get('article_id')} (Index 21)")

print("\n=======================================================")
print("ALL AUTOMATED TESTS PASSED SUCCESSFULLY! (10/10)")
print("=======================================================")
