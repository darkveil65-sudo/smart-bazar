import {
  clientDb, collection, getDocs, addDoc,
  updateDoc, doc, query, where, onSnapshot,
} from '@smart-bazar/shared/lib/firebase';
import { Application } from '@smart-bazar/shared/types/firestore';

export const applicationService = {
  // ─── READ ─────────────────────────────────────────────────
  async getAllApplications(): Promise<Application[]> {
    const snap = await getDocs(collection(clientDb, 'applications'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application);
  },

  async getPendingApplications(): Promise<Application[]> {
    const q = query(collection(clientDb, 'applications'), where('status', '==', 'pending'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application);
  },

  async getApplicationsByUser(userId: string): Promise<Application[]> {
    const q = query(collection(clientDb, 'applications'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application);
  },

  // ─── CREATE ───────────────────────────────────────────────
  async createApplication(data: Omit<Application, 'id'>): Promise<string> {
    const ref = await addDoc(collection(clientDb, 'applications'), {
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  },

  // ─── APPROVE (also upgrades user role) ────────────────────
  async approveApplication(
    applicationId: string,
    application: Application,
    reviewedBy: string,
    managerId?: string
  ): Promise<void> {
    // 1. Update application status
    await updateDoc(doc(clientDb, 'applications', applicationId), {
      status: 'approved',
      reviewedBy,
      updatedAt: new Date().toISOString(),
    });

    // 2. Upgrade user role in Firestore
    const newRole = application.type === 'store' ? 'store'
      : application.type === 'delivery' ? 'delivery'
      : 'manager';
    const updates: Record<string, unknown> = {
      role: newRole,
      status: 'active',
      updatedAt: new Date().toISOString(),
    };

    if (application.type === 'store' && application.storeCategory) {
      updates.storeCategory = application.storeCategory;
    }

    if (managerId) {
      updates.managerId = managerId;
    }

    await updateDoc(doc(clientDb, 'users', application.userId), updates);
  },

  async rejectApplication(
    applicationId: string,
    reviewedBy: string,
    notes?: string
  ): Promise<void> {
    await updateDoc(doc(clientDb, 'applications', applicationId), {
      status: 'rejected',
      reviewedBy,
      adminNotes: notes || '',
      updatedAt: new Date().toISOString(),
    });
  },

  // ─── REAL-TIME ────────────────────────────────────────────
  subscribeToApplications(callback: (applications: Application[]) => void) {
    return onSnapshot(collection(clientDb, 'applications'), (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application));
    });
  },

  subscribeToPendingApplications(callback: (applications: Application[]) => void) {
    const q = query(collection(clientDb, 'applications'), where('status', '==', 'pending'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application));
    });
  },
};
