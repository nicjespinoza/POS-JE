import React, { useState, useMemo, useEffect } from 'react';
import { GlassCard } from './ui/GlassCard';
import { FinancialOverview } from './FinancialOverview';
import { Transaction, TransactionType, RoleDefinition, Permission, CartItem, Product } from '../types';
import { analyzeBusinessData } from '../services/geminiService';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { ReportsDashboard } from './ReportsDashboard';
import {
  TrendingUp, TrendingDown, DollarSign, Sparkles, LogOut, ArrowUpRight, ArrowDownRight,
  Wallet, Sun, Moon, ChevronDown, Filter, X, Settings, Plus, Trash2, Edit2, Check, Save, Globe, Shield, Users, CheckSquare, Square, BarChart, ArrowUp, ArrowDown, ShoppingBag, Package, CheckCircle2, Percent, Box, Calendar, Tag, CreditCard, Banknote, Landmark, Smartphone, Mail, FileText, Search, LayoutDashboard, PieChart
} from 'lucide-react';
import { CURRENCIES, ALL_PERMISSIONS } from '../constants';

interface CategoryState {
  income: string[];
  expense: string[];
}

interface AdminDashboardProps {
  transactions: Transaction[];
  products: Product[];
  onLogout: () => void;
  onAddTransaction: (t: Transaction) => void;
  onEditTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onBulkDeleteTransactions: (ids: string[]) => void;
  onBulkEditTransactions: (ids: string[], updates: Partial<Transaction>) => void;
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  toggleTheme: () => void;
  isDark: boolean;
  categories: CategoryState;
  onUpdateCategories: (cats: CategoryState) => void;
  roles: RoleDefinition[];
  onUpdateRoles: (roles: RoleDefinition[]) => void;
  currency: { code: string, symbol: string };
  onCurrencyChange: (code: string) => void;
  taxRate: number;
  onUpdateTaxRate: (rate: number) => void;
  lowStockThreshold: number;
  onUpdateLowStockThreshold: (threshold: number) => void;
  adminEmail: string;
  onUpdateAdminEmail: (email: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  transactions,
  products,
  onLogout,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onBulkDeleteTransactions,
  onBulkEditTransactions,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  toggleTheme,
  isDark,
  categories,
  onUpdateCategories,
  roles,
  onUpdateRoles,
  currency,
  onCurrencyChange,
  taxRate,
  onUpdateTaxRate,
  lowStockThreshold,
  onUpdateLowStockThreshold,
  adminEmail,
  onUpdateAdminEmail
}) => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'reports'>('overview');

  const [analyzing, setAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  // Logout Confirmation State
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Expense Modal State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({ desc: '', amount: '', category: '' });

  // Income Modal State
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [newIncome, setNewIncome] = useState({ desc: '', amount: '', category: '' });

  // Settings/Category Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'income' | 'expense' | 'tax' | 'inventory'>('income');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ index: number, value: string } | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set());

  // Role Management Modal State
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleDefinition | null>(null);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [tempRoleName, setTempRoleName] = useState('');
  const [tempRoleDesc, setTempRoleDesc] = useState('');

  // Edit Transaction State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Bulk Edit State
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditValues, setBulkEditValues] = useState<{ category: string, date: string }>({ category: '', date: '' });

  // View Items State
  const [viewingItems, setViewingItems] = useState<CartItem[] | null>(null);

  // Filter State
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');

  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inventory State
  const [productSearch, setProductSearch] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    category: '',
    stock: '',
    image: '',
    images: [] as string[],
    discount: ''
  });

  // Reset category selection when changing settings tab
  useEffect(() => {
    setSelectedCategories(new Set());
  }, [settingsTab]);

  // Set default categories when modals open if empty
  useEffect(() => {
    if (showExpenseModal && !newExpense.category && categories.expense.length > 0) {
      setNewExpense(prev => ({ ...prev, category: categories.expense[0] }));
    }
    if (showIncomeModal && !newIncome.category && categories.income.length > 0) {
      setNewIncome(prev => ({ ...prev, category: categories.income[0] }));
    }
  }, [categories, showExpenseModal, showIncomeModal, newExpense.category, newIncome.category]);

  // Set initial selected role for modal
  useEffect(() => {
    if (showRolesModal && !selectedRole && roles.length > 0) {
      setSelectedRole(roles[0]);
    }
  }, [showRolesModal, roles, selectedRole]);

  useEffect(() => {
    if (editingProduct) {
      setProductForm({
        name: editingProduct.name,
        price: editingProduct.price.toString(),
        category: editingProduct.category,
        stock: editingProduct.stock.toString(),
        image: editingProduct.image,
        images: editingProduct.images || [],
        discount: (editingProduct.discount || '').toString()
      });
      setShowProductModal(true);
    } else {
      setProductForm({
        name: '', price: '', category: '', stock: '', image: '', images: [], discount: ''
      });
    }
  }, [editingProduct]);

  // Filter Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.date);

      // Date Filter
      if (filterStartDate) {
        const start = new Date(filterStartDate);
        if (tDate < start) return false;
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate);
        end.setHours(23, 59, 59, 999); // Include the entire end day
        if (tDate > end) return false;
      }

      // Type Filter
      if (filterType !== 'ALL' && t.type !== filterType) return false;

      return true;
    });
  }, [transactions, filterStartDate, filterEndDate, filterType]);

  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  // Sort Logic
  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions];
    sorted.sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

      // Handle specific transformations
      if (sortConfig.key === 'date') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortConfig.key === 'category') {
        aValue = (aValue || '').toString().toLowerCase();
        bValue = (bValue || '').toString().toLowerCase();
      } else if (sortConfig.key === 'description') {
        aValue = (aValue || '').toString().toLowerCase();
        bValue = (bValue || '').toString().toLowerCase();
      } else if (sortConfig.key === 'type') {
        aValue = aValue.toString();
        bValue = bValue.toString();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sorted;
  }, [filteredTransactions, sortConfig]);

  const requestSort = (key: keyof Transaction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof Transaction }) => {
    if (sortConfig.key !== columnKey) return <div className="w-4" />; // Placeholder for alignment
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  // Selection Logic
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = sortedTransactions.map(t => t.id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = () => {
    const idsArray = Array.from(selectedIds);
    onBulkDeleteTransactions(idsArray);
    setSelectedIds(new Set());
  };

  const handleBulkEdit = () => {
    const updates: Partial<Transaction> = {};
    if (bulkEditValues.category) updates.category = bulkEditValues.category;
    if (bulkEditValues.date) updates.date = new Date(bulkEditValues.date).toISOString();

    if (Object.keys(updates).length > 0) {
      onBulkEditTransactions(Array.from(selectedIds), updates);
    }

    setShowBulkEditModal(false);
    setSelectedIds(new Set());
    setBulkEditValues({ category: '', date: '' });
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tableRows = sortedTransactions.map(t => `
        <tr>
          <td>${t.description}</td>
          <td>${t.category || '-'}</td>
          <td>${new Date(t.date).toLocaleDateString()}</td>
          <td>${t.type === TransactionType.INCOME ? 'Ingreso' : 'Egreso'}</td>
          <td style="text-align: right;">${t.type === TransactionType.INCOME ? '+' : '-'}${currency.symbol}${t.amount.toFixed(2)}</td>
        </tr>
      `).join('');

    const totalIncome = sortedTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = sortedTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    const net = totalIncome - totalExpense;

    printWindow.document.write(`
        <html>
          <head>
            <title>Reporte de Transacciones - Titanium POS</title>
            <style>
              body { font-family: 'Inter', sans-serif; padding: 20px; }
              h1 { text-align: center; color: #333; }
              .meta { margin-bottom: 20px; font-size: 12px; color: #666; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
              th { background-color: #f2f2f2; }
              .summary { margin-top: 20px; display: flex; justify-content: flex-end; gap: 20px; font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>Reporte de Transacciones</h1>
            <div class="meta">
              Generado: ${new Date().toLocaleString()}<br/>
              Filtros: ${filterType === 'ALL' ? 'Todos' : filterType} | ${filterStartDate || 'Inicio'} - ${filterEndDate || 'Fin'}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th style="text-align: right;">Monto</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
            <div class="summary">
              <div>Ingresos: ${currency.symbol}${totalIncome.toFixed(2)}</div>
              <div>Egresos: ${currency.symbol}${totalExpense.toFixed(2)}</div>
              <div>Neto: ${currency.symbol}${net.toFixed(2)}</div>
            </div>
          </body>
        </html>
      `);
    printWindow.document.close();
    printWindow.print();
  };

  const isAllSelected = sortedTransactions.length > 0 && selectedIds.size === sortedTransactions.length;

  // Determine available categories for bulk edit based on selection
  const bulkEditCategoryOptions = useMemo(() => {
    const selectedItems = transactions.filter(t => selectedIds.has(t.id));
    const hasIncome = selectedItems.some(t => t.type === TransactionType.INCOME);
    const hasExpense = selectedItems.some(t => t.type === TransactionType.EXPENSE);

    if (hasIncome && !hasExpense) return categories.income;
    if (hasExpense && !hasIncome) return categories.expense;
    return [...categories.income, ...categories.expense]; // Mixed or empty selection
  }, [selectedIds, transactions, categories]);


  // Calculations based on filtered data
  const summary = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) {
        acc.income += t.amount;
      } else {
        acc.expense += t.amount;
      }
      return acc;
    }, { income: 0, expense: 0 });
  }, [filteredTransactions]);

  const netProfit = summary.income - summary.expense;

  const chartData = useMemo(() => {
    // Group by date (simplified for demo)
    const grouped: Record<string, { name: string, income: number, expense: number }> = {};
    // Sort transactions by date for the chart
    const sorted = [...filteredTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach(t => {
      const date = new Date(t.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
      if (!grouped[date]) grouped[date] = { name: date, income: 0, expense: 0 };
      if (t.type === TransactionType.INCOME) grouped[date].income += t.amount;
      else grouped[date].expense += t.amount;
    });
    return Object.values(grouped);
  }, [filteredTransactions]);

  const handleGeminiAnalysis = async () => {
    setAnalyzing(true);
    // Analyze the currently filtered view
    const result = await analyzeBusinessData(filteredTransactions);
    setAiInsight(result);
    setAnalyzing(false);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(newExpense.amount);

    if (!newExpense.desc || isNaN(amountVal) || amountVal <= 0) {
      alert("Por favor ingresa un monto válido mayor a 0.");
      return;
    }

    onAddTransaction({
      id: crypto.randomUUID(),
      type: TransactionType.EXPENSE,
      amount: amountVal,
      description: newExpense.desc,
      category: newExpense.category || categories.expense[0],
      date: new Date().toISOString(),
      status: 'COMPLETED'
    });
    setNewExpense({ desc: '', amount: '', category: categories.expense[0] });
    setShowExpenseModal(false);
  };

  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(newIncome.amount);

    if (!newIncome.desc || isNaN(amountVal) || amountVal <= 0) {
      alert("Por favor ingresa un monto válido mayor a 0.");
      return;
    }

    onAddTransaction({
      id: crypto.randomUUID(),
      type: TransactionType.INCOME,
      amount: amountVal,
      description: newIncome.desc,
      category: newIncome.category || categories.income[0],
      date: new Date().toISOString(),
      status: 'COMPLETED'
    });
    setNewIncome({ desc: '', amount: '', category: categories.income[0] });
    setShowIncomeModal(false);
  };

  // --- Category Management Logic ---
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    if (settingsTab === 'tax' || settingsTab === 'inventory') return;

    if (window.confirm(`¿Estás seguro de agregar la categoría "${newCategoryName.trim()}"?`)) {
      const updated = { ...categories };
      updated[settingsTab] = [...updated[settingsTab], newCategoryName.trim()];
      onUpdateCategories(updated);
      setNewCategoryName('');
    }
  };

  const handleDeleteCategory = (index: number) => {
    if (settingsTab === 'tax' || settingsTab === 'inventory') return;
    if (confirm('¿Eliminar esta categoría?')) {
      const updated = { ...categories };
      updated[settingsTab] = updated[settingsTab].filter((_, i) => i !== index);
      onUpdateCategories(updated);
      setSelectedCategories(new Set()); // Clear selection to prevent index mismatches
    }
  };

  const handleBulkDeleteCategories = () => {
    if (settingsTab === 'tax' || settingsTab === 'inventory') return;
    if (confirm(`¿Eliminar ${selectedCategories.size} categorías seleccionadas?`)) {
      const updated = { ...categories };
      updated[settingsTab] = updated[settingsTab].filter((_, i) => !selectedCategories.has(i));
      onUpdateCategories(updated);
      setSelectedCategories(new Set());
    }
  };

  const startEditingCategory = (index: number, currentVal: string) => {
    setEditingCategory({ index, value: currentVal });
  };

  const saveEditedCategory = () => {
    if (settingsTab === 'tax' || settingsTab === 'inventory') return;
    if (!editingCategory || !editingCategory.value.trim()) return;
    const updated = { ...categories };
    updated[settingsTab] = updated[settingsTab].map((c, i) => i === editingCategory.index ? editingCategory.value.trim() : c);
    onUpdateCategories(updated);
    setEditingCategory(null);
  };

  // --- Role Management Logic ---
  const handleAddNewRole = () => {
    const newRole: RoleDefinition = {
      id: crypto.randomUUID(),
      name: 'Nuevo Rol',
      description: 'Descripción del rol',
      permissions: []
    };
    const updatedRoles = [...roles, newRole];
    onUpdateRoles(updatedRoles);
    setSelectedRole(newRole);
    setIsEditingRole(true);
    setTempRoleName(newRole.name);
    setTempRoleDesc(newRole.description);
  };

  const handleDeleteRole = (id: string) => {
    if (confirm('¿Eliminar este rol? Esta acción no se puede deshacer.')) {
      const updatedRoles = roles.filter(r => r.id !== id);
      onUpdateRoles(updatedRoles);
      if (selectedRole?.id === id) {
        setSelectedRole(updatedRoles[0] || null);
      }
    }
  };

  const togglePermission = (permId: Permission) => {
    if (!selectedRole) return;

    const currentPerms = selectedRole.permissions;
    let newPerms: Permission[];

    if (currentPerms.includes(permId)) {
      newPerms = currentPerms.filter(p => p !== permId);
    } else {
      newPerms = [...currentPerms, permId];
    }

    const updatedRole = { ...selectedRole, permissions: newPerms };
    const updatedRoles = roles.map(r => r.id === selectedRole.id ? updatedRole : r);
    onUpdateRoles(updatedRoles);
    setSelectedRole(updatedRole);
  };

  const startEditingRole = () => {
    if (!selectedRole) return;
    setTempRoleName(selectedRole.name);
    setTempRoleDesc(selectedRole.description);
    setIsEditingRole(true);
  };

  const saveRoleDetails = () => {
    if (!selectedRole) return;
    const updatedRole = {
      ...selectedRole,
      name: tempRoleName || selectedRole.name,
      description: tempRoleDesc || selectedRole.description
    };
    const updatedRoles = roles.map(r => r.id === selectedRole.id ? updatedRole : r);
    onUpdateRoles(updatedRoles);
    setSelectedRole(updatedRole);
    setIsEditingRole(false);
  };

  // --- Edit Transaction Logic ---
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTransaction) {
      onEditTransaction(editingTransaction);
      setEditingTransaction(null);
    }
  };

  // --- Product Management Logic ---
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(productForm.price);
    const stock = parseInt(productForm.stock);
    const discount = parseInt(productForm.discount) || 0;
    const validImages = productForm.images.filter(url => url && url.trim() !== '');

    if (!productForm.name || isNaN(price) || price < 0) {
      alert('Por favor, ingresa datos válidos. El precio debe ser mayor o igual a 0.');
      return;
    }

    const productData = {
      name: productForm.name,
      price: price,
      category: productForm.category,
      stock: isNaN(stock) ? 0 : stock,
      image: productForm.image,
      images: validImages,
      discount: discount
    };

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        ...productData
      });
    } else {
      onAddProduct({
        id: crypto.randomUUID(),
        ...productData,
        category: productForm.category || 'General' // ensuring fallback
      });
    }
    setShowProductModal(false);
    setEditingProduct(null);
  };

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterType('ALL');
  };

  const getPaymentIcon = (method?: string) => {
    switch (method) {
      case 'Efectivo': return <Banknote size={16} />;
      case 'Tarjeta': return <CreditCard size={16} />;
      case 'Transferencia': return <Landmark size={16} />;
      case 'Móvil': return <Smartphone size={16} />;
      // Fallbacks for older English data
      case 'Cash': return <Banknote size={16} />;
      case 'Card': return <CreditCard size={16} />;
      case 'Transfer': return <Landmark size={16} />;
      case 'Mobile': return <Smartphone size={16} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black text-slate-900 dark:text-white font-sans p-6 pb-32 md:pb-24 relative overflow-x-hidden transition-colors duration-300">

      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[20%] w-[40vw] h-[40vw] bg-purple-600/5 dark:bg-purple-900/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] right-[20%] w-[30vw] h-[30vw] bg-blue-600/5 dark:bg-blue-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header GlassCard - Enhanced Styles */}
        <GlassCard className="sticky top-4 z-40 flex flex-col md:flex-row justify-between items-center mb-8 gap-4 px-6 py-4 shadow-2xl backdrop-blur-2xl">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-gray-400">
              Sistema Contable
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-gray-500">Gestión de Ingresos, Egresos & Control</p>
          </div>

          {/* Main Navigation Tabs */}
          <div className="flex bg-gray-100 dark:bg-white/10 rounded-full p-1 gap-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-black text-slate-900 dark:text-white shadow-md' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <LayoutDashboard size={16} /> Panel General
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'inventory' ? 'bg-white dark:bg-black text-slate-900 dark:text-white shadow-md' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <Box size={16} /> Inventario
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'reports' ? 'bg-white dark:bg-black text-slate-900 dark:text-white shadow-md' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <PieChart size={16} /> Reportes
            </button>
          </div>

          <div className="flex gap-3 items-center flex-wrap justify-center">
            {/* Currency Selector */}
            <div className="relative">
              <select
                value={currency.code}
                onChange={(e) => onCurrencyChange(e.target.value)}
                className="appearance-none pl-9 pr-4 py-2 rounded-full bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/10 backdrop-blur-md transition-all cursor-pointer outline-none text-sm font-medium shadow-sm text-slate-700 dark:text-gray-200"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code} className="bg-white dark:bg-gray-900">{c.code}</option>
                ))}
              </select>
              <Globe size={16} className="absolute left-3 top-2.5 text-slate-500 dark:text-gray-400 pointer-events-none" />
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/10 backdrop-blur-md transition-all shadow-sm text-slate-600 dark:text-gray-300"
            >
              {isDark ? <Sun size={20} className="text-gray-300" /> : <Moon size={20} className="text-slate-600" />}
            </button>

            <button
              onClick={() => setShowRolesModal(true)}
              className="p-2 rounded-full bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/10 backdrop-blur-md transition-all shadow-sm text-slate-600 dark:text-gray-300"
              title="Gestión de Roles"
            >
              <Shield size={20} />
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-full bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/10 backdrop-blur-md transition-all shadow-sm text-slate-600 dark:text-gray-300"
              title="Configuración & Categorías"
            >
              <Settings size={20} />
            </button>
            <div className="h-6 w-px bg-gray-300 dark:bg-white/10 mx-1 hidden md:block" />

            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="px-4 py-2 rounded-full bg-red-500/10 dark:bg-red-500/10 border border-red-500/20 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-500/20 backdrop-blur-md transition-all text-sm font-medium"
            >
              Salir
            </button>
          </div>
        </GlassCard>

        {activeTab === 'overview' ? (
          <>
            {/* Filter Bar */}
            <GlassCard className="p-4 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400 w-full md:w-auto">
                <Filter size={18} />
                <span className="text-sm font-medium">Filtros</span>
              </div>

              <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 w-full md:w-auto"
                    placeholder="Fecha Inicio"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 w-full md:w-auto"
                    placeholder="Fecha Fin"
                  />
                </div>

                <div className="relative w-full md:w-40">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 appearance-none cursor-pointer"
                  >
                    <option value="ALL">Todo</option>
                    <option value={TransactionType.INCOME}>Ingresos</option>
                    <option value={TransactionType.EXPENSE}>Egresos</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={14} />
                </div>

                <button
                  onClick={handleExportPDF}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2 text-sm font-medium transition-colors"
                  title="Exportar a PDF"
                >
                  <FileText size={16} /> <span className="hidden sm:inline">Exportar PDF</span>
                </button>

                {(filterStartDate || filterEndDate || filterType !== 'ALL') && (
                  <button
                    onClick={clearFilters}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 transition-colors"
                    title="Limpiar Filtros"
                  >
                    <X size={18} />
                  </button>
                )}

                <div className="h-6 w-px bg-gray-300 dark:bg-white/10 mx-1" />

                <button
                  onClick={() => setShowIncomeModal(true)}
                  className="px-4 py-2 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  <TrendingUp size={16} /> <span className="hidden lg:inline">Ingreso</span>
                </button>

                <button
                  onClick={() => setShowExpenseModal(true)}
                  className="px-4 py-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  <TrendingDown size={16} /> <span className="hidden lg:inline">Egreso</span>
                </button>
              </div>
            </GlassCard>

            {/* Financial Overview Cards */}
            <FinancialOverview
              income={summary.income}
              expense={summary.expense}
              profit={netProfit}
              currencySymbol={currency.symbol}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Chart Section */}
              <GlassCard className="p-6 lg:col-span-2 min-h-[400px]">
                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                  <BarChart size={20} className="text-purple-600 dark:text-purple-400" /> Análisis de Flujo de Caja
                </h3>
                <div className="h-[300px] w-full">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#e5e7eb"} vertical={false} />
                        <XAxis dataKey="name" stroke={isDark ? "#666" : "#9ca3af"} fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke={isDark ? "#666" : "#9ca3af"} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${currency.symbol}${val}`} />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: isDark ? 'rgba(20, 20, 20, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                            borderColor: isDark ? '#333' : '#e5e7eb',
                            borderRadius: '12px',
                            backdropFilter: 'blur(10px)',
                            color: isDark ? '#fff' : '#000'
                          }}
                          itemStyle={{ color: isDark ? '#fff' : '#000' }}
                        />
                        <Area type="monotone" dataKey="income" name="Ingresos" stroke="#4ade80" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                        <Area type="monotone" dataKey="expense" name="Egresos" stroke="#f87171" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 dark:text-gray-600">
                      Sin datos para el período seleccionado
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* AI Insights Section */}
              <GlassCard className="p-6 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Sparkles size={20} className="text-yellow-500 dark:text-yellow-400" /> Insights Gemini
                  </h3>
                </div>

                <div className="flex-1 bg-white/50 dark:bg-black/20 rounded-2xl p-4 overflow-y-auto mb-4 custom-scrollbar border border-gray-100 dark:border-white/5 min-h-[250px] text-sm text-slate-700 dark:text-gray-300 leading-relaxed">
                  {analyzing ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-purple-600 dark:text-purple-400 animate-pulse">Analizando patrones financieros...</span>
                    </div>
                  ) : aiInsight ? (
                    <div className="whitespace-pre-wrap font-sans">
                      {aiInsight}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-gray-500 text-center">
                      <p>Toca analizar para generar un reporte estratégico sobre los datos <strong>visibles</strong>.</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleGeminiAnalysis}
                  disabled={analyzing || filteredTransactions.length === 0}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 font-semibold text-white shadow-lg hover:shadow-purple-500/25 transition-all active:scale-95 disabled:opacity-50"
                >
                  {analyzing ? 'Pensando...' : 'Analizar Salud Financiera'}
                </button>
              </GlassCard>

              {/* Recent Transactions Table */}
              <GlassCard className="p-6 lg:col-span-3">
                {/* Table code remains identical to original... */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Transacciones Recientes</h3>
                    <span className="text-sm text-slate-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-full">
                      {filteredTransactions.length} ítems
                    </span>
                  </div>
                  <span className="text-sm text-slate-500 dark:text-gray-400">Mostrando top {sortedTransactions.slice(0, 50).length} de {filteredTransactions.length}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-slate-500 dark:text-gray-500 text-sm border-b border-gray-200 dark:border-white/10 select-none">
                        <th className="py-3 px-2 w-10 text-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                            checked={isAllSelected}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th className="py-3 px-2 font-medium cursor-pointer hover:text-slate-700 dark:hover:text-gray-300 transition-colors" onClick={() => requestSort('description')}>
                          <div className="flex items-center gap-1">
                            Descripción <SortIcon columnKey="description" />
                          </div>
                        </th>
                        <th className="py-3 px-2 font-medium">Items</th>
                        <th className="py-3 px-2 font-medium cursor-pointer hover:text-slate-700 dark:hover:text-gray-300 transition-colors" onClick={() => requestSort('category')}>
                          <div className="flex items-center gap-1">
                            Categoría <SortIcon columnKey="category" />
                          </div>
                        </th>
                        <th className="py-3 px-2 font-medium cursor-pointer hover:text-slate-700 dark:hover:text-gray-300 transition-colors" onClick={() => requestSort('date')}>
                          <div className="flex items-center gap-1">
                            Fecha <SortIcon columnKey="date" />
                          </div>
                        </th>
                        <th className="py-3 px-2 font-medium cursor-pointer hover:text-slate-700 dark:hover:text-gray-300 transition-colors" onClick={() => requestSort('type')}>
                          <div className="flex items-center gap-1">
                            Tipo <SortIcon columnKey="type" />
                          </div>
                        </th>
                        <th className="py-3 px-2 font-medium text-center">
                          Método
                        </th>
                        <th className="py-3 px-2 font-medium text-right cursor-pointer hover:text-slate-700 dark:hover:text-gray-300 transition-colors" onClick={() => requestSort('amount')}>
                          <div className="flex items-center justify-end gap-1">
                            Monto <SortIcon columnKey="amount" />
                          </div>
                        </th>
                        <th className="py-3 px-2 font-medium text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTransactions.length > 0 ? (
                        sortedTransactions.slice(0, 50).map(t => (
                          <tr key={t.id} className={`border-b border-gray-100 dark:border-white/5 transition-colors text-sm ${selectedIds.has(t.id) ? 'bg-purple-50 dark:bg-purple-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                            <td className="py-4 px-2 text-center">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                                checked={selectedIds.has(t.id)}
                                onChange={() => handleSelectOne(t.id)}
                              />
                            </td>
                            <td className="py-4 px-2 text-slate-700 dark:text-gray-200">{t.description}</td>
                            <td className="py-4 px-2">
                              {t.items && t.items.length > 0 ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingItems(t.items!);
                                  }}
                                  className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20 text-xs font-medium hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors"
                                >
                                  <ShoppingBag size={12} className="group-hover:scale-110 transition-transform" />
                                  <span>{t.items.length} {t.items.length === 1 ? 'Ítem' : 'Ítems'}</span>
                                </button>
                              ) : (
                                <span className="text-slate-400 dark:text-gray-600 text-xs">-</span>
                              )}
                            </td>
                            <td className="py-4 px-2 text-slate-500 dark:text-gray-400">
                              {t.category ? (
                                <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-white/5 text-xs">
                                  {t.category}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="py-4 px-2 text-slate-500 dark:text-gray-400">{new Date(t.date).toLocaleDateString()}</td>
                            <td className="py-4 px-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.type === TransactionType.INCOME ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'}`}>
                                {t.type === TransactionType.INCOME ? 'Ingreso' : 'Egreso'}
                              </span>
                            </td>
                            <td className="py-4 px-2 text-center text-slate-500 dark:text-gray-400">
                              {t.paymentMethod && (
                                <div className="flex items-center justify-center gap-1" title={t.paymentMethod}>
                                  {getPaymentIcon(t.paymentMethod)}
                                  <span className="hidden lg:inline text-xs">{t.paymentMethod}</span>
                                </div>
                              )}
                            </td>
                            <td className={`py-4 px-2 text-right font-semibold ${t.type === TransactionType.INCOME ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {t.type === TransactionType.INCOME ? '+' : '-'}{currency.symbol}{t.amount.toFixed(2)}
                            </td>
                            <td className="py-4 px-2 text-right">
                              <button
                                onClick={() => setEditingTransaction(t)}
                                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400 dark:text-gray-600">
                            No se encontraron transacciones para los filtros seleccionados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          </>
        ) : activeTab === 'inventory' ? (
          /* INVENTORY TAB CONTENT */
          <div className="space-y-6">
            <GlassCard className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar en inventario..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:ring-2 focus:ring-purple-500/50 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 transition-all"
                />
              </div>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setShowProductModal(true);
                }}
                className="w-full md:w-auto px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-500/30 transition-all"
              >
                <Plus size={20} /> Nuevo Producto
              </button>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-slate-500 dark:text-gray-500 text-sm border-b border-gray-200 dark:border-white/10">
                      <th className="py-3 px-4 font-medium w-20">Imagen</th>
                      <th className="py-3 px-4 font-medium">Nombre</th>
                      <th className="py-3 px-4 font-medium">Categoría</th>
                      <th className="py-3 px-4 font-medium text-right">Precio</th>
                      <th className="py-3 px-4 font-medium text-center">Stock</th>
                      <th className="py-3 px-4 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(product => (
                      <tr key={product.id} className="border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-white/5 overflow-hidden border border-gray-200 dark:border-white/10">
                            {product.image ? (
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex items-center justify-center w-full h-full text-slate-400">
                                <Package size={20} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900 dark:text-white">{product.name}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-white/5 text-xs text-slate-600 dark:text-gray-300">
                            {product.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white">
                          {currency.symbol}{product.price.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${product.stock <= 0 ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                            product.stock < lowStockThreshold ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                              'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                            }`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setShowProductModal(true);
                              }}
                              className="p-2 rounded-lg hover:bg-purple-50 text-slate-400 hover:text-purple-600 dark:hover:bg-purple-500/20 dark:hover:text-purple-400 transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => onDeleteProduct(product.id)}
                              className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-gray-600">
                          No se encontraron productos en el inventario.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        ) : activeTab === 'reports' && (
          <ReportsDashboard />
        )}
      </div>

      {/* Product Modal (Add/Edit) */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4">
          <GlassCard className="w-full max-w-lg p-6 bg-white dark:bg-[#1a1a1a]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-gray-300">Nombre del Producto</label>
                  <input
                    autoFocus
                    required
                    type="text"
                    value={productForm.name}
                    onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-colors text-slate-900 dark:text-white"
                    placeholder="Ej. Zapato Deportivo Nike"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-gray-300">Precio</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={productForm.price}
                    onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-colors text-slate-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-gray-300">Descuento (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={productForm.discount}
                    onChange={e => setProductForm({ ...productForm, discount: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-colors text-slate-900 dark:text-white"
                    placeholder="0"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-gray-300">Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.stock}
                    onChange={e => setProductForm({ ...productForm, stock: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-colors text-slate-900 dark:text-white"
                    placeholder="0"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-gray-300">Categoría</label>
                  <div className="relative">
                    <input
                      list="category-suggestions"
                      type="text"
                      value={productForm.category}
                      onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-colors text-slate-900 dark:text-white"
                      placeholder="Seleccionar o escribir..."
                    />
                    <datalist id="category-suggestions">
                      <option value="Hombre" />
                      <option value="Mujer" />
                      <option value="Niños" />
                      <option value="Rebajas" />
                      <option value="Promociones" />
                    </datalist>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-gray-300">Imagen Principal (Portada)</label>
                  <input
                    type="url"
                    value={productForm.image}
                    onChange={e => setProductForm({ ...productForm, image: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-colors text-slate-900 dark:text-white"
                    placeholder="https://..."
                  />
                </div>

                <div className="col-span-2 space-y-3 pt-2 border-t border-gray-100 dark:border-white/5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">Galería de Imágenes (Máx 5)</label>
                  {[0, 1, 2, 3, 4].map((index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <span className="text-xs text-gray-400 w-4">{index + 1}.</span>
                      <input
                        type="url"
                        value={productForm.images[index] || ''}
                        onChange={e => {
                          const newImages = [...productForm.images];
                          newImages[index] = e.target.value;
                          setProductForm({ ...productForm, images: newImages });
                        }}
                        className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 outline-none focus:border-purple-500 transition-colors text-slate-900 dark:text-white text-sm"
                        placeholder={`URL Imagen Adicional ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-bold mt-6 hover:opacity-90 transition-opacity flex justify-center gap-2"
              >
                <Save size={20} /> Guardar Producto
              </button>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Floating Bulk Action Bar (only visible in overview tab) */}
      {activeTab === 'overview' && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <GlassCard className="flex items-center gap-6 px-6 py-3 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-2xl border-white/20 shadow-2xl rounded-full">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                {selectedIds.size}
              </div>
              <span className="text-sm font-medium text-slate-900 dark:text-white">Seleccionados</span>
            </div>
            <div className="h-6 w-px bg-gray-200 dark:bg-white/10" />

            <button
              onClick={() => setShowBulkEditModal(true)}
              className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 text-sm font-medium transition-colors"
            >
              <Edit2 size={16} />
              Editar
            </button>

            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium transition-colors"
            >
              <Trash2 size={16} />
              Borrar
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-slate-500 transition-colors"
            >
              <X size={16} />
            </button>
          </GlassCard>
        </div>
      )}

      {/* View Items Modal */}
      {viewingItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <GlassCard className="w-full max-w-2xl p-6 bg-white dark:bg-[#1a1a1a] flex flex-col max-h-[80vh] shadow-2xl">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-white/10">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="text-purple-500" /> Ítems de la Transacción
              </h3>
              <button
                onClick={() => setViewingItems(null)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-500 dark:text-gray-500 text-sm border-b border-gray-100 dark:border-white/5">
                    <th className="pb-3 pl-2 font-medium">Producto</th>
                    <th className="pb-3 font-medium text-center">Cant.</th>
                    <th className="pb-3 font-medium text-right">Precio</th>
                    <th className="pb-3 pr-2 font-medium text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 overflow-hidden flex-shrink-0 border border-gray-200 dark:border-white/10">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{item.name}</p>
                            <p className="text-xs text-slate-500 dark:text-gray-400">{item.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-center text-sm text-slate-700 dark:text-gray-300 font-mono">{item.quantity}</td>
                      <td className="py-3 text-right text-sm text-slate-700 dark:text-gray-300 font-mono">{currency.symbol}{item.price.toFixed(2)}</td>
                      <td className="py-3 pr-2 text-right text-sm font-semibold text-slate-900 dark:text-white font-mono">{currency.symbol}{(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 dark:border-white/10">
                    <td colSpan={3} className="pt-4 text-right font-medium text-slate-500 dark:text-gray-400">Monto Total</td>
                    <td className="pt-4 pr-2 text-right font-bold text-lg text-slate-900 dark:text-white font-mono">
                      {currency.symbol}{viewingItems.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingItems(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-medium hover:opacity-90 transition-opacity"
              >
                Cerrar
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <GlassCard className="w-full max-w-md p-8 bg-white dark:bg-[#1a1a1a]">
            <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Edición Masiva</h3>
            <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">Editando {selectedIds.size} transacciones. Deja los campos vacíos para no cambiar.</p>

            <div className="space-y-4">
              {/* Category Selection */}
              <div>
                <label className="block text-sm text-slate-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                  <Tag size={14} /> Nueva Categoría
                </label>
                <div className="relative">
                  <select
                    value={bulkEditValues.category}
                    onChange={(e) => setBulkEditValues({ ...bulkEditValues, category: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-purple-500 outline-none appearance-none"
                  >
                    <option value="">(Sin Cambio)</option>
                    {bulkEditCategoryOptions.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-sm text-slate-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                  <Calendar size={14} /> Nueva Fecha
                </label>
                <input
                  type="date"
                  value={bulkEditValues.date}
                  onChange={(e) => setBulkEditValues({ ...bulkEditValues, date: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <button
                onClick={() => setShowBulkEditModal(false)}
                className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkEdit}
                className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
              >
                Aplicar Cambios
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Role Management Modal (Existing code...) */}
      {showRolesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4">
          <GlassCard className="w-full max-w-4xl p-0 overflow-hidden flex flex-col md:flex-row h-[600px] bg-white dark:bg-[#1a1a1a]">
            {/* Sidebar List */}
            <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-white/10 flex flex-col bg-gray-50/50 dark:bg-black/20">
              <div className="p-6 border-b border-gray-200 dark:border-white/10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users size={20} className="text-purple-600" /> Roles
                </h3>
                <p className="text-xs text-slate-500 mt-1">Selecciona un rol para editar</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {roles.map(role => (
                  <div
                    key={role.id}
                    onClick={() => {
                      setSelectedRole(role);
                      setIsEditingRole(false);
                    }}
                    className={`p-4 rounded-xl cursor-pointer border transition-all ${selectedRole?.id === role.id
                      ? 'bg-purple-100 dark:bg-purple-500/20 border-purple-200 dark:border-purple-500/30'
                      : 'bg-white dark:bg-white/5 border-transparent hover:bg-gray-100 dark:hover:bg-white/10'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-semibold ${selectedRole?.id === role.id ? 'text-purple-700 dark:text-purple-300' : 'text-slate-700 dark:text-white'}`}>
                        {role.name}
                      </span>
                      <span className="text-xs bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded-full text-slate-500 dark:text-gray-400">
                        {role.permissions.length} perms
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-gray-400 line-clamp-2">{role.description}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-white/10">
                <button
                  onClick={handleAddNewRole}
                  className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-medium hover:bg-slate-800 dark:hover:bg-gray-200 transition-colors flex justify-center items-center gap-2"
                >
                  <Plus size={18} /> Nuevo Rol
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-white dark:bg-[#1a1a1a]">
                <div>
                  {selectedRole && isEditingRole ? (
                    <div className="space-y-2 animate-in fade-in duration-300">
                      <input
                        type="text"
                        value={tempRoleName}
                        onChange={e => setTempRoleName(e.target.value)}
                        className="text-2xl font-bold bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-purple-500 outline-none w-full text-slate-900 dark:text-white"
                        placeholder="Nombre del Rol"
                      />
                      <input
                        type="text"
                        value={tempRoleDesc}
                        onChange={e => setTempRoleDesc(e.target.value)}
                        className="text-sm bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-purple-500 outline-none w-full text-slate-500 dark:text-gray-400"
                        placeholder="Descripción corta"
                      />
                    </div>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {selectedRole?.name || "Selecciona Rol"}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-gray-400">{selectedRole?.description}</p>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  {selectedRole && (
                    isEditingRole ? (
                      <button
                        onClick={saveRoleDetails}
                        className="p-2 rounded-lg bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors"
                        title="Guardar Nombre"
                      >
                        <Save size={20} />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={startEditingRole}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                          title="Editar Nombre"
                        >
                          <Edit2 size={20} />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(selectedRole.id)}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          title="Eliminar Rol"
                        >
                          <Trash2 size={20} />
                        </button>
                      </>
                    )
                  )}
                  <button onClick={() => setShowRolesModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>
              </div>

              {selectedRole ? (
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white dark:bg-[#1a1a1a]">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-4">Permisos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ALL_PERMISSIONS.map(perm => {
                      const hasPermission = selectedRole.permissions.includes(perm.id);
                      return (
                        <div
                          key={perm.id}
                          onClick={() => togglePermission(perm.id)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-4 group ${hasPermission
                            ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20'
                            : 'bg-gray-50 dark:bg-white/5 border-transparent opacity-60 hover:opacity-100'
                            }`}
                        >
                          <div className={`mt-1 ${hasPermission ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-gray-500'}`}>
                            {hasPermission ? <CheckSquare size={20} /> : <Square size={20} />}
                          </div>
                          <div>
                            <h5 className={`font-semibold ${hasPermission ? 'text-purple-900 dark:text-purple-100' : 'text-slate-700 dark:text-gray-300'}`}>
                              {perm.label}
                            </h5>
                            <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">{perm.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-gray-600">
                  <Shield size={48} className="mb-4 opacity-20" />
                  <p>Selecciona un rol para configurar permisos.</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Settings Modal (Existing code...) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4">
          <GlassCard className="w-full max-w-lg p-8 bg-white dark:bg-[#1a1a1a] max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Configuración</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-white/10 pb-1 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSettingsTab('income')}
                className={`pb-3 px-2 text-sm font-medium transition-colors relative whitespace-nowrap ${settingsTab === 'income' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-gray-400'}`}
              >
                Categorías Ingreso
                {settingsTab === 'income' && <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-purple-600 dark:bg-purple-400" />}
              </button>
              <button
                onClick={() => setSettingsTab('expense')}
                className={`pb-3 px-2 text-sm font-medium transition-colors relative whitespace-nowrap ${settingsTab === 'expense' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-gray-400'}`}
              >
                Categorías Egreso
                {settingsTab === 'expense' && <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-purple-600 dark:bg-purple-400" />}
              </button>
              <button
                onClick={() => setSettingsTab('tax')}
                className={`pb-3 px-2 text-sm font-medium transition-colors relative whitespace-nowrap ${settingsTab === 'tax' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-gray-400'}`}
              >
                Impuestos
                {settingsTab === 'tax' && <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-purple-600 dark:bg-purple-400" />}
              </button>
              <button
                onClick={() => setSettingsTab('inventory')}
                className={`pb-3 px-2 text-sm font-medium transition-colors relative whitespace-nowrap ${settingsTab === 'inventory' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-gray-400'}`}
              >
                Inventario
                {settingsTab === 'inventory' && <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-purple-600 dark:bg-purple-400" />}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-6 custom-scrollbar pr-2">
              {settingsTab === 'tax' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Tasa de Impuesto (%)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={taxRate}
                        onChange={(e) => onUpdateTaxRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-purple-500 outline-none"
                      />
                      <Percent size={20} className="text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">
                      Esta tasa se aplicará a todas las ventas nuevas procesadas en el POS.
                    </p>
                  </div>
                </div>
              ) : settingsTab === 'inventory' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Umbral de Stock Bajo</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={lowStockThreshold}
                        onChange={(e) => onUpdateLowStockThreshold(parseInt(e.target.value) || 0)}
                        className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-purple-500 outline-none"
                      />
                      <Box size={20} className="text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">
                      Los productos por debajo de esta cantidad activarán alertas visuales y notificaciones.
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Correo de Alertas</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="email"
                        value={adminEmail}
                        onChange={(e) => onUpdateAdminEmail(e.target.value)}
                        className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-purple-500 outline-none"
                        placeholder="admin@ejemplo.com"
                      />
                      <Mail size={20} className="text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-2">
                      Se enviarán notificaciones a este correo cuando el stock caiga por debajo del umbral.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={categories[settingsTab].length > 0 && selectedCategories.size === categories[settingsTab].length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCategories(new Set(categories[settingsTab].map((_, i) => i)));
                          } else {
                            setSelectedCategories(new Set());
                          }
                        }}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                      />
                      <span className="text-sm text-slate-500 dark:text-gray-400">Seleccionar Todo</span>
                    </div>
                    {selectedCategories.size > 0 && (
                      <button
                        onClick={handleBulkDeleteCategories}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
                      >
                        <Trash2 size={14} /> Borrar ({selectedCategories.size})
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {categories[settingsTab].map((cat, index) => (
                      <div key={index} className={`flex items-center justify-between p-3 rounded-xl border group transition-colors ${selectedCategories.has(index) ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5'}`}>
                        <div className="flex items-center gap-3 w-full">
                          <input
                            type="checkbox"
                            checked={selectedCategories.has(index)}
                            onChange={() => {
                              const newSet = new Set(selectedCategories);
                              if (newSet.has(index)) newSet.delete(index);
                              else newSet.add(index);
                              setSelectedCategories(newSet);
                            }}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                          />
                          <div className="flex-1">
                            {editingCategory && editingCategory.index === index ? (
                              <input
                                type="text"
                                autoFocus
                                value={editingCategory.value}
                                onChange={(e) => setEditingCategory({ ...editingCategory, value: e.target.value })}
                                className="bg-transparent text-slate-900 dark:text-white outline-none w-full"
                              />
                            ) : (
                              <span className="text-slate-700 dark:text-gray-300 font-medium">{cat}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {editingCategory && editingCategory.index === index ? (
                            <button onClick={saveEditedCategory} className="p-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20">
                              <Check size={14} />
                            </button>
                          ) : (
                            <button onClick={() => startEditingCategory(index, cat)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                              <Edit2 size={14} />
                            </button>
                          )}
                          <button onClick={() => handleDeleteCategory(index)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {settingsTab !== 'tax' && settingsTab !== 'inventory' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={`Nueva categoría de ${settingsTab === 'income' ? 'Ingreso' : 'Egreso'}...`}
                  className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-purple-500 outline-none"
                />
                <button
                  onClick={handleAddCategory}
                  className="bg-slate-900 dark:bg-white text-white dark:text-black p-3 rounded-xl hover:bg-slate-800 dark:hover:bg-gray-200 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4">
          <GlassCard className="w-full max-w-md p-8 bg-white dark:bg-[#1a1a1a]">
            <h3 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Registrar Egreso</h3>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-500 dark:text-gray-400 mb-1">Descripción</label>
                <input
                  type="text"
                  required
                  value={newExpense.desc}
                  onChange={e => setNewExpense({ ...newExpense, desc: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-purple-500 outline-none"
                  placeholder="ej., Suministros de Oficina"
                />
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-sm text-slate-500 dark:text-gray-400 mb-1">Categoría</label>
                <div className="relative">
                  <select
                    value={newExpense.category}
                    onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-purple-500 outline-none appearance-none"
                  >
                    {categories.expense.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-500 dark:text-gray-400 mb-1">Monto ({currency.symbol})</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={newExpense.amount}
                  onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-purple-500 outline-none"
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
                >
                  Guardar Egreso
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Add Income Modal */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4">
          <GlassCard className="w-full max-w-md p-8 bg-white dark:bg-[#1a1a1a]">
            <h3 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Registrar Ingreso</h3>
            <form onSubmit={handleAddIncome} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-500 dark:text-gray-400 mb-1">Descripción</label>
                <input
                  type="text"
                  required
                  value={newIncome.desc}
                  onChange={e => setNewIncome({ ...newIncome, desc: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-purple-500 outline-none"
                  placeholder="ej., Servicio de Consultoría"
                />
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-sm text-slate-500 dark:text-gray-400 mb-1">Categoría</label>
                <div className="relative">
                  <select
                    value={newIncome.category}
                    onChange={e => setNewIncome({ ...newIncome, category: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-purple-500 outline-none appearance-none"
                  >
                    {categories.income.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-500 dark:text-gray-400 mb-1">Monto ({currency.symbol})</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={newIncome.amount}
                  onChange={e => setNewIncome({ ...newIncome, amount: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-purple-500 outline-none"
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowIncomeModal(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-medium transition-colors"
                >
                  Guardar Ingreso
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4">
          <GlassCard className="w-full max-w-md p-8 bg-white dark:bg-[#1a1a1a]">
            <h3 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Editar Transacción</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-500 dark:text-gray-400 mb-1">Descripción</label>
                <input
                  type="text"
                  required
                  value={editingTransaction.description}
                  onChange={e => setEditingTransaction({ ...editingTransaction, description: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-500 dark:text-gray-400 mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  value={editingTransaction.date.split('T')[0]}
                  onChange={e => {
                    // Prevent crash if date input is cleared
                    if (e.target.value) {
                      setEditingTransaction({ ...editingTransaction, date: new Date(e.target.value).toISOString() })
                    }
                  }}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-purple-500 outline-none"
                />
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-sm text-slate-500 dark:text-gray-400 mb-1">Categoría</label>
                <div className="relative">
                  <select
                    value={editingTransaction.category || ''}
                    onChange={e => setEditingTransaction({ ...editingTransaction, category: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-purple-500 outline-none appearance-none"
                  >
                    {(editingTransaction.type === TransactionType.INCOME ? categories.income : categories.expense).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-500 dark:text-gray-400 mb-1">Monto ({currency.symbol})</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={editingTransaction.amount}
                  onChange={e => setEditingTransaction({ ...editingTransaction, amount: parseFloat(e.target.value) })}
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white focus:border-purple-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('¿Eliminar esta transacción permanentemente?')) {
                      onDeleteTransaction(editingTransaction.id);
                      setEditingTransaction(null);
                    }
                  }}
                  className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                  title="Eliminar Transacción"
                >
                  <Trash2 size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors flex justify-center items-center gap-2"
                >
                  <Save size={18} /> Guardar
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <GlassCard className="w-full max-w-sm p-6 bg-white dark:bg-[#1a1a1a]">
            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Cerrar Sesión</h3>
            <p className="text-slate-600 dark:text-gray-300 mb-6">¿Estás seguro de que deseas salir del sistema?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-800 text-slate-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={onLogout}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
              >
                Salir
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};