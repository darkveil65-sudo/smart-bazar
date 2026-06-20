'use client';

import React, { useState, useRef, useEffect } from 'react';

interface SwipeSliderProps {
  onComplete: () => void;
  isLoading?: boolean;
  text?: string;
  completedText?: string;
}

export const SwipeSlider: React.FC<SwipeSliderProps> = ({
  onComplete,
  isLoading = false,
  text = "Swipe to Complete",
  completedText = "Completed"
}) => {
  const [isSwiped, setIsSwiped] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);

  // Automatically reset swipe status when loading turns off and it is no longer pending
  useEffect(() => {
    if (!isLoading && isSwiped) {
      const timer = setTimeout(() => {
        setIsSwiped(false);
        setDragX(0);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isSwiped]);

  const getMaxDrag = () => {
    if (containerRef.current && handleRef.current) {
      return containerRef.current.clientWidth - handleRef.current.clientWidth - 8; // 8px buffer for padding/margins
    }
    return 0;
  };

  const handleStart = (clientX: number) => {
    if (isSwiped || isLoading) return;
    setIsDragging(true);
    startXRef.current = clientX - dragX;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || isSwiped || isLoading) return;
    const max = getMaxDrag();
    const newX = Math.max(0, Math.min(clientX - startXRef.current, max));
    setDragX(newX);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const max = getMaxDrag();
    if (max > 0 && dragX >= max * 0.85) {
      // Success! Snap to end
      setDragX(max);
      setIsSwiped(true);
      onComplete();
    } else {
      // Snap back to start
      setDragX(0);
    }
  };

  // Touch Events
  const onTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const onTouchEnd = () => {
    handleEnd();
  };

  // Mouse Events for desktop testing
  const onMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleEnd();
      }
    };
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX);
      }
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isDragging, dragX]);

  const max = getMaxDrag() || 1;
  const opacity = isDragging ? Math.max(0, 1 - (dragX / max) * 1.5) : 1;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-12 bg-slate-100 rounded-full p-1 border overflow-hidden select-none flex items-center justify-center transition-colors duration-300 ${
        isSwiped ? 'border-green-200 bg-green-50' : 'border-slate-200'
      }`}
      style={{ touchAction: 'none' }}
    >
      {/* Background track text */}
      <span 
        className={`text-xs font-extrabold transition-all duration-150 uppercase tracking-wider select-none ${
          isSwiped ? 'text-green-600 animate-pulse' : 'text-slate-400'
        }`} 
        style={{ opacity }}
      >
        {isSwiped ? (isLoading ? 'Processing...' : completedText) : text}
      </span>

      {/* Swipe handle */}
      <div
        ref={handleRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        className={`absolute left-1 top-1 w-10 h-10 rounded-full flex items-center justify-center text-white cursor-grab active:cursor-grabbing shadow-[0_2px_8px_rgba(0,0,0,0.15)] ${
          isSwiped 
            ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
            : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600'
        }`}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : isSwiped ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </div>
  );
};
