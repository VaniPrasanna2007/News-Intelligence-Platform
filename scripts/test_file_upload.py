import io
import urllib.request
import json
import pypdf
import docx

BASE_URL = "http://127.0.0.1:8000/api"

def create_sample_docx(text):
    doc = docx.Document()
    doc.add_heading("Global Education Summit Announces University Grants", 0)
    doc.add_paragraph(text)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()

def create_sample_pdf(text):
    from pypdf import PdfWriter
    # Create simple minimal PDF using pypdf writer or write raw text
    # Or test txt upload first
    return None

def test_multipart():
    print("Testing File & URL input endpoints...")
    
    # 1. Text file upload
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    sample_text = "Federal Reserve officials voted unanimously to maintain baseline federal funds rates at 5.25 percent, citing inflation data and robust economic expansion across corporate sectors."
    
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="sample_finance.txt"\r\n'
        f"Content-Type: text/plain\r\n\r\n"
        f"{sample_text}\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")
    
    req = urllib.request.Request(
        f"{BASE_URL}/predict/file",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        print("[1] TXT File Upload Result:")
        print(f"    - Predicted: {res['predicted_category']} (Confidence: {res['confidence']})")
        print(f"    - Extracted DNA: {res['news_dna']['headline']}")
        assert res["predicted_category"] == "Business"

    # 2. DOCX File upload
    docx_bytes = create_sample_docx("International education conferences in Geneva and London brought together over two hundred university presidents, professors, and scholarship foundation leaders to debate distance learning standards.")
    docx_body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="academic_report.docx"\r\n'
        f"Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n"
    ).encode("utf-8") + docx_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req_docx = urllib.request.Request(
        f"{BASE_URL}/predict/file",
        data=docx_body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    with urllib.request.urlopen(req_docx) as resp:
        res_docx = json.loads(resp.read().decode("utf-8"))
        print("[2] DOCX File Upload Result:")
        print(f"    - Predicted: {res_docx['predicted_category']} (Confidence: {res_docx['confidence']})")
        print(f"    - Extracted DNA: {res_docx['news_dna']['headline']}")
        assert res_docx["predicted_category"] == "Education"

    print("\nFILE UPLOAD TEST COMPLETED WITH 100% SUCCESS!")

if __name__ == "__main__":
    test_multipart()
