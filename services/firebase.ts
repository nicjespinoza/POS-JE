import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, doc, getDoc, getDocs, setDoc, updateDoc, onSnapshot, query, where, orderBy, limit, Timestamp, runTransaction, serverTimestamp, FieldValue, DocumentData, startAfter, writeBatch } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// App Check - descomentar cuando se configure reCAPTCHA
// import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

// Validate required config at startup
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('[SECURITY] Missing Firebase config. Set VITE_FIREBASE_* vars in .env.local');
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// App Check Configuration - Activar en producción con reCAPTCHA
// Comentado hasta que se configure VITE_RECAPTCHA_SITE_KEY en .env
/*
if (import.meta.env.PROD && import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true
  });
  console.log('[SECURITY] App Check initialized');
}
*/

// Emulator Configuration - Solo para desarrollo local
const USE_EMULATOR = import.meta.env.VITE_USE_EMULATOR === 'true';

if (USE_EMULATOR) {
  console.log('[DEV] Connecting to Firebase Emulators...');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  console.log('[DEV] Connected to Firestore (8080) and Auth (9099) emulators');
}

export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  Timestamp,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  runTransaction,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  serverTimestamp,
  FieldValue,
  USE_EMULATOR
};

export type { DocumentData };
