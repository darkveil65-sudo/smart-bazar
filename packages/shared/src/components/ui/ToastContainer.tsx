'use client';

import { FC } from 'react';
import Toast from './Toast';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';

interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const ToastContainer: FC<ToastContainerProps> = ({
  position = 'bottom-right',
}) => {
  const { toasts, removeToast } = useToast();

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div className={`fixed z-50 ${positionClasses[position]} flex flex-col gap-2 pointer-events-auto`}>
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
  );
};

export default ToastContainer;