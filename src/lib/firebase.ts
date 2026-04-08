import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  serverTimestamp,
  writeBatch,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyARoEPvlQBjiGTeOQfzWsepQRz_AApEV7M",
  authDomain: "smart-bazar-d08ed.firebaseapp.com",
  databaseURL: "https://smart-bazar-d08ed-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-bazar-d08ed",
  storageBucket: "smart-bazar-d08ed.firebasestorage.app",
  messagingSenderId: "525393563137",
  appId: "1:525393563137:web:7d7cafda7b98f60557fa00",
  measurementId: "G-HW5SGE0CJ7"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const clientAuth = getAuth(app);
export const clientDb = getFirestore(app);
export const clientStorage = getStorage(app);

export {
  collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy,
  onSnapshot, limit, serverTimestamp, writeBatch,
  increment, Timestamp,
};
export {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged,
};

export default app;