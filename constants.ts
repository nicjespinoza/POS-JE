
import { Product, Transaction, TransactionType, Permission, RoleDefinition, Account, AccountType, AccountNature } from './types';

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'Dólar Estadounidense' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'Libra Esterlina' },
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano' },
  { code: 'COP', symbol: '$', name: 'Peso Colombiano' },
  { code: 'ARS', symbol: '$', name: 'Peso Argentino' }
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Reloj Titanium Ultra',
    price: 799,
    category: 'Accesorios',
    stock: 15,
    image: 'https://picsum.photos/200/200?random=1'
  },
  {
    id: '2',
    name: 'Audífonos Sonic',
    price: 299,
    category: 'Audio',
    stock: 24,
    image: 'https://picsum.photos/200/200?random=2'
  },
  {
    id: '3',
    name: 'Smart Hub Cristal',
    price: 129,
    category: 'Hogar',
    stock: 50,
    image: 'https://picsum.photos/200/200?random=3'
  },
  {
    id: '4',
    name: 'Cargador Inalámbrico',
    price: 49,
    category: 'Accesorios',
    stock: 100,
    image: 'https://picsum.photos/200/200?random=4'
  },
  {
    id: '5',
    name: 'Funda Cerámica',
    price: 59,
    category: 'Accesorios',
    stock: 30,
    image: 'https://picsum.photos/200/200?random=5'
  },
  {
    id: '6',
    name: 'Funda Laptop Pro',
    price: 89,
    category: 'Accesorios',
    stock: 12,
    image: 'https://picsum.photos/200/200?random=6'
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    type: TransactionType.EXPENSE,
    amount: 1200,
    date: new Date(Date.now() - 86400000 * 5).toISOString(),
    description: 'Renta del Local - Mensual',
    category: 'Alquiler',
    status: 'COMPLETED'
  },
  {
    id: 't2',
    type: TransactionType.EXPENSE,
    amount: 300,
    date: new Date(Date.now() - 86400000 * 3).toISOString(),
    description: 'Pago de Servicios (Luz/Internet)',
    category: 'Servicios',
    status: 'COMPLETED'
  },
  {
    id: 't3',
    type: TransactionType.INCOME,
    amount: 799,
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    description: 'Venta: Reloj Titanium Ultra',
    items: [{ ...MOCK_PRODUCTS[0], quantity: 1 }],
    category: 'Ventas',
    status: 'COMPLETED'
  },
  {
    id: 't4',
    type: TransactionType.INCOME,
    amount: 598,
    date: new Date(Date.now() - 86400000 * 1).toISOString(),
    description: 'Venta: Audífonos Sonic x2',
    items: [{ ...MOCK_PRODUCTS[1], quantity: 2 }],
    category: 'Ventas',
    status: 'COMPLETED'
  }
];

export const DEFAULT_CATEGORIES = {
  income: ['Ventas', 'Servicios', 'Consultoría', 'Ajuste', 'Otros'],
  expense: ['Suministros', 'Servicios', 'Marketing', 'Alquiler', 'Nómina', 'Mantenimiento', 'Otros']
};

export const ALL_PERMISSIONS = [
  { id: Permission.VIEW_DASHBOARD, label: 'Ver Panel', description: 'Acceso al resumen principal' },
  { id: Permission.MANAGE_TRANSACTIONS, label: 'Gestionar Transacciones', description: 'Agregar, editar o eliminar registros de ingresos/egresos' },
  { id: Permission.MANAGE_CATEGORIES, label: 'Gestionar Categorías', description: 'Configurar categorías contables' },
  { id: Permission.MANAGE_ROLES, label: 'Gestionar Roles', description: 'Crear, editar y eliminar roles de usuario' },
  { id: Permission.VIEW_ANALYTICS, label: 'Ver Analíticas', description: 'Acceso a gráficos e insights de IA' },
  { id: Permission.EXPORT_DATA, label: 'Exportar Datos', description: 'Descargar reportes financieros' },
];

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: 'admin-role',
    name: 'Administrador',
    description: 'Acceso total al sistema',
    permissions: Object.values(Permission) as Permission[]
  },
  {
    id: 'manager-role',
    name: 'Gerente de Tienda',
    description: 'Puede gestionar operaciones pero no roles del sistema',
    permissions: [Permission.VIEW_DASHBOARD, Permission.MANAGE_TRANSACTIONS, Permission.MANAGE_CATEGORIES, Permission.VIEW_ANALYTICS]
  },
  {
    id: 'cashier-role',
    name: 'Cajero',
    description: 'Solo puede registrar ventas',
    permissions: [Permission.VIEW_DASHBOARD, Permission.MANAGE_TRANSACTIONS]
  }
];

export const ACCOUNTS_LIST: Account[] = [
  { id: '1', code: '1', name: 'ACTIVO', type: AccountType.ASSET, nature: AccountNature.DEBIT, isGroup: true, level: 1 },
  { id: '1.1', code: '1.1', name: 'Activo Corriente', type: AccountType.ASSET, nature: AccountNature.DEBIT, isGroup: true, level: 2, parentId: '1' },
  { id: '1.1.01', code: '1.1.01', name: 'Caja y Bancos', type: AccountType.ASSET, nature: AccountNature.DEBIT, isGroup: true, level: 3, parentId: '1.1' },
  { id: '1.1.01.01', code: '1.1.01.01', name: 'Caja General', type: AccountType.ASSET, nature: AccountNature.DEBIT, isGroup: false, level: 4, parentId: '1.1.01' },
  { id: '1.3', code: '1.3', name: 'Inventarios', type: AccountType.ASSET, nature: AccountNature.DEBIT, isGroup: true, level: 2, parentId: '1' },
  { id: '1.3.01', code: '1.3.01', name: 'Inventario Mercaderías', type: AccountType.ASSET, nature: AccountNature.DEBIT, isGroup: true, level: 3, parentId: '1.3' },
  { id: '1.3.01.01', code: '1.3.01.01', name: 'Inventario de Zapatos', type: AccountType.ASSET, nature: AccountNature.DEBIT, isGroup: false, level: 4, parentId: '1.3.01' },
  { id: '2', code: '2', name: 'PASIVO', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, isGroup: true, level: 1 },
  { id: '2.1', code: '2.1', name: 'Pasivo Corriente', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, isGroup: true, level: 2, parentId: '2' },
  { id: '2.1.02', code: '2.1.02', name: 'Impuestos por Pagar', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, isGroup: true, level: 3, parentId: '2.1' },
  { id: '2.1.02.01', code: '2.1.02.01', name: 'IVA por Pagar (15%)', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, isGroup: false, level: 4, parentId: '2.1.02' },
  { id: '4', code: '4', name: 'INGRESOS', type: AccountType.REVENUE, nature: AccountNature.CREDIT, isGroup: true, level: 1 },
  { id: '4.1', code: '4.1', name: 'Ingresos de Operación', type: AccountType.REVENUE, nature: AccountNature.CREDIT, isGroup: true, level: 2, parentId: '4' },
  { id: '4.1.01', code: '4.1.01', name: 'Ventas de Zapatos', type: AccountType.REVENUE, nature: AccountNature.CREDIT, isGroup: true, level: 3, parentId: '4.1' },
  { id: '4.1.01.01', code: '4.1.01.01', name: 'Ventas Gravadas 15%', type: AccountType.REVENUE, nature: AccountNature.CREDIT, isGroup: false, level: 4, parentId: '4.1.01' },
  { id: '5', code: '5', name: 'EGRESOS', type: AccountType.EXPENSE, nature: AccountNature.DEBIT, isGroup: true, level: 1 },
  { id: '5.1', code: '5.1', name: 'Costos de Venta', type: AccountType.EXPENSE, nature: AccountNature.DEBIT, isGroup: true, level: 2, parentId: '5' },
  { id: '5.1.01', code: '5.1.01', name: 'Costo de Ventas Zapatos', type: AccountType.EXPENSE, nature: AccountNature.DEBIT, isGroup: true, level: 3, parentId: '5.1' },
  { id: '5.1.01.01', code: '5.1.01.01', name: 'Costo de Ventas', type: AccountType.EXPENSE, nature: AccountNature.DEBIT, isGroup: false, level: 4, parentId: '5.1.01' },
];
