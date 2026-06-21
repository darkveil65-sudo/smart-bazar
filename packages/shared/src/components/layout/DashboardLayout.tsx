'use client';

import { FC, ReactNode, useState, useEffect, CSSProperties } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { getAppUrl } from '@smart-bazar/shared/lib/urls';
import { NotificationBell } from '../NotificationBell';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number;
}

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  navItems: NavItem[];
  accentColor?: string;
}

const getDashPath = (role: string) => {
  switch (role) {
    case 'admin':
    case 'co-admin': return '/dashboard/admin';
    case 'manager': return '/dashboard/manager';
    case 'store': return '/dashboard/store';
    case 'delivery': return '/dashboard/delivery';
    default: return '/';
  }
};

const ROLE_ACCESS: Record<string, string[]> = {
  '/dashboard/admin': ['admin', 'co-admin'],
  '/dashboard/manager': ['manager'],
  '/dashboard/store': ['store'],
  '/dashboard/delivery': ['delivery'],
};

const DashboardLayout: FC<DashboardLayoutProps> = ({
  children,
  title,
  navItems,
  accentColor = '#3b82f6',
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { userData, loading, initialized, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Set mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const protectedPrefix = pathname ? Object.keys(ROLE_ACCESS).find(prefix => pathname.startsWith(prefix)) : undefined;
  const isAuthorized = !protectedPrefix || (userData && ROLE_ACCESS[protectedPrefix].includes(userData.role));

  useEffect(() => {
    if (!initialized) return;

    if (!userData && !loading) {
      router.replace('/');
      return;
    }

    if (userData && protectedPrefix) {
      const allowedRoles = ROLE_ACCESS[protectedPrefix];
      if (!allowedRoles.includes(userData.role)) {
        const targetUrl = getAppUrl(userData.role) + getDashPath(userData.role);
        if (targetUrl.startsWith('http')) {
          window.location.href = targetUrl;
        } else {
          router.replace(targetUrl);
        }
      }
    }
  }, [userData, loading, initialized, pathname, router, protectedPrefix]);

  // Prevent flashing unauthenticated or unauthorized content
  if (!mounted || !initialized || (loading && !userData) || (userData && !isAuthorized)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!userData) return null;


  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const initial = userData?.name?.[0]?.toUpperCase() || 'U';
  const roleName = userData?.role?.replace('-', ' ').toUpperCase() || 'STAFF';

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden bg-transparent">
      {/* Logo area */}
      <div className="px-5 py-5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold text-white shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.35)]"
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)` }}
          >
            🛒
          </div>
          <div>
            <h1 className="text-white font-extrabold text-sm leading-none tracking-wide">Smart Bazar</h1>
            <p className="text-slate-400 text-[10px] mt-0.5 font-medium opacity-80">{title}</p>
          </div>
        </div>
      </div>

      {/* Sidebar Profile Header */}
      <div className="px-5 py-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-inner transition-all duration-300 hover:bg-white/[0.04]">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
            style={{ background: `linear-gradient(135deg, #10b981, #059669)` }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-slate-100 text-xs font-bold truncate leading-tight">{userData?.name || 'User'}</p>
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" title="Active" />
            </div>
            <p className="text-white/40 text-[9px] font-bold tracking-wider uppercase mt-1 px-1.5 py-0.5 rounded bg-white/[0.04] w-fit border border-white/[0.03]">{roleName}</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto hide-scrollbar">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ease-out relative group hover:scale-[1.02] hover:translate-x-0.5 active:scale-[0.98] cursor-pointer"
              style={
                active
                  ? { background: 'rgba(16, 185, 129, 0.08)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.15)' }
                  : { color: '#94a3b8', border: '1px solid transparent' }
              }
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                  style={{ background: '#10b981' }}
                />
              )}
              <span className={`text-base transition-transform duration-200 ${active ? 'text-[#34d399]' : 'text-slate-400 group-hover:text-slate-200 group-hover:scale-110'}`}>{item.icon}</span>
              <span className={`flex-1 text-left ${active ? 'font-semibold text-[#34d399]' : 'text-slate-400 group-hover:text-slate-200'} transition-colors`}>
                {item.label}
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom area */}
      <div className="px-3 py-3 border-t border-white/[0.06] shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-white/[0.02] border border-white/[0.05] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5.25 12.25H2.917A1.167 1.167 0 011.75 11.083V2.917A1.167 1.167 0 012.917 1.75H5.25M9.333 10.083L12.25 7.167M12.25 7.167L9.333 4.25M12.25 7.167H5.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background" style={{ minHeight: '100dvh' }}>
      {/* ===== DESKTOP SIDEBAR (always visible >= lg) ===== */}
      <aside
        className="hidden lg:flex flex-col shrink-0"
        style={{
          width: 240,
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          height: '100dvh',
          overflowY: 'hidden'
        } as CSSProperties}
      >
        {renderSidebarContent()}
      </aside>

      {/* ===== MOBILE SIDEBAR OVERLAY ===== */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <aside
            className="fixed inset-y-0 left-0 z-50 flex flex-col lg:hidden"
            style={{
              width: 240,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)'
            } as CSSProperties}
          >
            {/* Close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-10"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            {renderSidebarContent()}
          </aside>
        </>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 min-w-0 flex flex-col" style={{ minHeight: '100dvh' }}>
        {/* Top bar */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-4 lg:px-6 py-3"
          style={{ background: 'var(--header-bg, rgba(255,255,255,0.95))', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors text-foreground"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2.25 4.5h13.5M2.25 9h13.5M2.25 13.5h13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <div>
              <h2 className="text-sm font-bold text-foreground">{title}</h2>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse-slow" />
              <span className="text-xs font-semibold text-emerald-400">Live</span>
            </div>
            <NotificationBell isStaff />
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)` }}
              >
                {initial}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-foreground leading-none">{userData?.name?.split(' ')[0]}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{roleName}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page body */}
        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
