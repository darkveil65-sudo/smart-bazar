import {
  clientDb, collection, doc, getDoc, getDocs,
  query, where, updateDoc, increment,
} from '@smart-bazar/shared/lib/firebase';
import { Coupon } from '@smart-bazar/shared/types/firestore';

const LOCAL_COUPONS: Record<string, any> = {
  WELCOME10: {
    id: 'WELCOME10',
    code: 'WELCOME10',
    type: 'percent',
    value: 10,
    isActive: true,
    minOrderValue: 100,
    maxDiscount: 100,
    description: '10% off up to ₹100',
    createdAt: new Date().toISOString(),
  },
  SMART30: {
    id: 'SMART30',
    code: 'SMART30',
    type: 'flat',
    value: 30,
    isActive: true,
    minOrderValue: 150,
    description: 'Flat ₹30 off on orders above ₹150',
    createdAt: new Date().toISOString(),
  },
  FREE50: {
    id: 'FREE50',
    code: 'FREE50',
    type: 'flat',
    value: 50,
    isActive: true,
    minOrderValue: 250,
    description: 'Flat ₹50 off on orders above ₹250',
    createdAt: new Date().toISOString(),
  },
  FREESHIP: {
    id: 'FREESHIP',
    code: 'FREESHIP',
    type: 'free_delivery',
    value: 0,
    isActive: true,
    minOrderValue: 0,
    description: 'Free delivery on your entire order',
    createdAt: new Date().toISOString(),
  }
};

/**
 * couponService — validate and apply promo codes
 *
 * Firestore collection: `coupons`
 * Each document id = coupon code (lowercase) for easy lookup.
 */
export const couponService = {
  /**
   * Validate a coupon code for a given customer and cart subtotal.
   * Returns the coupon if valid, throws an error with a user-friendly message otherwise.
   */
  async validate(code: string, customerId: string, subtotal: number): Promise<Coupon> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) throw new Error('Please enter a coupon code');

    // Try by document ID first (code as doc id), then fallback to query
    let coupon: Coupon | null = null;

    try {
      const byId = await getDoc(doc(clientDb, 'coupons', normalized));
      if (byId.exists()) {
        coupon = { id: byId.id, ...byId.data() } as Coupon;
      } else {
        const q = query(
          collection(clientDb, 'coupons'),
          where('code', '==', normalized),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          coupon = { id: snap.docs[0].id, ...snap.docs[0].data() } as Coupon;
        }
      }
    } catch (e) {
      console.warn('Firestore coupons query failed, falling back to local coupons:', e);
    }

    if (!coupon) {
      // Check local coupons fallback
      const localCoupon = LOCAL_COUPONS[normalized];
      if (localCoupon) {
        coupon = localCoupon;
      }
    }

    if (!coupon) throw new Error('Invalid coupon code');
    if (!coupon.isActive) throw new Error('This coupon is no longer active');

    // Expiry check
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new Error('This coupon has expired');
    }

    // Minimum order check
    if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
      throw new Error(`Minimum order ₹${coupon.minOrderValue} required for this coupon`);
    }

    // Global usage limit
    if (coupon.usageLimit && (coupon.usedCount ?? 0) >= coupon.usageLimit) {
      throw new Error('This coupon has reached its usage limit');
    }

    // Per-user usage limit
    if (customerId && coupon.perUserLimit) {
      try {
        const q = query(
          collection(clientDb, 'orders'),
          where('customerId', '==', customerId)
        );
        const snap = await getDocs(q);
        const usedCount = snap.docs.filter(d => d.data().couponCode === coupon?.code).length;
        if (usedCount >= coupon.perUserLimit) {
          throw new Error('You have already used this coupon code');
        }
      } catch (e) {
        // If query fails, log it but don't block order unless critical
        console.error('Error checking per-user coupon limit:', e);
      }
    }

    return coupon;
  },

  /**
   * Calculate discount amount from a validated coupon + subtotal.
   */
  calculateDiscount(coupon: Coupon, subtotal: number, deliveryCharge: number): number {
    switch (coupon.type) {
      case 'flat':
        return Math.min(coupon.value, subtotal); // can't discount more than subtotal
      case 'percent': {
        const raw = (subtotal * coupon.value) / 100;
        return coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
      }
      case 'free_delivery':
        return deliveryCharge; // waive delivery charge
      default:
        return 0;
    }
  },

  /**
   * Increment the usedCount on a coupon after a successful order.
   * Call this AFTER the order is created in Firestore.
   */
  async markUsed(couponId: string): Promise<void> {
    await updateDoc(doc(clientDb, 'coupons', couponId), {
      usedCount: increment(1),
    });
  },

  /**
   * Human-readable description of the coupon benefit.
   */
  describeDiscount(coupon: Coupon): string {
    switch (coupon.type) {
      case 'flat':        return `₹${coupon.value} off`;
      case 'percent':     return `${coupon.value}% off${coupon.maxDiscount ? ` (max ₹${coupon.maxDiscount})` : ''}`;
      case 'free_delivery': return 'Free delivery';
      default:            return 'Discount applied';
    }
  },
};
