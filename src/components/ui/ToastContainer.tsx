'use client';

import { useState, ReactNode, FC } from 'react';
import Toast from './Toast';

interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const ToastContainer: FC<ToastContainerProps> = ({
  position = 'bottom-right',
}) => {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    children: ReactNode;
    type?: 'success' | 'error' | 'warning' | 'info';
  }>>([]);

let nextToastId = 0;

  const addToast = (children: ReactNode, type?: 'success' | 'error' | 'warning' | 'info') => {
    const id = String(nextToastId++);
    setToasts(prev => [...prev, { id, children, type }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <>
      <div className={`fixed z-50 ${positionClasses[position]} flex space-y-3 max-w-full pointer-events-auto`}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          >
            {toast.children}
          </Toast>
        ))}
      </div>
      {/* Return the addToast function via context or prop in a real implementation */}
      <div id="toast-api" data-add-toast={JSON.stringify({ addToast })} style={{ display: 'none' }} />
    </>
  );
};

export default ToastContainer;