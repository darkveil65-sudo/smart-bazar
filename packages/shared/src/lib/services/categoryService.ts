import { clientDb, collection, getDocs, setDoc, doc, deleteDoc, updateDoc, query, where, onSnapshot } from '@smart-bazar/shared/lib/firebase';
import { Category } from '@smart-bazar/shared/types/firestore';
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

export const categoryService = {
  async getCategories(storeId: string): Promise<Category[]> {
    const effectiveStoreId = 'furniture-store';
    const q = query(collection(clientDb, 'categories'), where('storeId', '==', effectiveStoreId));
    const snap = await getDocs(q);
    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
    console.log(`[categoryService] getCategories(${storeId}) ->`, results.length, 'items');
    return results;
  },

  subscribeToCategories(storeId: string, callback: (data: Category[]) => void): () => void {
    const effectiveStoreId = 'furniture-store';
    const q = query(collection(clientDb, 'categories'), where('storeId', '==', effectiveStoreId));
    return onSnapshot(q, (snap) => {
      const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
      console.log(`[categoryService] subscribeToCategories(${storeId}) ->`, results.length, 'items');
      callback(results);
    }, (error) => {
      console.error('[categoryService] Realtime listener error:', error);
      callback([]);
    });
  },

  async getAllCategories(): Promise<Category[]> {
    const snap = await getDocs(collection(clientDb, 'categories'));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Category)
      .filter((c) => c.storeId === 'furniture-store');
  },

  async addCategory(id: string, storeId: string, name: string, imageFile: File | null): Promise<void> {
    if (storeId !== 'furniture-store') {
      throw new Error(`Invalid storeId "${storeId}". Only "furniture-store" is supported.`);
    }
    let imageUrl = '';
    if (imageFile) {
      console.log('Starting image upload for', imageFile.name);
      imageUrl = await uploadToCloudinary(imageFile);
    }
    
    console.log('Saving category metadata to Firestore...');
    const docPromise = setDoc(doc(clientDb, 'categories', id), {
      storeId,
      name,
      ...(imageUrl && { imageUrl }),
      createdAt: new Date().toISOString(),
    });

    await withTimeout(
      docPromise,
      10000,
      'Firestore write timed out after 10 seconds. Check connection or security rules.'
    );
    console.log('Category save complete.');
  },
  
  async updateCategory(id: string, name: string, imageFile: File | null, existingImageUrl?: string): Promise<void> {
    let imageUrl = existingImageUrl || '';
    if (imageFile) {
      console.log('Starting image upload for', imageFile.name);
      imageUrl = await uploadToCloudinary(imageFile);
    }
    
    console.log('Updating category metadata in Firestore...');
    const docPromise = updateDoc(doc(clientDb, 'categories', id), {
      name,
      ...(imageUrl && { imageUrl }),
    });

    await withTimeout(
      docPromise,
      10000,
      'Firestore write timed out after 10 seconds. Check connection or security rules.'
    );
    console.log('Category update complete.');
  },
  
  async deleteCategory(id: string): Promise<void> {
    await deleteDoc(doc(clientDb, 'categories', id));
  }
};
