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
    print("Testing Backend API Endpoints...\n")
    
    # 1. Health
    health = get("/health")
    print("[1] GET /api/health:", health)
    assert health["status"] == "healthy", "Health check failed"
    
    # 2. Dataset summary
    summary = get("/dataset/summary")
    print(f"[2] GET /api/dataset/summary: Total {summary['total_articles']} articles, Categories: {list(summary['category_counts'].keys())}")
    
    # 3. Categories
    cats = get("/categories")
    print(f"[3] GET /api/categories: {cats['categories']}")
    
    # 4. Models
    models = get("/models")
    print(f"[4] GET /api/models: Best model is '{models['best_model']}', total models: {len(models['models'])}")
    
    # 5. Model performance
    perf = get("/model-performance")
    print(f"[5] GET /api/model-performance: Best model {perf['best_model']} test accuracy = {perf['test'][perf['best_model']]['accuracy']}")
    
    # 6. Keywords
    kws = get("/keywords")
    print(f"[6] GET /api/keywords: Categories with keywords: {list(kws.keys())}")
    
    # 7. Confusion matrix
    cm = get("/confusion-matrix")
    print(f"[7] GET /api/confusion-matrix: Models evaluated: {list(cm.keys())}")
    
    # 8. Single predict
    article = {
        "text": "The Federal Reserve announced an unexpected cut in interest rates today, sparking gains across major Wall Street indices and bond markets."
    }
    pred = post("/predict", article)
    print(f"[8] POST /api/predict: Category={pred['predicted_category']}, Confidence={pred['confidence']}, Probs={pred['probabilities']}")
    assert pred["predicted_category"] == "Business", f"Expected Business, got {pred['predicted_category']}"
    
    # 9. Single predict (Technology)
    tech_article = {
        "text": "Nvidia unveiled its next-generation Blackwell AI GPU architecture, delivering up to 4x faster training speed for large language models."
    }
    pred_tech = post("/predict", tech_article)
    print(f"[9] POST /api/predict (Tech): Category={pred_tech['predicted_category']}, Confidence={pred_tech['confidence']}")
    assert pred_tech["predicted_category"] == "Technology", f"Expected Technology, got {pred_tech['predicted_category']}"
    
    # 10. Single predict (Sports)
    sports_article = {
        "text": "Lionel Messi scored a stunning free-kick in extra time to lead Inter Miami to victory in the championship final."
    }
    pred_sports = post("/predict", sports_article)
    print(f"[10] POST /api/predict (Sports): Category={pred_sports['predicted_category']}, Confidence={pred_sports['confidence']}")
    assert pred_sports["predicted_category"] == "Sports", f"Expected Sports, got {pred_sports['predicted_category']}"
    
    # 11. Batch predict
    batch_data = [
        {"id": "1", "text": "Harvard University professors publish new curriculum for online distance education degrees."},
        {"id": "2", "text": "Christopher Nolan's new blockbuster film broke weekend box office records with stellar performances."}
    ]
    batch_res = post("/predict/batch", batch_data)
    print(f"[11] POST /api/predict/batch: Processed {batch_res['total_articles']} items.")
    for r in batch_res["results"]:
        print(f"    - ID {r['id']}: {r['predicted_category']} (Conf: {r['confidence']})")
        
    # 12. Recent predictions
    recent = get("/predictions/recent")
    print(f"[12] GET /api/predictions/recent: Retrieved {len(recent)} records from SQLite.")
    
    # 13. System statistics
    stats = get("/statistics")
    print(f"[13] GET /api/statistics: {stats}")
    
    print("\nALL 13 API ENDPOINTS TESTED AND VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
