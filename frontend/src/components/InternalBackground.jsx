import React from 'react';
import internalBg from '../assets/landing-bg.png';

/**
 * Global Static Internal Background System
 * Exactly matches the reference image:
 * - dark graphite / near-black base
 * - subtle deep green/teal atmosphere
 * - soft blurred lighting
 * - very subtle green/teal glow around the edges
 * - clean dark center
 * - professional AI/news intelligence appearance
 * - completely stationary: zero movement, zero animation, zero parallax
 */
export default function InternalBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* Master Reference Background Image */}
      <img
        src={internalBg}
        alt=""
        className="w-full h-full object-cover object-center transform-none filter-none"
      />

      {/* Very subtle dark overlay ONLY if necessary to ensure crisp card readability without making it pitch black */}
      <div className="absolute inset-0 bg-black/25 pointer-events-none" />
    </div>
  );
}
