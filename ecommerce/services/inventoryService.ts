/**
 * Servicio de Inventario Centralizado
 * Maneja el stock por sucursal y registra todos los movimientos
 */

import {
    db,
    collection,
    doc,
    setDoc,
    updateDoc,
    query,
    where,
    getDocs,
    onSnapshot,
    Timestamp,
    runTransaction,
    increment,
    orderBy,
    limit,
    startAfter,
    DocumentData
} from '../lib/firebase';
import type { QueryDocumentSnapshot } from '../lib/firebase';
import { generateSaleJournalEntry } from './accountingService';
import {
    InventoryItem,
    InventoryMovement,
    InventorySummary,
    InventoryBatch,
    MovementType,
    Product,
    Branch,
    Transaction as BusinessTransaction
} from '../lib/types';

// ============================================
// FUNCIONES DE INVENTARIO
// ============================================

/**
 * Obtener inventario de una sucursal específica
 */
export const getInventoryByBranch = (
    branchId: string,
    callback: (inventory: InventoryItem[]) => void
) => {
    const q = branchId === 'all'
        ? query(collection(db, 'inventory'))
        : query(collection(db, 'inventory'), where('branchId', '==', branchId));

    return onSnapshot(q, (snapshot) => {
        const items: InventoryItem[] = [];
        snapshot.forEach((doc) => {
            items.push({ ...(doc.data() as Omit<InventoryItem, 'id'>), id: doc.id });
        });
        callback(items);
    });
};

/**
 * Obtener movimientos de inventario
 */
export const getInventoryMovements = (
    branchId: string,
    limit: number = 50,
    callback: (movements: InventoryMovement[]) => void
) => {
    const q = branchId === 'all'
        ? query(collection(db, 'inventory_movements'))
        : query(collection(db, 'inventory_movements'), where('branchId', '==', branchId));

    return onSnapshot(q, (snapshot) => {
        const movements: InventoryMovement[] = [];
        snapshot.forEach((doc) => {
            movements.push({ ...(doc.data() as Omit<InventoryMovement, 'id'>), id: doc.id });
        });
        // Ordenar por fecha descendente
        movements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(movements.slice(0, limit));
    });
};

/**
 * Registrar un movimiento de inventario
 */
export const recordInventoryMovement = async (
    movement: Omit<InventoryMovement, 'id' | 'createdAt'>
): Promise<string> => {
    const movementId = crypto.randomUUID();
    const movementData: InventoryMovement = {
        ...movement,
        id: movementId,
        createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'inventory_movements', movementId), movementData);
    return movementId;
};

/**
 * Actualizar stock de un producto en una sucursal
 */
export const updateBranchStock = async (
    productId: string,
    branchId: string,
    newStock: number
): Promise<void> => {
    const inventoryId = `${productId}_${branchId}`;
    await updateDoc(doc(db, 'inventory', inventoryId), {
        stock: newStock,
        updatedAt: new Date().toISOString()
    });
};

/**
 * Procesar una venta - Descuenta stock y registra movimiento
 */
export const processSaleInventory = async (
    items: { productId: string; productName: string; quantity: number }[],
    branchId: string,
    branchName: string,
    transactionId: string,
    userId: string,
    userName: string
): Promise<void> => {
    for (const item of items) {
        const inventoryId = `${item.productId}_${branchId}`;

        // Obtener stock actual (simplificado, en producción usar transacción)
        // Por ahora asumimos el stock viene del contexto

        await recordInventoryMovement({
            productId: item.productId,
            productName: item.productName,
            branchId: branchId,
            branchName: branchName,
            type: MovementType.SALIDA,
            quantity: -item.quantity,
            previousStock: 0, // Se actualizará con el valor real
            newStock: 0,      // Se actualizará con el valor real
            reason: 'Venta POS',
            transactionId: transactionId,
            userId: userId,
            userName: userName
        });
    }
};

/**
 * Agregar stock (entrada de mercancía)
 */
export const addStock = async (
    productId: string,
    productName: string,
    branchId: string,
    branchName: string,
    quantity: number,
    currentStock: number,
    reason: string,
    userId: string,
    userName: string
): Promise<void> => {
    const newStock = currentStock + quantity;

    // Actualizar inventario
    await updateBranchStock(productId, branchId, newStock);

    // Registrar movimiento
    await recordInventoryMovement({
        productId,
        productName,
        branchId,
        branchName,
        type: MovementType.ENTRADA,
        quantity: quantity,
        previousStock: currentStock,
        newStock: newStock,
        reason,
        userId,
        userName
    });
};

/**
 * Transferir stock entre sucursales (ATOMIC)
 * Uses Firestore transaction to prevent inconsistencies on partial failure
 */
export const transferStock = async (
    productId: string,
    productName: string,
    fromBranchId: string,
    fromBranchName: string,
    toBranchId: string,
    toBranchName: string,
    quantity: number,
    _fromCurrentStock: number,
    _toCurrentStock: number,
    userId: string,
    userName: string
): Promise<void> => {
    await runTransaction(db, async (transaction) => {
        const fromInvId = `${productId}_${fromBranchId}`;
        const toInvId = `${productId}_${toBranchId}`;

        const fromRef = doc(db, 'inventory', fromInvId);
        const toRef = doc(db, 'inventory', toInvId);

        // Read both within transaction (locks)
        const fromSnap = await transaction.get(fromRef);
        const toSnap = await transaction.get(toRef);

        if (!fromSnap.exists()) throw new Error('Inventario origen no existe');

        const fromStock = fromSnap.data().stock || 0;
        const toStock = toSnap.exists() ? (toSnap.data().stock || 0) : 0;

        if (fromStock < quantity) throw new Error('Stock insuficiente para transferir');

        const newFromStock = fromStock - quantity;
        const newToStock = toStock + quantity;
        const now = new Date().toISOString();

        // Atomic writes
        transaction.update(fromRef, { stock: newFromStock, updatedAt: now });

        if (toSnap.exists()) {
            transaction.update(toRef, { stock: newToStock, updatedAt: now });
        } else {
            transaction.set(toRef, {
                productId, branchId: toBranchId,
                stock: quantity, lowStockThreshold: 5, updatedAt: now
            });
        }

        // Movement logs (within same transaction)
        const movOutId = crypto.randomUUID();
        const movInId = crypto.randomUUID();

        transaction.set(doc(db, 'inventory_movements', movOutId), {
            id: movOutId, productId, productName,
            branchId: fromBranchId, branchName: fromBranchName,
            type: MovementType.TRANSFERENCIA, quantity: -quantity,
            previousStock: fromStock, newStock: newFromStock,
            reason: `Transferencia a ${toBranchName}`,
            transferToBranchId: toBranchId,
            userId, userName, createdAt: now
        } as InventoryMovement);

        transaction.set(doc(db, 'inventory_movements', movInId), {
            id: movInId, productId, productName,
            branchId: toBranchId, branchName: toBranchName,
            type: MovementType.TRANSFERENCIA, quantity: quantity,
            previousStock: toStock, newStock: newToStock,
            reason: `Transferencia desde ${fromBranchName}`,
            transferToBranchId: fromBranchId,
            userId, userName, createdAt: now
        } as InventoryMovement);
    });
};

/**
 * Ajustar inventario manualmente
 */
export const adjustStock = async (
    productId: string,
    productName: string,
    branchId: string,
    branchName: string,
    newStock: number,
    currentStock: number,
    reason: string,
    userId: string,
    userName: string
): Promise<void> => {
    const difference = newStock - currentStock;

    // Actualizar inventario
    await updateBranchStock(productId, branchId, newStock);

    // Registrar movimiento
    await recordInventoryMovement({
        productId,
        productName,
        branchId,
        branchName,
        type: MovementType.AJUSTE,
        quantity: difference,
        previousStock: currentStock,
        newStock: newStock,
        reason,
        userId,
        userName
    });
};

/**
 * Crear resumen de inventario consolidado para Admin
 * [SCALABILITY] Optimized: Uses Map pre-index for O(I + P*B) instead of O(P*B*I)
 */
export const createInventorySummary = (
    products: Product[],
    inventory: InventoryItem[],
    branches: Branch[]
): InventorySummary[] => {
    // Pre-index inventory for O(1) lookups instead of O(I) .find() per iteration
    const inventoryMap = new Map<string, InventoryItem>();
    for (const inv of inventory) {
        inventoryMap.set(`${inv.productId}_${inv.branchId}`, inv);
    }

    return products.map(product => {
        const stockByBranch = branches.map(branch => {
            const inventoryItem = inventoryMap.get(`${product.id}_${branch.id}`);
            const stock = inventoryItem?.stock ?? 0;
            return {
                branchId: branch.id,
                branchName: branch.name,
                stock,
                lowStock: stock <= (inventoryItem?.lowStockThreshold ?? 5)
            };
        });

        return {
            productId: product.id,
            productName: product.name,
            category: product.category,
            image: product.image,
            price: product.price,
            totalStock: stockByBranch.reduce((sum, b) => sum + b.stock, 0),
            stockByBranch
        };
    });
};

/**
 * Inicializar inventario para un producto en todas las sucursales
 */
export const initializeProductInventory = async (
    product: Product,
    branches: Branch[],
    initialStock: number = 0
): Promise<void> => {
    for (const branch of branches) {
        const inventoryId = `${product.id}_${branch.id}`;
        const inventoryItem: InventoryItem = {
            productId: product.id,
            branchId: branch.id,
            stock: initialStock,
            lowStockThreshold: 5,
            updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'inventory', inventoryId), inventoryItem);
    }
};

/**
 * Add New Stock Batch (Inbox)
 * Creates a new batch record and updates aggregate stock
 */
export const addInventoryBatch = async (
    productId: string,
    branchId: string,
    quantity: number,
    cost: number,
    userId: string
): Promise<void> => {
    const batchId = crypto.randomUUID();
    const batch: InventoryBatch = {
        id: batchId,
        productId,
        branchId,
        cost,
        initialStock: quantity,
        remainingStock: quantity,
        createdAt: new Date().toISOString(),
        receivedBy: userId
    };

    await runTransaction(db, async (transaction) => {
        // 1. Create Batch
        transaction.set(doc(db, 'inventory_batches', batchId), batch);

        // 2. Update Aggregate Inventory
        const inventoryId = `${productId}_${branchId}`;
        const inventoryRef = doc(db, 'inventory', inventoryId);
        const inventoryDoc = await transaction.get(inventoryRef);

        if (inventoryDoc.exists()) {
            const currentStock = inventoryDoc.data().stock || 0;
            transaction.update(inventoryRef, {
                stock: currentStock + quantity,
                updatedAt: new Date().toISOString()
            });
        } else {
            // Initialize if not exists
            transaction.set(inventoryRef, {
                productId,
                branchId,
                stock: quantity,
                lowStockThreshold: 5,
                updatedAt: new Date().toISOString()
            });
        }
    });
};

export const processAtomicSale = async (
    transactionData: BusinessTransaction,
    items: { productId: string; branchId: string; quantity: number; productName: string }[],
    userId: string,
    userName: string
): Promise<void> => {
    try {
        // RE-WRITING LOGIC ABOVE TO BE CORRECT WITH NON-IMPORTED INCREMENT
        await runTransaction(db, async (transaction) => {
            // 1. Reads & Locks (Aggregate)
            const inventoryDocsMap = new Map<string, { ref: ReturnType<typeof doc>; data: DocumentData }>();
            for (const item of items) {
                const inventoryId = `${item.productId}_${item.branchId}`;
                const ref = doc(db, 'inventory', inventoryId);
                const snap = await transaction.get(ref);
                if (!snap.exists()) throw new Error(`Product not found: ${item.productName}`);
                if (snap.data().stock < item.quantity) throw new Error(`Stock error: ${item.productName}`);
                inventoryDocsMap.set(inventoryId, { ref, data: snap.data() });
            }

            // 2. Reads & Locks (Batches) - FIFO Logic
            let totalTransactionCost = 0;
            const batchUpdates: { ref: ReturnType<typeof doc>; newRemaining: number }[] = [];

            for (const item of items) {
                // Fetch optimistic candidates
                // NOTE: Users must create a Composite Index: collection: inventory_batches, fields: [productId, branchId, remainingStock, createdAt]
                // [SCALABILITY] Limited FIFO query: reads max 10 batches instead of all active batches
                // Requires composite index: productId ASC, branchId ASC, remainingStock ASC, createdAt ASC
                const q = query(
                    collection(db, 'inventory_batches'),
                    where('productId', '==', item.productId),
                    where('branchId', '==', item.branchId),
                    where('remainingStock', '>', 0),
                    orderBy('remainingStock'),
                    orderBy('createdAt', 'asc'),
                    limit(10)
                );
                const batchQuerySnap = await getDocs(q);
                const candidates = batchQuerySnap.docs
                    .map(d => ({ ...d.data(), id: d.id } as InventoryBatch));

                let leftToFill = item.quantity;

                for (const cand of candidates) {
                    if (leftToFill <= 0) break;
                    // Secure Lock
                    const bRef = doc(db, 'inventory_batches', cand.id);
                    const bSnap = await transaction.get(bRef);
                    if (!bSnap.exists()) continue;

                    const batch = bSnap.data() as InventoryBatch;
                    if (batch.remainingStock <= 0) continue;

                    const take = Math.min(batch.remainingStock, leftToFill);
                    totalTransactionCost += (take * batch.cost);

                    batchUpdates.push({ ref: bRef, newRemaining: batch.remainingStock - take });
                    leftToFill -= take;
                }
            }

            // 3. Writes
            // Transaction Record
            transaction.set(doc(db, 'transactions', transactionData.id), transactionData);

            // Journal Entry (Real Cost)
            const journalEntry = generateSaleJournalEntry(transactionData, totalTransactionCost, userId);
            transaction.set(doc(db, 'journal_entries', journalEntry.id), journalEntry);

            // Batches Update
            batchUpdates.forEach(u => transaction.update(u.ref, { remainingStock: u.newRemaining }));

            // Aggregate Inventory Update
            items.forEach(item => {
                const id = `${item.productId}_${item.branchId}`;
                const stored = inventoryDocsMap.get(id);
                if (!stored) throw new Error(`Inventory not found for product: ${item.productName}`);
                transaction.update(stored.ref, {
                    stock: (stored.data.stock as number) - item.quantity,
                    updatedAt: new Date().toISOString()
                });

                // SYNC TO PRODUCTS COLLECTION (For Online Store/CartContext compatibility)
                const productRef = doc(db, 'products', item.productId);
                transaction.update(productRef, {
                    stock: increment(-item.quantity)
                });

                // Movement Log
                const movId = crypto.randomUUID();
                transaction.set(doc(db, 'inventory_movements', movId), {
                    id: movId,
                    productId: item.productId,
                    productName: item.productName,
                    branchId: item.branchId,
                    branchName: 'Sucursal ' + item.branchId,
                    type: MovementType.SALIDA,
                    quantity: -item.quantity,
                    previousStock: stored.data.stock as number,
                    newStock: (stored.data.stock as number) - item.quantity,
                    reason: 'Venta POS / Online (FIFO)',
                    transactionId: transactionData.id,
                    userId,
                    userName: userName, // Ideally passed in
                    createdAt: new Date().toISOString()
                } as InventoryMovement);
            });
        });

        console.log("Atomic FIFO Sale Completed.");
    } catch (e) {
        console.error("FIFO Transaction Failed:", e);
        throw e;
    }
};

// ============================================
// PAGINATED INVENTORY FUNCTIONS
// ============================================

export interface InventoryPage {
    items: InventoryItem[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
    hasMore: boolean;
}

/**
 * Paginated inventory loading — replaces full-collection onSnapshot for Admin.
 */
export const getInventoryPaginated = async (
    branchId: string,
    pageSize: number = 100,
    lastDocCursor?: QueryDocumentSnapshot<DocumentData> | null
): Promise<InventoryPage> => {
    let constraints: any[] = [orderBy('productId'), limit(pageSize)];

    if (branchId !== 'all') {
        constraints = [where('branchId', '==', branchId), orderBy('productId'), limit(pageSize)];
    }

    if (lastDocCursor) {
        constraints.push(startAfter(lastDocCursor));
    }

    const q = query(collection(db, 'inventory'), ...constraints);
    const snapshot = await getDocs(q);

    const items = snapshot.docs.map(d => ({
        ...d.data(),
        id: d.id
    } as InventoryItem));

    return {
        items,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === pageSize
    };
};

/**
 * Load all inventory in batches (for Admin summary that needs full data).
 */
export const getAllInventoryBatched = async (branchId: string = 'all'): Promise<InventoryItem[]> => {
    const allItems: InventoryItem[] = [];
    let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
    let hasMore = true;

    while (hasMore) {
        const page = await getInventoryPaginated(branchId, 200, lastDoc);
        allItems.push(...page.items);
        lastDoc = page.lastDoc;
        hasMore = page.hasMore;
    }

    return allItems;
};

/**
 * Paginated movements loading.
 */
export const getMovementsPaginated = async (
    branchId: string,
    pageSize: number = 100,
    lastDocCursor?: QueryDocumentSnapshot<DocumentData> | null
): Promise<{ movements: InventoryMovement[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean }> => {
    let constraints: any[] = [orderBy('createdAt', 'desc'), limit(pageSize)];

    if (branchId !== 'all') {
        constraints = [where('branchId', '==', branchId), orderBy('createdAt', 'desc'), limit(pageSize)];
    }

    if (lastDocCursor) {
        constraints.push(startAfter(lastDocCursor));
    }

    const q = query(collection(db, 'inventory_movements'), ...constraints);
    const snapshot = await getDocs(q);

    const movements = snapshot.docs.map(d => ({
        ...d.data(),
        id: d.id
    } as InventoryMovement));

    return {
        movements,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === pageSize
    };
};
