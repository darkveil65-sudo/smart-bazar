// Firestore Schema Types for Smart Bazar

export type UserRole = 'admin' | 'co-admin' | 'manager' | 'store' | 'delivery' | 'customer';

export interface Category {
  id: string;
  name: 'Mudikhana' | 'Household' | 'Vegetables' | 'Fruits' | 'Beauty' | 'Fashion';
  createdAt: string; // ISO timestamp
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedCategories?: string[]; // For managers - list of category IDs they can manage
  storeId?: string; // For stores - reference to their store
  createdAt: string; // ISO timestamp
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number; // in INR (₹)
  category: string; // references Category.id
  storeId: string; // references User.id of the store owner
  imageUrl?: string;
  description?: string;
  stock: number;
  isAvailable: boolean;
  createdAt: string; // ISO timestamp
  updatedAt?: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number; // price at time of order
  name: string; // product name at time of order
}

export interface Order {
  id: string;
  customerId: string; // references User.id
  items: OrderItem[];
  totalAmount: number; // in INR (₹)
  status: 'pending' | 'manager' | 'store' | 'packed' | 'delivery' | 'completed' | 'cancelled';
  assignedManagerId?: string; // references User.id
  assignedStoreId?: string; // references User.id
  assignedDeliveryBoyId?: string; // references User.id
  createdAt: string; // ISO timestamp
  updatedAt?: string;
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  specialInstructions?: string;
}

export interface Application {
  id: string;
  userId: string; // references User.id
  type: 'store' | 'delivery';
  status: 'pending' | 'approved' | 'rejected';
  storeCategory?: string; // For store applications - which category they want to sell
  businessName?: string;
  businessAddress?: string;
  createdAt: string; // ISO timestamp
  updatedAt?: string;
  adminNotes?: string;
}