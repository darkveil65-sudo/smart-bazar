'use client';

import { useEffect, ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { FullPageSpinner } from '@/components/ui/Spinner';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const init = useAuthStore((s) => s.init);
  const loading = useAuthStore((s) => s.loading);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (!initialized) {
      const unsubscribe = init();
      return () => unsubscribe();
    }
  }, [init, initialized]);

  if (loading) {
    return <FullPageSpinner />;
  }

  return <>{children}</>;
};

export { useAuthStore } from '@/stores/authStore';