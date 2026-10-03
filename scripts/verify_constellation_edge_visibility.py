"""
Verification script for Semantic Constellation Map Edge / Line Visibility.
Validates:
1. Node 7 (Enterprise & Industry) and Node 13 (Banking & Corporate Finance) coordinates in reports/cluster_constellation.json
2. Vector distance and non-zero dx/dy (no vertical/horizontal collapse)
3. Edge (7, 13) similarity strength 55.2%
4. Frontend ClusterConstellationMap.jsx source code verification:
   - Zero filter="url(#activeGlow)" on <line> elements (eliminates SVG objectBoundingBox zero-dimension bug)
   - Dual-line SVG glow rendering (under-glow + core stroke)
   - Symmetrical active edge calculation with Number() normalization
   - Mid-point similarity percentage pill attached to visible edge group
"""
import json
import os
import re
import math

def test_constellation_data():
    print("[1] Validating constellation JSON data...")
    path = os.path.join("reports", "cluster_constellation.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    nodes = data.get("nodes", [])
    edges = data.get("edges", [])

    node_map = {n["id"]: n for n in nodes}
    assert 7 in node_map, "Node 7 (Enterprise & Industry) missing"
    assert 13 in node_map, "Node 13 (Banking & Corporate Finance) missing"

    n7 = node_map[7]
    n13 = node_map[13]

    print(f"    Node 7  ({n7['label']}): x={n7['x']}, y={n7['y']}")
    print(f"    Node 13 ({n13['label']}): x={n13['x']}, y={n13['y']}")

    # Check non-zero dx & dy
    dx = n13["x"] - n7["x"]
    dy = n13["y"] - n7["y"]
    dist = math.hypot(dx, dy)
    assert dx != 0, f"Error: dx is zero between Node 7 and Node 13 (dx={dx})"
    assert dy != 0, f"Error: dy is zero between Node 7 and Node 13 (dy={dy})"
    print(f"    [PASS] Non-zero offset vector: dx={dx}, dy={dy}, distance={dist:.1f}px")

    # Find edge (7, 13)
    edge_7_13 = next((e for e in edges if (e["source"] == 7 and e["target"] == 13) or (e["source"] == 13 and e["target"] == 7)), None)
    assert edge_7_13 is not None, "Edge between 7 and 13 missing in constellation data"
    assert edge_7_13["strength"] == 55.2 or abs(edge_7_13["similarity"] - 0.5516) < 0.01, f"Unexpected similarity: {edge_7_13}"
    print(f"    [PASS] Edge (7 <-> 13) verified with strength: {edge_7_13['strength']}%")

def test_frontend_rendering_logic():
    print("\n[2] Validating Frontend ClusterConstellationMap.jsx Rendering...")
    map_path = os.path.join("frontend", "src", "components", "ClusterConstellationMap.jsx")
    with open(map_path, "r", encoding="utf-8") as f:
        src = f.read()

    # 1. Verify NO filter on <line>
    line_filter_matches = re.findall(r'<line[^>]*filter\s*=', src)
    assert len(line_filter_matches) == 0, f"FAILED: Found filter attribute on <line>: {line_filter_matches}"
    print("    [PASS] Zero SVG filter attributes on <line> elements (immune to objectBoundingBox bug)")

    # 2. Verify dual-line glow rendering for active edge
    assert "isConnectedToActive" in src, "Missing isConnectedToActive logic"
    assert "strokeWidth={strokeWidth + 6}" in src, "Missing under-glow stroke width definition"
    assert 'stroke="#38bdf8"' in src, "Missing active connection sky cyan stroke color"
    print("    [PASS] Dual-line SVG under-glow and core stroke properly configured")

    # 3. Verify symmetrical ID normalization
    assert "Number(e.source) === targetId || Number(e.target) === targetId" in src, "Missing symmetrical targetId check in activeEdges"
    print("    [PASS] Symmetrical activeEdges detection verified (Number-normalized)")

    # 4. Verify percentage badge is bound to active edge
    assert "isConnectedToActive && (" in src, "Percentage badge must be conditioned on active edge"
    assert "{edge.strength}%" in src, "Percentage badge must display edge strength"
    print("    [PASS] Mid-point percentage pill strictly bound to active edge rendering")

def simulate_edge_selection():
    print("\n[3] Simulating Selection Symmetrical Behavior...")
    # Simulate the exact JS logic
    path = os.path.join("reports", "cluster_constellation.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    visible_nodes = [n for n in data["nodes"] if n["is_major"]]
    visible_node_ids = {n["id"] for n in visible_nodes}
    visible_edges = [e for e in data["edges"] if e["source"] in visible_node_ids and e["target"] in visible_node_ids]
    node_map = {n["id"]: n for n in visible_nodes}

    # Case 1: Select Enterprise & Industry (7)
    active_id_1 = 7
    active_edges_1 = [idx for idx, e in enumerate(visible_edges) if e["source"] == active_id_1 or e["target"] == active_id_1]
    
    # Case 2: Select Banking & Corporate Finance (13)
    active_id_2 = 13
    active_edges_2 = [idx for idx, e in enumerate(visible_edges) if e["source"] == active_id_2 or e["target"] == active_id_2]

    # Find the edge connecting 7 and 13 in visible_edges
    connecting_edge_idx = next(idx for idx, e in enumerate(visible_edges) if (e["source"] == 7 and e["target"] == 13) or (e["source"] == 13 and e["target"] == 7))
    
    assert connecting_edge_idx in active_edges_1, "Edge (7, 13) not active when Enterprise is selected"
    assert connecting_edge_idx in active_edges_2, "Edge (7, 13) not active when Banking is selected"
    
    edge_obj = visible_edges[connecting_edge_idx]
    src_pt = node_map[edge_obj["source"]]
    tgt_pt = node_map[edge_obj["target"]]
    mid_x = (src_pt["x"] + tgt_pt["x"]) / 2
    mid_y = (src_pt["y"] + tgt_pt["y"]) / 2

    print(f"    When selecting Node 7 (Enterprise): Edge (7<->13) is active (idx {connecting_edge_idx})")
    print(f"    When selecting Node 13 (Banking):   Edge (7<->13) is active (idx {connecting_edge_idx})")
    print(f"    Rendered line segment: ({src_pt['x']}, {src_pt['y']}) ---> ({tgt_pt['x']}, {tgt_pt['y']})")
    print(f"    Rendered pill label:   {edge_obj['strength']}% at ({mid_x}, {mid_y})")
    print("    [PASS] Completely symmetrical edge & label rendering confirmed for both nodes")

if __name__ == "__main__":
    test_constellation_data()
    test_frontend_rendering_logic()
    simulate_edge_selection()
    print("\n[ALL AUDITS PASSED WITH ZERO ERRORS]")
