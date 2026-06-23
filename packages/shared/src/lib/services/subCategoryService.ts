import { clientDb, collection, getDocs, setDoc, doc, deleteDoc, updateDoc, query, where, onSnapshot } from '@smart-bazar/shared/lib/firebase';
import { SubCategory } from '@smart-bazar/shared/types/firestore';
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

export const subCategoryService = {
  async getSubCategories(categoryId: string): Promise<SubCategory[]> {
    const q = query(collection(clientDb, 'subcategories'), where('categoryId', '==', categoryId));
    const snap = await getDocs(q);
    const results = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as SubCategory)
      .filter((sc) => sc.storeId === 'furniture-store');
    console.log(`[subCategoryService] getSubCategories(${categoryId}) ->`, results.length, 'items');
    return results;
  },

  subscribeToSubCategories(categoryId: string, callback: (data: SubCategory[]) => void): () => void {
    const q = query(collection(clientDb, 'subcategories'), where('categoryId', '==', categoryId));
    return onSnapshot(q, (snap) => {
      const results = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as SubCategory)
        .filter((sc) => sc.storeId === 'furniture-store');
      console.log(`[subCategoryService] subscribeToSubCategories(${categoryId}) ->`, results.length, 'items');
      callback(results);
    }, (error) => {
      console.error('[subCategoryService] Realtime listener error:', error);
      callback([]);
    });
  },

  subscribeToStoreSubCategories(storeId: string, callback: (data: SubCategory[]) => void): () => void {
    const effectiveStoreId = 'furniture-store';
    const q = query(collection(clientDb, 'subcategories'), where('storeId', '==', effectiveStoreId));
    return onSnapshot(q, (snap) => {
      const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SubCategory);
      console.log(`[subCategoryService] subscribeToStoreSubCategories(${storeId}) ->`, results.length, 'items');
      callback(results);
    }, (error) => {
      console.error('[subCategoryService] Realtime store listener error:', error);
      callback([]);
    });
  },

  async getAllSubCategories(): Promise<SubCategory[]> {
    const snap = await getDocs(collection(clientDb, 'subcategories'));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as SubCategory)
      .filter((sc) => sc.storeId === 'furniture-store');
  },

  async addSubCategory(id: string, categoryId: string, storeId: string, name: string, imageFile: File | null): Promise<void> {
    let imageUrl = '';
    if (imageFile) {
      console.log('Starting image upload for', imageFile.name);
      imageUrl = await uploadToCloudinary(imageFile);
    }
    
    console.log('Saving subcategory metadata to Firestore...');
    const docPromise = setDoc(doc(clientDb, 'subcategories', id), {
      categoryId,
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
    console.log('SubCategory save complete.');
  },
  
  async updateSubCategory(id: string, name: string, imageFile: File | null, existingImageUrl?: string): Promise<void> {
    let imageUrl = existingImageUrl || '';
    if (imageFile) {
      console.log('Starting image upload for', imageFile.name);
      imageUrl = await uploadToCloudinary(imageFile);
    }
    
    console.log('Updating subcategory metadata in Firestore...');
    const docPromise = updateDoc(doc(clientDb, 'subcategories', id), {
      name,
      ...(imageUrl && { imageUrl }),
    });

    await withTimeout(
      docPromise,
      10000,
      'Firestore write timed out after 10 seconds. Check connection or security rules.'
    );
    console.log('SubCategory update complete.');
  },
  
  async deleteSubCategory(id: string): Promise<void> {
    await deleteDoc(doc(clientDb, 'subcategories', id));
  }
};
