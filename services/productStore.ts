/**
 * Zustand Product Store - Reemplaza el full-collection onSnapshot de DataContext
 * Usa cache con TTL + listeners incrementales via docChanges()
 * Reduce reads de 10,000 (full collection) a solo los docs que cambian
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    db,
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    onSnapshot,
    doc,
    setDoc,
    updateDoc,
    serverTimestamp
} from './firebase';
import { Product } from '../types';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { startAfter } from 'firebase/firestore';

const PAGE_SIZE = 100;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface ProductStore {
    products: Product[];
    loading: boolean;
    lastFetched: number;
    _unsubscribe: (() => void) | null;

    // Actions
    loadAll: () => Promise<void>;
    subscribeToChanges: () => () => void;
    addProduct: (product: Product) => Promise<void>;
    updateProduct: (product: Product) => Promise<void>;
    invalidateCache: () => void;
}

export const useProductStore = create<ProductStore>()(
    persist(
        (set, get) => ({
            products: [],
            loading: false,
            lastFetched: 0,
            _unsubscribe: null,

            /**
             * Load all products in paginated batches (avoids single massive read).
             * Skips if cache is still fresh.
             */
            loadAll: async () => {
                const state = get();
                if (Date.now() - state.lastFetched < CACHE_TTL && state.products.length > 0) {
                    return; // Cache still valid
                }

                set({ loading: true });
                const allProducts: Product[] = [];
                let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
                let hasMore = true;

                try {
                    while (hasMore) {
                        const constraints: any[] = [orderBy('name'), limit(PAGE_SIZE)];
                        if (lastDoc) constraints.push(startAfter(lastDoc));

                        const q = query(collection(db, 'products'), ...constraints);
                        const snapshot = await getDocs(q);

                        snapshot.docs.forEach(d => {
                            allProducts.push({ ...d.data(), id: d.id } as Product);
                        });

                        lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
                        hasMore = snapshot.docs.length === PAGE_SIZE;
                    }

                    set({ products: allProducts, loading: false, lastFetched: Date.now() });
                } catch (error) {
                    console.error('[ProductStore] Error loading products:', error);
                    set({ loading: false });
                }
            },

            /**
             * Incremental real-time listener using docChanges().
             * Only processes added/modified/removed docs instead of re-reading entire collection.
             */
            subscribeToChanges: () => {
                const q = query(collection(db, 'products'));

                let isFirstSnapshot = true;
                const unsub = onSnapshot(q, { includeMetadataChanges: false }, (snapshot) => {
                    // Skip the first snapshot (initial load) since loadAll already populated the store
                    if (isFirstSnapshot) {
                        isFirstSnapshot = false;
                        // If store is empty (first ever load), populate from snapshot
                        const state = get();
                        if (state.products.length === 0) {
                            const items: Product[] = [];
                            snapshot.forEach(d => {
                                items.push({ ...d.data(), id: d.id } as Product);
                            });
                            set({ products: items, loading: false, lastFetched: Date.now() });
                        }
                        return;
                    }

                    // Process only changes (incremental updates)
                    const changes = snapshot.docChanges();
                    if (changes.length === 0) return;

                    set(state => {
                        const updated = [...state.products];

                        for (const change of changes) {
                            const product = { ...change.doc.data(), id: change.doc.id } as Product;
                            const idx = updated.findIndex(p => p.id === product.id);

                            if (change.type === 'added' && idx === -1) {
                                updated.push(product);
                            } else if (change.type === 'modified' && idx >= 0) {
                                updated[idx] = product;
                            } else if (change.type === 'removed' && idx >= 0) {
                                updated.splice(idx, 1);
                            }
                        }

                        return { products: updated };
                    });
                });

                set({ _unsubscribe: unsub });
                return unsub;
            },

            addProduct: async (product: Product) => {
                await setDoc(doc(db, 'products', product.id), product);
                // Real-time listener will pick up the change automatically
            },

            updateProduct: async (product: Product) => {
                await updateDoc(doc(db, 'products', product.id), { ...(product as any) });
                // Real-time listener will pick up the change automatically
            },

            invalidateCache: () => {
                set({ lastFetched: 0 });
            },
        }),
        {
            name: 'titanium-pos-products',
            partialize: (state) => ({
                products: state.products,
                lastFetched: state.lastFetched,
            }),
        }
    )
);
