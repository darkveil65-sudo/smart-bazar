'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { FullPageSpinner } from '@smart-bazar/shared/components/ui/Spinner';
import { useRouter, usePathname } from 'next/navigation';
import { getAppUrl } from '@smart-bazar/shared/lib/urls';

const getDashPath = (role: string) => {
  switch (role) {
    case 'admin':
    case 'co-admin':
      return '/dashboard/admin';
    case 'manager':
      return '/dashboard/manager';
    case 'store':
      return '/dashboard/store';
    case 'delivery':
      return '/dashboard/delivery';
    case 'customer':
      return '/home';
    default:
      return '/';
  }
};

interface AuthProviderProps {
  children: ReactNode;
  allowedRoles?: string[];
  defaultAuthPath?: string;
  publicPaths?: string[];
}

export const AuthProvider = ({
  children,
  allowedRoles,
  defaultAuthPath,
  publicPaths = ['/'],
}: AuthProviderProps) => {
  const init = useAuthStore((s) => s.init);
  const loading = useAuthStore((s) => s.loading);
  const initialized = useAuthStore((s) => s.initialized);
  const userData = useAuthStore((s) => s.userData);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPage = pathname ? publicPaths.includes(pathname) : false;

  useEffect(() => {
    setMounted(true);
    const unsubscribe = init();
    return () => unsubscribe();
  }, [init]);

  useEffect(() => {
    if (!mounted || !initialized) return;

    if (!userData) {
      // Guest user
      if (!isPublicPage) {
        // Accessing a protected route, redirect to login page of the current app
        router.replace('/');
      }
    } else {
      // Authenticated user
      const role = userData.role;
      const hasAccess = allowedRoles ? allowedRoles.includes(role) : true;

      if (!hasAccess) {
        // Role mismatch, redirect to the correct app landing page
        const targetUrl = getAppUrl(role) + getDashPath(role);
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        if (origin && targetUrl.startsWith(origin)) {
          const relativePath = targetUrl.replace(origin, '');
          router.replace(relativePath);
        } else {
          window.location.href = targetUrl;
        }
      } else if (isPublicPage) {
        // Correct role, but on public page, redirect to default authenticated path
        if (defaultAuthPath) {
          router.replace(defaultAuthPath);
        }
      }
    }
  }, [mounted, initialized, userData, pathname, router, allowedRoles, defaultAuthPath, isPublicPage]);

  // Prevent hydration mismatch by rendering the spinner on the server 
  // and the very first client render, matching exactly what the server outputs.
  // Also, do not render children if we are in the middle of a redirect to avoid flashing unauthorized screens.
  const isRedirecting = 
    mounted && 
    initialized && 
    ((!userData && !isPublicPage) || // guest trying to access protected route
     (userData && allowedRoles && !allowedRoles.includes(userData.role)) || // wrong role
     (userData && isPublicPage && defaultAuthPath)); // correct role but on public page

  if (!mounted || loading || !initialized || isRedirecting) {
    return <FullPageSpinner />;
  }

  return <>{children}</>;
};

export { useAuthStore } from '@smart-bazar/shared/stores/authStore';