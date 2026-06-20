import {
  clientDb, collection, doc, getDocs, getDoc, addDoc,
  updateDoc, deleteDoc, query, where, onSnapshot,
  clientStorage
} from '@smart-bazar/shared/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Product } from '@smart-bazar/shared/types/firestore';

/**
 * Firestore rejects `undefined` values.
 * Recursively remove all keys whose value is `undefined` before writing.
 */
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

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

export const productService = {
  async getProductById(id: string): Promise<Product | null> {
    const snap = await getDoc(doc(clientDb, 'products', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Product;
  },

  // Alias
  async getProduct(id: string): Promise<Product | null> {
    return this.getProductById(id);
  },

  // Update image URL by product id (used for background image upload)
  async updateProductImageByName(name: string, imageUrl: string): Promise<void> {
    const q = query(collection(clientDb, 'products'), where('name', '==', name));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const latestDoc = snap.docs[snap.docs.length - 1];
      await updateDoc(doc(clientDb, 'products', latestDoc.id), { imageUrl, updatedAt: new Date().toISOString() });
    }
  },

  async getAllProducts(): Promise<Product[]> {
    const snap = await getDocs(collection(clientDb, 'products'));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Product)
      .filter((p) => p.store === 'furniture-store');
  },

  async getProductsByStore(storeId: string): Promise<Product[]> {
    const effectiveStoreId = 'furniture-store';
    const q = query(collection(clientDb, 'products'), where('store', '==', effectiveStoreId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
  },

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    const q = query(collection(clientDb, 'products'), where('category', '==', categoryId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Product)
      .filter((p) => p.store === 'furniture-store');
  },

  async getProductsByVendor(vendorId: string): Promise<Product[]> {
    const q = query(collection(clientDb, 'products'), where('vendorId', '==', vendorId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Product)
      .filter((p) => p.store === 'furniture-store');
  },

  async addProduct(data: Omit<Product, 'id'>): Promise<string> {
    const clean = stripUndefined({
      ...data,
      createdAt: new Date().toISOString(),
    } as Record<string, unknown>);
    const docRef = await addDoc(collection(clientDb, 'products'), clean);
    return docRef.id;
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    const clean = stripUndefined({
      ...data,
      updatedAt: new Date().toISOString(),
    } as Record<string, unknown>);
    await updateDoc(doc(clientDb, 'products', id), clean);
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      const snap = await getDoc(doc(clientDb, 'products', id));
      if (snap.exists()) {
        const productData = snap.data() as Product;
        if (productData.imageUrl && productData.imageUrl.includes('firebasestorage.googleapis.com')) {
          try {
            const imageRef = ref(clientStorage, productData.imageUrl);
            await deleteObject(imageRef);
          } catch (e) {
            console.error('Failed to delete image from storage:', e);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching product before deletion:', e);
    }
    
    await deleteDoc(doc(clientDb, 'products', id));
  },

  async uploadProductImage(file: File): Promise<string> {
    const storageRef = ref(clientStorage, `products/${Date.now()}_${file.name}`);
    const snapshot = await withTimeout(
      uploadBytes(storageRef, file),
      15000,
      'timeout'
    );
    return await getDownloadURL(snapshot.ref);
  },

  subscribeToProducts(callback: (products: Product[]) => void) {
    return onSnapshot(collection(clientDb, 'products'), (snap) => {
      callback(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Product)
          .filter((p) => p.store === 'furniture-store')
      );
    });
  },

  subscribeToProductsByVendor(vendorId: string, callback: (products: Product[]) => void) {
    const q = query(collection(clientDb, 'products'), where('vendorId', '==', vendorId));
    return onSnapshot(q, (snap) => {
      callback(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Product)
          .filter((p) => p.store === 'furniture-store')
      );
    });
  },

  subscribeToStoreProducts(storeId: string, callback: (products: Product[]) => void) {
    const effectiveStoreId = 'furniture-store';
    const q = query(collection(clientDb, 'products'), where('store', '==', effectiveStoreId));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product));
    });
  },

  subscribeToCategoryProducts(categoryId: string, callback: (products: Product[]) => void) {
    const q = query(collection(clientDb, 'products'), where('category', '==', categoryId));
    return onSnapshot(q, (snap) => {
      callback(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as Product)
          .filter((p) => p.store === 'furniture-store')
      );
    });
  },
};
