import React from 'react';
import masterBg from '../assets/landing-bg.jpg';

/**
 * Global Static Master Background
 * Completely stationary, fixed visual layer behind all application content.
 * Does not move, animate, or scroll with content.
 */
export default function MasterBackground({ overlayOpacity = 'bg-slate-950/75' }) {
  return (
    <div
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0"
      aria-hidden="true"
      style={{ willChange: 'transform' }}
    >
      <img
        src={masterBg}
        alt=""
        className="w-full h-full object-cover object-center transform-none filter-none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center'
        }}
      />
      {/* Dark readability overlay to ensure high contrast for cards, tables, and text */}
      <div className={`absolute inset-0 ${overlayOpacity} pointer-events-none`} />
    </div>
  );
}
