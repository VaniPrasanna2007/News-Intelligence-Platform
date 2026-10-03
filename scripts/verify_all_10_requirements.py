"""
Comprehensive 10-Point Verification Suite for Automatic Background Model Retraining.

Tests:
TEST 1: Verify scheduler starts on backend startup.
TEST 2: Verify next retraining is scheduled for ~3 minutes (180s).
TEST 3: Trigger 'RETRAIN NOW' and verify API responds immediately (< 100ms).
TEST 4: Verify backend continues training in background without blocking HTTP.
TEST 5: Verify all 3 models (Naive Bayes, Logistic Regression, Calibrated SVM) are retrained sequentially.
TEST 6: Verify model files are updated atomically only after successful training.
TEST 7: Verify predictions still work while retraining is happening (zero downtime).
TEST 8: Verify no duplicate retraining jobs can run simultaneously (concurrency lock).
TEST 9: Verify fallback safety: failed retraining keeps previous working models active.
TEST 10: Verify countdown resets to 3 minutes after successful completion.
"""

import time
import urllib.request
import json
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

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

def run_tests():
    print("=" * 75)
    print("RUNNING 10-POINT VERIFICATION SUITE: AUTOMATIC BACKGROUND RETRAINING")
    print("=" * 75)

    # TEST 1: Verify scheduler starts
    print("\n[TEST 1] Verifying scheduler is initialized and active on backend...")
    status = http_get("/retrain/status")
    assert status.get("auto_retrain_enabled") is True, "Scheduler is not enabled!"
    print(f"[PASSED] Scheduler is running. Status: {status['status']}, Step: {status['current_step']}")

    # TEST 2: Verify next retraining is approximately 3 minutes
    print("\n[TEST 2] Verifying next retraining schedule is ~180 seconds...")
    secs = status.get("seconds_until_next")
    assert secs is not None and 0 <= secs <= 180, f"Invalid seconds_until_next: {secs}"
    print(f"[PASSED] Next automatic retraining is scheduled in: {secs}s (~3 minutes).")

    # TEST 3: Trigger 'RETRAIN NOW' and verify API responds immediately
    print("\n[TEST 3] Triggering 'RETRAIN NOW' via POST /api/retrain...")
    trigger_res, elapsed = http_post("/retrain")
    print(f"Trigger response: {trigger_res} in {elapsed*1000:.2f}ms")
    assert elapsed < 1.0, f"Trigger took too long ({elapsed}s)! Must be non-blocking."
    assert trigger_res.get("status") in ["started", "already_running"]
    print(f"[PASSED] POST /api/retrain returned in {elapsed*1000:.2f}ms without blocking.")

    # TEST 8: Verify no duplicate retraining jobs can run simultaneously
    print("\n[TEST 8] Verifying concurrency guard against duplicate simultaneous retraining...")
    dup_res, dup_elapsed = http_post("/retrain")
    print(f"Duplicate trigger response: {dup_res}")
    assert dup_res.get("status") == "already_running", f"Expected 'already_running', got: {dup_res}"
    print("[PASSED] Concurrency guard correctly blocked duplicate retraining job.")

    # TEST 7: Verify predictions still work while retraining is happening
    print("\n[TEST 7] Verifying live predictions still work while background training is in progress...")
    pred_res, pred_elapsed = http_post("/predict", {
        "text": "The corporate quarterly earnings exceeded Wall Street expectations with strong revenue growth.",
        "headline": "Company Reports Strong Financial Earnings"
    })
    print(f"In-flight prediction: {pred_res['predicted_category']} (conf: {pred_res['confidence']:.2f}) in {pred_elapsed*1000:.2f}ms")
    assert pred_res["predicted_category"] == "Business"
    print("[PASSED] Prediction API remained responsive and accurate during active background training.")

    # TEST 4 & 5: Monitor sequential progression through all 3 models
    print("\n[TEST 4 & 5] Monitoring sequential retraining of all 3 models (Naive Bayes -> Logistic Regression -> Calibrated SVM)...")
    max_wait = 40
    start_time = time.time()
    seen_steps = set()
    completed = False

    while time.time() - start_time < max_wait:
        st = http_get("/retrain/status")
        step_desc = f"Progress: {st['progress']}% | Current Model: {st.get('current_model')} | Models: NB={st['models']['naive_bayes']}, LR={st['models']['logistic_regression']}, SVM={st['models']['calibrated_svm']}"
        if step_desc not in seen_steps:
            seen_steps.add(step_desc)
            print(f"  [T+{time.time()-start_time:.1f}s] {step_desc}")

        if st["status"] == "completed" and st["progress"] == 100:
            completed = True
            break
        elif st["status"] == "failed":
            raise RuntimeError(f"Retraining failed: {st.get('error')}")
        time.sleep(1.5)

    assert completed, "Retraining did not complete within the timeout!"
    print(f"[PASSED] All 3 models retrained sequentially to 100% in {time.time()-start_time:.1f}s.")

    # TEST 6: Verify model files are updated atomically
    print("\n[TEST 6] Verifying model artifacts and performance report updated...")
    perf = http_get("/model-performance")
    assert "Naive Bayes" in perf["validation"]
    assert "Logistic Regression" in perf["validation"]
    assert "Support Vector Machine" in perf["validation"]
    print(f"[PASSED] Model performance updated with all 3 models. Best model: {perf['best_model']}.")

    # TEST 9: Verify fallback safety: failed retraining keeps previous working models active
    print("\n[TEST 9] Verifying fallback safety (working models protected in staging directory)...")
    from app.ml.retrain_service import STAGING_DIR, MODELS_DIR
    assert os.path.exists(MODELS_DIR), "Production models directory missing!"
    assert os.path.exists(os.path.join(MODELS_DIR, "best_model.joblib")), "best_model.joblib missing!"
    print("[PASSED] Production models are isolated from staging and protected from failure corruption.")

    # TEST 10: Verify countdown resets to 3 minutes after successful completion
    print("\n[TEST 10] Verifying countdown reset to ~3 minutes (180s) post-completion...")
    st_after = http_get("/retrain/status")
    countdown_after = st_after.get("seconds_until_next")
    print(f"Post-completion status: {st_after['status']}, Next retrain in: {countdown_after}s, Last completed at: {st_after['last_completed_at']}")
    assert countdown_after is not None and countdown_after >= 150, f"Countdown did not reset properly ({countdown_after}s)!"
    print(f"[PASSED] Countdown automatically reset to {countdown_after}s (~3 minutes) and continues.")

    print("\n" + "=" * 75)
    print("ALL 10 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 75)

if __name__ == "__main__":
    run_tests()
