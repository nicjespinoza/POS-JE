import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, collection, query, where, onSnapshot, updateDoc, doc, setDoc, orderBy, limit } from '../services/firebase';
import { processAtomicSale } from '../services/inventoryService';
import { useProductStore } from '../services/productStore';
import { Product, Transaction, CategoryState, RoleDefinition, Role } from '../types'; // Adjust imports
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
    // [SCALABILITY] Products now managed by Zustand store with cache + incremental listeners
    const products = useProductStore(state => state.products);
    const productsLoading = useProductStore(state => state.loading);
    const loadAllProducts = useProductStore(state => state.loadAll);
    const subscribeToProductChanges = useProductStore(state => state.subscribeToChanges);

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    // Assuming CategoryState is { income: string[], expense: string[] } based on AdminDashboard
    const [categories, setCategories] = useState<CategoryState>(DEFAULT_CATEGORIES);
    const [roles, setRoles] = useState<RoleDefinition[]>(DEFAULT_ROLES);
    const [loadingData, setLoadingData] = useState(true);

    // [SCALABILITY] Load products via Zustand (paginated + cached) then subscribe to incremental changes
    useEffect(() => {
        loadAllProducts().then(() => {
            setLoadingData(false);
        });
        const unsubscribe = subscribeToProductChanges();
        return () => unsubscribe();
    }, [loadAllProducts, subscribeToProductChanges]);

    // Load Transactions (Real-time)
    useEffect(() => {
        // Optimization: Limit to last 50 transactions to prevent "Query of Death"
        // Note: If orderBy is used, a composite index is needed. For now, we will just rely on basic limits or client-side sort if data is small, 
        // BUT the goal is to prevent massive reads. 
        // 1. Transactions - Optimized Query
        // Filters:
        // - ADMIN: All transactions
        // - MANAGER/CASHIER: Only their branch
        let q = query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(50));

        if (userProfile && userProfile.role !== Role.ADMIN && userProfile.branchId) {
            // Ideally create composite index: branchId + date
            q = query(
                collection(db, 'transactions'),
                where('branchId', '==', userProfile.branchId),
                orderBy('date', 'desc'),
                limit(50)
            );
        }

        const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
            const items: Transaction[] = [];
            snapshot.forEach((doc) => {
                items.push(doc.data() as Transaction);
            });
            // Sort and slice locally for now to avoid Index Error during dev
            items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTransactions(items.slice(0, 50));
        });
        return () => unsubscribeTransactions();
    }, [userProfile]);

    // [SCALABILITY] Product writes delegated to Zustand store (listener auto-syncs)
    const storeAddProduct = useProductStore(state => state.addProduct);
    const storeUpdateProduct = useProductStore(state => state.updateProduct);

    const addProduct = async (product: Product) => {
        await storeAddProduct(product);
    };

    const updateProduct = async (product: Product) => {
        await storeUpdateProduct(product);
    };

    const deleteProduct = async (id: string) => {
        // In Firestore usually we just mark active:false, but for now delete
        // Implementation depends on needs
        console.warn("Delete not fully implemented in this snippet");
    };

    const addTransaction = async (transaction: Transaction) => {
        // If it's a sale with items, use the atomic service
        if (transaction.type === 'INCOME' && transaction.items && transaction.items.length > 0) {
            // Need user info
            if (!userProfile) throw new Error("User must be logged in to process sale");

            const atomicItems = transaction.items.map(item => ({
                productId: item.id,
                branchId: transaction.branchId || userProfile.branchId || 'main', // fallback
                productName: item.name,
                quantity: item.quantity
            }));

            // This calls the Atomic Service
            await processAtomicSale(
                transaction,
                atomicItems,
                userProfile.uid,
                userProfile.displayName || 'Unknown'
            );
        } else {
            // Expenses or other transactions
            await setDoc(doc(db, 'transactions', transaction.id), transaction);
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
