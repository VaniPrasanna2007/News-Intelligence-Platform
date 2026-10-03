import React, { useState, useMemo } from 'react';
import { Share2, ExternalLink, X, FileText, Globe, Layers, ArrowUpRight } from 'lucide-react';
import { getCategoryStyle } from '../utils/categoryColors';

export default function StoryClusterGraph({ clusterData }) {
  const [selectedNode, setSelectedNode] = useState(null);

  // Canvas Geometry for SVG Node-Link graph
  const width = 600;
  const height = 340;
  const centerX = width / 2;
  const centerY = height / 2;
  const orbitRadius = 135;

  const nodes = useMemo(() => clusterData?.nodes || [], [clusterData]);
  const edges = useMemo(() => clusterData?.edges || [], [clusterData]);

  // Stable, deterministic node positioning (No recalculation or random layout shifts)
  const positionedNodes = useMemo(() => {
    if (!nodes || nodes.length === 0) return [];
    const relatedCount = Math.max(1, nodes.length - 1);

    return nodes.map((node, idx) => {
      if (node.is_query || idx === 0) {
        return { ...node, x: centerX, y: centerY };
      }
      const angle = ((idx - 1) / relatedCount) * 2 * Math.PI - Math.PI / 2;
      // Fixed organic distance based on similarity
      const r = orbitRadius * (1.1 - (node.similarity || 0.3) * 0.3);
      const x = Math.round(centerX + r * Math.cos(angle));
      const y = Math.round(centerY + r * Math.sin(angle));
      return { ...node, x, y };
    });
  }, [nodes, centerX, centerY, orbitRadius]);

  const nodeMap = useMemo(() => {
    return Object.fromEntries(positionedNodes.map((n) => [n.id, n]));
  }, [positionedNodes]);

  // Connected neighbors of the currently selected node
  const activeNeighborIds = useMemo(() => {
    if (!selectedNode) return new Set();
    const set = new Set();
    edges.forEach((e) => {
      if (e.source === selectedNode.id) set.add(e.target);
      if (e.target === selectedNode.id) set.add(e.source);
    });
    return set;
  }, [selectedNode, edges]);

  if (!clusterData || !clusterData.nodes || clusterData.nodes.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-500 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Story Family & Relationship Map</h3>
              <p className="text-[10px] text-slate-400 font-mono">Semantic cosine similarity clustering</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-800 bg-slate-950 text-slate-500">
            Waiting for article
          </span>
        </div>

        {/* Empty Canvas Placeholder */}
        <div className="relative w-full h-[260px] bg-slate-950/60 rounded-xl border border-slate-800/60 flex flex-col items-center justify-center text-center p-6 my-2">
          <svg width="220" height="140" className="opacity-20 mb-3">
            <circle cx="110" cy="70" r="50" fill="none" stroke="#27342F" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="110" cy="70" r="16" fill="#1A2420" />
            <circle cx="65" cy="50" r="8" fill="#27342F" />
            <circle cx="155" cy="50" r="8" fill="#27342F" />
            <circle cx="110" cy="120" r="8" fill="#27342F" />
            <line x1="110" y1="70" x2="65" y2="50" stroke="#27342F" strokeWidth="1" strokeDasharray="2 2" />
            <line x1="110" y1="70" x2="155" y2="50" stroke="#27342F" strokeWidth="1" strokeDasharray="2 2" />
            <line x1="110" y1="70" x2="110" y2="120" stroke="#27342F" strokeWidth="1" strokeDasharray="2 2" />
          </svg>
          <p className="text-xs font-bold text-slate-200">No article analyzed yet.</p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
            Submit an article to discover related stories and generate an orbital semantic relationship graph.
          </p>
        </div>

        <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
          Submit an article to generate related-story analysis against the 9,990-article reference corpus.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Story Family & Relationship Map</h3>
            <p className="text-[10px] text-slate-400 font-mono">Semantic cosine similarity clustering</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
          <span>{positionedNodes.length} Articles</span>
          <span>•</span>
          <span>{edges.length} Semantic Connections</span>
        </div>
      </div>

      {/* SVG Interactive Canvas */}
      <div className="relative w-full h-[340px] flex items-center justify-center bg-slate-950/60 rounded-xl border border-slate-800/60 overflow-hidden">
        {/* Deselect by clicking empty background */}
        <svg
          width={width}
          height={height}
          onClick={() => setSelectedNode(null)}
          className="overflow-visible select-none max-w-full cursor-default"
        >
          <defs>
            <radialGradient id="queryGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </radialGradient>

            {/* Smooth Outer Glow Filter for Selected Node */}
            <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background orbital guide */}
          <circle
            cx={centerX}
            cy={centerY}
            r={orbitRadius}
            fill="none"
            stroke="#27342F"
            strokeDasharray="4 4"
            strokeWidth="1"
          />

          {/* Edges Layer */}
          {edges.map((edge, idx) => {
            const src = nodeMap[edge.source];
            const tgt = nodeMap[edge.target];
            if (!src || !tgt) return null;

            const isConnected = selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id);
            const edgeOpacity = selectedNode ? (isConnected ? 1.0 : 0.12) : 0.65;
            const edgeWidth = isConnected ? Math.max(2.5, edge.weight * 4.5) : Math.max(1, edge.weight * 3);
            const edgeColor = isConnected ? '#10B981' : '#27342F';

            return (
              <g key={`edge-${idx}`} style={{ transition: 'opacity 200ms ease' }}>
                {/* Secondary glow line for active edge */}
                {isConnected && (
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke="#10B981"
                    strokeWidth={edgeWidth + 4}
                    strokeOpacity={0.25}
                    strokeLinecap="round"
                  />
                )}

                {/* Core Edge Line */}
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke={edgeColor}
                  strokeWidth={edgeWidth}
                  opacity={edgeOpacity}
                  strokeLinecap="round"
                  style={{ transition: 'stroke 200ms ease, opacity 200ms ease, stroke-width 200ms ease' }}
                />

                {/* Edge weight badge */}
                <rect
                  x={(src.x + tgt.x) / 2 - 14}
                  y={(src.y + tgt.y) / 2 - 8}
                  width="28"
                  height="16"
                  rx="4"
                  fill="#151C19"
                  stroke={isConnected ? '#10B981' : '#27342F'}
                  strokeWidth="1"
                  opacity={edgeOpacity}
                  style={{ transition: 'stroke 200ms ease, opacity 200ms ease' }}
                />
                <text
                  x={(src.x + tgt.x) / 2}
                  y={(src.y + tgt.y) / 2 + 3}
                  textAnchor="middle"
                  fill={isConnected ? '#34D399' : '#A7B5AE'}
                  fontSize="9"
                  fontFamily="monospace"
                  opacity={edgeOpacity}
                  style={{ transition: 'fill 200ms ease, opacity 200ms ease' }}
                >
                  {edge.label}
                </text>
              </g>
            );
          })}

          {/* Seed/Query Center Ambient Glow */}
          <circle cx={centerX} cy={centerY} r="45" fill="url(#queryGlow)" pointerEvents="none" />

          {/* Nodes Layer - Static coordinates with smooth glow highlight (Zero shake/movement) */}
          {positionedNodes.map((node) => {
            const isQuery = node.is_query;
            const style = getCategoryStyle(node.category);
            const isSelected = selectedNode?.id === node.id;
            const isNeighbor = activeNeighborIds.has(node.id);
            const nodeColor = isQuery ? '#10B981' : style.hex;

            // Focus dimming for unrelated nodes when a selection is active
            const nodeOpacity = selectedNode ? (isSelected || isNeighbor ? 1.0 : 0.35) : 1.0;

            return (
              <g
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNode(node);
                }}
                className="cursor-pointer"
                style={{
                  opacity: nodeOpacity,
                  transition: 'opacity 200ms ease'
                }}
              >
                {/* 1. SOFT OUTER GLOW (Only on Selected Node) */}
                {isSelected && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isQuery ? 34 : 26}
                    fill={nodeColor}
                    opacity="0.45"
                    filter="url(#softGlow)"
                    pointerEvents="none"
                    style={{ transition: 'opacity 200ms ease' }}
                  />
                )}

                {/* 2. OUTER SELECTION RING (White crisp border) */}
                {isSelected && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isQuery ? 27 : 21}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    opacity="0.85"
                    pointerEvents="none"
                    style={{ transition: 'opacity 200ms ease' }}
                  />
                )}

                {/* 3. NEIGHBOR SECONDARY HIGHLIGHT (Subtle dashed ring) */}
                {isNeighbor && !isSelected && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isQuery ? 26 : 20}
                    fill="none"
                    stroke={nodeColor}
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                    opacity="0.85"
                    pointerEvents="none"
                    style={{ transition: 'opacity 200ms ease' }}
                  />
                )}

                {/* 4. CORE NODE CIRCLE (Exact stable position & size) */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isQuery ? 22 : 16}
                  fill={nodeColor}
                  stroke={isSelected ? '#ffffff' : isQuery ? '#34D399' : '#151C19'}
                  strokeWidth={isSelected ? 2.5 : 2}
                  style={{
                    transition: 'stroke 200ms ease, stroke-width 200ms ease'
                  }}
                />

                {/* 5. NODE LABEL */}
                <text
                  x={node.x}
                  y={node.y + (isQuery ? 32 : 24)}
                  textAnchor="middle"
                  fill={isSelected ? '#ffffff' : isQuery ? '#34D399' : '#A7B5AE'}
                  fontSize="10"
                  fontWeight={isSelected || isQuery ? 'bold' : 'normal'}
                  className="pointer-events-none"
                  style={{ transition: 'fill 200ms ease' }}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute right-3 top-3 bottom-3 w-80 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl p-4 shadow-2xl overflow-y-auto space-y-3 text-xs z-20 animate-in fade-in slide-in-from-right-2 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                Article Inspector
              </span>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${getCategoryStyle(selectedNode.category).bg} ${getCategoryStyle(selectedNode.category).text} border ${getCategoryStyle(selectedNode.category).border} mb-1.5`}>
                {selectedNode.category}
              </span>
              <h5 className="font-bold text-slate-100 text-xs leading-snug">
                {selectedNode.full_title || selectedNode.label}
              </h5>
            </div>

            <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Semantic Similarity:</span>
                <span className="font-mono font-bold text-brand-400">
                  {selectedNode.similarity ? (selectedNode.similarity * 100).toFixed(1) + '%' : '100% (Seed)'}
                </span>
              </div>
              {selectedNode.domain && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Publisher:</span>
                  <span className="font-mono text-slate-200">{selectedNode.domain}</span>
                </div>
              )}
            </div>

            {selectedNode.url && (
              <a
                href={selectedNode.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300 font-medium text-[11px] pt-1"
              >
                <span>View Original Source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>

      <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>Click any node to highlight connections & inspect metadata (Click canvas to deselect)</span>
        <span className="text-brand-400">Cosine Topology</span>
      </div>
    </div>
  );
}
