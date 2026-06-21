import { create } from 'zustand';
import { User } from 'firebase/auth';
import { UserData } from '@smart-bazar/shared/types/firestore';
import { clientAuth, clientDb, onAuthStateChanged, doc, getDoc, signOut } from '@smart-bazar/shared/lib/firebase';

interface AuthStore {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  initialized: boolean;
  /** True only after onAuthStateChanged fires — prevents role-based redirects from stale cache */
  authReady: boolean;
  init: () => () => void;
  logout: () => Promise<void>;
  setUserData: (userData: UserData | null) => void;
}

// Attempt to read cache synchronously during store creation for instant UI (not for auth decisions)
let initialUserData = null;
let initialLoading = true;
let initialInitialized = false;

if (typeof window !== 'undefined') {
  try {
    const cachedUser = localStorage.getItem('sb_userData');
    if (cachedUser) {
      initialUserData = JSON.parse(cachedUser);
      initialLoading = false;
      initialInitialized = true;
    }
  } catch (e) {
    console.warn('Could not read cached auth data', e);
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  userData: initialUserData,
  loading: initialLoading,
  initialized: initialInitialized,
  authReady: false, // ← starts false; becomes true only after onAuthStateChanged fires

  setUserData: (userData) => set({ userData }),

  init: () => {
    // Attempt to load cached session synchronously to avoid layout shift and Fast Refresh drops
    if (typeof window !== 'undefined') {
      try {
        const cachedUser = localStorage.getItem('sb_userData');
        if (cachedUser) {
          useAuthStore.setState({ userData: JSON.parse(cachedUser), loading: false, initialized: true });
        }
      } catch (e) {
        console.warn('Could not read cached auth data', e);
      }
    }

    // Safety fallback: if Firebase onAuthStateChanged hangs completely, release the loader after 4s
    const safetyTimeout = setTimeout(() => {
      const state = useAuthStore.getState();
      if (state.loading) {
        useAuthStore.setState({ loading: false, initialized: true, authReady: true });
        console.warn("Firebase auth initialization timed out. Proceeding to login...");
      }
      // Also release if authReady is still false but we already have data
      if (!state.authReady && state.initialized) {
        useAuthStore.setState({ authReady: true });
      }
    }, 4000);

    const unsubscribe = onAuthStateChanged(clientAuth, async (user) => {
      console.log("Auth state changed:", user ? `User logged in (${user.email})` : "No user");
      if (user) {
        try {
          const userDoc = await getDoc(doc(clientDb, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as UserData;
            document.cookie = `userRole=${userData.role}; path=/; max-age=86400`;
            if (typeof window !== 'undefined') localStorage.setItem('sb_userData', JSON.stringify(userData));
            set({ user, userData, loading: false, initialized: true, authReady: true });
          } else {
            // Keep cached data if it exists during transient errors, otherwise null
            const hasCache = typeof window !== 'undefined' && localStorage.getItem('sb_userData');
            if (!hasCache) set({ user, userData: null, loading: false, initialized: true, authReady: true });
            else set({ user, loading: false, initialized: true, authReady: true });
          }
         } catch (error) {
           console.error('Auth initialization error:', error);
           // Do not wipe userData aggressively on simple network errors
           set({ user, loading: false, initialized: true, authReady: true });
         } finally {
           clearTimeout(safetyTimeout);
         }
      } else {
        document.cookie = 'userRole=; path=/; max-age=0';
        if (typeof window !== 'undefined') localStorage.removeItem('sb_userData');
        set({ user: null, userData: null, loading: false, initialized: true, authReady: true });
        clearTimeout(safetyTimeout);
      }
    });
    return unsubscribe;
  },

  logout: async () => {
    await signOut(clientAuth);
    document.cookie = 'userRole=; path=/; max-age=0';
    if (typeof window !== 'undefined') localStorage.removeItem('sb_userData');
    set({ user: null, userData: null });
  },
}));
