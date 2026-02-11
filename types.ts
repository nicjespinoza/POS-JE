import { FieldValue } from 'firebase/firestore';

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
  branchId?: string;
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
  price: number;
  cost?: number;
  category: string;
  image: string;
  images?: string[];
  mainImageIndex?: number;
  description?: string;
  sku?: string;
  brand?: string;
  size?: string[];
  color?: string;
  discount?: number;
  stock: number;
  currentStock?: number;
}

// Helper for Firestore timestamps
export type FirestoreTimestamp = string | FieldValue | any;

export interface InventoryItem {
  id: string; // Required for all operations
  productId: string;
  branchId: string;
  stock: number;
  lowStockThreshold: number;
  updatedAt: FirestoreTimestamp;
}

export interface CartItem extends Product {
  quantity: number;
}

export type TransactionStatus = 'COMPLETED' | 'REFUNDED' | 'CANCELLED';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  items?: CartItem[];
  category?: string;
  paymentMethod?: string;
  branchId?: string;
  userId?: string;
  customerId?: string;
  status: TransactionStatus;
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
  AJUSTE = 'AJUSTE',
  DEVOLUCION = 'DEVOLUCION'
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
  transactionId?: string;
  transferToBranchId?: string;
  userId: string;
  userName: string;
  createdAt: FirestoreTimestamp;
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

export interface StockTransferItem {
  productId: string;
  productName: string;
  quantity: number;
  sourceBatches?: {
    originalBatchId: string;
    cost: number;
    quantity: number;
  }[];
  unitCost?: number;
}

export interface StockTransfer {
  id: string;
  originBranchId: string;
  targetBranchId: string;
  status: TransferStatus;
  items: StockTransferItem[];
  sentBy: string;
  receivedBy?: string;
  sentAt: FirestoreTimestamp;
  receivedAt?: FirestoreTimestamp;
  note?: string;
}

export interface InventoryBatch {
  id: string;
  productId: string;
  branchId: string;
  cost: number;
  initialStock: number;
  remainingStock: number;
  createdAt: FirestoreTimestamp;
  receivedBy: string;
}

// --- ACCOUNTING ---

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

export enum AccountNature {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT'
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  nature: AccountNature;
  description?: string;
  isGroup: boolean;
  level: number;
  parentId?: string;
}

export interface JournalEntryLine {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export type JournalStatus = 'DRAFT' | 'POSTED' | 'VOID';

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  lines: JournalEntryLine[];
  totalAmount: number;
  referenceId?: string;
  referenceType?: 'SALE' | 'EXPENSE' | 'ADJUSTMENT';
  branchId: string;
  createdBy: string;
  createdAt: string; // Usually ISO string for accounting logs
  status: JournalStatus;
}