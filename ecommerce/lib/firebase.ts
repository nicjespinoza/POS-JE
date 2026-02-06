import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, onSnapshot, query, where, Timestamp, runTransaction, increment, limit, orderBy, addDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyAWQS6K0KX5v4VcCMkc8wYMcDCy620g5a0",
    authDomain: "pos-zapatos.firebaseapp.com",
    projectId: "pos-zapatos",
    storageBucket: "pos-zapatos.firebasestorage.app",
    messagingSenderId: "717323415083",
    appId: "1:717323415083:web:12e41d5fd205ba2301c46e",
    measurementId: "G-DQTWFD2B83"
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
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    increment,
    limit,
    orderBy,
    addDoc,
    deleteDoc,
    ref,
    uploadBytes,
    getDownloadURL
};
