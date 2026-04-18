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
  setUserData: (userData: UserData | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  userData: null,
  loading: true,
  initialized: false,

  setUserData: (userData) => set({ userData }),

  init: () => {
    // Safety fallback: if Firebase onAuthStateChanged hangs completely, release the loader after 4s
    const safetyTimeout = setTimeout(() => {
      if (useAuthStore.getState().loading) {
        useAuthStore.setState({ loading: false, initialized: true });
        console.warn("Firebase auth initialization timed out. Proceeding to login...");
      }
    }, 4000);

    const unsubscribe = onAuthStateChanged(clientAuth, async (user) => {
      clearTimeout(safetyTimeout);
      console.log("Auth state changed:", user ? `User logged in (${user.email})` : "No user");
      if (user) {
        try {
          const userDoc = await getDoc(doc(clientDb, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as UserData;
            document.cookie = `userRole=${userData.role}; path=/; max-age=86400`;
            set({ user, userData, loading: false, initialized: true });
          } else {
            set({ user, userData: null, loading: false, initialized: true });
          }
         } catch (error) {
           console.error('Auth initialization error:', error);
           set({ user, userData: null, loading: false, initialized: true });
         }
      } else {
        document.cookie = 'userRole=; path=/; max-age=0';
        set({ user: null, userData: null, loading: false, initialized: true });
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
