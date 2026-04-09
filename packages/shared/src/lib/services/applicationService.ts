import {
  clientDb, collection, getDocs, addDoc,
  updateDoc, doc, query, where, onSnapshot,
} from '@smart-bazar/shared/lib/firebase';
import { Application } from '@smart-bazar/shared/types/firestore';

export const applicationService = {
  async getAllApplications(): Promise<Application[]> {

    const snap = await getDocs(collection(clientDb, 'applications'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application);
  },

  async getApplicationsByUser(userId: string): Promise<Application[]> {

    const q = query(collection(clientDb, 'applications'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application);
  },

  async createApplication(data: Omit<Application, 'id'>): Promise<string> {

    const ref = await addDoc(collection(clientDb, 'applications'), {
      ...data,
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  },

  async updateApplicationStatus(id: string, status: string): Promise<void> {

    await updateDoc(doc(clientDb, 'applications', id), {
      status,
      updatedAt: new Date().toISOString(),
    });
  },

  subscribeToApplications(callback: (applications: Application[]) => void) {

    return onSnapshot(collection(clientDb, 'applications'), (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application));
    });
  },
};
