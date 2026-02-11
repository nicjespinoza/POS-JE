import {
    db,
    collection,
    query,
    orderBy,
    limit,
    startAfter,
    getDocs,
    where,
    onSnapshot,
    doc,
    getDoc
} from '../lib/firebase';
import type { QueryDocumentSnapshot, DocumentData } from '../lib/firebase';
import { Product } from '../lib/types';

const PAGE_SIZE = 50;

export interface ProductPage {
    products: Product[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
    hasMore: boolean;
}

/**
 * Paginated product loading — replaces full-collection onSnapshot.
 * Uses cursor-based pagination with startAfter.
 */
export const getProductsPage = async (
    lastDoc?: QueryDocumentSnapshot<DocumentData> | null,
    category?: string
): Promise<ProductPage> => {
    let constraints: any[] = [orderBy('name'), limit(PAGE_SIZE)];

    if (category && category !== 'all') {
        constraints = [where('category', '==', category), orderBy('name'), limit(PAGE_SIZE)];
    }

    if (lastDoc) {
        constraints.push(startAfter(lastDoc));
    }

    const q = query(collection(db, 'products'), ...constraints);
    const snapshot = await getDocs(q);

    const products = snapshot.docs.map(d => ({
        ...d.data(),
        id: d.id
    } as Product));

    return {
        products,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === PAGE_SIZE
    };
};

/**
 * Load ALL products in paginated batches (for POS that needs full catalog).
 * Loads PAGE_SIZE at a time to avoid single massive read.
 */
export const getAllProductsBatched = async (): Promise<Product[]> => {
    const allProducts: Product[] = [];
    let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
    let hasMore = true;

    while (hasMore) {
        const page = await getProductsPage(lastDoc);
        allProducts.push(...page.products);
        lastDoc = page.lastDoc;
        hasMore = page.hasMore;
    }

    return allProducts;
};

/**
 * Real-time listener for specific product IDs (e.g. cart items).
 * Uses batched 'in' queries (max 30 per query).
 */
export const subscribeToProducts = (
    productIds: string[],
    callback: (products: Product[]) => void
) => {
    if (productIds.length === 0) {
        callback([]);
        return () => {};
    }

    const chunks: string[][] = [];
    for (let i = 0; i < productIds.length; i += 30) {
        chunks.push(productIds.slice(i, i + 30));
    }

    const allProducts = new Map<string, Product>();

    const unsubscribes = chunks.map(chunk => {
        const q = query(
            collection(db, 'products'),
            where('__name__', 'in', chunk)
        );
        return onSnapshot(q, (snapshot) => {
            snapshot.docs.forEach(d => {
                allProducts.set(d.id, { ...d.data(), id: d.id } as Product);
            });
            callback(Array.from(allProducts.values()));
        });
    });

    return () => unsubscribes.forEach(unsub => unsub());
};

/**
 * Search products by name prefix (server-side).
 * Uses Firestore range query on 'name' field.
 */
export const searchProducts = async (
    searchTerm: string,
    maxResults: number = 20
): Promise<Product[]> => {
    if (!searchTerm.trim()) return [];

    const term = searchTerm.trim();
    const endTerm = term + '\uf8ff';

    const q = query(
        collection(db, 'products'),
        where('name', '>=', term),
        where('name', '<=', endTerm),
        limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Product));
};

/**
 * Get a single product by ID.
 */
export const getProductById = async (productId: string): Promise<Product | null> => {
    const snap = await getDoc(doc(db, 'products', productId));
    if (!snap.exists()) return null;
    return { ...snap.data(), id: snap.id } as Product;
};
