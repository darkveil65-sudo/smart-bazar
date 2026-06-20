import {
  clientDb, collection, doc, getDoc, getDocs, addDoc,
  updateDoc, query, where, orderBy, onSnapshot, runTransaction,
} from '@smart-bazar/shared/lib/firebase';
import { Order, OrderStatus, UserData } from '@smart-bazar/shared/types/firestore';
import { notificationService } from './notificationService';
import { userService } from './userService';

export const orderService = {
  // --- CREATE -----------------------------------------------
  async createOrder(data: Omit<Order, 'id'>): Promise<string> {
    const ref = await addDoc(collection(clientDb, 'orders'), {
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    const orderId = ref.id;

    try {
      // Notify customer
      await notificationService.createNotification(
        data.customerId,
        'Order Placed',
        `Your order #${orderId.substring(0, 6)} has been placed successfully.`,
        'order',
        orderId
      );

      // Notify all managers and admins/co-admins
      const [managers, admins, coAdmins] = await Promise.all([
        userService.getUsersByRole('manager'),
        userService.getUsersByRole('admin'),
        userService.getUsersByRole('co-admin'),
      ]);
      const staffToNotify = [...managers, ...admins, ...coAdmins];
      await Promise.all(
        staffToNotify.map((staff) =>
          notificationService.createNotification(
            staff.id,
            'New Order Received',
            `A new order #${orderId.substring(0, 6)} requires assignment.`,
            'order',
            orderId
          )
        )
      );
    } catch (err) {
      console.error('Error sending order placement notifications:', err);
    }

    return ref.id;
  },

  // --- READ -------------------------------------------------
  async getOrder(id: string): Promise<Order | null> {
    const snap = await getDoc(doc(clientDb, 'orders', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } as Order : null;
  },

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    const q = query(
      collection(clientDb, 'orders'),
      where('customerId', '==', customerId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    const q = query(collection(clientDb, 'orders'), where('status', '==', status));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
  },

  async getOrdersByStore(vendorId: string): Promise<Order[]> {
    const q = query(
      collection(clientDb, 'orders'),
      where('assignedVendorId', '==', vendorId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getOrdersByDelivery(deliveryId: string): Promise<Order[]> {
    const q = query(
      collection(clientDb, 'orders'),
      where('assignedDeliveryBoyId', '==', deliveryId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getOrdersByManager(managerId: string): Promise<Order[]> {
    const q = query(
      collection(clientDb, 'orders'),
      where('assignedManagerId', '==', managerId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  // --- UPDATE -----------------------------------------------
  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    extraData?: Record<string, unknown>
  ): Promise<void> {
    await updateDoc(doc(clientDb, 'orders', id), {
      status,
      ...extraData,
      updatedAt: new Date().toISOString(),
    });
  },

  async assignManager(orderId: string, managerId: string): Promise<void> {
    await this.updateOrderStatus(orderId, 'manager', { assignedManagerId: managerId });
    try {
      const order = await this.getOrder(orderId);
      if (order) {
        // Notify customer
        await notificationService.createNotification(
          order.customerId,
          'Order Accepted',
          `Your order #${orderId.substring(0, 6)} has been accepted by our manager.`,
          'order',
          orderId
        );
        // Notify manager
        await notificationService.createNotification(
          managerId,
          'Order Assigned',
          `You have been assigned to manage order #${orderId.substring(0, 6)}.`,
          'order',
          orderId
        );
      }
    } catch (err) {
      console.error('Error sending assignManager notifications:', err);
    }
  },

  async assignStore(orderId: string, vendorId: string): Promise<void> {
    await runTransaction(clientDb, async (transaction) => {
      const orderRef = doc(clientDb, 'orders', orderId);
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error('Order does not exist');
      }
      const orderData = orderSnap.data() as Order;
      if (orderData.status !== 'pending') {
        throw new Error(`Order status is already ${orderData.status}`);
      }
      transaction.update(orderRef, {
        status: 'store',
        assignedVendorId: vendorId,
        updatedAt: new Date().toISOString(),
      });
    });
    try {
      const order = await this.getOrder(orderId);
      if (order) {
        // Notify customer
        await notificationService.createNotification(
          order.customerId,
          'Preparing Order',
          `Your order #${orderId.substring(0, 6)} is now being prepared by the store.`,
          'order',
          orderId
        );
        // Notify store/vendor
        await notificationService.createNotification(
          vendorId,
          'New Order Assignment',
          `Order #${orderId.substring(0, 6)} has been assigned to your store for preparation.`,
          'order',
          orderId
        );
      }
    } catch (err) {
      console.error('Error sending assignStore notifications:', err);
    }
  },

  async markPacked(orderId: string): Promise<void> {
    await this.updateOrderStatus(orderId, 'packed', { packedAt: new Date().toISOString() });
    try {
      const order = await this.getOrder(orderId);
      if (order) {
        // Notify customer
        await notificationService.createNotification(
          order.customerId,
          'Order Packed',
          `Your order #${orderId.substring(0, 6)} is packed and ready for delivery.`,
          'order',
          orderId
        );
        // Notify manager
        if (order.assignedManagerId) {
          await notificationService.createNotification(
            order.assignedManagerId,
            'Order Packed',
            `Order #${orderId.substring(0, 6)} is packed and ready for delivery assignment.`,
            'order',
            orderId
          );
        }
      }
    } catch (err) {
      console.error('Error sending markPacked notifications:', err);
    }
  },

  async assignDelivery(orderId: string, deliveryBoyId: string): Promise<void> {
    await runTransaction(clientDb, async (transaction) => {
      const orderRef = doc(clientDb, 'orders', orderId);
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error('Order does not exist');
      }
      const orderData = orderSnap.data() as Order;
      if (orderData.status !== 'packed') {
        throw new Error(`Order status is already ${orderData.status}`);
      }
      
      const boyRef = doc(clientDb, 'users', deliveryBoyId);
      const boySnap = await transaction.get(boyRef);
      if (!boySnap.exists()) {
        throw new Error('Delivery partner does not exist');
      }
      const boyData = boySnap.data() as UserData;
      if (boyData.role !== 'delivery' || boyData.status !== 'active') {
        throw new Error('Delivery partner is not active or online');
      }

      transaction.update(orderRef, {
        status: 'delivery',
        assignedDeliveryBoyId: deliveryBoyId,
        updatedAt: new Date().toISOString(),
      });
    });
    try {
      const order = await this.getOrder(orderId);
      if (order) {
        // Notify customer
        await notificationService.createNotification(
          order.customerId,
          'Out for Delivery',
          `Your order #${orderId.substring(0, 6)} is now out for delivery.`,
          'order',
          orderId
        );
        // Notify delivery boy
        await notificationService.createNotification(
          deliveryBoyId,
          'Delivery Assignment',
          `You have been assigned to deliver order #${orderId.substring(0, 6)}.`,
          'order',
          orderId
        );
      }
    } catch (err) {
      console.error('Error sending assignDelivery notifications:', err);
    }
  },

  async markDelivered(orderId: string): Promise<void> {
    await this.updateOrderStatus(orderId, 'completed', { deliveredAt: new Date().toISOString() });
    try {
      const order = await this.getOrder(orderId);
      if (order) {
        // Notify customer
        await notificationService.createNotification(
          order.customerId,
          'Order Completed',
          `Your order #${orderId.substring(0, 6)} has been successfully delivered!`,
          'order',
          orderId
        );
        // Notify manager
        if (order.assignedManagerId) {
          await notificationService.createNotification(
            order.assignedManagerId,
            'Order Completed',
            `Order #${orderId.substring(0, 6)} has been successfully delivered.`,
            'order',
            orderId
          );
        }
      }
    } catch (err) {
      console.error('Error sending markDelivered notifications:', err);
    }
  },

  async cancelOrder(orderId: string, reason: string): Promise<void> {
    await this.updateOrderStatus(orderId, 'cancelled', { cancelReason: reason });
    try {
      const order = await this.getOrder(orderId);
      if (order) {
        // Notify customer
        await notificationService.createNotification(
          order.customerId,
          'Order Cancelled',
          `Your order #${orderId.substring(0, 6)} was cancelled. Reason: ${reason}`,
          'order',
          orderId
        );
        // Notify manager
        if (order.assignedManagerId) {
          await notificationService.createNotification(
            order.assignedManagerId,
            'Order Cancelled',
            `Order #${orderId.substring(0, 6)} was cancelled. Reason: ${reason}`,
            'order',
            orderId
          );
        }
        // Notify vendor
        if (order.assignedVendorId) {
          await notificationService.createNotification(
            order.assignedVendorId,
            'Order Cancelled',
            `Order #${orderId.substring(0, 6)} was cancelled. Reason: ${reason}`,
            'order',
            orderId
          );
        }
      }
    } catch (err) {
      console.error('Error sending cancelOrder notifications:', err);
    }
  },

  async verifyPaymentProof(orderId: string, verifiedBy: string): Promise<void> {
    await updateDoc(doc(clientDb, 'orders', orderId), {
      paymentProofVerified: true,
      paymentProofVerifiedAt: new Date().toISOString(),
      paymentProofVerifiedBy: verifiedBy,
      updatedAt: new Date().toISOString(),
    });
  },

  async setPreorderDeliveryTime(orderId: string, time: string): Promise<void> {
    await updateDoc(doc(clientDb, 'orders', orderId), {
      preorderDeliveryTime: time,
      updatedAt: new Date().toISOString(),
    });
  },

  // --- REAL-TIME SUBSCRIPTIONS ------------------------------
  subscribeToOrder(orderId: string, callback: (order: Order | null) => void) {
    return onSnapshot(doc(clientDb, 'orders', orderId), (snap) => {
      callback(snap.exists() ? { id: snap.id, ...snap.data() } as Order : null);
    });
  },

  // ✅ Real-time customer orders subscription
  subscribeToOrdersByCustomer(customerId: string, callback: (orders: Order[]) => void) {
    const q = query(
      collection(clientDb, 'orders'),
      where('customerId', '==', customerId)
    );
    return onSnapshot(q, (snap) => {
      const orders = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Order)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      callback(orders);
    });
  },

  subscribeToAllOrders(callback: (orders: Order[]) => void) {
    const q = query(collection(clientDb, 'orders'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order));
    });
  },

  subscribeToOrdersByStatus(status: OrderStatus, callback: (orders: Order[]) => void) {
    const q = query(
      collection(clientDb, 'orders'),
      where('status', '==', status)
    );
    return onSnapshot(q, (snap) => {
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      callback(orders);
    });
  },

  subscribeToOrdersByStore(vendorId: string, callback: (orders: Order[]) => void) {
    const q = query(
      collection(clientDb, 'orders'),
      where('assignedVendorId', '==', vendorId)
    );
    return onSnapshot(q, (snap) => {
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      callback(orders);
    });
  },

  subscribeToOrdersByDelivery(deliveryId: string, callback: (orders: Order[]) => void) {
    const q = query(
      collection(clientDb, 'orders'),
      where('assignedDeliveryBoyId', '==', deliveryId)
    );
    return onSnapshot(q, (snap) => {
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      callback(orders);
    });
  },

  subscribeToOrdersByManager(managerId: string, callback: (orders: Order[]) => void) {
    const q = query(
      collection(clientDb, 'orders'),
      where('assignedManagerId', '==', managerId)
    );
    return onSnapshot(q, (snap) => {
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      callback(orders);
    });
  },

  // Subscribe to pending orders (no manager yet assigned)
  subscribeToPendingOrders(callback: (orders: Order[]) => void) {
    return this.subscribeToOrdersByStatus('pending', callback);
  },

  // Alias for backward compatibility
  subscribeToOrders(callback: (orders: Order[]) => void) {
    return this.subscribeToAllOrders(callback);
  },
};
