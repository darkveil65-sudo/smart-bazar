import { clientDb, clientStorage, collection, getDocs, setDoc, doc, deleteDoc, updateDoc, onSnapshot } from '@smart-bazar/shared/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { CATEGORIES } from '@smart-bazar/shared/lib/constants'; // Note: keep constants as is for now unless they get renamed too
import { Store } from '@smart-bazar/shared/types/firestore';

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
    if (snap.empty) {
      // Return default stores if none in Firestore
      return CATEGORIES.map((c) => ({
        id: c.id,
        name: c.name as Store['name'],
        createdAt: new Date().toISOString(),
      }));
    }
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Store)
      .filter((s) => allowedIds.includes(s.id));
  },

  /** Real-time subscription — instantly reflects isComingSoon, name, imageUrl changes */
  subscribeToStores(callback: (cats: Store[]) => void): () => void {
    const allowedIds: string[] = CATEGORIES.map((c) => c.id);
    return onSnapshot(collection(clientDb, 'stores'), (snap) => {
      if (snap.empty) {
        callback(CATEGORIES.map((c) => ({
          id: c.id,
          name: c.name as Store['name'],
          createdAt: new Date().toISOString(),
        })));
      } else {
        const sorted = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Store)
          .filter((s) => allowedIds.includes(s.id))
          .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
        callback(sorted);
      }
    }, (err) => {
      console.error('[storeService] subscription error:', err);
    });
  },

  async seedStores(): Promise<void> {
    for (const cat of CATEGORIES) {
      await setDoc(doc(clientDb, 'stores', cat.id), {
        name: cat.name,
        createdAt: new Date().toISOString(),
      });
    }
  },

  async addStore(id: string, name: string, imageFile: File | null, isComingSoon: boolean = false): Promise<void> {
    let imageUrl = '';
    
    if (imageFile) {
      console.log('Starting image upload for', imageFile.name);
      const storageRef = ref(clientStorage, `stores/${id}/${imageFile.name}`);
      const snapshot = await withTimeout(
        uploadBytes(storageRef, imageFile),
        15000,
        'timeout'
      );
      console.log('Upload successful. Fetching download URL...');
      imageUrl = await getDownloadURL(snapshot.ref);
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
      const storageRef = ref(clientStorage, `stores/${id}/${imageFile.name}`);
      const snapshot = await withTimeout(
        uploadBytes(storageRef, imageFile),
        15000,
        'timeout'
      );
      console.log('Upload successful. Fetching download URL...');
      imageUrl = await getDownloadURL(snapshot.ref);
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
