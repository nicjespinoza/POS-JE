import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, doc, getDoc, onAuthStateChanged } from '../services/firebase';
import { User } from 'firebase/auth';
import { UserProfile, Role } from '../types';

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    isAdmin: boolean;
    isManager: boolean;
    isCashier: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    isAdmin: false,
    isManager: false,
    isCashier: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                // Fetch additional role data from Firestore
                try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (userDoc.exists()) {
                        setUserProfile(userDoc.data() as UserProfile);
                    } else {
                        // Only for dev/first run: Create a basic profile if not exists
                        // In production, users should be created by admin
                        setUserProfile({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email || '',
                            role: Role.GUEST,
                            displayName: firebaseUser.displayName || 'Usuario',
                        });
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    setUserProfile(null);
                }
            } else {
                setUserProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const isAdmin = userProfile?.role === Role.ADMIN;
    const isManager = userProfile?.role === Role.MANAGER || isAdmin;
    const isCashier = userProfile?.role === Role.CASHIER || isManager;

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, isAdmin, isManager, isCashier }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
