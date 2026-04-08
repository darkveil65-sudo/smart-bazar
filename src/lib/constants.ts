// Fixed categories
export const CATEGORIES = [
  { id: 'mudikhana', name: 'Mudikhana', icon: '🏪', color: '#f59e0b' },
  { id: 'household', name: 'Household', icon: '🏠', color: '#3b82f6' },
  { id: 'vegetables', name: 'Vegetables', icon: '🥬', color: '#22c55e' },
  { id: 'fruits', name: 'Fruits', icon: '🍎', color: '#ef4444' },
  { id: 'beauty', name: 'Beauty', icon: '💄', color: '#ec4899' },
  { id: 'fashion', name: 'Fashion', icon: '👗', color: '#8b5cf6' },
] as const;

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
);

// Order status flow
export const ORDER_STATUSES = {
  pending: { label: 'Order Placed', color: '#f59e0b', bg: '#fef3c7' },
  manager: { label: 'Assigned to Manager', color: '#3b82f6', bg: '#dbeafe' },
  store: { label: 'At Store', color: '#8b5cf6', bg: '#ede9fe' },
  packed: { label: 'Packed', color: '#06b6d4', bg: '#cffafe' },
  delivery: { label: 'Out for Delivery', color: '#f97316', bg: '#ffedd5' },
  completed: { label: 'Delivered', color: '#22c55e', bg: '#dcfce7' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: '#fee2e2' },
} as const;

export const ORDER_STATUS_FLOW = ['pending', 'manager', 'store', 'packed', 'delivery', 'completed'] as const;

// Business rules
export const MIN_ORDER_VALUE = 199;
export const DELIVERY_CHARGE = 20;
export const FREE_DELIVERY_MIN = 199;
export const DELIVERY_TIME_MINUTES = 30;

// Roles
export const ROLES = {
  admin: { label: 'Admin', color: '#ef4444' },
  'co-admin': { label: 'Co-Admin', color: '#f97316' },
  manager: { label: 'Manager', color: '#8b5cf6' },
  store: { label: 'Store', color: '#3b82f6' },
  delivery: { label: 'Delivery', color: '#06b6d4' },
  customer: { label: 'Customer', color: '#22c55e' },
} as const;

export type CategoryId = typeof CATEGORIES[number]['id'];
export type OrderStatusKey = keyof typeof ORDER_STATUSES;
