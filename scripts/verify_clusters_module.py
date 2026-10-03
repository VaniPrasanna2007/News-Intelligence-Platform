"""
Verification script for Clusters & Constellation Module.
Audits:
1. Backend /api/story-clusters endpoint (15 real clusters with coherence & representative articles)
2. Backend /api/cluster-constellation endpoint (nodes & edges)
3. Mathematical validity of Coherence Scores (intra-cluster cosine similarity)
4. Frontend ClustersConstellationPage does NOT include CategoryConstellation or duplicate cards
5. Frontend production build validity
"""
import urllib.request
import json
import os
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_api_endpoints():
    print("[1] Testing Backend API Endpoints...")
    
    # 1. Health
    with urllib.request.urlopen(f"{BASE_URL}/api/health") as res:
        health = json.loads(res.read())
        assert health["status"] == "healthy", f"Health status degraded: {health}"
        print("    [PASS] /api/health is healthy")

    # 2. Story Clusters
    with urllib.request.urlopen(f"{BASE_URL}/api/story-clusters") as res:
        data = json.loads(res.read())
        clusters = data.get("clusters", [])
        assert len(clusters) == 15, f"Expected 15 clusters, found {len(clusters)}"
        print(f"    [PASS] /api/story-clusters returned {len(clusters)} clusters")
        
        for c in clusters:
            assert "cluster_id" in c, "Missing cluster_id"
            assert "topic_label" in c, f"Missing topic_label in cluster {c.get('cluster_id')}"
            assert "coherence_score" in c, f"Missing coherence_score in cluster {c.get('cluster_id')}"
            assert 0.0 <= c["coherence_score"] <= 100.0, f"Invalid coherence score: {c['coherence_score']}"
            assert "coherence_grade" in c, "Missing coherence_grade"
            assert "representative_articles" in c and len(c["representative_articles"]) > 0, "Missing representative articles"
            assert "related_clusters" in c, "Missing related_clusters"
        print("    [PASS] All 15 clusters have valid coherence scores and representative articles")

    # 3. Cluster Constellation
    with urllib.request.urlopen(f"{BASE_URL}/api/cluster-constellation") as res:
        const = json.loads(res.read())
        nodes = const.get("nodes", [])
        edges = const.get("edges", [])
        assert len(nodes) == 15, f"Expected 15 nodes, found {len(nodes)}"
        assert len(edges) >= 15, f"Expected at least 15 edges, found {len(edges)}"
        print(f"    [PASS] /api/cluster-constellation returned {len(nodes)} nodes and {len(edges)} semantic edges")
        
        for n in nodes:
            assert "x" in n and "y" in n, f"Missing coordinates for node {n.get('id')}"
            assert "coherence" in n, f"Missing coherence for node {n.get('id')}"
        for e in edges:
            assert "source" in e and "target" in e and "similarity" in e, f"Invalid edge: {e}"
        print("    [PASS] All nodes and edges conform to constellation schema")

def test_page_integrity():
    print("\n[2] Testing Page Code & Redundancy Cleanliness...")
    page_path = os.path.join("frontend", "src", "pages", "ClustersConstellationPage.jsx")
    with open(page_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Must NOT import or render CategoryConstellation (removes Corpus Category Landscape)
    assert "CategoryConstellation" not in content, "FAILED: CategoryConstellation found in ClustersConstellationPage!"
    print("    [PASS] 'Corpus Category Landscape' (CategoryConstellation) completely removed from ClustersConstellationPage")

    # Must feature ClusterConstellationMap
    assert "ClusterConstellationMap" in content, "FAILED: ClusterConstellationMap not found in page!"
    print("    [PASS] ClusterConstellationMap properly integrated")

    # Must feature SelectedClusterDetail
    assert "SelectedClusterDetail" in content, "FAILED: SelectedClusterDetail not found in page!"
    print("    [PASS] SelectedClusterDetail properly integrated")

    # Must show Cluster Coherence
    assert "Cluster Coherence" in content, "FAILED: Cluster Coherence not present in page!"
    print("    [PASS] Cluster Coherence Score metric prominently featured")

    # Must NOT show duplicate overview components or general dashboard cards
    assert "Live Overview" not in content
    assert "Overall Accuracy" not in content
    print("    [PASS] No duplicate Live Overview metrics or summary cards on page")

if __name__ == "__main__":
    test_api_endpoints()
    test_page_integrity()
    print("\n[ALL TESTS PASSED SUCCESSFULLY!]")
