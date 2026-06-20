import {
  clientDb, collection, doc, addDoc, updateDoc, deleteDoc, query, where, onSnapshot, getDocs, writeBatch, limit
} from '@smart-bazar/shared/lib/firebase';
import { Notification } from '@smart-bazar/shared/types/firestore';

export const notificationService = {
  // Create a new notification
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: 'order' | 'application' | 'system',
    orderId?: string
  ): Promise<string> {
    const ref = await addDoc(collection(clientDb, 'notifications'), {
      userId,
      title,
      message,
      type,
      read: false,
      orderId,
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  },

  // Mark a notification as read
  async markAsRead(notificationId: string): Promise<void> {
    await updateDoc(doc(clientDb, 'notifications', notificationId), {
      read: true,
    });
  },

  // Mark all notifications for a user as read
  async markAllAsRead(userId: string): Promise<void> {
    const q = query(
      collection(clientDb, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;
    
    const batch = writeBatch(clientDb);
    snap.docs.forEach((d) => {
      batch.update(doc(clientDb, 'notifications', d.id), { read: true });
    });
    await batch.commit();
  },

  // Delete a notification
  async deleteNotification(notificationId: string): Promise<void> {
    await deleteDoc(doc(clientDb, 'notifications', notificationId));
  },

  // Subscribe to real-time notifications for a user
  // NOTE: No orderBy here to avoid requiring a composite Firestore index.
  // Instead, we sort client-side after receiving the snapshot.
  subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
    const q = query(
      collection(clientDb, 'notifications'),
      where('userId', '==', userId),
      limit(50)
    );
    return onSnapshot(q, (snap) => {
      const notifications = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Notification)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 20);
      callback(notifications);
    });
  },
};
