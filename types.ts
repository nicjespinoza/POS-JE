
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
  status?: 'COMPLETED' | 'REFUNDED' | 'CANCELLED';
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