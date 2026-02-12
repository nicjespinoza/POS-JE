import {
    db,
    collection,
    doc,
    getDoc,
    query,
    where,
    getDocs,
    Timestamp
} from './firebase';
import { AccountType, InventoryBatch, JournalEntry, JournalEntryLine } from '../types';
import { ACCOUNTS } from './accountingService';

export interface ReportPnL {
    startDate: string;
    endDate: string;
    revenue: number;
    cogs: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
    details: {
        revenueByAccount: Record<string, number>;
        expensesByAccount: Record<string, number>;
    };
}

/**
 * Generate Profit & Loss Statement (Estado de Resultados)
 * Aggregates all "POSTED" Journal Entries within a date range.
 */
export const getProfitAndLoss = async (startDate: Date, endDate: Date): Promise<ReportPnL> => {
    // 1. Fetch Entries
    // Optimized: In production, use a dedicated 'financial_summaries' collection.
    // Here we aggregate raw entries (acceptable for < 10k entries).
    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();

    const q = query(
        collection(db, 'journal_entries'),
        where('date', '>=', startStr),
        where('date', '<=', endStr),
        where('status', '==', 'POSTED')
    );

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(d => d.data() as JournalEntry);

    // 2. Aggregate
    let revenue = 0;
    let cogs = 0;
    let expenses = 0;
    const revenueDetails: Record<string, number> = {};
    const expenseDetails: Record<string, number> = {};

    entries.forEach(entry => {
        entry.lines.forEach(line => {
            // Identify Account Type based on Code Structure (Simplistic)
            // Or ideally fetch Account Doc to check Type.
            // Using standard NI codes: 
            // 4.x = Revenue (Credit is positive)
            // 5.x = Costs/Expenses (Debit is positive)

            if (line.accountId.startsWith('4.')) {
                // Revenue (Creditor Nature)
                const val = line.credit - line.debit;
                revenue += val;
                revenueDetails[line.accountName] = (revenueDetails[line.accountName] || 0) + val;
            } else if (line.accountId === ACCOUNTS.COST_OF_SALES) {
                // COGS (Debtor Nature)
                const val = line.debit - line.credit;
                cogs += val;
            } else if (line.accountId.startsWith('5.') && line.accountId !== ACCOUNTS.COST_OF_SALES) {
                // Other Expenses
                const val = line.debit - line.credit;
                expenses += val;
                expenseDetails[line.accountName] = (expenseDetails[line.accountName] || 0) + val;
            }
        });
    });

    return {
        startDate: startStr,
        endDate: endStr,
        revenue,
        cogs,
        grossProfit: revenue - cogs,
        expenses,
        netProfit: (revenue - cogs) - expenses,
        details: {
            revenueByAccount: revenueDetails,
            expensesByAccount: expenseDetails
        }
    };
};

/**
 * Get Real-Time Inventory Valuation (FIFO Basis)
 * Sums the value of all active batches.
 */
export const getInventoryValuation = async (branchId?: string): Promise<number> => {
    let q = query(collection(db, 'inventory_batches'), where('remainingStock', '>', 0));

    if (branchId) {
        q = query(
            collection(db, 'inventory_batches'),
            where('branchId', '==', branchId),
            where('remainingStock', '>', 0)
        );
    }

    const snapshot = await getDocs(q);
    let totalValue = 0;

    snapshot.forEach(doc => {
        const batch = doc.data() as InventoryBatch;
        totalValue += (batch.remainingStock * batch.cost);
    });

    return totalValue;
};

/**
 * [SCALABILITY] Fast P&L using pre-aggregated financial_summaries from Cloud Functions.
 * 1 read instead of 1,000+ reads. Use for monthly summaries.
 * Falls back to full scan only for custom date ranges.
 */
export const getProfitAndLossFast = async (
    year: number,
    month: number,
    branchId: string = 'all'
): Promise<ReportPnL> => {
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const summaryId = `${monthKey}_${branchId}`;

    const snap = await getDoc(doc(db, 'financial_summaries', summaryId));

    if (!snap.exists()) {
        return {
            startDate: `${monthKey}-01`,
            endDate: `${monthKey}-31`,
            revenue: 0, cogs: 0, grossProfit: 0, expenses: 0, netProfit: 0,
            details: { revenueByAccount: {}, expensesByAccount: {} }
        };
    }

    const data = snap.data();
    const revenue = data.revenue || 0;
    const cogs = data.cogs || 0;
    const expenses = data.expenses || 0;

    return {
        startDate: `${monthKey}-01`,
        endDate: `${monthKey}-31`,
        revenue,
        cogs,
        grossProfit: revenue - cogs,
        expenses,
        netProfit: (revenue - cogs) - expenses,
        details: { revenueByAccount: {}, expensesByAccount: {} }
    };
};

/**
 * [SCALABILITY] Fast inventory valuation using pre-aggregated inventory_valuations.
 * 1 read instead of scanning all active batches.
 */
export const getInventoryValuationFast = async (branchId: string = 'all'): Promise<number> => {
    const snap = await getDoc(doc(db, 'inventory_valuations', branchId));
    if (!snap.exists()) return 0;
    return snap.data().totalValue || 0;
};

/**
 * AI Financial Analysis Wrapper (Placeholder)
 * Sends P&L data to Gemini for interpretation.
 */
export const analyzeFinancialHealth = async (pnl: ReportPnL): Promise<string> => {
    // Mock implementation for Phase 5 prototype
    // Implementation: Send `pnl` JSON to a Cloud Function wrapping Gemini API.

    // Simple rule-based insight for now:
    const margin = pnl.revenue > 0 ? (pnl.grossProfit / pnl.revenue) * 100 : 0;

    if (margin < 20) {
        return "⚠️ Alerta: Tu margen bruto es bajo (<20%). Revisa tus costos de venta o precios.";
    } else if (pnl.netProfit < 0) {
        return "⚠️ Alerta: Estás operando con pérdidas netas. Tus gastos operativos superan tu utilidad bruta.";
    }

    return "✅ Salud Financiera Estable. Tu margen bruto es saludable.";
};
