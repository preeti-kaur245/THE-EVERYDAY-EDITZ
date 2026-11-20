/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';

interface BrandIntroLoaderProps {
  onComplete?: () => void;
}

export const BrandIntroLoader: React.FC<BrandIntroLoaderProps> = ({ onComplete }) => {
  // Check if user already saw the intro in this session or prefers reduced motion
  const [shouldRender, setShouldRender] = useState(() => {
    if (typeof window === 'undefined') return false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const alreadySeen = sessionStorage.getItem('edz_intro_seen_v1');
    return !reducedMotion && !alreadySeen;
  });

  const [stage, setStage] = useState<number>(1);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    if (!shouldRender) {
      if (onComplete) onComplete();
      return;
    }

    // Sequence stages
    // Stage 1 (0ms): Warm ivory background + delicate fine framing lines
    // Stage 2 (400ms): Logo insignia smooth reveal with soft gold bloom
    const t1 = setTimeout(() => setStage(2), 350);

    // Stage 3 (900ms): Typography reveal: "THE EVERYDAY EDITZ" & "Your Everyday. Your Expression."
    const t2 = setTimeout(() => setStage(3), 850);

    // Stage 4 (1400ms): Subtle editorial progress bar + "Curating your experience..."
    const t3 = setTimeout(() => setStage(4), 1350);

    // Stage 5 (2300ms): Luxury fade transition
    const t4 = setTimeout(() => {
      setIsFadingOut(true);
    }, 2350);

    // Cleanup & dismiss after fade-out transition (2800ms)
    const t5 = setTimeout(() => {
      sessionStorage.setItem('edz_intro_seen_v1', 'true');
      setShouldRender(false);
      if (onComplete) onComplete();
    }, 2850);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [shouldRender, onComplete]);

  const handleSkip = () => {
    sessionStorage.setItem('edz_intro_seen_v1', 'true');
    setIsFadingOut(true);
    setTimeout(() => {
      setShouldRender(false);
      if (onComplete) onComplete();
    }, 300);
  };

  if (!shouldRender) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-100 flex flex-col items-center justify-center bg-[#F7F5F0] transition-opacity duration-700 ease-out select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Delicate Architectural Fine Lines (Stage 1) */}
      <div 
        className={`absolute inset-6 sm:inset-12 border border-[#B7A18D]/20 pointer-events-none transition-opacity duration-1000 ${
          stage >= 1 ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Subtle corner ticks */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t border-l border-[#B7A18D]/60" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t border-r border-[#B7A18D]/60" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b border-l border-[#B7A18D]/60" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b border-r border-[#B7A18D]/60" />
      </div>

      {/* Skip button for non-blocking immediate access */}
      <button
        onClick={handleSkip}
        className="absolute top-8 right-8 text-[11px] font-medium tracking-widest uppercase text-[#242424]/40 hover:text-[#242424] transition-colors cursor-pointer py-1 px-3 z-10"
      >
        Skip to Store →
      </button>

      {/* Main Brand Content Block */}
      <div className="relative flex flex-col items-center max-w-sm px-6 text-center">
        
        {/* Stage 2: Official Circular Intertwined 'EE' Rose-Gold / Gold Emblem */}
        <div
          className={`relative mb-6 transition-all duration-1000 ease-out ${
            stage >= 2 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-3'
          }`}
        >
          {/* Subtle luminous halo */}
          <div className="absolute -inset-4 bg-gradient-to-tr from-[#D9A6A0]/25 via-amber-100/30 to-[#B7A18D]/20 rounded-full blur-xl opacity-75" />

          {/* Emblem Container with Fine Rose-Gold Border */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-white shadow-xl ring-1 ring-[#D9A6A0]/40 overflow-hidden flex items-center justify-center">
            <img
              src="/brand-logo.jpg"
              alt="The Everyday Editz Insignia"
              className="w-full h-full object-cover rounded-full"
            />
            {/* Subtle Metallic Light Sweep Animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-brand-shimmer pointer-events-none" />
          </div>
        </div>

        {/* Stage 3: Typography Reveal: Brand Name & Tagline */}
        <div
          className={`transition-all duration-700 ease-out space-y-2 ${
            stage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="text-[10px] tracking-[0.3em] uppercase text-[#B7A18D] font-medium font-mono">
            Raftaar Solutions
          </div>
          
          <h1 className="text-xl sm:text-2xl font-bold tracking-[0.2em] text-[#242424] uppercase">
            The Everyday Editz
          </h1>

          <p className="text-xs sm:text-sm italic tracking-wide text-[#242424]/75 font-serif pt-1">
            “Your Everyday. Your Expression.”
          </p>
        </div>

        {/* Stage 4: Fine Editorial Progress Line & Quiet Status */}
        <div
          className={`mt-8 w-44 flex flex-col items-center space-y-2.5 transition-all duration-700 ${
            stage >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          {/* Elegant hairline track */}
          <div className="w-full h-0.5 bg-[#242424]/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#B7A18D] via-[#D9A6A0] to-[#536B57] w-full animate-pulse transition-all duration-1000 ease-in-out" />
          </div>

          <span className="text-[10px] tracking-widest uppercase text-[#242424]/50 font-mono">
            Curating your experience...
          </span>
        </div>

      </div>

      {/* Discreet bottom hallmark */}
      <div className="absolute bottom-8 text-[10px] tracking-wider text-[#242424]/30 font-mono">
        everyday_editz.in
      </div>
    </div>
  );
};
