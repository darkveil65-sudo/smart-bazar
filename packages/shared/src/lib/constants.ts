// Fixed stores for Smart Bazar (these seed the top-level 'stores' Firestore collection)
export const CATEGORIES = [
  { id: 'furniture-store',  name: 'Furniture Store',  icon: '🪑', imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=300&q=80', color: '#f59e0b', bg: '#fef3c7' },
] as const;

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

// Order status flow & config
export const ORDER_STATUSES = {
  pending:   { label: 'Order Placed',         color: '#f59e0b', bg: '#fef3c7', icon: '📋' },
  manager:   { label: 'Assigned to Manager',  color: '#3b82f6', bg: '#dbeafe', icon: '👨‍💼' },
  store:     { label: 'At Store',             color: '#8b5cf6', bg: '#ede9fe', icon: '🏪' },
  packed:    { label: 'Packed & Ready',       color: '#06b6d4', bg: '#cffafe', icon: '📦' },
  delivery:  { label: 'Out for Delivery',     color: '#f97316', bg: '#ffedd5', icon: '🛵' },
  completed: { label: 'Delivered',            color: '#22c55e', bg: '#dcfce7', icon: '✅' },
  cancelled: { label: 'Cancelled',            color: '#ef4444', bg: '#fee2e2', icon: '❌' },
} as const;

export const ORDER_STATUS_FLOW = [
  'pending', 'manager', 'store', 'packed', 'delivery', 'completed',
] as const;

// Business rules
export const MIN_ORDER_VALUE     = 199;
export const FREE_DELIVERY_MIN   = 199;
export const DELIVERY_CHARGE     = 20;

export const getDeliverySlot = () => {
  const hours = new Date().getHours();
  if (hours >= 6 && hours < 9) return '9am - 10am';
  if (hours >= 9 && hours < 11) return '11am - 12pm';
  if (hours >= 11 && hours < 14) return '3pm - 4pm';
  if (hours >= 14 && hours < 16) return '4pm - 5pm';
  if (hours >= 16 && hours < 18) return '6pm - 7pm';
  if (hours >= 18 && hours < 19) return '7pm - 8pm';
  if (hours >= 19 && hours < 21) return '9pm - 10pm';
  return 'Tomorrow 9am - 10am';
};

// User roles config
export const ROLES = {
  admin:      { label: 'Admin',      color: '#ef4444', bg: '#fee2e2' },
  manager:    { label: 'Manager',    color: '#8b5cf6', bg: '#ede9fe' },
  store:      { label: 'Store',      color: '#3b82f6', bg: '#dbeafe' },
  delivery:   { label: 'Delivery',   color: '#06b6d4', bg: '#cffafe' },
  customer:   { label: 'Customer',   color: '#22c55e', bg: '#dcfce7' },
} as const;

// Navigation per role
export const ADMIN_NAV = [
  { label: 'Overview',      href: '/dashboard/admin',                icon: '📊' },
  { label: 'Orders',        href: '/dashboard/admin/orders',         icon: '🛒' },
  { label: 'Pre-Orders',    href: '/dashboard/admin/preorders',      icon: '⭐' },
  { label: 'Users',         href: '/dashboard/admin/users',          icon: '👥' },
  { label: 'Stores',        href: '/dashboard/admin/categories',     icon: '🏪' },
  { label: 'Sub-Categories', href: '/dashboard/admin/subcategories', icon: '📂' },
  { label: 'Banners',       href: '/dashboard/admin/banners',        icon: '🎨' },
  { label: 'Applications',  href: '/dashboard/admin/applications',   icon: '📝' },
  { label: 'Inventory',     href: '/dashboard/admin/inventory',      icon: '📦' },
  { label: 'Analytics',     href: '/dashboard/admin/analytics',      icon: '📈' },
  { label: 'Settings',      href: '/dashboard/admin/settings',       icon: '⚙️' },
] as const;

export const MANAGER_NAV = [
  { label: 'Overview',      href: '/dashboard/manager',                   icon: '📊' },
  { label: 'Orders',        href: '/dashboard/manager/orders',             icon: '🛒' },
  { label: 'Pre-Orders',    href: '/dashboard/manager/preorders',          icon: '⭐' },
  { label: 'Stores',        href: '/dashboard/manager/categories',         icon: '🏪' },
  { label: 'Sub-Categories',href: '/dashboard/manager/subcategories',      icon: '📂' },
  { label: 'Banners',       href: '/dashboard/manager/banners',            icon: '🎨' },
  { label: 'Vendors',       href: '/dashboard/manager/team/stores',        icon: '🏪' },
  { label: 'Delivery',      href: '/dashboard/manager/team/delivery',      icon: '🛵' },
  { label: 'Applications',  href: '/dashboard/manager/applications',       icon: '📝' },
] as const;

export const STORE_NAV = [
  { label: 'Overview',   href: '/dashboard/store',             icon: '📊' },
  { label: 'Orders',     href: '/dashboard/store/orders',      icon: '🛒' },
  { label: 'Inventory',  href: '/dashboard/store/inventory',   icon: '📦' },
  { label: 'Analytics',  href: '/dashboard/store/analytics',   icon: '📈' },
  { label: 'Profile',    href: '/dashboard/store/profile',     icon: '⚙️' },
] as const;

export const DELIVERY_NAV = [
  { label: 'Overview',  href: '/dashboard/delivery',         icon: '📊' },
  { label: 'Orders',    href: '/dashboard/delivery/orders',  icon: '🛒' },
  { label: 'Map',       href: '/dashboard/delivery/map',     icon: '🗺️' },
  { label: 'Earnings',  href: '/dashboard/delivery/earnings',icon: '💰' },
] as const;


export type OrderStatusKey  = keyof typeof ORDER_STATUSES;
