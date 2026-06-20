import {
  clientDb, collection, doc, getDoc, getDocs, setDoc, query, where, onSnapshot
} from '@smart-bazar/shared/lib/firebase';
import { Review } from '@smart-bazar/shared/types/firestore';

export const reviewService = {
  async submitReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<void> {
    await setDoc(doc(clientDb, 'reviews', review.orderId), {
      ...review,
      createdAt: new Date().toISOString(),
    });
  },

  async getReviewByOrder(orderId: string): Promise<Review | null> {
    const snap = await getDoc(doc(clientDb, 'reviews', orderId));
    return snap.exists() ? { id: snap.id, ...snap.data() } as Review : null;
  },

  async getReviewsByCustomer(customerId: string): Promise<Review[]> {
    const q = query(
      collection(clientDb, 'reviews'),
      where('customerId', '==', customerId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review);
  },

  async getReviewsByVendor(vendorId: string): Promise<Review[]> {
    const q = query(
      collection(clientDb, 'reviews'),
      where('vendorId', '==', vendorId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review);
  },

  subscribeToReviewsByVendor(vendorId: string, callback: (reviews: Review[]) => void) {
    const q = query(
      collection(clientDb, 'reviews'),
      where('vendorId', '==', vendorId)
    );
    return onSnapshot(q, (snap) => {
      const reviews = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review);
      callback(reviews);
    });
  }
};
