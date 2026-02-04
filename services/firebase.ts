import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, onSnapshot, query, where, Timestamp, runTransaction } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB1Mvre6TiW6eOK0PTQfNn8iLh7riw2ISk",
  authDomain: "posoriental-88648.firebaseapp.com",
  projectId: "posoriental-88648",
  storageBucket: "posoriental-88648.firebasestorage.app",
  messagingSenderId: "485487454134",
  appId: "1:485487454134:web:bc3bf851c588e6d6bec317",
  measurementId: "G-54E1P0Y5D0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

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
  createUserWithEmailAndPassword
};
