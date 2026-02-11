'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
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
        let cancelled = false;

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (cancelled) return;
            setUser(firebaseUser);

            if (firebaseUser?.email) {
                // Reset loading so pages show "Cargando..." while we fetch the profile
                setLoading(true);
                try {
                    // Ensure the auth token is available (no force-refresh to avoid
                    // network failures). The SDK caches the token from sign-in.
                    await firebaseUser.getIdToken();
                    if (cancelled) return;

                    const email = firebaseUser.email.toLowerCase();
                    const userRef = doc(db, 'users', firebaseUser.uid);

                    // --- STEP 0: READ OR CREATE users/{uid} ---
                    // Retry logic: Firestore SDK may not have synced the auth
                    // token to its WebChannel yet when onAuthStateChanged fires.
                    let userDoc: any = null;
                    for (let attempt = 1; attempt <= 3; attempt++) {
                        try {
                            userDoc = await getDoc(userRef);
                            break; // success
                        } catch (e) {
                            console.warn(`[AuthContext] getDoc attempt ${attempt}/3 failed:`, (e as any)?.code);
                            if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 500));
                        }
                    }
                    if (cancelled) return;

                    if (!userDoc || !userDoc.exists()) {
                        // Determine bootstrap role from email (hardcoded known admins)
                        let bootstrapRole = 'GUEST';
                        let bootstrapBranch: string | null = null;
                        if (email === 'admin@webdesignje.com') { bootstrapRole = 'ADMIN'; }
                        else if (email === 'suc1@webdesignje.com') { bootstrapRole = 'MANAGER'; bootstrapBranch = 'suc-1'; }
                        else if (email === 'suc2@webdesignje.com') { bootstrapRole = 'MANAGER'; bootstrapBranch = 'suc-2'; }
                        else if (email === 'suc3@webdesignje.com') { bootstrapRole = 'MANAGER'; bootstrapBranch = 'suc-3'; }

                        try {
                            await setDoc(userRef, {
                                uid: firebaseUser.uid,
                                email: email,
                                displayName: firebaseUser.displayName || 'Usuario',
                                role: bootstrapRole,
                                branchId: bootstrapBranch,
                                photoURL: firebaseUser.photoURL || null
                            });
                            userDoc = await getDoc(userRef);
                        } catch (createErr) {
                            console.warn('[AuthContext] bootstrap setDoc failed:', (createErr as any)?.code);
                        }
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
                                console.warn("[AuthContext] access_users seed failed (rules):", (e as any)?.code);
                            }
                        }
                    }

                    // --- STEP 3: DETERMINE EFFECTIVE ROLE ---
                    let assignedRole = Role.GUEST;
                    let assignedBranch = '';
                    const userDocData = userDoc?.data?.() || null;

                    if (accessDoc && accessDoc.exists()) {
                        const accessData = accessDoc.data();
                        if (accessData.role === 'ADMIN') assignedRole = Role.ADMIN;
                        else if (accessData.role === 'SUC1') { assignedRole = Role.MANAGER; assignedBranch = 'suc-1'; }
                        else if (accessData.role === 'SUC2') { assignedRole = Role.MANAGER; assignedBranch = 'suc-2'; }
                        else if (accessData.role === 'SUC3') { assignedRole = Role.MANAGER; assignedBranch = 'suc-3'; }
                        else if (accessData.role === 'CASHIER') assignedRole = Role.CASHIER;
                    } else if (userDocData) {
                        // Fallback: use role from users doc if access_users not available
                        const existingRole = userDocData.role;
                        if (existingRole === 'ADMIN') assignedRole = Role.ADMIN;
                        else if (existingRole === 'MANAGER') assignedRole = Role.MANAGER;
                        else if (existingRole === 'CASHIER') assignedRole = Role.CASHIER;
                        assignedBranch = userDocData.branchId || '';
                    } else {
                        // Last resort: derive role from email when Firestore is unreachable
                        if (email === 'admin@webdesignje.com') assignedRole = Role.ADMIN;
                        else if (email.startsWith('suc') && email.endsWith('@webdesignje.com')) {
                            assignedRole = Role.MANAGER;
                            const num = email.replace('suc', '').split('@')[0];
                            assignedBranch = `suc-${num}`;
                        }
                    }

                    // --- STEP 4: SYNC TO USER PROFILE ---
                    const profileData: UserProfile = {
                        uid: firebaseUser.uid,
                        email: email,
                        displayName: firebaseUser.displayName || 'Usuario',
                        role: assignedRole,
                        branchId: assignedBranch || userDocData?.branchId || null,
                        photoURL: firebaseUser.photoURL || null
                    };

                    // Only update DB if role changed and we have a valid doc
                    if (userDocData && userDocData.role !== assignedRole) {
                        try { await setDoc(userRef, profileData, { merge: true }); } catch (e) { /* non-critical */ }
                    }

                    // --- STEP 5: MARK ONLINE ---
                    try {
                        await setDoc(userRef, {
                            isOnline: true,
                            lastSeen: new Date().toISOString()
                        }, { merge: true });
                    } catch (e) { /* non-critical */ }

                    if (!cancelled) setUserProfile(profileData);

                } catch (error) {
                    console.error("[AuthContext] Auth flow error:", error);
                    if (!cancelled) {
                        // LAST RESORT: build a minimal profile from the firebase user
                        // so the app doesn't redirect to login when the user IS signed in.
                        const email = firebaseUser.email!.toLowerCase();
                        let fallbackRole = Role.GUEST;
                        let fallbackBranch = '';
                        if (email === 'admin@webdesignje.com') fallbackRole = Role.ADMIN;
                        else if (email === 'suc1@webdesignje.com') { fallbackRole = Role.MANAGER; fallbackBranch = 'suc-1'; }
                        else if (email === 'suc2@webdesignje.com') { fallbackRole = Role.MANAGER; fallbackBranch = 'suc-2'; }
                        else if (email === 'suc3@webdesignje.com') { fallbackRole = Role.MANAGER; fallbackBranch = 'suc-3'; }
                        setUserProfile({
                            uid: firebaseUser.uid,
                            email: email,
                            displayName: firebaseUser.displayName || 'Usuario',
                            role: fallbackRole,
                            branchId: fallbackBranch || null,
                            photoURL: firebaseUser.photoURL || null
                        });
                    }
                }
            } else {
                if (!cancelled) setUserProfile(null);
            }

            if (!cancelled) setLoading(false);
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    // Heartbeat: update lastSeen every 60s while online
    const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (user && userProfile) {
            const userRef = doc(db, 'users', user.uid);

            // Start heartbeat
            heartbeatRef.current = setInterval(async () => {
                try {
                    await setDoc(userRef, { lastSeen: new Date().toISOString(), isOnline: true }, { merge: true });
                } catch { /* non-critical */ }
            }, 60000); // every 60s

            // Mark offline on tab close
            const handleBeforeUnload = () => {
                // Use sendBeacon for reliability on page close
                // Fallback: the heartbeat will stop and isOnline can be inferred from lastSeen
                try {
                    setDoc(userRef, { isOnline: false, lastSeen: new Date().toISOString() }, { merge: true });
                } catch { /* best effort */ }
            };
            window.addEventListener('beforeunload', handleBeforeUnload);

            return () => {
                if (heartbeatRef.current) clearInterval(heartbeatRef.current);
                window.removeEventListener('beforeunload', handleBeforeUnload);
            };
        }
    }, [user, userProfile]);

    const logout = async () => {
        // Mark offline before signing out
        if (user) {
            try {
                const userRef = doc(db, 'users', user.uid);
                await setDoc(userRef, { isOnline: false, lastSeen: new Date().toISOString() }, { merge: true });
            } catch { /* non-critical */ }
        }
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
