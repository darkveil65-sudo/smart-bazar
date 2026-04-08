'use client';

import { FC, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCartStore } from '@smart-bazar/shared/stores/cartStore';
import { DELIVERY_TIME_MINUTES } from '@smart-bazar/shared/lib/constants';

interface CustomerLayoutProps {
  children: ReactNode;
}

const navItems = [
  { label: 'Home', href: '/home', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  )},
  { label: 'Categories', href: '/category', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
  )},
  { label: 'Cart', href: '/cart', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
  )},
  { label: 'Orders', href: '/orders', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
  )},
];

const CustomerLayout: FC<CustomerLayoutProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const itemCount = useCartStore((s) => s.getItemCount());

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top header */}
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-primary">🛒 Smart Bazar</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#22c55e" strokeWidth="1.5"/><path d="M6 3.5V6L7.5 7.5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Delivery in {DELIVERY_TIME_MINUTES} mins
            </p>
          </div>
          <button
            onClick={() => router.push('/cart')}
            className="relative p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center animate-scaleIn">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-lg mx-auto">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-t border-border">
        <div className="max-w-lg mx-auto flex items-center justify-around py-1.5">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200
                  ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <div className="relative">
                  {item.icon}
                  {item.href === '/cart' && itemCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default CustomerLayout;
