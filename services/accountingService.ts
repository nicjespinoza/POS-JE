import {
    JournalEntry,
    JournalEntryLine,
    Transaction as BusinessTransaction,
    AccountNature
} from '../types';
import { db, collection, getDocs } from './firebase';

// Standard Nicaraguan Account Codes (Constants for stable reference)
export const ACCOUNTS = {
    CASH_GENERAL: '1.1.01.01',
    INVENTORY_ZAPATOS: '1.3.01.01',
    VAT_PAYABLE: '2.1.02.01',
    SALES_REVENUE: '4.1.01.01',
    COST_OF_SALES: '5.1.01.01',
};

/**
 * Validates that a Journal Entry is balanced (Debits = Credits)
 */
export const validateJournalEntry = (entry: JournalEntry): boolean => {
    const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = entry.lines.reduce((sum, line) => sum + line.credit, 0);

    // Allow small floating point diff
    return Math.abs(totalDebit - totalCredit) < 0.01;
};

/**
 * Generates the Journal Entry for a standard retail sale
 * @param transaction The sales transaction
 * @param totalCost The total Cost of Goods Sold (Cost of the items sold)
 */
export const generateSaleJournalEntry = (
    transaction: BusinessTransaction,
    totalCost: number,
    userId: string
): JournalEntry => {
    const date = new Date().toISOString();
    const entryId = crypto.randomUUID();
    const totalAmount = transaction.amount;

    // Tax Calculation (Assuming 15% IVA is included or added? 
    // Usually POS prices in NI are IVA included for retail, but let's assume included for now: Price = Base * 1.15)
    // Base = Total / 1.15
    const baseAmount = totalAmount / 1.15;
    const taxAmount = totalAmount - baseAmount;

    // 1. Debit Cash (Money In)
    const lineCash: JournalEntryLine = {
        accountId: ACCOUNTS.CASH_GENERAL,
        accountName: 'Caja General',
        debit: totalAmount,
        credit: 0
    };

    // 2. Credit Sales Revenue (Ingreso)
    const lineSales: JournalEntryLine = {
        accountId: ACCOUNTS.SALES_REVENUE,
        accountName: 'Ventas Gravadas 15%',
        debit: 0,
        credit: Number(baseAmount.toFixed(2))
    };

    // 3. Credit VAT Payable (Pasivo)
    const lineTax: JournalEntryLine = {
        accountId: ACCOUNTS.VAT_PAYABLE,
        accountName: 'IVA por Pagar 15%',
        debit: 0,
        credit: Number(taxAmount.toFixed(2))
    };

    // 4. Debit Cost of Sales (Gasto)
    const lineCost: JournalEntryLine = {
        accountId: ACCOUNTS.COST_OF_SALES,
        accountName: 'Costo de Ventas',
        debit: totalCost,
        credit: 0
    };

    // 5. Credit Inventory (Asset Decrease)
    const lineInventory: JournalEntryLine = {
        accountId: ACCOUNTS.INVENTORY_ZAPATOS,
        accountName: 'Inventario de Zapatos',
        debit: 0,
        credit: totalCost
    };

    const lines = [lineCash, lineSales, lineTax, lineCost, lineInventory];

    return {
        id: entryId,
        date: transaction.date || date,
        description: `Venta POS #${transaction.id} - ${transaction.description}`,
        lines,
        totalAmount: totalAmount,
        referenceId: transaction.id,
        referenceType: 'SALE',
        branchId: transaction.branchId || 'main',
        createdBy: userId,
        createdAt: date,
        status: 'POSTED'
    };
};
