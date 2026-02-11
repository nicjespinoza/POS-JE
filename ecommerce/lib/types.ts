
export enum Role {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER', // Gerente de Sucursal
    CASHIER = 'CASHIER',
    INVENTORY = 'INVENTORY',
    GUEST = 'GUEST'
}

export interface Branch {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    isActive: boolean;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName?: string;
    role: Role;
    branchId?: string; // If null, maybe global admin or unassigned
    photoURL?: string;
}

export enum TransactionType {
    INCOME = 'INCOME',
    EXPENSE = 'EXPENSE'
}

export enum Permission {
    VIEW_DASHBOARD = 'VIEW_DASHBOARD',
    MANAGE_TRANSACTIONS = 'MANAGE_TRANSACTIONS',
    MANAGE_CATEGORIES = 'MANAGE_CATEGORIES',
    MANAGE_ROLES = 'MANAGE_ROLES',
    VIEW_ANALYTICS = 'VIEW_ANALYTICS',
    EXPORT_DATA = 'EXPORT_DATA'
}

export interface RoleDefinition {
    id: string;
    name: string;
    description: string;
    permissions: Permission[];
}

export interface Product {
    id: string;
    name: string;
    price: number; // Base price
    cost?: number; // Costo para contabilidad
    category: string;
    image: string; // Main image URL (backward compatible)
    images?: string[]; // Up to 10 images
    mainImageIndex?: number; // Index of the main image in images[]
    description?: string;
    sku?: string;
    brand?: string;
    size?: string[];
    color?: string;
    discount?: number; // Percentage discount
    stock: number; // Legacy support for UI
    // Stock is now handled separately per branch, but for UI convenience we might calculate a "current branch stock"
    currentStock?: number;
}

export interface InventoryItem {
    id?: string;
    productId: string;
    branchId: string;
    stock: number;
    lowStockThreshold: number;
    updatedAt: string;
}

export interface CartItem extends Product {
    quantity: number;
}

export interface Transaction {
    id: string;
    type: TransactionType;
    amount: number;
    date: string;
    description: string;
    items?: CartItem[]; // Only for sales
    category?: string;
    paymentMethod?: string;
    branchId?: string; // Critical for multi-branch
    userId?: string; // Who processed it
    customerId?: string; // Linked customer
    customerName?: string; // Snapshot of name
    status?: 'COMPLETED' | 'REFUNDED' | 'CANCELLED' | 'PENDING_VERIFICATION';
}

export interface FinancialSummary {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    transactionCount: number;
}

export interface CategoryState {
    income: string[];
    expense: string[];
}

export enum MovementType {
    ENTRADA = 'ENTRADA',
    SALIDA = 'SALIDA',
    TRANSFERENCIA = 'TRANSFERENCIA',
    AJUSTE = 'AJUSTE'
}

export interface InventoryMovement {
    id: string;
    productId: string;
    productName: string;
    branchId: string;
    branchName: string;
    type: MovementType;
    quantity: number;
    previousStock: number;
    newStock: number;
    reason: string;
    transactionId?: string; // Optional linkage to sales
    transferToBranchId?: string;
    userId: string;
    userName: string;
    createdAt: string;
}

export interface InventorySummary {
    productId: string;
    productName: string;
    category: string;
    image: string;
    price: number;
    totalStock: number;
    stockByBranch: {
        branchId: string;
        branchName: string;
        stock: number;
        lowStock: boolean;
    }[];
}

export type TransferStatus = 'PENDING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

export interface StockTransfer {
    id: string;
    originBranchId: string;
    targetBranchId: string;
    status: TransferStatus;
    items: {
        productId: string;
        productName: string;
        quantity: number;
        // FIFO Propagation: We track exactly which batches (costs) were consumed
        sourceBatches?: {
            originalBatchId: string;
            cost: number;
            quantity: number;
        }[];
    }[];
    sentBy: string;
    receivedBy?: string;
    sentAt: string;
    receivedAt?: string;
    note?: string;
}

export interface InventoryBatch {
    id: string;
    productId: string;
    branchId: string;
    cost: number;        // Cost per unit at time of purchase
    initialStock: number;
    remainingStock: number; // Decreases as items are sold
    createdAt: string;   // ISO Date, used for FIFO sorting
    receivedBy: string;  // User ID who received stock
}

// --- ACCOUNTING MODULE ---

export enum AccountType {
    ASSET = 'ASSET',       // Activo
    LIABILITY = 'LIABILITY', // Pasivo
    EQUITY = 'EQUITY',     // Patrimonio
    REVENUE = 'REVENUE',   // Ingresos
    EXPENSE = 'EXPENSE'    // Gastos
}

export enum AccountNature {
    DEBIT = 'DEBIT',   // Deudora (Activos, Gastos)
    CREDIT = 'CREDIT'  // Acreedora (Pasivos, Ingresos, Patrimonio)
}

export interface Account {
    id: string;        // e.g., "1.1.01"
    code: string;      // "1.1.01"
    name: string;      // "Caja General"
    type: AccountType;
    nature: AccountNature;
    description?: string;
    isGroup: boolean;  // True if it just groups other accounts (no transactions)
    level: number;     // Hierarchy level
    parentId?: string;
}

export interface JournalEntryLine {
    accountId: string;     // Reference to Account Code
    accountName: string;   // Snapshot for history
    debit: number;
    credit: number;
    description?: string; // Line specific detail
}

export interface JournalEntry {
    id: string;
    date: string;
    description: string;
    lines: JournalEntryLine[];
    totalAmount: number; // Sum of debits (should equal credits)
    referenceId?: string; // Link to Transaction ID
    referenceType?: 'SALE' | 'EXPENSE' | 'ADJUSTMENT';
    branchId: string;
    createdBy: string;
    createdAt: string;
    status: 'DRAFT' | 'POSTED' | 'VOID';
}
