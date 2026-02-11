'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, doc, getDoc, setDoc, onAuthStateChanged } from '../lib/firebase';
import { User } from 'firebase/auth';
import { UserProfile, Role } from '../lib/types';

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    isAdmin: boolean;
    isManager: boolean;
    isCashier: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    isAdmin: false,
    isManager: false,
    isCashier: false,
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser?.email) {
                try {
                    const email = firebaseUser.email.toLowerCase();
                    const userRef = doc(db, 'users', firebaseUser.uid);

                    // --- STEP 0: BOOTSTRAP users/{uid} if it doesn't exist ---
                    // This MUST happen first because Firestore rules use users/{uid}
                    // to determine role. Without it, all other reads fail.
                    // The users rule allows create if request.auth.uid == userId.
                    let userDoc = await getDoc(userRef);
                    if (!userDoc.exists()) {
                        // Determine bootstrap role from email (hardcoded known admins)
                        let bootstrapRole = 'GUEST';
                        let bootstrapBranch: string | null = null;
                        if (email === 'admin@webdesignje.com') { bootstrapRole = 'ADMIN'; }
                        else if (email === 'suc1@webdesignje.com') { bootstrapRole = 'MANAGER'; bootstrapBranch = 'suc-1'; }
                        else if (email === 'suc2@webdesignje.com') { bootstrapRole = 'MANAGER'; bootstrapBranch = 'suc-2'; }
                        else if (email === 'suc3@webdesignje.com') { bootstrapRole = 'MANAGER'; bootstrapBranch = 'suc-3'; }

                        await setDoc(userRef, {
                            uid: firebaseUser.uid,
                            email: email,
                            displayName: firebaseUser.displayName || 'Usuario',
                            role: bootstrapRole,
                            branchId: bootstrapBranch,
                            photoURL: firebaseUser.photoURL || null
                        });
                        userDoc = await getDoc(userRef);
                    }

                    // --- STEP 1: ACCESS CONTROL CHECK ---
                    const accessRef = doc(db, 'access_users', email);
                    let accessDoc;
                    try {
                        accessDoc = await getDoc(accessRef);
                    } catch {
                        accessDoc = null;
                    }

                    // --- STEP 2: AUTO-SEEDING (DEV ONLY) --- 
                    if ((!accessDoc || !accessDoc.exists()) && process.env.NODE_ENV === 'development') {
                        let seedRole = 'GUEST';
                        let seedBranch = '';

                        if (email === 'admin@webdesignje.com') { seedRole = 'ADMIN'; }
                        else if (email === 'suc1@webdesignje.com') { seedRole = 'SUC1'; seedBranch = 'suc1'; }
                        else if (email === 'suc2@webdesignje.com') { seedRole = 'SUC2'; seedBranch = 'suc2'; }
                        else if (email === 'suc3@webdesignje.com') { seedRole = 'SUC3'; seedBranch = 'suc3'; }

                        if (seedRole !== 'GUEST') {
                            try {
                                await setDoc(accessRef, {
                                    email: email,
                                    role: seedRole,
                                    branchId: seedBranch,
                                    authorized: true
                                });
                                accessDoc = await getDoc(accessRef);
                            } catch (e) {
                                console.error("Seed failed (likely rules):", e);
                            }
                        }
                    }

                    // --- STEP 3: DETERMINE EFFECTIVE ROLE ---
                    let assignedRole = Role.GUEST;
                    let assignedBranch = '';

                    if (accessDoc && accessDoc.exists()) {
                        const accessData = accessDoc.data();
                        if (accessData.role === 'ADMIN') assignedRole = Role.ADMIN;
                        else if (accessData.role === 'SUC1') { assignedRole = Role.MANAGER; assignedBranch = 'suc-1'; }
                        else if (accessData.role === 'SUC2') { assignedRole = Role.MANAGER; assignedBranch = 'suc-2'; }
                        else if (accessData.role === 'SUC3') { assignedRole = Role.MANAGER; assignedBranch = 'suc-3'; }
                        else if (accessData.role === 'CASHIER') assignedRole = Role.CASHIER;
                    } else {
                        // Fallback: use role from users doc if access_users not available
                        const existingRole = userDoc.data()?.role;
                        if (existingRole === 'ADMIN') assignedRole = Role.ADMIN;
                        else if (existingRole === 'MANAGER') assignedRole = Role.MANAGER;
                        else if (existingRole === 'CASHIER') assignedRole = Role.CASHIER;
                        assignedBranch = userDoc.data()?.branchId || '';
                    }

                    // --- STEP 4: SYNC TO USER PROFILE ---
                    const profileData: UserProfile = {
                        uid: firebaseUser.uid,
                        email: email,
                        displayName: firebaseUser.displayName || 'Usuario',
                        role: assignedRole,
                        branchId: assignedBranch || userDoc.data()?.branchId || null,
                        photoURL: firebaseUser.photoURL || null
                    };

                    // Only update DB if role changed
                    if (userDoc.data()?.role !== assignedRole) {
                        try { await setDoc(userRef, profileData, { merge: true }); } catch (e) { console.error("Error syncing profile:", e); }
                    }

                    setUserProfile(profileData);

                } catch (error) {
                    console.error("Auth error:", error);
                    setUserProfile(null);
                }
            } else {
                setUserProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await auth.signOut();
    };

    const isAdmin = userProfile?.role === Role.ADMIN;
    const isManager = userProfile?.role === Role.MANAGER || isAdmin;
    const isCashier = userProfile?.role === Role.CASHIER || isManager;

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, isAdmin, isManager, isCashier, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
