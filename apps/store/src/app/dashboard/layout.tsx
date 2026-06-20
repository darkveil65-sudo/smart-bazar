'use client';

import DashboardLayout from '@smart-bazar/shared/components/layout/DashboardLayout';

const STORE_NAV_ITEMS = [
  { label: 'Overview',   href: '/dashboard/store',            icon: '📊' },
  { label: 'Orders',     href: '/dashboard/store/orders',     icon: '🛒' },
  { label: 'Inventory',  href: '/dashboard/store/inventory',  icon: '📦' },
];

export default function StoreDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout 
      title="Store Operations" 
      navItems={STORE_NAV_ITEMS as any} 
      accentColor="#f59e0b" 
    >
      {children}
    </DashboardLayout>
  );
}
