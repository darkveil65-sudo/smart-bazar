'use client';

import DashboardLayout from '@smart-bazar/shared/components/layout/DashboardLayout';
import { STORE_NAV } from '@smart-bazar/shared/lib/constants';

export default function StoreDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout 
      title="Store Operations" 
      navItems={STORE_NAV as any} 
      accentColor="#f59e0b" 
    >
      {children}
    </DashboardLayout>
  );
}
