import { clientDb, collection, getDocs, doc, setDoc, updateDoc, deleteDoc, onSnapshot, orderBy, query } from '@smart-bazar/shared/lib/firebase';
import { HeroBanner } from '../../types/firestore';
import { uploadToCloudinary } from './cloudinaryService';

const COL = 'heroBanners';

export const heroBannerService = {
  /** Real-time listener — sorted by order ascending */
  subscribe(callback: (banners: HeroBanner[]) => void): () => void {
    const q = query(collection(clientDb, COL), orderBy('order', 'asc'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as HeroBanner));
    });
  },

  /** Get all banners once */
  async getAll(): Promise<HeroBanner[]> {
    const q    = query(collection(clientDb, COL), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as HeroBanner);
  },

  /** Add a new banner */
  async add(data: Omit<HeroBanner, 'id'>, imageFile?: File | null): Promise<void> {
    const id = `banner_${Date.now()}`;
    let imageUrl = data.imageUrl ?? '';

    if (imageFile) {
      imageUrl = await uploadToCloudinary(imageFile);
    }

    await setDoc(doc(clientDb, COL, id), {
      ...data,
      imageUrl,
      createdAt: new Date().toISOString(),
    });
  },

  /** Update an existing banner */
  async update(id: string, data: Partial<Omit<HeroBanner, 'id'>>, imageFile?: File | null): Promise<void> {
    const updates: Record<string, unknown> = { ...data };

    if (imageFile) {
      updates.imageUrl = await uploadToCloudinary(imageFile);
    }

    await updateDoc(doc(clientDb, COL, id), updates);
  },

  /** Delete a banner */
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(clientDb, COL, id));
  },

  /** Toggle active/inactive */
  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await updateDoc(doc(clientDb, COL, id), { isActive });
  },
};
