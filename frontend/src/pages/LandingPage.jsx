import React from 'react';
import { ArrowRight } from 'lucide-react';
import landingBg from '../assets/landing-bg.jpg';

export default function LandingPage({ onEnter }) {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-end overflow-hidden select-none bg-slate-950">
      <style>{`
        /* Smooth continuous data spark movement */
        @keyframes sparkTrailMove {
          0% {
            stroke-dashoffset: 320;
            opacity: 0.2;
          }
          35% {
            opacity: 0.95;
          }
          85% {
            opacity: 0.95;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 0.2;
          }
        }
        .spark-dash-trail {
          animation: sparkTrailMove 4.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        @keyframes sparkPulseNode {
          0%, 100% {
            transform: scale(1);
            opacity: 0.75;
          }
          50% {
            transform: scale(1.25);
            opacity: 1;
            filter: drop-shadow(0 0 6px rgba(52, 211, 153, 0.9));
          }
        }
        .spark-node-pulse {
          animation: sparkPulseNode 2.4s ease-in-out infinite;
        }
      `}</style>

      {/* =========================================================
          BACKGROUND LAYER: Provided Background Image
          Aditya University Newspaper (Left) + Digital Globe (Center/Right) + Floating Cards
          (100% Intact, Preserved Exactly As Provided)
          ========================================================= */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <img
          src={landingBg}
          alt="News Intelligence Platform"
          className="w-full h-full object-cover object-center"
        />
        {/* Soft edge gradient to ensure crisp readability of right-side entry */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-slate-950/60 pointer-events-none" />
      </div>

      {/* =========================================================
          RIGHT-SIDE INTERACTIVE PROJECT ENTRY & FLOWING DATA SPARK
          ========================================================= */}
      <div className="relative z-20 w-full flex items-center justify-end px-6 sm:px-10 md:px-14 lg:px-16 xl:px-24 py-12">
        <div
          onClick={onEnter}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onEnter();
          }}
          className="group relative cursor-pointer select-none max-w-sm sm:max-w-md lg:max-w-lg rounded-2xl p-6 sm:p-7 md:p-8 bg-slate-950/60 hover:bg-slate-950/80 border border-emerald-500/20 hover:border-emerald-400/50 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.65)] hover:shadow-[0_0_45px_rgba(16,185,129,0.22)] transition-all duration-300"
        >
          {/* Subtle Emerald Ambient Glow on hover */}
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-teal-500/0 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          {/* =========================================================
              SUBTLE ANIMATED EMERALD / TEAL DATA SPARK & TRACE
              (Flowing along curved path from Digital Globe toward Heading)
              ========================================================= */}
          <div className="absolute -left-28 sm:-left-36 md:-left-44 top-1/2 -translate-y-1/2 w-36 sm:w-44 md:w-52 h-32 sm:h-36 pointer-events-none overflow-visible opacity-75 group-hover:opacity-100 transition-opacity duration-300">
            <svg
              viewBox="0 0 220 120"
              className="w-full h-full overflow-visible"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter id="sparkGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="sparkTrailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                  <stop offset="65%" stopColor="#059669" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0.95" />
                </linearGradient>
              </defs>

              {/* Faint static trajectory path from the globe */}
              <path
                d="M 5,95 C 65,90 120,45 210,32"
                stroke="rgba(16, 185, 129, 0.22)"
                strokeWidth="1.2"
                strokeDasharray="3 4"
              />

              {/* Animated soft fade trail */}
              <path
                d="M 5,95 C 65,90 120,45 210,32"
                stroke="url(#sparkTrailGrad)"
                strokeWidth="1.8"
                strokeDasharray="55 245"
                className="spark-dash-trail"
              />

              {/* Moving glowing spark head (native SVG animateMotion for 60fps smoothness) */}
              <circle r="3.2" fill="#a7f3d0" filter="url(#sparkGlow)">
                <animateMotion
                  path="M 5,95 C 65,90 120,45 210,32"
                  dur="4.8s"
                  repeatCount="indefinite"
                />
              </circle>

              {/* Secondary faint micro pulse for natural signal flow */}
              <circle r="1.8" fill="#34d399" opacity="0.6">
                <animateMotion
                  path="M 5,95 C 65,90 120,45 210,32"
                  dur="4.8s"
                  begin="0.22s"
                  repeatCount="indefinite"
                />
              </circle>

              {/* Small terminal arrival node at the heading boundary */}
              <circle cx="210" cy="32" r="3" fill="#10b981" className="spark-node-pulse" />
              <circle
                cx="210"
                cy="32"
                r="6.5"
                stroke="rgba(52, 211, 153, 0.4)"
                strokeWidth="0.8"
                fill="none"
              />
            </svg>
          </div>

          {/* Heading Content */}
          <div className="relative z-10 space-y-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white group-hover:text-emerald-50 transition-colors uppercase font-sans">
              NEWS INTELLIGENCE PLATFORM
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-medium tracking-wide leading-relaxed group-hover:text-slate-200 transition-colors pt-0.5">
              AI-Powered News Category Classification & Intelligent Analysis
            </p>

            <div className="pt-3">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-emerald-400 group-hover:text-emerald-300 transition-all">
                <span>EXPLORE PLATFORM</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
