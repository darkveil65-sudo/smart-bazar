'use client';

import { useState, useEffect, useRef, useCallback, FC, ReactNode } from 'react';

interface ToastProps {
  id?: string;
  children: ReactNode;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  duration?: number;
  onClose?: () => void;
}

const Toast: FC<ToastProps> = ({
  children,
  type = 'info',
  duration = 2000,
  onClose,
  title,
}) => {
  const [visible, setVisible] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  // Timer and progress state
  const [timeLeft, setTimeLeft] = useState(duration);
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    // Trigger entrance animation on mount
    setIsMounted(true);
  }, []);

  const triggerClose = useCallback(() => {
    setIsExiting(true);
    // Wait for slide-out/fade-out animation to complete
    setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, 300);
  }, [onClose]);

  // Handle countdown interval
  useEffect(() => {
    if (isPaused || isExiting) return;

    const interval = 30;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - interval;
        if (next <= 0) {
          clearInterval(timer);
          triggerClose();
          return 0;
        }
        return next;
      });
    }, interval);

    return () => {
      clearInterval(timer);
    };
  }, [isPaused, isExiting, triggerClose]);

  // Sync progress bar percentage
  useEffect(() => {
    setProgress((timeLeft / duration) * 100);
  }, [timeLeft, duration]);

  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  if (!visible) return null;

  const config = {
    success: {
      border: 'border-l-emerald-500',
      bgBar: 'bg-emerald-500',
      defaultTitle: 'Success',
      icon: (
        <div className="p-1.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ),
    },
    error: {
      border: 'border-l-rose-500',
      bgBar: 'bg-rose-500',
      defaultTitle: 'Error',
      icon: (
        <div className="p-1.5 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      ),
    },
    warning: {
      border: 'border-l-amber-500',
      bgBar: 'bg-amber-500',
      defaultTitle: 'Warning',
      icon: (
        <div className="p-1.5 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      ),
    },
    info: {
      border: 'border-l-blue-500',
      bgBar: 'bg-blue-500',
      defaultTitle: 'Info',
      icon: (
        <div className="p-1.5 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      ),
    },
  }[type];

  // Combine transition states to produce class name
  const animClass = isExiting
    ? 'opacity-0 translate-x-12 scale-95 duration-300'
    : isMounted
    ? 'opacity-100 translate-x-0 scale-100'
    : 'opacity-0 translate-x-12 scale-95';

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden pointer-events-auto flex items-start gap-3 w-80 max-w-sm p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md shadow-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-2xl hover:scale-[1.02] border-l-4 ${config.border} ${animClass}`}
      role="alert"
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">{config.icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-2">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-0.5">
          {title || config.defaultTitle}
        </h4>
        <div className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed break-words">
          {children}
        </div>
      </div>

      {/* Close Button */}
      <button
        onClick={triggerClose}
        className="flex-shrink-0 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
        aria-label="Close"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-100 dark:bg-slate-800/50">
        <div
          className={`h-full ${config.bgBar} transition-all duration-[30ms] ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default Toast;