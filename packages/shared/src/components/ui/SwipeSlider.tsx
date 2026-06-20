'use client';

import { useState, useRef, useEffect } from 'react';

interface SwipeSliderProps {
  onComplete: () => void | Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  text?: string;
  successText?: string;
}

export default function SwipeSlider({
  onComplete,
  isLoading = false,
  disabled = false,
  text = 'Swipe to Complete Delivery',
  successText = 'Delivered ✓',
}: SwipeSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [handleWidth, setHandleWidth] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const startXRef = useRef(0);

  useEffect(() => {
    if (containerRef.current && handleRef.current) {
      setSliderWidth(containerRef.current.clientWidth);
      setHandleWidth(handleRef.current.clientWidth);
    }

    const handleResize = () => {
      if (containerRef.current && handleRef.current) {
        setSliderWidth(containerRef.current.clientWidth);
        setHandleWidth(handleRef.current.clientWidth);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxTranslate = sliderWidth - handleWidth - 8; // 4px padding on each side

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || isLoading || isSuccess || maxTranslate <= 0) return;
    setIsDragging(true);
    startXRef.current = e.clientX;
    handleRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startXRef.current;
    const newTranslateX = Math.max(0, Math.min(maxTranslate, deltaX));
    setTranslateX(newTranslateX);
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    handleRef.current?.releasePointerCapture(e.pointerId);

    // If dragged more than 90%, complete the action
    if (translateX >= maxTranslate * 0.9) {
      setTranslateX(maxTranslate);
      setIsSuccess(true);
      try {
        await onComplete();
      } catch (err) {
        setIsSuccess(false);
        setTranslateX(0);
      }
    } else {
      setTranslateX(0);
    }
  };

  const progressPercent = maxTranslate > 0 ? (translateX / maxTranslate) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-14 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden flex items-center select-none touch-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      {/* Dynamic Green Progress Fill */}
      <div
        className="absolute left-0 top-0 bottom-0 bg-emerald-500 transition-all duration-75"
        style={{ width: `${translateX + handleWidth / 2}px`, opacity: isSuccess ? 1 : 0.8 }}
      />

      {/* Label Text - fades as handle is swiped */}
      <div
        className="absolute inset-0 flex items-center justify-center text-xs font-bold pointer-events-none select-none transition-opacity"
        style={{
          opacity: isSuccess ? 0 : Math.max(0, 1 - (progressPercent / 100) * 2.5),
          color: progressPercent > 50 ? '#ffffff' : '#475569',
        }}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
            Updating...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            {text} <span className="text-sm font-normal">→</span>
          </span>
        )}
      </div>

      {/* Success Text */}
      {isSuccess && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold pointer-events-none transition-all duration-300 scale-100">
          {successText}
        </div>
      )}

      {/* Draggable Handle */}
      <div
        ref={handleRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`absolute left-1 z-10 w-12 h-12 rounded-xl flex items-center justify-center shadow-md select-none transition-shadow ${
          isSuccess
            ? 'bg-white text-emerald-600 cursor-default'
            : isDragging
            ? 'bg-emerald-600 text-white cursor-grabbing shadow-lg scale-105'
            : 'bg-white text-slate-700 hover:bg-slate-50 cursor-grab active:cursor-grabbing'
        } transition-transform duration-150`}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1), background-color 200ms',
        }}
      >
        {isSuccess ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : isLoading ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <span className="text-xl">🛵</span>
        )}
      </div>
    </div>
  );
}
