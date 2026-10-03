import urllib.request
import json

categories = ["Business", "Education", "Entertainment", "Sports", "Technology"]

print(">>> TEST A: Testing all 5 canonical categories on /api/articles...")
for cat in categories:
    url = f"http://127.0.0.1:8000/api/articles?category={cat}&page=1&limit=5"
    with urllib.request.urlopen(url, timeout=10) as resp:
        data = json.loads(resp.read().decode())
        print(f"  [{cat}] Total matching: {data['total']}, Returned: {len(data['articles'])}, Page: {data['page']}/{data['total_pages']}")
        assert data['total'] > 0
        assert data['articles'][0]['category'] == cat

print("\n>>> TEST B: Testing combined Search + Category filter...")
combo_url = "http://127.0.0.1:8000/api/articles?search=school&category=Education&page=1&limit=5"
with urllib.request.urlopen(combo_url, timeout=10) as resp:
    data = json.loads(resp.read().decode())
    print(f"  [Search: school + Category: Education] Total: {data['total']}, Returned: {len(data['articles'])}")
    assert data['total'] > 0
    assert data['articles'][0]['category'] == "Education"

print("\n>>> TEST C: Testing /api/dataset/articles backwards compatibility...")
compat_url = "http://127.0.0.1:8000/api/dataset/articles?page=1&limit=5"
with urllib.request.urlopen(compat_url, timeout=10) as resp:
    data = json.loads(resp.read().decode())
    print(f"  [/api/dataset/articles] Total: {data['total']}, Returned: {len(data['articles'])}")
    assert data['total'] == 9990

print("\n>>> ALL TESTS PASSED!")
