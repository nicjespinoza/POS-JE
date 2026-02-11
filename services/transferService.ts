import {
    db,
    doc,
    runTransaction,
    collection,
    getDocs,
    query,
    where,
    serverTimestamp
} from './firebase';
import { StockTransfer, StockTransferItem, MovementType, InventoryMovement, InventoryBatch } from '../types';

/**
 * Initiate Stock Transfer (Sender)
 * - Validates stock availability in Origin.
 * - Deducts stock from Origin (Move to "Transit").
 * - Creates Transfer Document.
 */
/**
 * Initiate Stock Transfer (Sender)
 * - Validates stock availability in Origin.
 * - Deducts stock from Origin (Move to "Transit").
 * - Creates Transfer Document with FIFO cost data.
 */
export const createStockTransfer = async (
    originBranchId: string,
    targetBranchId: string,
    items: { productId: string; productName: string; quantity: number }[],
    userId: string, // Sender
    note?: string
): Promise<void> => {
    const transferId = crypto.randomUUID();
    const date = new Date().toISOString();

    await runTransaction(db, async (transaction) => {
        const transferItems: StockTransferItem[] = [];

        for (const item of items) {
            // A. Check Aggregate Stock (Fail fast)
            const inventoryId = `${item.productId}_${originBranchId}`;
            const inventoryRef = doc(db, 'inventory', inventoryId);
            const invSnap = await transaction.get(inventoryRef);

            if (!invSnap.exists() || invSnap.data().stock < item.quantity) {
                throw new Error(`Stock insuficiente en origen para: ${item.productName}`);
            }

            // B. FIFO Selection
            // 1. Fetch Candidates (Optimistic Read)
            // Note: In a high-concurrency environment, this query should ideally be part of the transaction,
            // but strict Client SDK doesn't support query in transaction easily without admin privileges or knowing IDs.
            // We use the pattern: Query -> Transaction.get(lock) -> Verify.
            const q = query(
                collection(db, 'inventory_batches'),
                where('productId', '==', item.productId),
                where('branchId', '==', originBranchId),
                where('remainingStock', '>', 0)
            );

            // We must execute this query OUTSIDE the transaction loop ideally, but inside runTransaction callback limits capability?
            // Actually, we can await getDocs inside runTransaction, but it won't be "locked" until we get() specific docs.
            const batchQuerySnap = await getDocs(q);

            // Sort by Date (FIFO)
            const candidates = batchQuerySnap.docs
                .map(d => ({ ...d.data(), id: d.id } as InventoryBatch))
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

            let quantityToFulfill = item.quantity;
            let totalCost = 0;
            const sourceBatches: StockTransferItem['sourceBatches'] = [];

            for (const batch of candidates) {
                if (quantityToFulfill <= 0) break;

                // Lock & Re-read Batch
                const batchRef = doc(db, 'inventory_batches', batch.id);
                const batchSnap = await transaction.get(batchRef);

                if (!batchSnap.exists()) continue;
                const currentBatch = batchSnap.data() as InventoryBatch;

                if (currentBatch.remainingStock <= 0) continue;

                const take = Math.min(currentBatch.remainingStock, quantityToFulfill);

                // Track for Transfer Doc
                sourceBatches.push({
                    originalBatchId: batch.id,
                    cost: currentBatch.cost,
                    quantity: take
                });
                totalCost += (take * currentBatch.cost);

                // Update Batch Source (Reduce Stock)
                transaction.update(batchRef, {
                    remainingStock: currentBatch.remainingStock - take
                });

                quantityToFulfill -= take;
            }

            if (quantityToFulfill > 0) {
                // Should have been caught by aggregate check, but safeguard
                throw new Error(`Inconsistencia de lotes: No se encontraron suficientes lotes para ${item.productName}`);
            }

            const unitCost = totalCost / item.quantity;

            transferItems.push({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                sourceBatches,
                unitCost
            });

            // Update Aggregate Inventory
            const currentStock = invSnap.data().stock;
            transaction.update(inventoryRef, {
                stock: currentStock - item.quantity,
                updatedAt: date
            });

            // Log Movement (Salida)
            const movId = crypto.randomUUID();
            transaction.set(doc(db, 'inventory_movements', movId), {
                id: movId,
                productId: item.productId,
                productName: item.productName,
                branchId: originBranchId,
                branchName: 'Sucursal ' + originBranchId,
                type: MovementType.SALIDA,
                quantity: -item.quantity,
                previousStock: currentStock,
                newStock: currentStock - item.quantity,
                reason: `Traslado enviado a ${targetBranchId} (Ref: ${transferId})`,
                transactionId: transferId,
                userId,
                createdAt: date
            } as InventoryMovement);
        }

        // 2. Create Transfer Doc
        const transferData: StockTransfer = {
            id: transferId,
            originBranchId,
            targetBranchId,
            status: 'PENDING',
            items: transferItems, // Contains cost info
            sentBy: userId,
            sentAt: serverTimestamp()
        };
        transaction.set(doc(db, 'stock_transfers', transferId), transferData);
    });
};

/**
 * Complete Stock Transfer (Receiver)
 * - Verifies Transfer is PENDING.
 * - Adds stock to Target.
 * - Creates Incoming Batches (Lotes) with preserved cost.
 * - Updates Transfer Status.
 */
export const completeStockTransfer = async (
    transferId: string,
    userId: string // Receiver
): Promise<void> => {
    await runTransaction(db, async (transaction) => {
        const transferRef = doc(db, 'stock_transfers', transferId);
        const transferSnap = await transaction.get(transferRef);

        if (!transferSnap.exists()) throw new Error("Transferencia no encontrada");
        const transfer = transferSnap.data() as StockTransfer;

        if (transfer.status !== 'PENDING') throw new Error("Transferencia ya procesada");

        // Process Items
        for (const item of transfer.items) {
            // 1. Add to Aggregate Stock
            const inventoryId = `${item.productId}_${transfer.targetBranchId}`;
            const inventoryRef = doc(db, 'inventory', inventoryId);
            const invSnap = await transaction.get(inventoryRef);

            let currentStock = 0;
            if (invSnap.exists()) {
                currentStock = invSnap.data().stock;
                transaction.update(inventoryRef, {
                    stock: currentStock + item.quantity,
                    updatedAt: serverTimestamp()
                });
            } else {
                transaction.set(inventoryRef, {
                    productId: item.productId,
                    branchId: transfer.targetBranchId,
                    stock: item.quantity,
                    lowStockThreshold: 5,
                    updatedAt: serverTimestamp()
                });
            }

            // 2. Create "Incoming" Batch
            // Use preserved unitCost from transfer item, or sourceBatches weighted average if unitCost missing
            let cost = 0;
            if (item.unitCost !== undefined) {
                cost = item.unitCost;
            } else if (item.sourceBatches && item.sourceBatches.length > 0) {
                const totalValue = item.sourceBatches.reduce((acc, b) => acc + (b.cost * b.quantity), 0);
                const totalQty = item.sourceBatches.reduce((acc, b) => acc + b.quantity, 0);
                cost = totalQty > 0 ? totalValue / totalQty : 0;
            }

            const batchId = crypto.randomUUID();
            const batch: InventoryBatch = {
                id: batchId,
                productId: item.productId,
                branchId: transfer.targetBranchId,
                cost: cost,
                initialStock: item.quantity,
                remainingStock: item.quantity,
                createdAt: serverTimestamp(),
                receivedBy: userId
            };
            transaction.set(doc(db, 'inventory_batches', batchId), batch);

            // 3. Log Movement (Entrada)
            const movId = crypto.randomUUID();
            transaction.set(doc(db, 'inventory_movements', movId), {
                id: movId,
                productId: item.productId,
                productName: item.productName,
                branchId: transfer.targetBranchId,
                branchName: 'Sucursal ' + transfer.targetBranchId, // Helper needed for name? Using ID for now if name unavailable
                type: MovementType.ENTRADA,
                quantity: item.quantity,
                previousStock: currentStock,
                newStock: currentStock + item.quantity,
                reason: `Traslado recibido de ${transfer.originBranchId} (Ref: ${transferId})`,
                transactionId: transferId,
                userId,
                createdAt: serverTimestamp()
            } as InventoryMovement);
        }

        // Update Transfer Status
        transaction.update(transferRef, {
            status: 'COMPLETED',
            receivedBy: userId,
            receivedAt: serverTimestamp()
        });
    });
};
