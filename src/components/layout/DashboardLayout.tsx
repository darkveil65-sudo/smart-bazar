'use client';

import { FC, ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { RoleBadge } from '@/components/ui/Badge';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  navItems: NavItem[];
}

const DashboardLayout: FC<DashboardLayoutProps> = ({ children, title, navItems }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { userData, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!userData) {
      router.push('/');
    } else if (pathname.includes('/dashboard/admin') && !['admin', 'co-admin'].includes(userData.role)) {
      router.push('/home');
    } else if (pathname.includes('/dashboard/manager') && userData.role !== 'manager') {
      router.push('/home');
    } else if (pathname.includes('/dashboard/store') && userData.role !== 'store') {
      router.push('/home');
    } else if (pathname.includes('/dashboard/delivery') && userData.role !== 'delivery') {
      router.push('/home');
    }
  }, [userData, pathname, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-muted/50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-300 lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-5 border-b border-border">
            <h1 className="text-xl font-bold text-primary">🛒 Smart Bazar</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => { router.push(item.href); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                    ${active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User info */}
          <div className="px-4 py-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {userData?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userData?.name || 'User'}</p>
                <RoleBadge role={userData?.role || 'customer'} />
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 14H3.33C2.97 14 2.63 13.86 2.38 13.61C2.13 13.36 2 13.02 2 12.67V3.33C2 2.97 2.13 2.63 2.38 2.38C2.63 2.13 2.97 2 3.33 2H6M10.67 11.33L14 8M14 8L10.67 4.67M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border px-4 lg:px-8 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-muted"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          <h2 className="text-lg font-semibold hidden lg:block">{title}</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">{userData?.email}</span>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
