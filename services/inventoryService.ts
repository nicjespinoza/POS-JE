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
    orderBy,
    limit as firestoreLimit,
    serverTimestamp
} from './firebase';
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
} from '../types';

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
    limitCount: number = 50,
    callback: (movements: InventoryMovement[]) => void
) => {
    // Requires Composite Index: branchId ASC, createdAt DESC
    const q = branchId === 'all'
        ? query(
            collection(db, 'inventory_movements'),
            orderBy('createdAt', 'desc'),
            firestoreLimit(limitCount)
        )
        : query(
            collection(db, 'inventory_movements'),
            where('branchId', '==', branchId),
            orderBy('createdAt', 'desc'),
            firestoreLimit(limitCount)
        );

    return onSnapshot(q, (snapshot) => {
        const movements: InventoryMovement[] = [];
        snapshot.forEach((doc) => {
            movements.push({ ...(doc.data() as Omit<InventoryMovement, 'id'>), id: doc.id });
        });
        // Sorting is handled by Firestore now
        callback(movements);
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
        createdAt: serverTimestamp() as any
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
        updatedAt: serverTimestamp()
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
 * Transferir stock entre sucursales
 */
export const transferStock = async (
    productId: string,
    productName: string,
    fromBranchId: string,
    fromBranchName: string,
    toBranchId: string,
    toBranchName: string,
    quantity: number,
    fromCurrentStock: number,
    toCurrentStock: number,
    userId: string,
    userName: string
): Promise<void> => {
    // Verificar que hay suficiente stock
    if (fromCurrentStock < quantity) {
        throw new Error('Stock insuficiente para transferir');
    }

    const newFromStock = fromCurrentStock - quantity;
    const newToStock = toCurrentStock + quantity;

    // Actualizar ambas sucursales
    await updateBranchStock(productId, fromBranchId, newFromStock);
    await updateBranchStock(productId, toBranchId, newToStock);

    // Registrar movimiento de salida
    await recordInventoryMovement({
        productId,
        productName,
        branchId: fromBranchId,
        branchName: fromBranchName,
        type: MovementType.TRANSFERENCIA,
        quantity: -quantity,
        previousStock: fromCurrentStock,
        newStock: newFromStock,
        reason: `Transferencia a ${toBranchName}`,
        transferToBranchId: toBranchId,
        userId,
        userName
    });

    // Registrar movimiento de entrada
    await recordInventoryMovement({
        productId,
        productName,
        branchId: toBranchId,
        branchName: toBranchName,
        type: MovementType.TRANSFERENCIA,
        quantity: quantity,
        previousStock: toCurrentStock,
        newStock: newToStock,
        reason: `Transferencia desde ${fromBranchName}`,
        transferToBranchId: fromBranchId,
        userId,
        userName
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
 */
export const createInventorySummary = (
    products: Product[],
    inventory: InventoryItem[],
    branches: Branch[]
): InventorySummary[] => {
    return products.map(product => {
        const stockByBranch = branches.map(branch => {
            const inventoryItem = inventory.find(
                inv => inv.productId === product.id && inv.branchId === branch.id
            );
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
 * PROCESS ATOMIC SALE (ACID Compliant)
 * Registra la venta y descuenta inventario en una sola transacción atómica.
 * Si algo falla (ej: sin stock), todo se revierte.
 */
// runTransaction is already imported at the top

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
            const inventoryDocsMap = new Map<string, any>();
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
            const batchUpdates: { ref: any, newRemaining: number }[] = [];

            for (const item of items) {
                // Fetch optimistic candidates
                // NOTE: Users must create a Composite Index: collection: inventory_batches, fields: [productId, branchId, remainingStock, createdAt]
                const q = query(
                    collection(db, 'inventory_batches'),
                    where('productId', '==', item.productId),
                    where('branchId', '==', item.branchId),
                    where('remainingStock', '>', 0)
                    // orderBy('createdAt', 'asc') // Enabling this requires index creation!
                );
                const batchQuerySnap = await getDocs(q);
                let candidates = batchQuerySnap.docs
                    .map(d => ({ ...d.data(), id: d.id } as InventoryBatch))
                    .sort((a, b) => a.createdAt.localeCompare(b.createdAt)); // JS Sort to implement FIFO if index missing

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
                transaction.update(stored.ref, {
                    stock: stored.data.stock - item.quantity,
                    updatedAt: new Date().toISOString()
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
                    previousStock: stored.data.stock,
                    newStock: stored.data.stock - item.quantity,
                    reason: 'Venta POS (FIFO)',
                    transactionId: transactionData.id,
                    userId,
                    userName: userName, // Ideally passed in
                    createdAt: serverTimestamp()
                } as InventoryMovement);
            });
        });

        console.log("Atomic FIFO Sale Completed.");
    } catch (e) {
        console.error("FIFO Transaction Failed:", e);
        throw e;
    }
};
