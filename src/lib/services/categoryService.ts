import { clientDb, collection, getDocs, setDoc, doc } from '@/lib/firebase';
import { CATEGORIES } from '@/lib/constants';
import { Category } from '@/types/firestore';

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    const snap = await getDocs(collection(clientDb, 'categories'));
    if (snap.empty) {
      // Return default categories if none in Firestore
      return CATEGORIES.map((c) => ({
        id: c.id,
        name: c.name as Category['name'],
        createdAt: new Date().toISOString(),
      }));
    }
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
  },

  async seedCategories(): Promise<void> {
    for (const cat of CATEGORIES) {
      await setDoc(doc(clientDb, 'categories', cat.id), {
        name: cat.name,
        createdAt: new Date().toISOString(),
      });
    }
  },
};
