'use client';

import { FC, ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { useCartStore } from '@smart-bazar/shared/stores/cartStore';
import { DELIVERY_TIME_MINUTES } from '@smart-bazar/shared/lib/constants';

interface CustomerLayoutProps {
  children: ReactNode;
}

const navItems = [
  {
    label: 'Home',
    href: '/home',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    activeIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22" fill="white" stroke="white" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    label: 'Categories',
    href: '/category',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
    activeIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    label: 'Cart',
    href: '/cart',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
      </svg>
    ),
    activeIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0.5">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
      </svg>
    ),
  },
  {
    label: 'Orders',
    href: '/orders',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
    activeIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8" fill="none" stroke="white" strokeWidth="1.5"/>
        <line x1="16" y1="13" x2="8" y2="13" stroke="white" strokeWidth="1.5"/>
        <line x1="16" y1="17" x2="8" y2="17" stroke="white" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    activeIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0.5">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

const CustomerLayout: FC<CustomerLayoutProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { userData, initialized } = useAuthStore();
  const itemCount = useCartStore((s) => s.getItemCount());

  // Auth guard — redirect unauthenticated users
  useEffect(() => {
    if (initialized && !userData) {
      router.push('/');
    }
  }, [userData, initialized, router]);

  // Show nothing while checking auth
  if (!initialized || !userData) return null;

  return (
    <div className="min-h-screen min-h-dvh bg-background">
      {/* ===== TOP HEADER ===== */}
      <header className="sticky top-0 z-30 glass border-b border-border/60" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-[430px] mx-auto px-4 py-3 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 flex items-center justify-center">
              <img src="/logo.svg" alt="Smart Bazar" className="w-full h-full" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-primary leading-none">Smart Bazar</h1>
              <div className="flex items-center gap-1">
                <span className="status-dot live" />
                <p className="text-[10px] text-muted-foreground font-medium">
                  Delivery in {DELIVERY_TIME_MINUTES} mins
                </p>
              </div>
            </div>
          </div>

          {/* Cart button in header */}
          <button
            onClick={() => router.push('/cart')}
            className="relative p-2 rounded-xl hover:bg-muted transition-colors press-effect"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-scaleInBounce">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-[430px] mx-auto pb-nav animate-fadeIn">
        {children}
      </main>

      {/* ===== BOTTOM NAVIGATION ===== */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-border/60"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="max-w-[430px] mx-auto flex items-center justify-around py-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-2xl transition-all duration-200 press-effect relative ${
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {/* Active background pill */}
                {active && (
                  <span
                    className="absolute inset-0 rounded-2xl opacity-10 animate-scaleIn"
                    style={{ background: 'var(--primary)' }}
                  />
                )}
                <div className="relative">
                  {active ? item.activeIcon : item.icon}
                  {/* Cart badge */}
                  {item.href === '/cart' && itemCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold ${active ? 'text-primary' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default CustomerLayout;
