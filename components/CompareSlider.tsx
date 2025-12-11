import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MoveHorizontal } from 'lucide-react';

interface CompareSliderProps {
  original: string;
  generated: string;
  className?: string;
}

export const CompareSlider: React.FC<CompareSliderProps> = ({ original, generated, className }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
      setSliderPosition(percent);
    }
  }, []);

  const onMouseDown = () => (isDragging.current = true);
  const onMouseUp = () => (isDragging.current = false);
  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) handleMove(e.clientX);
  };

  const onTouchStart = () => (isDragging.current = true);
  const onTouchEnd = () => (isDragging.current = false);
  const onTouchMove = (e: React.TouchEvent) => {
    if (isDragging.current) handleMove(e.touches[0].clientX);
  };

  // Global mouse up handler to catch drags outside component
  useEffect(() => {
    const handleGlobalMouseUp = () => (isDragging.current = false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-[500px] overflow-hidden rounded-xl select-none cursor-ew-resize group ${className}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Background Image (Modified/Generated) */}
      <img
        src={generated}
        alt="After"
        className="absolute top-0 left-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Foreground Image (Original) - Clipped */}
      <div
        className="absolute top-0 left-0 h-full w-full overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={original}
          alt="Before"
          className="absolute top-0 left-0 h-full max-w-none object-cover"
          // We must ensure the original image scales exactly like the background image
          // Setting width to the container's width (calculated via 100vw or specific logic) is tricky in pure CSS absolute.
          // However, assuming the container has a fixed aspect ratio or width, 
          // we use standard object-cover. The trick is: the image needs to be the width of the PARENT container.
          style={{ width: containerRef.current ? containerRef.current.clientWidth : '100%' }}
          draggable={false}
        />
      </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-lg z-10 flex items-center justify-center pointer-events-none"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="w-8 h-8 -ml-[15px] bg-white rounded-full shadow-md flex items-center justify-center text-slate-600">
          <MoveHorizontal size={16} />
        </div>
      </div>
      
      {/* Labels */}
      <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm pointer-events-none">
        Original
      </div>
      <div className="absolute top-4 right-4 bg-white/80 text-black px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm pointer-events-none">
        Reimagined
      </div>
    </div>
  );
};