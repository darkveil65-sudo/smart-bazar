'use client';

import { FC, ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { getAppUrl } from '@smart-bazar/shared/lib/urls';

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

const DashboardLayout: FC<DashboardLayoutProps> = ({
  children,
  title,
  navItems,
  accentColor = '#3b82f6',
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { userData, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!userData) {
      router.replace('/');
      return;
    }

    const role = userData.role;
    const currentPath = pathname;

    // Mapping of which roles are allowed in which dashboard prefixes
    const roleAccess: Record<string, string[]> = {
      '/dashboard/admin': ['admin', 'co-admin'],
      '/dashboard/manager': ['manager'],
      '/dashboard/store': ['store'],
      '/dashboard/delivery': ['delivery'],
    };

    // Find if the current path matches any protected dashboard prefix
    const protectedPrefix = Object.keys(roleAccess).find(prefix => currentPath.startsWith(prefix));

    if (protectedPrefix) {
      const allowedRoles = roleAccess[protectedPrefix];
      if (!allowedRoles.includes(role)) {
        // Redirect to their own app's dashboard
        const targetUrl = getAppUrl(role) + getDashPath(role);
        
        if (targetUrl.startsWith('http')) {
          // Cross-app redirect (different port/domain)
          window.location.href = targetUrl;
        } else {
          // Intra-app redirect
          router.replace(targetUrl);
        }
      }
    }
  }, [userData, pathname, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const initial = userData?.name?.[0]?.toUpperCase() || 'U';
  const roleName = userData?.role?.replace('-', ' ').toUpperCase() || 'STAFF';

  return (
    <div className="min-h-screen flex bg-background">
      {/* ===== SIDEBAR ===== */}
      <aside
        className={`fixed lg:relative z-40 w-60 h-screen flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 shrink-0 ${
          sidebarOpen ? 'translate-x-0 inset-y-0 left-0' : '-translate-x-full'
        }`}
        style={{ background: '#0f172a', borderRight: '1px solid #1e293b' }}
      >
        {/* Logo area */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)` }}
            >
              🛒
            </div>
            <div>
              <h1 className="text-white font-extrabold text-sm leading-none">Smart Bazar</h1>
              <p className="text-slate-500 text-[10px] mt-0.5 font-medium">{title}</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto hide-scrollbar">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <button
                key={item.href}
                onClick={() => { router.push(item.href); setSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative group"
                style={
                  active
                    ? { background: `${accentColor}1a`, color: accentColor }
                    : { color: '#94a3b8' }
                }
              >
                {/* Active indicator */}
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: accentColor }}
                  />
                )}
                <span className="text-base">{item.icon}</span>
                <span className={`flex-1 text-left ${!active ? 'group-hover:text-white' : ''} transition-colors`}>
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

        {/* User area */}
        <div className="px-3 py-3 border-t border-slate-800">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl mb-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}88)` }}
            >
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-100 text-xs font-semibold truncate">{userData?.name || 'User'}</p>
              <p className="text-slate-500 text-[10px] font-medium">{roleName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5.25 12.25H2.917A1.167 1.167 0 011.75 11.083V2.917A1.167 1.167 0 012.917 1.75H5.25M9.333 10.083L12.25 7.167M12.25 7.167L9.333 4.25M12.25 7.167H5.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border flex items-center justify-between px-4 lg:px-6 py-3">
          {/* Mobile menu toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-muted transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2.25 4.5h13.5M2.25 9h13.5M2.25 13.5h13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <div className="hidden lg:block">
              <h2 className="text-base font-bold text-foreground">{title}</h2>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Live pulse */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full border border-green-100">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse-slow" />
              <span className="text-xs font-medium text-green-700">Live</span>
            </div>
            {/* Admin badge */}
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)` }}
              >
                {initial}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold leading-none">{userData?.name?.split(' ')[0]}</p>
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
