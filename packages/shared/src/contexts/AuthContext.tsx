'use client';

import { useEffect, ReactNode } from 'react';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { FullPageSpinner } from '@smart-bazar/shared/components/ui/Spinner';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const init = useAuthStore((s) => s.init);
  const loading = useAuthStore((s) => s.loading);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    const unsubscribe = init();
    return () => unsubscribe();
  }, [init]);

  if (loading) {
    return <FullPageSpinner />;
  }

  return <>{children}</>;
};

export { useAuthStore } from '@smart-bazar/shared/stores/authStore';