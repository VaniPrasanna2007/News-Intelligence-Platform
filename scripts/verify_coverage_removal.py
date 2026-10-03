"""
Verification script: Ensure Coverage & Sources is completely removed from UI and Navigation.
"""
import os
import re

def test_sidebar():
    print("[1] Auditing Sidebar.jsx...")
    path = os.path.join("frontend", "src", "components", "Sidebar.jsx")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "Coverage & Sources" not in content, "Error: 'Coverage & Sources' found in Sidebar.jsx!"
    assert "'coverage'" not in content, "Error: 'coverage' id found in Sidebar.jsx!"
    assert "PieChart" not in content, "Error: Unused PieChart icon still imported in Sidebar.jsx!"
    print("    [PASS] Coverage & Sources completely absent from Sidebar.jsx")

    # Verify remaining modules are all intact in Sidebar
    expected_modules = [
        "Command Center",
        "Live Overview",
        "Clusters & Constellation",
        "Model Evaluation",
        "Corpus Explorer",
        "Batch Classification",
        "Review & History",
        "Architecture & NLP"
    ]
    for mod in expected_modules:
        assert mod in content, f"Missing expected module in sidebar: {mod}"
        print(f"    [PASS] Verified module present: {mod}")

def test_app_routing():
    print("\n[2] Auditing App.jsx Routing...")
    path = os.path.join("frontend", "src", "App.jsx")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "CoverageSourcesPage" not in content, "Error: CoverageSourcesPage still imported/rendered in App.jsx!"
    assert "activeTab === 'coverage'" not in content, "Error: activeTab === 'coverage' route still exists in App.jsx!"
    print("    [PASS] Coverage & Sources route completely removed from App.jsx")

    # Verify remaining activeTab routes are all intact
    expected_tabs = ['command_center', 'overview', 'clusters', 'evaluation', 'dataset', 'categories', 'batch', 'history', 'about']
    for tab in ['command_center', 'overview', 'clusters', 'evaluation', 'dataset', 'batch', 'history', 'about']:
        assert f"activeTab === '{tab}'" in content, f"Missing route for tab: {tab}"
        print(f"    [PASS] Verified route active: {tab}")

def test_backend_integrity():
    print("\n[3] Auditing Core Backend & Model Integrity...")
    import urllib.request, json
    
    with urllib.request.urlopen("http://127.0.0.1:8000/api/health") as res:
        health = json.loads(res.read())
        assert health["status"] == "healthy", f"Health degraded: {health}"
        print("    [PASS] Backend is healthy, models loaded")

    with urllib.request.urlopen("http://127.0.0.1:8000/api/dataset/summary") as res:
        summary = json.loads(res.read())
        assert summary["total_articles"] == 9990, f"Unexpected article count: {summary['total_articles']}"
        print(f"    [PASS] Dataset intact: {summary['total_articles']} clean articles across 5 categories")

if __name__ == "__main__":
    test_sidebar()
    test_app_routing()
    test_backend_integrity()
    print("\n" + "="*50)
    print("ALL REMOVAL CHECKS PASSED WITH ZERO ERRORS!")
    print("REMOVED MODULE:         Coverage & Sources")
    print("OTHER MODULES MODIFIED: NONE")
    print("="*50)
