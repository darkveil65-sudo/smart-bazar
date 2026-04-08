import { FC } from 'react';
import { ORDER_STATUSES, ROLES } from '@/lib/constants';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  outline: 'border border-border bg-transparent text-foreground',
};

export const Badge: FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
    {children}
  </span>
);

// Specialized badges
export const OrderStatusBadge: FC<{ status: string }> = ({ status }) => {
  const s = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES];
  if (!s) return <Badge>{status}</Badge>;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
};

export const RoleBadge: FC<{ role: string }> = ({ role }) => {
  const r = ROLES[role as keyof typeof ROLES];
  if (!r) return <Badge>{role}</Badge>;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: `${r.color}15`, color: r.color }}
    >
      {r.label}
    </span>
  );
};

export default Badge;
