import React, { useState, useMemo } from 'react';
import { CATEGORY_COLORS, getCategoryStyle } from '../utils/categoryColors';
import { 
  Share2, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  SlidersHorizontal,
  Layers,
  Sparkles
} from 'lucide-react';

export default function ClusterConstellationMap({
  constellation,
  selectedClusterId,
  onSelectCluster,
  categoryFilter = 'All'
}) {
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [showAllClusters, setShowAllClusters] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const rawNodes = constellation?.nodes || [];
  const rawEdges = constellation?.edges || [];

  // Determine which nodes to display:
  // By default: 10 major clusters (or all 15 if toggled OR if a non-major cluster is selected)
  const visibleNodes = useMemo(() => {
    return rawNodes.filter(n => {
      // If category filter is active (not All), allow matching nodes
      const matchesCategory = categoryFilter === 'All' || n.category.toLowerCase() === categoryFilter.toLowerCase();
      
      const isSelected = selectedClusterId !== null && selectedClusterId !== undefined && Number(selectedClusterId) === Number(n.id);
      // If showing all or selected node is non-major, include all
      if (showAllClusters || isSelected) {
        return matchesCategory;
      }
      // Default: major clusters only (8-12 clusters)
      return matchesCategory && n.is_major;
    });
  }, [rawNodes, showAllClusters, selectedClusterId, categoryFilter]);

  const visibleNodeIds = useMemo(() => {
    const set = new Set();
    visibleNodes.forEach(n => {
      set.add(n.id);
      set.add(Number(n.id));
      set.add(String(n.id));
    });
    return set;
  }, [visibleNodes]);

  // Filter edges to only those connecting currently visible nodes
  const visibleEdges = useMemo(() => {
    return rawEdges.filter(e => {
      const srcMatch = visibleNodeIds.has(e.source) || visibleNodeIds.has(Number(e.source)) || visibleNodeIds.has(String(e.source));
      const tgtMatch = visibleNodeIds.has(e.target) || visibleNodeIds.has(Number(e.target)) || visibleNodeIds.has(String(e.target));
      return srcMatch && tgtMatch;
    });
  }, [rawEdges, visibleNodeIds]);

  const nodeMap = useMemo(() => {
    const map = new Map();
    visibleNodes.forEach(n => {
      map.set(n.id, n);
      map.set(Number(n.id), n);
      map.set(String(n.id), n);
    });
    return map;
  }, [visibleNodes]);

  // Active node is either hovered or selected
  const activeNodeId = hoveredNodeId !== null && hoveredNodeId !== undefined ? hoveredNodeId : selectedClusterId;

  // Active edges connected to active node (symmetrical by both source and target)
  const activeEdges = useMemo(() => {
    if (activeNodeId === null || activeNodeId === undefined) return new Set();
    const set = new Set();
    const targetId = Number(activeNodeId);
    visibleEdges.forEach((e, idx) => {
      if (Number(e.source) === targetId || Number(e.target) === targetId) {
        set.add(idx);
      }
    });
    return set;
  }, [activeNodeId, visibleEdges]);

  // Connected neighbors of active node
  const activeNeighbors = useMemo(() => {
    if (activeNodeId === null || activeNodeId === undefined) return new Set();
    const set = new Set();
    const targetId = Number(activeNodeId);
    visibleEdges.forEach(e => {
      const s = Number(e.source);
      const t = Number(e.target);
      if (s === targetId) {
        set.add(t);
        set.add(e.target);
      }
      if (t === targetId) {
        set.add(s);
        set.add(e.source);
      }
    });
    return set;
  }, [activeNodeId, visibleEdges]);

  const handleNodeClick = (node) => {
    if (selectedClusterId === node.id) {
      onSelectCluster(null);
    } else {
      onSelectCluster(node.id);
    }
  };

  return (
    <div className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-0">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 md:px-6 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                Semantic Constellation Map
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {visibleNodes.length} Clusters • {visibleEdges.length} Semantic Relationships
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cluster-level topology: links show genuine centroid cosine similarities (threshold &ge; 35%)
            </p>
          </div>
        </div>

        {/* View Density Toggle & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 10 Major vs All 15 Clusters View Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setShowAllClusters(false)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                !showAllClusters
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              10 Major Clusters
            </button>
            <button
              onClick={() => setShowAllClusters(true)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                showAllClusters
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All 15 Clusters
            </button>
          </div>

          {selectedClusterId !== null && (
            <button
              onClick={() => onSelectCluster(null)}
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Deselect</span>
            </button>
          )}

          <div className="flex items-center bg-slate-800/60 border border-slate-700/60 rounded-lg p-0.5">
            <button
              onClick={() => setZoomLevel(z => Math.max(0.85, z - 0.1))}
              className="p-1 text-slate-400 hover:text-white rounded transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-mono text-slate-300">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(z => Math.min(1.3, z + 0.1))}
              className="p-1 text-slate-400 hover:text-white rounded transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Constellation Canvas */}
      <div className="relative w-full overflow-hidden bg-slate-950">
        <svg
          viewBox="0 0 940 480"
          className="w-full h-auto transition-transform duration-300 ease-out select-none"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
        >
          <defs>
            {/* Subtle glow filter */}
            <filter id="activeGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle coordinate dot pattern */}
            <pattern id="dotPattern" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.8" fill="rgba(255,255,255,0.06)" />
            </pattern>
          </defs>

          {/* Canvas Background Pattern */}
          <rect width="940" height="480" fill="url(#dotPattern)" />

          {/* LAYER 1: Semantic Relationship Lines */}
          <g className="edges-layer">
            {visibleEdges.map((edge, idx) => {
              const src = nodeMap.get(Number(edge.source)) || nodeMap.get(edge.source);
              const tgt = nodeMap.get(Number(edge.target)) || nodeMap.get(edge.target);
              if (!src || !tgt) return null;

              const isConnectedToActive = activeEdges.has(idx);
              const isAnyActive = activeNodeId !== null && activeNodeId !== undefined;

              // Stroke styling
              let strokeOpacity = Math.max(0.3, edge.similarity * 0.75);
              let strokeWidth = Math.max(1.8, (edge.similarity - 0.3) * 6 + 1.2);
              let strokeColor = '#27342F'; // default graphite border

              if (isAnyActive) {
                if (isConnectedToActive) {
                  strokeOpacity = 1.0;
                  strokeWidth = Math.max(3.2, edge.similarity * 6.5);
                  strokeColor = '#10B981'; // Emerald glow for active connections
                } else {
                  strokeOpacity = 0.08;
                  strokeWidth = 1.0;
                }
              }

              const midX = (src.x + tgt.x) / 2;
              const midY = (src.y + tgt.y) / 2;

              return (
                <g key={`edge-${edge.source}-${edge.target}`} className="transition-all duration-200">
                  {/* Outer glow stroke for active edge - pure SVG lines, immune to 0-width objectBoundingBox filter bug */}
                  {isConnectedToActive && (
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={tgt.x}
                      y2={tgt.y}
                      stroke="#10B981"
                      strokeWidth={strokeWidth + 6}
                      strokeOpacity={0.3}
                      strokeLinecap="round"
                    />
                  )}

                  {/* Core relationship line */}
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={strokeOpacity}
                    strokeLinecap="round"
                  />

                  {/* Mid-point similarity percentage pill for active connections */}
                  {isConnectedToActive && (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x="-24"
                        y="-10"
                        width="48"
                        height="18"
                        rx="4"
                        fill="#0B0F0E"
                        stroke="#10B981"
                        strokeWidth="1.5"
                        opacity="0.95"
                      />
                      <text
                        x="0"
                        y="2.5"
                        textAnchor="middle"
                        fill="#34D399"
                        fontSize="9.5"
                        fontWeight="700"
                        fontFamily="monospace"
                      >
                        {edge.strength}%
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* LAYER 2: Cluster Level Nodes (Clean Card-Like Design) */}
          <g className="nodes-layer">
            {visibleNodes.map((node) => {
              const catStyle = getCategoryStyle(node.category);
              const isSelected = Number(selectedClusterId) === Number(node.id);
              const isHovered = Number(hoveredNodeId) === Number(node.id);
              const isActive = Number(activeNodeId) === Number(node.id);
              const isNeighbor = activeNeighbors.has(Number(node.id)) || activeNeighbors.has(node.id);
              const isAnyActive = activeNodeId !== null && activeNodeId !== undefined;

              // Dim non-connected nodes when an active node is selected/hovered
              let opacity = 1.0;
              if (isAnyActive) {
                opacity = (isActive || isNeighbor) ? 1.0 : 0.25;
              }

              // Card dimensions
              const cardW = 146;
              const cardH = 50;

              return (
                <g
                  key={`cluster-node-${node.id}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => handleNodeClick(node)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  className="cursor-pointer transition-all duration-200"
                  opacity={opacity}
                >
                  {/* Selection / Active Glow Halo */}
                  {isSelected && (
                    <rect
                      x={-cardW / 2 - 4}
                      y={-cardH / 2 - 4}
                      width={cardW + 8}
                      height={cardH + 8}
                      rx="14"
                      fill="none"
                      stroke={catStyle.hex}
                      strokeWidth="2"
                      strokeDasharray="6 3"
                      opacity="0.8"
                    />
                  )}

                  {/* Neighbor highlight border */}
                  {isNeighbor && !isSelected && (
                    <rect
                      x={-cardW / 2 - 2}
                      y={-cardH / 2 - 2}
                      width={cardW + 4}
                      height={cardH + 4}
                      rx="12"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="1.5"
                      opacity="0.75"
                    />
                  )}

                  {/* Main Node Card (Clean box design requested by user) */}
                  <rect
                    x={-cardW / 2}
                    y={-cardH / 2}
                    width={cardW}
                    height={cardH}
                    rx="10"
                    fill={isSelected ? "#151C19" : "#111715"}
                    stroke={isSelected ? catStyle.hex : isHovered ? catStyle.hex : '#27342F'}
                    strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1.2}
                    filter={isActive ? "url(#activeGlow)" : undefined}
                  />

                  {/* Category Indicator Dot */}
                  <circle
                    cx={-cardW / 2 + 14}
                    cy={-cardH / 2 + 16}
                    r="4"
                    fill={catStyle.hex}
                  />

                  {/* Row 1: Short Cluster Name (2-4 words) */}
                  <text
                    x={-cardW / 2 + 25}
                    y={-cardH / 2 + 19}
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    className="select-none"
                  >
                    {node.label.length > 17 ? `${node.label.slice(0, 16)}…` : node.label}
                  </text>

                  {/* Row 2: Article Count (Clean, concise) */}
                  <text
                    x={-cardW / 2 + 25}
                    y={-cardH / 2 + 37}
                    fill="#A7B5AE"
                    fontSize="10"
                    fontWeight="500"
                    fontFamily="monospace"
                    className="select-none"
                  >
                    {node.article_count} articles
                  </text>

                  {/* Small Coherence Indicator in top-right */}
                  <text
                    x={cardW / 2 - 10}
                    y={-cardH / 2 + 37}
                    textAnchor="end"
                    fill={node.coherence >= 80 ? "#34D399" : node.coherence >= 60 ? "#FBBF24" : "#718079"}
                    fontSize="9"
                    fontWeight="600"
                    fontFamily="monospace"
                  >
                    {node.coherence}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Footer Legend */}
      <div className="p-3.5 bg-slate-900/90 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Categories:
          </span>
          {Object.entries(CATEGORY_COLORS).map(([cat, style]) => (
            <div key={cat} className="flex items-center space-x-1.5 text-[11px]">
              <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
              <span className="text-slate-300 font-medium">{cat}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-emerald-400 inline-block" />
            <span>Active Semantic Link</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-slate-600 inline-block" />
            <span>Cosine Similarity &ge; 35%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
