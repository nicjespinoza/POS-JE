"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onBatchUpdated = exports.archiveDepletedBatches = exports.onJournalEntryCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
// ============================================
// 1. PRE-AGGREGATED FINANCIAL SUMMARIES
// Triggered when a journal_entry is created.
// Maintains monthly summary docs for instant P&L.
// ============================================
exports.onJournalEntryCreated = functions.firestore
    .document('journal_entries/{entryId}')
    .onCreate(async (snap) => {
    var _a, _b;
    const entry = snap.data();
    if (!entry || !entry.date)
        return;
    const monthKey = entry.date.substring(0, 7); // "2026-02"
    const branchId = entry.branchId || 'all';
    const summaryId = `${monthKey}_${branchId}`;
    const globalSummaryId = `${monthKey}_all`;
    const increments = {
        transactionCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (entry.lines && Array.isArray(entry.lines)) {
        for (const line of entry.lines) {
            if ((_a = line.accountId) === null || _a === void 0 ? void 0 : _a.startsWith('4.')) {
                // Revenue (credit nature)
                const val = (line.credit || 0) - (line.debit || 0);
                increments.revenue = admin.firestore.FieldValue.increment(val);
            }
            else if (line.accountId === '5.1.01.01') {
                // COGS (debit nature)
                const val = (line.debit || 0) - (line.credit || 0);
                increments.cogs = admin.firestore.FieldValue.increment(val);
            }
            else if ((_b = line.accountId) === null || _b === void 0 ? void 0 : _b.startsWith('5.')) {
                // Other expenses
                const val = (line.debit || 0) - (line.credit || 0);
                increments.expenses = admin.firestore.FieldValue.increment(val);
            }
        }
    }
    const batch = db.batch();
    // Branch-specific summary
    batch.set(db.doc(`financial_summaries/${summaryId}`), {
        ...increments,
        monthKey,
        branchId
    }, { merge: true });
    // Global summary (all branches)
    if (branchId !== 'all') {
        batch.set(db.doc(`financial_summaries/${globalSummaryId}`), {
            ...increments,
            monthKey,
            branchId: 'all'
        }, { merge: true });
    }
    await batch.commit();
    console.log(`Financial summary updated: ${summaryId}`);
});
// ============================================
// 2. ARCHIVE DEPLETED BATCHES
// Scheduled: runs daily at 3 AM.
// Moves batches with remainingStock=0 to archive.
// ============================================
exports.archiveDepletedBatches = functions.pubsub
    .schedule('every day 03:00')
    .timeZone('America/Managua')
    .onRun(async () => {
    const snapshot = await db.collection('inventory_batches')
        .where('remainingStock', '==', 0)
        .limit(450) // Stay under 500 batch limit
        .get();
    if (snapshot.empty) {
        console.log('No depleted batches to archive.');
        return null;
    }
    const batch = db.batch();
    let count = 0;
    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        // Move to archive
        batch.set(db.doc(`inventory_batches_archive/${docSnap.id}`), {
            ...data,
            archivedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Delete from active collection
        batch.delete(docSnap.ref);
        count++;
    }
    await batch.commit();
    console.log(`Archived ${count} depleted batches.`);
    return null;
});
// ============================================
// 3. INVENTORY VALUATION SUMMARY
// Triggered on batch updates (stock changes).
// Maintains per-branch valuation totals.
// ============================================
exports.onBatchUpdated = functions.firestore
    .document('inventory_batches/{batchId}')
    .onWrite(async (change, context) => {
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;
    if (!before && !after)
        return;
    const branchId = (after === null || after === void 0 ? void 0 : after.branchId) || (before === null || before === void 0 ? void 0 : before.branchId);
    if (!branchId)
        return;
    // Calculate value delta
    const beforeValue = before ? (before.remainingStock || 0) * (before.cost || 0) : 0;
    const afterValue = after ? (after.remainingStock || 0) * (after.cost || 0) : 0;
    const delta = afterValue - beforeValue;
    if (delta === 0)
        return;
    const summaryRef = db.doc(`inventory_valuations/${branchId}`);
    await summaryRef.set({
        branchId,
        totalValue: admin.firestore.FieldValue.increment(delta),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    // Also update global
    const globalRef = db.doc('inventory_valuations/all');
    await globalRef.set({
        branchId: 'all',
        totalValue: admin.firestore.FieldValue.increment(delta),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
});
//# sourceMappingURL=index.js.map