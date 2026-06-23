import { clientDb, collection, getDocs, setDoc, doc, deleteDoc, updateDoc, onSnapshot, getDoc } from '@smart-bazar/shared/lib/firebase';
import { CATEGORIES } from '@smart-bazar/shared/lib/constants';
import { Store } from '@smart-bazar/shared/types/firestore';
import { uploadToCloudinary } from './cloudinaryService';

const withTimeout = <T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      console.warn(`[Timeout Triggered] ${errorMsg} after ${ms}ms`);
      reject(new Error(errorMsg));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
};

export const storeService = {
  async getStores(): Promise<Store[]> {
    const snap = await getDocs(collection(clientDb, 'stores'));
    const allowedIds: string[] = CATEGORIES.map((c) => c.id);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Store)
      .filter((s) => allowedIds.includes(s.id));
  },

  subscribeToStores(callback: (stores: Store[]) => void): () => void {
    const allowedIds: string[] = CATEGORIES.map((c) => c.id);
    return onSnapshot(collection(clientDb, 'stores'), (snap) => {
      const results = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Store)
        .filter((s) => allowedIds.includes(s.id));
      callback(results);
    }, (error) => {
      console.error('[storeService] Realtime listener error:', error);
      callback([]);
    });
  },

  async getStore(id: string): Promise<Store | null> {
    const snap = await getDoc(doc(clientDb, 'stores', id));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Store;
    }
    return null;
  },

  async seedStores(): Promise<void> {
    const now = new Date().toISOString();
    for (const cat of CATEGORIES) {
      const storeRef = doc(clientDb, 'stores', cat.id);
      const snap = await getDoc(storeRef);
      if (!snap.exists()) {
        await setDoc(storeRef, {
          name: cat.name + ' Bazar',
          isComingSoon: false,
          createdAt: now,
        });
      }
    }
  },

  async addStore(id: string, name: string, imageFile: File | null, isComingSoon: boolean = false): Promise<void> {
    let imageUrl = '';
    
    if (imageFile) {
      console.log('Starting image upload for', imageFile.name);
      imageUrl = await uploadToCloudinary(imageFile);
    }
    
    console.log('Saving store metadata to Firestore...');
    const docPromise = setDoc(doc(clientDb, 'stores', id), {
      name,
      isComingSoon,
      ...(imageUrl && { imageUrl }),
      createdAt: new Date().toISOString(),
    });
    
    await withTimeout(
      docPromise,
      10000,
      'Firestore write timed out after 10 seconds. Check connection or security rules.'
    );
    console.log('Store save complete.');
  },
  
  async updateStore(id: string, name: string, imageFile: File | null, existingImageUrl?: string, isComingSoon: boolean = false): Promise<void> {
    let imageUrl = existingImageUrl || '';
    
    if (imageFile) {
      console.log('Starting image upload for', imageFile.name);
      imageUrl = await uploadToCloudinary(imageFile);
    }
    
    console.log('Updating store metadata in Firestore...');
    const docPromise = updateDoc(doc(clientDb, 'stores', id), {
      name,
      isComingSoon,
      ...(imageUrl && { imageUrl }),
    });
    
    await withTimeout(
      docPromise,
      10000,
      'Firestore write timed out after 10 seconds. Check connection or security rules.'
    );
    console.log('Store update complete.');
  },
  
  async deleteStore(id: string): Promise<void> {
    await deleteDoc(doc(clientDb, 'stores', id));
  }
};
