import { create } from 'zustand';
import { User } from 'firebase/auth';
import { UserData } from '@smart-bazar/shared/types/firestore';
import { clientAuth, clientDb, onAuthStateChanged, doc, getDoc, signOut } from '@smart-bazar/shared/lib/firebase';

interface AuthStore {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  initialized: boolean;
  init: () => () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  userData: null,
  loading: true,
  initialized: false,

  init: () => {
    // Safety fallback: if Firebase onAuthStateChanged hangs completely, release the loader after 8s
    const safetyTimeout = setTimeout(() => {
      if (useAuthStore.getState().loading) {
        useAuthStore.setState({ loading: false });
        console.error("Firebase auth initialization timed out.");
      }
    }, 8000);

    const unsubscribe = onAuthStateChanged(clientAuth, async (user) => {
      clearTimeout(safetyTimeout);
      if (user) {
        try {
          const userDoc = await getDoc(doc(clientDb, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as UserData;
            document.cookie = `userRole=${userData.role}; path=/; max-age=86400`;
            set({ user, userData, loading: false });
          } else {
            set({ user, userData: null, loading: false });
          }
        } catch {
          set({ user, userData: null, loading: false });
        }
      } else {
        document.cookie = 'userRole=; path=/; max-age=0';
        set({ user: null, userData: null, loading: false });
      }
    });
    return unsubscribe;
  },

  logout: async () => {
    await signOut(clientAuth);
    document.cookie = 'userRole=; path=/; max-age=0';
    set({ user: null, userData: null });
  },
}));
