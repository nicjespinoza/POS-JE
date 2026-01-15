import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, collection, query, where, onSnapshot, updateDoc, doc, setDoc } from '../services/firebase';
import { Product, Transaction, CategoryState, RoleDefinition } from '../types'; // Adjust imports
import { MOCK_PRODUCTS, DEFAULT_CATEGORIES, DEFAULT_ROLES } from '../constants'; // Fallbacks
import { useAuth } from './AuthContext';

interface DataContextType {
    products: Product[];
    transactions: Transaction[];
    categories: CategoryState; // Ensure this matches types.ts
    roles: RoleDefinition[];
    loadingData: boolean;
    addProduct: (p: Product) => Promise<void>;
    updateProduct: (p: Product) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
    addTransaction: (t: Transaction) => Promise<void>;
    updateTransaction: (t: Transaction) => Promise<void>; // Add this
    deleteTransaction: (id: string) => Promise<void>; // Add this
    // Add other methods as needed
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within DataProvider');
    return context;
};

// Helper for initial load if DB is empty
const seedData = async () => {
    // Only implemented if requested, to populate initial products
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { userProfile } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    // Assuming CategoryState is { income: string[], expense: string[] } based on AdminDashboard
    const [categories, setCategories] = useState<any>(DEFAULT_CATEGORIES);
    const [roles, setRoles] = useState<RoleDefinition[]>(DEFAULT_ROLES);
    const [loadingData, setLoadingData] = useState(true);

    // Load Products (Real-time)
    useEffect(() => {
        const q = query(collection(db, 'products')); // Potentially filter by branch in future
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items: Product[] = [];
            snapshot.forEach((doc) => {
                items.push(doc.data() as Product);
            });
            // If empty, maybe fall back to mock or localStorage for migration (skip for now)
            setProducts(items);
            setLoadingData(false);
        });
        return () => unsubscribe();
    }, []);

    // Load Transactions (Real-time)
    useEffect(() => {
        // Optimization: limit to recent or paginate in real app 
        const q = query(collection(db, 'transactions'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items: Transaction[] = [];
            snapshot.forEach((doc) => {
                items.push(doc.data() as Transaction);
            });
            setTransactions(items);
        });
        return () => unsubscribe();
    }, []);

    const addProduct = async (product: Product) => {
        await setDoc(doc(db, 'products', product.id), product);
    };

    const updateProduct = async (product: Product) => {
        await updateDoc(doc(db, 'products', product.id), { ...product });
    };

    const deleteProduct = async (id: string) => {
        // In Firestore usually we just mark active:false, but for now delete
        // Implementation depends on needs
        console.warn("Delete not fully implemented in this snippet");
    };

    const addTransaction = async (transaction: Transaction) => {
        await setDoc(doc(db, 'transactions', transaction.id), transaction);

        // Update stock if sale
        if (transaction.type === 'INCOME' && transaction.items) {
            transaction.items.forEach(item => {
                // Logic to decrement stock in Firestore
                // This should ideally be a Cloud Function or Transaction for safety
                // For now, client-side update
                const prodRef = doc(db, 'products', item.id);
                // We need to read current stock first or use increment(-qty)
                // Using updateDoc with increment would be safer
            });
        }
    };

    const updateTransaction = async (transaction: Transaction) => {
        await setDoc(doc(db, 'transactions', transaction.id), transaction, { merge: true });
    };

    const deleteTransaction = async (id: string) => {
        // Implement delete
    };

    return (
        <DataContext.Provider value={{
            products,
            transactions,
            categories,
            roles,
            loadingData,
            addProduct,
            updateProduct,
            deleteProduct,
            addTransaction,
            updateTransaction,
            deleteTransaction
        }}>
            {children}
        </DataContext.Provider>
    );
};
