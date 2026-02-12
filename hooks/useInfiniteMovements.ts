/**
 * [SCALABILITY] Hook for infinite-scroll paginated inventory movements.
 * Replaces fixed-limit onSnapshot with cursor-based pagination.
 * Only fetches data on demand (loadMore), reducing Firestore reads.
 */

import { useState, useCallback } from 'react';
import { getInventoryMovementsPaginated, MovementsPage } from '../services/inventoryService';
import { InventoryMovement } from '../types';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

export const useInfiniteMovements = (branchId: string, pageSize: number = 50) => {
    const [movements, setMovements] = useState<InventoryMovement[]>([]);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [initialLoaded, setInitialLoaded] = useState(false);

    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return;
        setLoading(true);

        try {
            const page = await getInventoryMovementsPaginated(branchId, pageSize, lastDoc);
            setMovements(prev => [...prev, ...page.movements]);
            setLastDoc(page.lastDoc);
            setHasMore(page.hasMore);
            setInitialLoaded(true);
        } catch (error) {
            console.error('[useInfiniteMovements] Error loading movements:', error);
        } finally {
            setLoading(false);
        }
    }, [branchId, pageSize, lastDoc, hasMore, loading]);

    const reset = useCallback(() => {
        setMovements([]);
        setLastDoc(null);
        setHasMore(true);
        setInitialLoaded(false);
    }, []);

    return { movements, loadMore, hasMore, loading, reset, initialLoaded };
};
