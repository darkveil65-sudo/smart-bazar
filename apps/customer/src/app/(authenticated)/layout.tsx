import CustomerLayout from '@smart-bazar/shared/components/layout/CustomerLayout';
import AnimatedBackground from '../../components/AnimatedBackground';

export const dynamic = 'force-dynamic';

export default function CustomerGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnimatedBackground />
      <CustomerLayout>{children}</CustomerLayout>
    </>
  );
}
