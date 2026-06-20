'use client';

import DashboardLayout from '@smart-bazar/shared/components/layout/DashboardLayout';
import { DELIVERY_NAV } from '@smart-bazar/shared/lib/constants';

export default function DeliveryDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout 
      title="Delivery Hub" 
      navItems={DELIVERY_NAV as any} 
      accentColor="#06b6d4" 
    >
      {children}
    </DashboardLayout>
  );
}
