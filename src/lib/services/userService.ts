import {
  clientDb, collection, doc, getDoc, getDocs, setDoc,
  updateDoc, deleteDoc, query, where, onSnapshot,
} from '@/lib/firebase';
import { UserData } from '@/types/firestore';

export const userService = {
  async getUser(uid: string): Promise<UserData | null> {
    const snap = await getDoc(doc(clientDb, 'users', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } as UserData : null;
  },

  async getAllUsers(): Promise<UserData[]> {
    const snap = await getDocs(collection(clientDb, 'users'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserData);
  },

  async getUsersByRole(role: string): Promise<UserData[]> {
    const q = query(collection(clientDb, 'users'), where('role', '==', role));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserData);
  },

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

  async deleteUser(uid: string): Promise<void> {
    await deleteDoc(doc(clientDb, 'users', uid));
  },

  async assignCategories(uid: string, categoryIds: string[]): Promise<void> {
    await updateDoc(doc(clientDb, 'users', uid), {
      assignedCategories: categoryIds,
      updatedAt: new Date().toISOString(),
    });
  },

  subscribeToUsers(callback: (users: UserData[]) => void) {
    return onSnapshot(collection(clientDb, 'users'), (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserData));
    });
  },
};
