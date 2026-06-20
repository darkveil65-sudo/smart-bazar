import DashboardLayout from '@smart-bazar/shared/components/layout/DashboardLayout';
import { MANAGER_NAV } from '@smart-bazar/shared/lib/constants';

export default function ManagerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout 
      title="Operations Hub" 
      navItems={MANAGER_NAV as any} 
      accentColor="#10b981"
    >
      {children}
    </DashboardLayout>
  );
}
