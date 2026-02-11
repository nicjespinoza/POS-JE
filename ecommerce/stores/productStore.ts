import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '../lib/types';
import { getAllProductsBatched, getProductsPage } from '../services/productService';
import type { QueryDocumentSnapshot, DocumentData } from '../lib/firebase';

interface ProductStore {
    products: Product[];
    hasMore: boolean;
    loading: boolean;
    lastFetched: number;

    loadInitial: () => Promise<void>;
    loadMore: () => Promise<void>;
    updateProductLocal: (product: Product) => void;
    addProductLocal: (product: Product) => void;
    removeProductLocal: (id: string) => void;
    invalidateCache: () => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useProductStore = create<ProductStore>()(
    persist(
        (set, get) => ({
            products: [],
            hasMore: true,
            loading: false,
            lastFetched: 0,

            loadInitial: async () => {
                const state = get();
                // Skip if cache is fresh
                if (Date.now() - state.lastFetched < CACHE_TTL && state.products.length > 0) {
                    return;
                }

                set({ loading: true });
                try {
                    const allProducts = await getAllProductsBatched();
                    set({
                        products: allProducts,
                        hasMore: false,
                        loading: false,
                        lastFetched: Date.now()
                    });
                } catch (error) {
                    console.error('Error loading products:', error);
                    set({ loading: false });
                }
            },

            loadMore: async () => {
                // For future use with infinite scroll
                const state = get();
                if (!state.hasMore || state.loading) return;
                // Currently all products are loaded in loadInitial
            },

            updateProductLocal: (product) => {
                set(prev => ({
                    products: prev.products.map(p => p.id === product.id ? product : p)
                }));
            },

            addProductLocal: (product) => {
                set(prev => ({
                    products: [product, ...prev.products]
                }));
            },

            removeProductLocal: (id) => {
                set(prev => ({
                    products: prev.products.filter(p => p.id !== id)
                }));
            },

            invalidateCache: () => {
                set({ lastFetched: 0 });
            }
        }),
        {
            name: 'pos-products-cache',
            partialize: (state) => ({
                products: state.products,
                lastFetched: state.lastFetched
            })
        }
    )
);
