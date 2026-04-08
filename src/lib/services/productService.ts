import {
  clientDb, collection, doc, getDocs, addDoc,
  updateDoc, deleteDoc, query, where, onSnapshot,
} from '@/lib/firebase';
import { Product } from '@/types/firestore';

export const productService = {
  async getAllProducts(): Promise<Product[]> {
    const snap = await getDocs(collection(clientDb, 'products'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
  },

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    const q = query(collection(clientDb, 'products'), where('category', '==', categoryId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
  },

  async getProductsByStore(storeId: string): Promise<Product[]> {
    const q = query(collection(clientDb, 'products'), where('storeId', '==', storeId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
  },

  async addProduct(data: Omit<Product, 'id'>): Promise<string> {
    const ref = await addDoc(collection(clientDb, 'products'), {
      ...data,
      createdAt: new Date().toISOString(),
    });
    return ref.id;
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    await updateDoc(doc(clientDb, 'products', id), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },

  async deleteProduct(id: string): Promise<void> {
    await deleteDoc(doc(clientDb, 'products', id));
  },

  subscribeToProducts(callback: (products: Product[]) => void) {
    return onSnapshot(collection(clientDb, 'products'), (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product));
    });
  },

  subscribeToCategoryProducts(categoryId: string, callback: (products: Product[]) => void) {
    const q = query(collection(clientDb, 'products'), where('category', '==', categoryId));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product));
    });
  },
};
