import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456:web:demo',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const clientAuth = getAuth(app);
export const clientDb = getFirestore(app);

export { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot, limit };
export { signInWithEmailAndPassword, signOut, onAuthStateChanged };

export default app;