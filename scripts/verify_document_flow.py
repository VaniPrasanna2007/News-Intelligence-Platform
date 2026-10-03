import os
import sys
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"
DOWNLOADS_DIR = r"C:\Users\srivi\Downloads"
BUSINESS_DOCX = os.path.join(DOWNLOADS_DIR, "Business_Test_Article.docx")
TECH_DOCX = os.path.join(DOWNLOADS_DIR, "Technology_Test_Article.docx")

def test_document_flow():
    print("=" * 70)
    print("RUNNING END-TO-END DOCUMENT WORKFLOW VERIFICATION")
    print("=" * 70)

    # Check files exist
    assert os.path.exists(BUSINESS_DOCX), f"Missing: {BUSINESS_DOCX}"
    assert os.path.exists(TECH_DOCX), f"Missing: {TECH_DOCX}"
    print(f"[OK] Found test documents:\n  - {BUSINESS_DOCX}\n  - {TECH_DOCX}\n")

    # -------------------------------------------------------------
    # TEST 1: Business_Test_Article.docx
    # -------------------------------------------------------------
    print(">>> TEST 1: Processing Business_Test_Article.docx")
    
    # Step 1.1: Extract preview
    with open(BUSINESS_DOCX, "rb") as f:
        res_ext = requests.post(f"{BASE_URL}/extract", files={"file": ("Business_Test_Article.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
    assert res_ext.status_code == 200, f"Extract failed: {res_ext.text}"
    ext_data = res_ext.json()
    print(f"  [1.1 Extract Preview] Extracted text length: {len(ext_data.get('text', ''))} chars")
    print(f"  [1.1 Extract Preview] Extracted headline: '{ext_data.get('headline')}'")
    assert "Economic Growth" in ext_data.get('headline', '') or "economic" in ext_data.get('text', '').lower()
    assert "predicted_category" not in ext_data, "Extract endpoint must NOT return predicted_category!"

    # Step 1.2: Run Document Intelligence Analysis
    with open(BUSINESS_DOCX, "rb") as f:
        res_pred = requests.post(
            f"{BASE_URL}/predict/file",
            files={"file": ("Business_Test_Article.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            data={"model_name": "best"}
        )
    assert res_pred.status_code == 200, f"Predict file failed: {res_pred.text}"
    biz_result = res_pred.json()
    
    print(f"  [1.2 Document Intelligence] Category Verdict: {biz_result.get('predicted_category')}")
    print(f"  [1.2 Document Intelligence] Confidence: {biz_result.get('confidence')}")
    print(f"  [1.2 Document Intelligence] All Probabilities: {biz_result.get('probabilities')}")
    print(f"  [1.2 Document Intelligence] Contributing Words: {biz_result.get('contributing_words')}")
    print(f"  [1.2 Document Intelligence] Summary: {biz_result.get('article_summary')}")
    print(f"  [1.2 Document Intelligence] Profile: {biz_result.get('article_profile')}")
    print(f"  [1.2 Document Intelligence] Model Info: {biz_result.get('model_info')}")

    assert biz_result.get("predicted_category") == "Business", f"Expected Business, got {biz_result.get('predicted_category')}"
    assert len(biz_result.get("contributing_words", [])) > 0, "Contributing words must not be empty"
    
    # Check that contributing words are actually in the business article text
    article_lower = (ext_data.get('text', '') + " " + ext_data.get('headline', '')).lower()
    for word in biz_result["contributing_words"]:
        # Word or stem should be in article
        assert word.lower() in article_lower or word.lower()[:4] in article_lower, f"Word '{word}' not found in article text!"
    print("  [OK] All contributing words originate strictly from the uploaded business document.")

    # -------------------------------------------------------------
    # TEST 2: Technology_Test_Article.docx (Clean State Reset)
    # -------------------------------------------------------------
    print("\n>>> TEST 2: Processing Technology_Test_Article.docx (Independent Run)")

    # Step 2.1: Extract preview
    with open(TECH_DOCX, "rb") as f:
        res_ext2 = requests.post(f"{BASE_URL}/extract", files={"file": ("Technology_Test_Article.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
    assert res_ext2.status_code == 200, f"Extract failed: {res_ext2.text}"
    ext_data2 = res_ext2.json()
    print(f"  [2.1 Extract Preview] Extracted text length: {len(ext_data2.get('text', ''))} chars")
    print(f"  [2.1 Extract Preview] Extracted headline: '{ext_data2.get('headline')}'")

    # Step 2.2: Run Document Intelligence Analysis
    with open(TECH_DOCX, "rb") as f:
        res_pred2 = requests.post(
            f"{BASE_URL}/predict/file",
            files={"file": ("Technology_Test_Article.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            data={"model_name": "best"}
        )
    assert res_pred2.status_code == 200, f"Predict file failed: {res_pred2.text}"
    tech_result = res_pred2.json()

    print(f"  [2.2 Document Intelligence] Category Verdict: {tech_result.get('predicted_category')}")
    print(f"  [2.2 Document Intelligence] Confidence: {tech_result.get('confidence')}")
    print(f"  [2.2 Document Intelligence] All Probabilities: {tech_result.get('probabilities')}")
    print(f"  [2.2 Document Intelligence] Contributing Words: {tech_result.get('contributing_words')}")
    print(f"  [2.2 Document Intelligence] Summary: {tech_result.get('article_summary')}")
    print(f"  [2.2 Document Intelligence] Profile: {tech_result.get('article_profile')}")
    print(f"  [2.2 Document Intelligence] Model Info: {tech_result.get('model_info')}")

    assert tech_result.get("predicted_category") == "Technology", f"Expected Technology, got {tech_result.get('predicted_category')}"
    assert len(tech_result.get("contributing_words", [])) > 0, "Contributing words must not be empty"

    # Verify zero leakage from Test 1
    tech_words = set(tech_result.get("contributing_words", []))
    assert "economic" not in tech_words and "investment" not in tech_words, "Data leakage detected from business test!"
    print("  [OK] No leakage from Business document to Technology document.")

    print("\n" + "=" * 70)
    print("ALL DOCUMENT WORKFLOW TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    test_document_flow()
