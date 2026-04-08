import {
  clientDb, collection, doc, getDoc, getDocs, addDoc,
  updateDoc, query, where, orderBy, onSnapshot,
} from '@/lib/firebase';
import { Order } from '@/types/firestore';

export const orderService = {
  async createOrder(data: Omit<Order, 'id'>): Promise<string> {
    const ref = await addDoc(collection(clientDb, 'orders'), {
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  },

  async getOrder(id: string): Promise<Order | null> {
    const snap = await getDoc(doc(clientDb, 'orders', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } as Order : null;
  },

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    const q = query(
      collection(clientDb, 'orders'),
      where('customerId', '==', customerId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
  },

  async getOrdersByStatus(status: string): Promise<Order[]> {
    const q = query(collection(clientDb, 'orders'), where('status', '==', status));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
  },

  async getOrdersByStore(storeId: string): Promise<Order[]> {
    const q = query(collection(clientDb, 'orders'), where('assignedStoreId', '==', storeId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
  },

  async getOrdersByDelivery(deliveryId: string): Promise<Order[]> {
    const q = query(collection(clientDb, 'orders'), where('assignedDeliveryBoyId', '==', deliveryId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
  },

  async updateOrderStatus(id: string, status: string, extraData?: Record<string, unknown>): Promise<void> {
    await updateDoc(doc(clientDb, 'orders', id), {
      status,
      ...extraData,
      updatedAt: new Date().toISOString(),
    });
  },

  async assignManager(orderId: string, managerId: string): Promise<void> {
    await updateDoc(doc(clientDb, 'orders', orderId), {
      status: 'manager',
      assignedManagerId: managerId,
      updatedAt: new Date().toISOString(),
    });
  },

  async assignStore(orderId: string, storeId: string): Promise<void> {
    await updateDoc(doc(clientDb, 'orders', orderId), {
      status: 'store',
      assignedStoreId: storeId,
      updatedAt: new Date().toISOString(),
    });
  },

  async assignDelivery(orderId: string, deliveryBoyId: string): Promise<void> {
    await updateDoc(doc(clientDb, 'orders', orderId), {
      status: 'delivery',
      assignedDeliveryBoyId: deliveryBoyId,
      updatedAt: new Date().toISOString(),
    });
  },

  subscribeToOrder(orderId: string, callback: (order: Order | null) => void) {
    return onSnapshot(doc(clientDb, 'orders', orderId), (snap) => {
      callback(snap.exists() ? { id: snap.id, ...snap.data() } as Order : null);
    });
  },

  subscribeToOrders(callback: (orders: Order[]) => void) {
    return onSnapshot(collection(clientDb, 'orders'), (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order));
    });
  },

  subscribeToOrdersByStatus(status: string, callback: (orders: Order[]) => void) {
    const q = query(collection(clientDb, 'orders'), where('status', '==', status));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order));
    });
  },
};
