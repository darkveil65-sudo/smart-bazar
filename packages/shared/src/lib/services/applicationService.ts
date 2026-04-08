import {
  clientDb, collection, getDocs, addDoc,
  updateDoc, doc, query, where, onSnapshot,
} from '@smart-bazar/shared/lib/firebase';
import { Application } from '@smart-bazar/shared/types/firestore';

export const applicationService = {
  async createApplication(data: Omit<Application, 'id'>): Promise<string> {
    const ref = await addDoc(collection(clientDb, 'applications'), {
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  },

  async getApplicationsByType(type: 'store' | 'delivery'): Promise<Application[]> {
    const q = query(collection(clientDb, 'applications'), where('type', '==', type));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application);
  },

  async getPendingApplications(): Promise<Application[]> {
    const q = query(collection(clientDb, 'applications'), where('status', '==', 'pending'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application);
  },

  async approveApplication(id: string, notes?: string): Promise<void> {
    await updateDoc(doc(clientDb, 'applications', id), {
      status: 'approved',
      adminNotes: notes || '',
      updatedAt: new Date().toISOString(),
    });
  },

  async rejectApplication(id: string, notes?: string): Promise<void> {
    await updateDoc(doc(clientDb, 'applications', id), {
      status: 'rejected',
      adminNotes: notes || '',
      updatedAt: new Date().toISOString(),
    });
  },

  subscribeToApplications(callback: (apps: Application[]) => void) {
    return onSnapshot(collection(clientDb, 'applications'), (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application));
    });
  },
};
