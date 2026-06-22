'use client';

import { useState, useEffect, useCallback, FC, ReactNode } from 'react';

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
  duration = 4000, // Show for 4 seconds instead of 2 seconds
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
      color: '#10b981', // Emerald
      defaultTitle: 'Success',
      icon: (
        <svg style={{ width: 16, height: 16, color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    error: {
      color: '#f43f5e', // Rose
      defaultTitle: 'Error',
      icon: (
        <svg style={{ width: 16, height: 16, color: '#f43f5e' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    warning: {
      color: '#f59e0b', // Amber
      defaultTitle: 'Warning',
      icon: (
        <svg style={{ width: 16, height: 16, color: '#f59e0b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    info: {
      color: '#06b6d4', // Cyan
      defaultTitle: 'Info',
      icon: (
        <svg style={{ width: 16, height: 16, color: '#06b6d4' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  }[type];

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        overflow: 'hidden',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        width: '320px',
        padding: '16px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderLeft: `4px solid ${config.color}`,
        background: 'rgba(15, 23, 42, 0.95)', // Dark premium slate background
        backdropFilter: 'blur(16px)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: isExiting ? 0 : isMounted ? 1 : 0,
        transform: isExiting 
          ? 'translateX(50px) scale(0.95)' 
          : isMounted 
          ? 'translateX(0) scale(1)' 
          : 'translateX(50px) scale(0.95)',
      }}
      role="alert"
    >
      {/* Icon Wrapper */}
      <div style={{
        flexShrink: 0,
        marginTop: '2px',
        padding: '6px',
        borderRadius: '8px',
        background: `${config.color}15`, // 15% opacity tint of accent color
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {config.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
        <h4 style={{
          fontSize: '14px',
          fontWeight: 800,
          color: '#ffffff', // Guaranteed crystal white
          margin: '0 0 4px 0',
          letterSpacing: '0.01em',
          lineHeight: '1.2'
        }}>
          {title || config.defaultTitle}
        </h4>
        <div style={{
          fontSize: '12px',
          color: '#cbd5e1', // Guaranteed light slate grey
          fontWeight: 500,
          lineHeight: '1.4',
          wordBreak: 'break-word'
        }}>
          {children}
        </div>
      </div>

      {/* Close Button */}
      <button
        onClick={triggerClose}
        style={{
          flexShrink: 0,
          background: 'transparent',
          border: 'none',
          padding: '4px',
          cursor: 'pointer',
          color: '#94a3b8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          transition: 'all 0.15s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
        aria-label="Close"
      >
        <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Progress Bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: 'rgba(255, 255, 255, 0.08)'
      }}>
        <div
          style={{
            height: '100%',
            background: config.color,
            width: `${progress}%`,
            transition: 'width 30ms linear'
          }}
        />
      </div>
    </div>
  );
};

export default Toast;