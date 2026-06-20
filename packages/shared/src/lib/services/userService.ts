import {
  clientDb, collection, doc, getDoc, getDocs, setDoc,
  updateDoc, deleteDoc, query, where, onSnapshot,
} from '@smart-bazar/shared/lib/firebase';
import { UserData, UserRole } from '@smart-bazar/shared/types/firestore';

export const userService = {
  // --- READ -------------------------------------------------
  async getUser(uid: string): Promise<UserData | null> {
    const snap = await getDoc(doc(clientDb, 'users', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } as UserData : null;
  },

  async getAllUsers(): Promise<UserData[]> {
    const snap = await getDocs(collection(clientDb, 'users'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserData);
  },

  async getUsersByRole(role: UserRole): Promise<UserData[]> {
    const q = query(collection(clientDb, 'users'), where('role', '==', role));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserData);
  },

  async getStoresByManager(managerId: string): Promise<UserData[]> {
    const q = query(
      collection(clientDb, 'users'),
      where('role', '==', 'store'),
      where('managerId', '==', managerId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserData);
  },

  async getDeliveryByManager(managerId: string): Promise<UserData[]> {
    const q = query(
      collection(clientDb, 'users'),
      where('role', '==', 'delivery'),
      where('managerId', '==', managerId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserData);
  },

  // --- CREATE / UPDATE --------------------------------------
  async createUser(uid: string, data: Omit<UserData, 'id'>): Promise<void> {
    await setDoc(doc(clientDb, 'users', uid), {
      ...data,
      createdAt: new Date().toISOString(),
    });
  },

  async updateUser(uid: string, data: Partial<UserData>): Promise<void> {
    await updateDoc(doc(clientDb, 'users', uid), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },

  async changeRole(uid: string, role: UserRole): Promise<void> {
    await updateDoc(doc(clientDb, 'users', uid), {
      role,
      updatedAt: new Date().toISOString(),
    });
  },

  async toggleStatus(uid: string, status: 'active' | 'inactive'): Promise<void> {
    await updateDoc(doc(clientDb, 'users', uid), {
      status,
      updatedAt: new Date().toISOString(),
    });
  },

  async assignCategories(uid: string, categoryIds: string[]): Promise<void> {
    await updateDoc(doc(clientDb, 'users', uid), {
      assignedCategories: categoryIds,
      updatedAt: new Date().toISOString(),
    });
  },

  async assignToManager(uid: string, managerId: string): Promise<void> {
    await updateDoc(doc(clientDb, 'users', uid), {
      managerId,
      updatedAt: new Date().toISOString(),
    });
  },

  async deleteUser(uid: string): Promise<void> {
    await deleteDoc(doc(clientDb, 'users', uid));
  },

  // --- REAL-TIME --------------------------------------------
  subscribeToUsers(callback: (users: UserData[]) => void) {
    return onSnapshot(collection(clientDb, 'users'), (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserData));
    });
  },

  subscribeToUsersByRole(role: UserRole, callback: (users: UserData[]) => void) {
    const q = query(collection(clientDb, 'users'), where('role', '==', role));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserData));
    });
  },
};
