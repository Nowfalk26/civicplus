import React, { useState, useRef, useCallback } from 'react';

interface PhotoSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export const PhotoSlider: React.FC<PhotoSliderProps> = ({
  beforeUrl,
  afterUrl,
  beforeLabel = 'BEFORE REPAIR • பழுதுபார்ப்பதற்கு முன்',
  afterLabel = 'RESOLVED / AFTER • தீர்க்கப்பட்டது',
  className = '',
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(position);
  }, []);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) handleMove(e.touches[0].clientX);
  };

  const handleMouseDown = () => {
    isDraggingRef.current = true;
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) handleMove(e.clientX);
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      ref={containerRef}
      onTouchMove={handleTouchMove}
      className={`relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden select-none shadow-md border border-surface-container-high bg-surface-container cursor-ew-resize ${className}`}
    >
      {/* After image (Base layer) */}
      <img
        src={afterUrl}
        alt="After Resolution"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
      <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/70 text-emerald-300 font-bold text-xs rounded-md backdrop-blur-xs flex items-center gap-1 z-10 pointer-events-none">
        <span className="material-symbols-outlined text-[14px]">check_circle</span>
        <span>{afterLabel}</span>
      </div>

      {/* Before image (Clipped layer) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforeUrl}
          alt="Before Issue"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ width: containerRef.current?.offsetWidth || '100%' }}
        />
        <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/70 text-red-300 font-bold text-xs rounded-md backdrop-blur-xs flex items-center gap-1 z-10 pointer-events-none">
          <span className="material-symbols-outlined text-[14px]">report_problem</span>
          <span>{beforeLabel}</span>
        </div>
      </div>

      {/* Draggable Divider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)] flex items-center justify-center"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        onMouseDown={handleMouseDown}
      >
        <div className="w-9 h-9 rounded-full bg-white text-primary shadow-lg border-2 border-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
        </div>
      </div>
    </div>
  );
};
