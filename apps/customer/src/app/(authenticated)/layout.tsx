'use client';

import CustomerLayout from '@smart-bazar/shared/components/layout/CustomerLayout';

export default function CustomerGroupLayout({ children }: { children: React.ReactNode }) {
  return <CustomerLayout>{children}</CustomerLayout>;
}
