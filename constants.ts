
import { Product, Transaction, TransactionType, Permission, RoleDefinition } from './types';

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
    category: 'Alquiler'
  },
  {
    id: 't2',
    type: TransactionType.EXPENSE,
    amount: 300,
    date: new Date(Date.now() - 86400000 * 3).toISOString(),
    description: 'Pago de Servicios (Luz/Internet)',
    category: 'Servicios'
  },
  {
    id: 't3',
    type: TransactionType.INCOME,
    amount: 799,
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    description: 'Venta: Reloj Titanium Ultra',
    items: [{ ...MOCK_PRODUCTS[0], quantity: 1 }],
    category: 'Ventas'
  },
  {
    id: 't4',
    type: TransactionType.INCOME,
    amount: 598,
    date: new Date(Date.now() - 86400000 * 1).toISOString(),
    description: 'Venta: Audífonos Sonic x2',
    items: [{ ...MOCK_PRODUCTS[1], quantity: 2 }],
    category: 'Ventas'
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
