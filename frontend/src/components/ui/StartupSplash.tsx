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

  // Stages: 'video' | 'logo' | 'fading' | 'done'
  const [stage, setStage] = useState<'video' | 'logo' | 'fading' | 'done'>('video');
  const [videoLoaded, setVideoLoaded] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const logoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Transition to Logo Image stage
  const handleTransitionToLogo = () => {
    if (stage !== 'video') return;
    setStage('logo');

    // Display the logo image cleanly for 1.8 seconds before smoothly fading into app
    logoTimerRef.current = setTimeout(() => {
      handleFadeOut();
    }, 1800);
  };

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
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    handleFadeOut();
  };

  useEffect(() => {
    if (!shouldShow) return;

    // Safety fallback timer: If video fails to start playing within 1.5s, advance to logo
    safetyTimerRef.current = setTimeout(() => {
      if (stage === 'video' && !videoLoaded) {
        console.warn('Video not loaded or started within threshold, falling back to logo image.');
        handleTransitionToLogo();
      }
    }, 1500);

    // Hard absolute safety timeout: Startup sequence must NEVER hold user past 7 seconds
    const hardTimeout = setTimeout(() => {
      handleFadeOut();
    }, 7000);

    return () => {
      if (logoTimerRef.current) clearTimeout(logoTimerRef.current);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      clearTimeout(hardTimeout);
    };
  }, [shouldShow, stage, videoLoaded]);

  // Attempt auto-play with sound muted (required for modern iOS & Android webview autoplay)
  useEffect(() => {
    if (stage === 'video' && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setVideoLoaded(true);
          })
          .catch(() => {
            // Autoplay blocked or asset missing -> immediately fallback to logo
            handleTransitionToLogo();
          });
      }
    }
  }, [stage]);

  if (!shouldShow || stage === 'done') {
    return null;
  }

  return (
    <div
      aria-label="Civics Plus Startup Screen"
      className={`fixed inset-0 z-[99999] bg-white flex flex-col items-center justify-center select-none overflow-hidden transition-opacity duration-700 ease-out ${
        stage === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Centered Media Container */}
      <div className="relative w-full max-w-sm sm:max-w-md md:max-w-lg aspect-square flex items-center justify-center p-6">
        {/* Step 1: Animation Video */}
        {stage === 'video' && (
          <div className="w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              preload="auto"
              onPlaying={() => setVideoLoaded(true)}
              onEnded={handleTransitionToLogo}
              onError={handleTransitionToLogo}
              className="w-full h-full object-contain rounded-2xl"
            >
              <source src="/civicsplus-animation.mp4" type="video/mp4" />
              <source src="/logo-animation.mp4" type="video/mp4" />
              <source src="/civicsplus-animation.webm" type="video/webm" />
            </video>
          </div>
        )}

        {/* Step 2: Exact CIVICS PLUS Logo Image */}
        {(stage === 'logo' || stage === 'fading') && (
          <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
            <img
              src="/civicsplus-logo.png"
              alt="Civics Plus"
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
          {stage === 'video'
            ? 'Initializing Civic System...'
            : 'Civics Plus • Tamil Nadu'}
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
