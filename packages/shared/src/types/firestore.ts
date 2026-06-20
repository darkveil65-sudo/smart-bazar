// Firestore Schema Types for Smart Bazar

export type UserRole = 'admin' | 'manager' | 'store' | 'delivery' | 'customer' | 'co-admin';

export type StoreId = string; // Made dynamic to allow admin additions

export interface Store {
  id: string;
  name: string;
  createdAt?: string;
  imageUrl?: string;
  isComingSoon?: boolean;
}

export interface HeroBanner {
  id: string;
  headline: string;
  sub: string;
  badge: string;
  cta: string;
  gradient: string;       // CSS gradient string
  imageUrl?: string;      // optional uploaded image
  isActive: boolean;
  order: number;
  createdAt?: string;
}


export interface Category {
  id: string;
  storeId: string;
  name: string;
  createdAt?: string;
  imageUrl?: string;
}

export interface SubCategory {
  id: string;
  categoryId: string; // The parent category
  storeId: string;    // The grand-parent store
  name: string;
  createdAt?: string;
  imageUrl?: string;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: 'active' | 'inactive';
  // For managers: which stores they can manage
  assignedStores?: StoreId[];
  assignedCategories?: string[];
  // For physical vendors (formerly 'store' role): which Store they sell
  vendorStore?: StoreId;
  // For physical vendors/delivery: which manager manages them
  managerId?: string;
  phone?: string;
  addresses?: Address[];
  createdAt: string;
  updatedAt?: string;
}

export interface Address {
  label?: string;
  customerName?: string;
  mobile?: string;
  area?: string;
  para?: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
}

export interface ProductVariant {
  id: string;           // e.g. "var_75g"
  name: string;         // Display label: "75g", "1 kg", "Red"
  price: number;        // Sale price in ₹
  mrp?: number;         // MRP / original price
  stock: number;        // Stock count for this variant
  unit?: string;        // e.g. "75g", "1 kg"
  imageUrl?: string;    // Optional variant-specific image override
}

export interface Product {
  id: string;
  name: string;
  price: number; // in INR (₹) — used when no variants
  mrp?: number;  // Original price
  discountPercent?: number; // Calculated discount
  isVeg?: boolean; // Vegetarian indicator
  tags?: string[]; // e.g. ['chilled', 'imported']
  store: StoreId;
  category?: string;
  subCategory?: string;
  vendorId: string; // was storeId
  imageUrl?: string;   // Main / first image (backward compat)
  images?: string[];   // Multiple product images (index 0 = main)
  emoji?: string;
  description?: string;
  unit?: string; // e.g. "500g", "1 kg", "1 piece"
  stock: number; // Used when no variants
  isAvailable: boolean;
  variants?: ProductVariant[]; // Optional product variants
  createdAt: string;
  updatedAt?: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number; // price at time of order
  name: string;  // product name at time of order
  emoji?: string;
}

export type OrderStatus = 'pending' | 'manager' | 'store' | 'packed' | 'delivery' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  totalAmount: number; // in INR (₹)
  deliveryCharge: number;
  status: OrderStatus;
  paymentMethod?: string;
  paymentProofImage?: string;
  upiTransactionId?: string;
  paymentProofVerified?: boolean;
  paymentProofVerifiedAt?: string;
  paymentProofVerifiedBy?: string;
  // Assignment chain
  assignedManagerId?: string;
  assignedVendorId?: string; // was assignedStoreId
  assignedDeliveryBoyId?: string;
  // Store of items (to route to correct manager)
  store?: StoreId;
  createdAt: string;
  updatedAt?: string;
  packedAt?: string;
  deliveredAt?: string;
  deliveryAddress: Address;
  specialInstructions?: string;
  cancelReason?: string;
  deliverySlot?: string;
  category?: string;
  isPreorder?: boolean;
  preorderDeliveryTime?: string;
  couponCode?: string | null;
  discountAmount?: number;
}

export interface Application {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  type: 'store' | 'delivery' | 'manager';
  status: 'pending' | 'approved' | 'rejected';
  // Vendor specific (type 'store')
  storeCategory?: StoreId;
  businessName?: string;
  businessAddress?: string;
  // Delivery specific
  vehicleType?: 'bike' | 'bicycle' | 'scooter';
  vehicleNumber?: string;
  aadharNumber?: string;
  // Review
  reviewedBy?: string; // managerId or adminId who reviewed
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'application' | 'system';
  read: boolean;
  orderId?: string;
  createdAt: string;
}

// --- App-level Remote Config (stored in Firestore: config/app) ----------------
export interface DeliverySlotRule {
  id: string;       // e.g. "slot_1"
  orderFrom: number;  // hour (0-23), e.g. 6
  orderTo:   number;  // hour (0-23), e.g. 9
  deliveryLabel: string; // e.g. "9am - 10am"
  enabled: boolean;
}

export interface AppConfig {
  businessName:     string;
  supportPhone?:    string;
  supportEmail?:    string;
  minOrderValue:    number;   // ₹ minimum cart value
  deliveryCharge:   number;   // ₹ flat charge
  freeDeliveryMin:  number;   // ₹ above which delivery is free
  maintenanceMode:  boolean;
  maintenanceMessage: string;
  deliverySlots:    DeliverySlotRule[];
  lateNightSlot:    string;   // fallback label e.g. "Tomorrow 9am - 10am"
  deliveryAreas:    string[]; // list of areas admin configures
  updatedAt?:       string;
  merchantUpiId?:   string;
  merchantUpiQrCode?: string;
  serviceFee?:      number;   // ₹ service fee (new)
}

// Default config (used if Firestore document doesn't exist yet)
export const DEFAULT_APP_CONFIG: AppConfig = {
  businessName:       'Smart Bazar',
  supportPhone:       '',
  supportEmail:       '',
  minOrderValue:      199,
  deliveryCharge:     20,
  freeDeliveryMin:    199,
  maintenanceMode:    false,
  maintenanceMessage: 'We are undergoing scheduled maintenance. We\'ll be back shortly!',
  lateNightSlot:      'Tomorrow 9am - 10am',
  deliveryAreas:      [],
  deliverySlots: [
    { id: 'slot_1', orderFrom: 6,  orderTo: 9,  deliveryLabel: '9am - 10am',   enabled: true },
    { id: 'slot_2', orderFrom: 9,  orderTo: 11, deliveryLabel: '11am - 12pm',  enabled: true },
    { id: 'slot_3', orderFrom: 11, orderTo: 14, deliveryLabel: '3pm - 4pm',    enabled: true },
    { id: 'slot_4', orderFrom: 14, orderTo: 16, deliveryLabel: '4pm - 5pm',    enabled: true },
    { id: 'slot_5', orderFrom: 16, orderTo: 18, deliveryLabel: '6pm - 7pm',    enabled: true },
    { id: 'slot_6', orderFrom: 18, orderTo: 19, deliveryLabel: '7pm - 8pm',    enabled: true },
    { id: 'slot_7', orderFrom: 19, orderTo: 21, deliveryLabel: '9pm - 10pm',   enabled: true },
  ],
  merchantUpiId:      'smartbazar@upi',
  merchantUpiQrCode:  '',
  serviceFee:         0,
};

// --- Coupon / Promo Code -------------------------------------------------------
export type CouponType = 'flat' | 'percent' | 'free_delivery';

export interface Coupon {
  id: string;
  code: string;            // e.g. "FIRST50", "SAVE20"
  type: CouponType;
  value: number;           // flat ₹ amount OR percent value (0-100)
  minOrderValue?: number;  // minimum cart subtotal to apply
  maxDiscount?: number;    // cap for percent coupons (e.g. max ₹100 off)
  usageLimit?: number;     // max total uses across all customers
  usedCount?: number;      // current total uses
  perUserLimit?: number;   // max uses per user (default 1)
  isActive: boolean;
  description?: string;    // e.g. "Flat ₹50 off on your first order"
  expiresAt?: string;      // ISO date string
  createdAt: string;
}

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  customerName?: string;
  vendorId: string; // The vendor who fulfilled the order
  rating: number; // 1-5 stars
  comment: string;
  createdAt: string;
  
  // New fields for rating delivery agent and store vendor
  vendorRating?: number;
  vendorComment?: string;
  deliveryBoyId?: string;
  deliveryRating?: number;
  deliveryComment?: string;
}