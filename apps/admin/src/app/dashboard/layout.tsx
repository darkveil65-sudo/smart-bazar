import DashboardLayout from '@smart-bazar/shared/components/layout/DashboardLayout';
import { ADMIN_NAV } from '@smart-bazar/shared/lib/constants';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout 
      title="Allkart" 
      navItems={ADMIN_NAV as any} 
      accentColor="#10b981"
    >
      {children}
    </DashboardLayout>
  );
}
