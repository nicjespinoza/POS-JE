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

                    // --- 1. ACCESS CONTROL CHECK (The "Acceso" Logic) ---
                    // We check a special collection 'access_users' which is the Source of Truth
                    const accessRef = doc(db, 'access_users', email);
                    let accessDoc = await getDoc(accessRef);

                    // --- 2. AUTO-SEEDING (DEV ONLY) --- 
                    // To ensure the system works immediately for the user request
                    if (!accessDoc.exists() && process.env.NODE_ENV === 'development') {
                        console.log("AuthProvider: Seeding Access Control for", email);
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
                                accessDoc = await getDoc(accessRef); // Refresh
                            } catch (e) {
                                console.error("Seed failed (likely rules):", e);
                            }
                        }
                    }

                    // --- 3. DETERMINE EFFECTIVE ROLE ---
                    let assignedRole = Role.GUEST;
                    let assignedBranch = '';

                    if (accessDoc.exists()) {
                        const accessData = accessDoc.data();
                        console.log("AuthProvider: Access Rule Found:", accessData);

                        // Map Custom Roles to System Roles
                        if (accessData.role === 'ADMIN') assignedRole = Role.ADMIN;
                        else if (accessData.role === 'SUC1') { assignedRole = Role.MANAGER; assignedBranch = 'suc-1'; }
                        else if (accessData.role === 'SUC2') { assignedRole = Role.MANAGER; assignedBranch = 'suc-2'; }
                        else if (accessData.role === 'SUC3') { assignedRole = Role.MANAGER; assignedBranch = 'suc-3'; }
                        else if (accessData.role === 'CASHIER') assignedRole = Role.CASHIER;
                    }

                    // --- 4. SYNC TO USER PROFILE (Session State) ---
                    const userRef = doc(db, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userRef);

                    const profileData: UserProfile = {
                        uid: firebaseUser.uid,
                        email: email,
                        displayName: firebaseUser.displayName || 'Usuario',
                        role: assignedRole,
                        branchId: assignedBranch || userDoc.data()?.branchId, // Prefer assigned, fallback to existing
                        photoURL: firebaseUser.photoURL || undefined
                    };

                    // Only update DB if changed to avoid unnecessary writes
                    if (!userDoc.exists() || userDoc.data()?.role !== assignedRole) {
                        console.log("AuthProvider: Syncing Profile to Firestore", profileData);
                        try { await setDoc(userRef, profileData, { merge: true }); } catch (e) { console.error("Error syncing profile:", e); }
                    }

                    setUserProfile(profileData);

                } catch (error) {
                    console.error("Error in Auth/Access logic:", error);
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
