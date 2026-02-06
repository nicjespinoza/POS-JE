
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
  image: string;
  description?: string;
  sku?: string;
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
  updatedAt: string | any; // Allow serverTimestamp
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
  createdAt: string | any; // Allow serverTimestamp
}

export interface InventoryBatch {
  id: string;
  productId: string;
  branchId: string;
  cost: number;        // Cost per unit at time of purchase
  initialStock: number;
  remainingStock: number; // Decreases as items are sold
  createdAt: string | any;   // ISO Date, used for FIFO sorting
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