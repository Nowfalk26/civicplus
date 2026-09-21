import React, { useState, useEffect, useRef } from 'react';

interface StartupSplashProps {
  onFinish?: () => void;
}

export const StartupSplash: React.FC<StartupSplashProps> = ({ onFinish }) => {
  // Check if startup animation already ran in this session
  const [shouldShow, setShouldShow] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !sessionStorage.getItem('civicsplus_startup_seen');
  });

  // Stages: 'logo' | 'fading' | 'done'
  const [stage, setStage] = useState<'logo' | 'fading' | 'done'>('logo');
  const logoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Smooth fade out of splash overlay
  const handleFadeOut = () => {
    setStage('fading');
    setTimeout(() => {
      setStage('done');
      setShouldShow(false);
      try {
        sessionStorage.setItem('civicsplus_startup_seen', 'true');
      } catch (e) {
        // Ignore if storage restricted
      }
      if (onFinish) {
        onFinish();
      }
    }, 700); // 700ms fade transition
  };

  // Skip startup animation
  const handleSkip = () => {
    if (logoTimerRef.current) clearTimeout(logoTimerRef.current);
    handleFadeOut();
  };

  useEffect(() => {
    if (!shouldShow) return;

    if (stage === 'logo') {
      logoTimerRef.current = setTimeout(() => {
        handleFadeOut();
      }, 1800);
    }

    return () => {
      if (logoTimerRef.current) clearTimeout(logoTimerRef.current);
    };
  }, [shouldShow, stage]);

  if (!shouldShow || stage === 'done') {
    return null;
  }

  return (
    <div
      aria-label="Civic+ Startup Screen"
      className={`fixed inset-0 z-[99999] bg-white flex flex-col items-center justify-center select-none overflow-hidden transition-opacity duration-700 ease-out ${
        stage === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Centered Media Container */}
      <div className="relative w-full max-w-sm sm:max-w-md md:max-w-lg aspect-square flex items-center justify-center p-6">
        {/* Exact CIVIC+ Logo Image */}
        {(stage === 'logo' || stage === 'fading') && (
          <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
            <img
              src="/civicsplus-logo.png"
              alt="Civic+"
              className="w-full h-full object-contain drop-shadow-sm"
              loading="eager"
            />
          </div>
        )}
      </div>

      {/* Subtle Bottom Loading / Progress Indicator */}
      <div className="absolute bottom-10 flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse delay-100" />
          <span className="w-2 h-2 rounded-full bg-primary/30 animate-pulse delay-200" />
        </div>
        <p className="text-[11px] font-semibold text-on-surface-variant tracking-wider uppercase">
          Civic+ • Tamil Nadu
        </p>
      </div>

      {/* Discreet Skip Button (Touch-Friendly) */}
      <button
        type="button"
        onClick={handleSkip}
        className="absolute top-6 right-6 px-3.5 py-1.5 rounded-full bg-surface-container-high/60 hover:bg-surface-container text-on-surface-variant text-xs font-semibold backdrop-blur-sm transition-all active:scale-95 flex items-center gap-1"
        aria-label="Skip splash"
      >
        <span>Skip</span>
        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
      </button>
    </div>
  );
};

