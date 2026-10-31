import React, { useState, useRef, useEffect, useCallback } from 'react';

interface BeforeAfterSliderProps {
  originalSrc: string;
  enhancedCanvas: HTMLCanvasElement | null;
  className?: string;
  originalLabel?: string;
  enhancedLabel?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  originalSrc,
  enhancedCanvas,
  className = '',
  originalLabel = 'ORIGINAL',
  enhancedLabel = 'GPU ENHANCED',
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0 to 100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const enhancedCanvasHolderRef = useRef<HTMLDivElement>(null);

  // Sync enhanced canvas into the holder div
  useEffect(() => {
    if (!enhancedCanvasHolderRef.current) return;
    enhancedCanvasHolderRef.current.innerHTML = '';
    if (enhancedCanvas) {
      enhancedCanvas.style.width = '100%';
      enhancedCanvas.style.height = '100%';
      enhancedCanvas.style.objectFit = 'contain';
      enhancedCanvasHolderRef.current.appendChild(enhancedCanvas);
    }
  }, [enhancedCanvas]);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clampedPos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(clampedPos);
  }, []);

  const onMouseDown = () => setIsDragging(true);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    };

    const onMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length === 0) return;
      handleMove(e.touches[0].clientX);
    };

    const onTouchEnd = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, handleMove]);

  return (
    <div
      ref={containerRef}
      className={`relative select-none overflow-hidden rounded-lg bg-[#070A0F] border border-studio-border ${className}`}
      onMouseDown={onMouseDown}
      onTouchStart={() => setIsDragging(true)}
    >
      {/* 1. Underlying Right Side: Enhanced View */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center">
        {enhancedCanvas ? (
          <div ref={enhancedCanvasHolderRef} className="w-full h-full flex items-center justify-center" />
        ) : (
          <img
            src={originalSrc}
            alt="Enhanced Placeholder"
            className="w-full h-full object-contain filter"
          />
        )}
        <div className="absolute top-3 right-3 bg-blue-600/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono tracking-wider text-white shadow-lg pointer-events-none">
          {enhancedLabel}
        </div>
      </div>

      {/* 2. Overlay Left Side: Original Image clipped at sliderPos % */}
      <div
        className="absolute inset-0 w-full h-full overflow-hidden"
        style={{ width: `${sliderPos}%` }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%' }}
        >
          <img
            src={originalSrc}
            alt="Original"
            className="w-full h-full object-contain"
          />
          <div className="absolute top-3 left-3 bg-slate-800/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono tracking-wider text-slate-200 shadow-lg pointer-events-none">
            {originalLabel}
          </div>
        </div>
      </div>

      {/* 3. Divider Line and Draggable Handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 cursor-ew-resize z-20 shadow-[0_0_10px_rgba(34,211,238,0.7)]"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-slate-900 border-2 border-cyan-400 flex items-center justify-center shadow-xl cursor-ew-resize">
          <div className="flex space-x-0.5">
            <div className="w-0.5 h-3 bg-cyan-400 rounded-full" />
            <div className="w-0.5 h-3 bg-cyan-400 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
