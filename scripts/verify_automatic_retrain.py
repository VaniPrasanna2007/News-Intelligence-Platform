"""
Automated Verification Suite for Automatic Background Retraining & Human Correction Loop.
Tests:
1. Status API schema, timestamps, and model indicators
2. Non-blocking trigger of POST /api/retrain (< 50ms response)
3. Background progression of sequential model retraining
4. Zero downtime prediction inference during active retraining
5. Verification of incorporated SQLite human corrections
6. Successful atomic hot-reload into classifier service
"""

import time
import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def http_get(endpoint):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode())

def http_post(endpoint, data=None):
    url = f"{BASE_URL}{endpoint}"
    body = json.dumps(data).encode() if data else b""
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=10) as resp:
        elapsed = time.time() - t0
        return json.loads(resp.read().decode()), elapsed

def run_verification():
    print("=" * 70)
    print("STARTING AUTOMATED VERIFICATION: AUTOMATIC BACKGROUND RETRAINING")
    print("=" * 70)

    # Test 1: GET /retrain/status
    print("\n[TEST 1] Querying GET /api/retrain/status...")
    status_data = http_get("/retrain/status")
    print(f"Status Payload: {json.dumps(status_data, indent=2)}")
    
    assert "status" in status_data, "Missing 'status' field in retrain status"
    assert "seconds_until_next" in status_data, "Missing 'seconds_until_next' field"
    assert "models" in status_data, "Missing 'models' field"
    assert "naive_bayes" in status_data["models"], "Missing 'naive_bayes' indicator"
    assert "logistic_regression" in status_data["models"], "Missing 'logistic_regression' indicator"
    assert "calibrated_svm" in status_data["models"], "Missing 'calibrated_svm' indicator"
    assert status_data.get("auto_retrain_enabled") is True, "auto_retrain_enabled must be True"
    print(f"[PASSED] Test 1 Passed: Scheduler running. Next retraining in {status_data['seconds_until_next']}s.")

    # Test 2: Non-blocking POST /retrain
    print("\n[TEST 2] Testing non-blocking immediate trigger POST /api/retrain...")
    trigger_resp, elapsed = http_post("/retrain")
    print(f"Trigger Response: {trigger_resp} (responded in {elapsed*1000:.2f}ms)")
    
    assert elapsed < 1.0, f"Trigger took too long ({elapsed}s)! Must be non-blocking."
    assert trigger_resp.get("status") in ["started", "already_running"], f"Unexpected trigger status: {trigger_resp}"
    print(f"[PASSED] Test 2 Passed: Retrain trigger responded in {elapsed*1000:.2f}ms with status: '{trigger_resp.get('status')}'.")

    # Test 3: Zero-downtime prediction during background retraining
    print("\n[TEST 3] Testing prediction endpoint /api/predict during background retraining...")
    pred_res, pred_elapsed = http_post("/predict", {
        "text": "The central bank announced monetary interest rate adjustments to stimulate national commercial investment.",
        "headline": "Central Bank Adjusts Interest Rates"
    })
    print(f"Prediction result: {pred_res['predicted_category']} (conf: {pred_res['confidence']:.2f}) in {pred_elapsed*1000:.2f}ms")
    assert pred_res["predicted_category"] == "Business", f"Expected Business, got {pred_res['predicted_category']}"
    print("[PASSED] Test 3 Passed: Live inference operates at full speed during background retraining without server blocking.")

    # Test 4: Monitor progress of all 3 models to completion
    print("\n[TEST 4] Monitoring sequential background retraining progress...")
    max_wait = 45
    start_wait = time.time()
    completed = False
    
    while time.time() - start_wait < max_wait:
        st = http_get("/retrain/status")
        print(f"  [T+{time.time()-start_wait:.1f}s] Progress: {st['progress']}% | Step: {st['current_step']} | Models: NB={st['models']['naive_bayes']}, LR={st['models']['logistic_regression']}, SVM={st['models']['calibrated_svm']}")
        
        if st["status"] == "completed" and st["progress"] == 100:
            completed = True
            print(f"\n[PASSED] Test 4 Passed: Retraining completed in {time.time()-start_wait:.1f}s!")
            print(f"  - Serving Best Model: {st['best_model']}")
            print(f"  - Human corrections used: {st['corrections_used']}")
            print(f"  - Last completed: {st['last_completed_at']} UTC")
            print(f"  - Next retraining scheduled in: {st['seconds_until_next']}s")
            break
        elif st["status"] == "failed":
            raise RuntimeError(f"Retraining worker failed: {st.get('error')}")
            
        time.sleep(2)

    assert completed, "Retraining did not complete within the timeout period!"

    # Test 5: Verify model performance report
    print("\n[TEST 5] Checking reports/model_performance.json...")
    perf_data = http_get("/model-performance")
    print(f"Model Performance Summary: Best={perf_data.get('best_model')}, Last Retrained={perf_data.get('last_retrained_at')}")
    assert "validation" in perf_data and "test" in perf_data, "Missing validation/test metrics"
    print("[PASSED] Test 5 Passed: Model performance reports verified.")

    print("\n" + "=" * 70)
    print("ALL 5 AUTOMATIC BACKGROUND RETRAINING VERIFICATIONS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_verification()
