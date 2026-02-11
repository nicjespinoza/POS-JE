'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    LayoutDashboard,
    Box,
    PieChart,
    TrendingUp,
    TrendingDown,
    DollarSign,
    CreditCard,
    Users,
    Settings,
    Search,
    Plus,
    Trash2,
    Edit2,
    X,
    CheckSquare,
    Square,
    Shield,
    Save,
    Package,
    ShoppingBag,
    ChevronDown,
    BarChart,
    Wallet,
    Calendar,
    Tag,
    ArrowUp,
    ArrowDown,
    Percent,
    Sparkles
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer
} from 'recharts';
import { GlassCard } from '../ui/GlassCard';
import { FinancialOverview } from './FinancialOverview';
import { ReportsDashboard } from './ReportsDashboard';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../providers/DataProvider';
import { analyzeBusinessData } from '../../services/geminiService';
import { ALL_PERMISSIONS } from '../../lib/constants';
import { Transaction, Product, Role, TransactionType, UserProfile, RoleDefinition, Permission } from '../../lib/types';
import { doc, updateDoc, deleteDoc, addDoc, collection, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { InventoryItem, InventoryMovement, MovementType, Branch } from '../../lib/types';
import { getInventoryByBranch, getInventoryMovements, createInventorySummary } from '../../services/inventoryService';
import { VirtualTable, Column } from '../ui/VirtualTable';

// Helper for sorting
type SortKey = 'date' | 'amount' | 'category' | 'description' | 'type';
type SortDirection = 'asc' | 'desc';

export const AdminDashboard: React.FC = () => {
    const { userProfile, isAdmin, isManager } = useAuth();
    const { transactions, products, categories, roles, loadingData, currency, lowStockThreshold, taxRate, updateTaxRate, updateLowStockThreshold } = useData();

    const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'reports' | 'kardex'>('overview');

    // UI State for Modals
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showRolesModal, setShowRolesModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);

    // Inventory State
    const [productSearch, setProductSearch] = useState('');
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
    const [allMovements, setAllMovements] = useState<InventoryMovement[]>([]);
    const [inventoryLoading, setInventoryLoading] = useState(true);
    const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
    const [kardexProductFilter, setKardexProductFilter] = useState<string>('all');
    const [kardexTypeFilter, setKardexTypeFilter] = useState<string>('all');

    const BRANCHES: Branch[] = [
        { id: 'suc-1', name: 'Sucursal Centro', isActive: true },
        { id: 'suc-2', name: 'Sucursal Norte', isActive: true },
        { id: 'suc-3', name: 'Sucursal Sur', isActive: true },
    ];

    // Roles State
    const [selectedRole, setSelectedRole] = useState<RoleDefinition | null>(null);
    const [isEditingRole, setIsEditingRole] = useState(false);
    const [tempRoleName, setTempRoleName] = useState('');
    const [tempRoleDesc, setTempRoleDesc] = useState('');

    // Settings State
    const [settingsTab, setSettingsTab] = useState<'income' | 'expense' | 'tax' | 'inventory'>('income');

    // Transaction Filtering & Sorting
    const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('week');
    const [overviewSearch, setOverviewSearch] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'date', direction: 'desc' });

    // Selection for Bulk Actions
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isAllSelected, setIsAllSelected] = useState(false);
    const [showBulkEditModal, setShowBulkEditModal] = useState(false);
    const [bulkEditValues, setBulkEditValues] = useState({ category: '', date: '' });

    // Viewing Items State
    const [viewingItems, setViewingItems] = useState<any[] | null>(null);

    // Gemini AI State
    const [aiInsight, setAiInsight] = useState<string>('');
    const [analyzing, setAnalyzing] = useState(false);

    // Product Form State
    const [productForm, setProductForm] = useState({
        name: '',
        price: '',
        cost: '',
        stock: '',
        category: '',
        image: '',
        brand: '',
        sku: '',
        color: '',
        description: '',
        discount: '',
    });
    const [productImages, setProductImages] = useState<string[]>([]);
    const [mainImageIndex, setMainImageIndex] = useState(0);
    const [newImageUrl, setNewImageUrl] = useState('');

    useEffect(() => {
        if (editingProduct) {
            setProductForm({
                name: editingProduct.name,
                price: editingProduct.price.toString(),
                cost: (editingProduct.cost || '').toString(),
                stock: editingProduct.stock.toString(),
                category: editingProduct.category,
                image: editingProduct.image || '',
                brand: editingProduct.brand || '',
                sku: editingProduct.sku || '',
                color: editingProduct.color || '',
                description: editingProduct.description || '',
                discount: (editingProduct.discount || '').toString(),
            });
            setProductImages(editingProduct.images || (editingProduct.image ? [editingProduct.image] : []));
            setMainImageIndex(editingProduct.mainImageIndex || 0);
        } else {
            setProductForm({ name: '', price: '', cost: '', stock: '', category: '', image: '', brand: '', sku: '', color: '', description: '', discount: '' });
            setProductImages([]);
            setMainImageIndex(0);
        }
        setNewImageUrl('');
    }, [editingProduct]);

    // Load Inventory Data (Admin sees all branches)
    useEffect(() => {
        const unsubInv = getInventoryByBranch('all', (items) => {
            setAllInventory(items);
            setInventoryLoading(false);
        });
        const unsubMov = getInventoryMovements('all', 200, (items) => {
            setAllMovements(items);
        });
        return () => { unsubInv(); unsubMov(); };
    }, []);

    // Inventory summary per branch
    const inventorySummary = useMemo(() => {
        return createInventorySummary(products, allInventory, BRANCHES);
    }, [products, allInventory]);

    const filteredInventorySummary = useMemo(() => {
        return inventorySummary.filter(item =>
            item.productName.toLowerCase().includes(productSearch.toLowerCase()) ||
            item.category.toLowerCase().includes(productSearch.toLowerCase())
        );
    }, [inventorySummary, productSearch]);

    const filteredKardexMovements = useMemo(() => {
        let filtered = allMovements;
        if (selectedBranchFilter !== 'all') {
            filtered = filtered.filter(m => m.branchId === selectedBranchFilter);
        }
        if (kardexProductFilter !== 'all') {
            filtered = filtered.filter(m => m.productId === kardexProductFilter);
        }
        if (kardexTypeFilter !== 'all') {
            filtered = filtered.filter(m => m.type === kardexTypeFilter);
        }
        return filtered;
    }, [allMovements, selectedBranchFilter, kardexProductFilter, kardexTypeFilter]);

    // Role Editing Effects
    useEffect(() => {
        if (selectedRole) {
            setTempRoleName(selectedRole.name);
            setTempRoleDesc(selectedRole.description || '');
        }
    }, [selectedRole]);

    // -- Helpers & Handlers --

    const getDateRangeFilter = () => {
        const now = new Date();
        const start = new Date();
        switch (timeRange) {
            case 'day': start.setHours(0, 0, 0, 0); break;
            case 'week': start.setDate(now.getDate() - 7); break;
            case 'month': start.setMonth(now.getMonth() - 1); break;
            case 'year': start.setFullYear(now.getFullYear() - 1); break;
            case 'all': return null;
        }
        return start;
    };

    const startDate = getDateRangeFilter();

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch = t.description.toLowerCase().includes(overviewSearch.toLowerCase()) ||
                t.category?.toLowerCase().includes(overviewSearch.toLowerCase()) ||
                t.branchId?.toLowerCase().includes(overviewSearch.toLowerCase());
            const matchesDate = !startDate || new Date(t.date) >= startDate;

            // Branch filtering already handled by DataProvider query, but double check
            const matchesBranch = userProfile?.role === 'ADMIN' || !userProfile?.branchId || t.branchId === userProfile.branchId;

            return matchesSearch && matchesDate && matchesBranch;
        });
    }, [transactions, overviewSearch, startDate, userProfile]);

    const sortedTransactions = useMemo(() => {
        const sorted = [...filteredTransactions].sort((a, b) => {
            let aVal: any = a[sortConfig.key];
            let bVal: any = b[sortConfig.key];

            if (sortConfig.key === 'date') {
                aVal = new Date(a.date).getTime();
                bVal = new Date(b.date).getTime();
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [filteredTransactions, sortConfig]);

    // Financial Metrics
    const income = filteredTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);
    const expense = filteredTransactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + t.amount, 0);
    const profit = income - expense;

    // Charts Data
    const chartData = useMemo(() => {
        // ... (Logic to aggregate by day)
        const dailyData: Record<string, { name: string; income: number; expense: number }> = {};

        // Populate all days in range if small range, else sparse
        // Simplified for this port:
        filteredTransactions.forEach(t => {
            const dateStr = t.date.split('T')[0];
            if (!dailyData[dateStr]) {
                dailyData[dateStr] = { name: dateStr, income: 0, expense: 0 };
            }
            if (t.type === TransactionType.INCOME) dailyData[dateStr].income += t.amount;
            else dailyData[dateStr].expense += t.amount;
        });

        return Object.values(dailyData).sort((a, b) => a.name.localeCompare(b.name)).slice(-14); // Last 14 days active
    }, [filteredTransactions]);


    // Bulk selection logic
    useEffect(() => {
        if (selectedIds.size === sortedTransactions.length && sortedTransactions.length > 0) {
            setIsAllSelected(true);
        } else {
            setIsAllSelected(false);
        }
    }, [selectedIds, sortedTransactions]);

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set());
        } else {
            // Select displayed only
            const toSelect = sortedTransactions.slice(0, 50).map(t => t.id); // Limit to top 50 for safety
            setSelectedIds(new Set(toSelect));
        }
    };

    const handleSelectOne = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    // Sorting
    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    // Bulk Actions
    const handleBulkDelete = async () => {
        if (!window.confirm(`¿Estás seguro de eliminar ${selectedIds.size} transacciones?`)) return;
        try {
            const ids = Array.from(selectedIds);
            for (let i = 0; i < ids.length; i += 500) {
                const chunk = ids.slice(i, i + 500);
                const batch = writeBatch(db);
                chunk.forEach(id => batch.delete(doc(db, 'transactions', id)));
                await batch.commit();
            }
            setSelectedIds(new Set());
        } catch (e) {
            console.error("Bulk delete failed", e);
        }
    };

    const handleBulkEdit = async () => {
        try {
            const updates: any = {};
            if (bulkEditValues.category) updates.category = bulkEditValues.category;
            if (bulkEditValues.date) updates.date = new Date(bulkEditValues.date).toISOString();

            if (Object.keys(updates).length === 0) return;

            const ids = Array.from(selectedIds);
            for (let i = 0; i < ids.length; i += 500) {
                const chunk = ids.slice(i, i + 500);
                const batch = writeBatch(db);
                chunk.forEach(id => batch.update(doc(db, 'transactions', id), updates));
                await batch.commit();
            }
            setShowBulkEditModal(false);
            setSelectedIds(new Set());
            setBulkEditValues({ category: '', date: '' });
        } catch (e) {
            console.error("Bulk edit failed", e);
        }
    };

    // Gemini
    const handleGeminiAnalysis = async () => {
        setAnalyzing(true);
        // Take top 50 transactions for context
        const contextData = filteredTransactions.slice(0, 50);
        const insight = await analyzeBusinessData(contextData);
        setAiInsight(insight);
        setAnalyzing(false);
    };

    // Product Management
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(productSearch.toLowerCase())
    );

    const handleAddImage = () => {
        if (!newImageUrl.trim() || productImages.length >= 10) return;
        setProductImages(prev => [...prev, newImageUrl.trim()]);
        setNewImageUrl('');
    };

    const handleRemoveImage = (index: number) => {
        setProductImages(prev => prev.filter((_, i) => i !== index));
        if (mainImageIndex >= productImages.length - 1) setMainImageIndex(Math.max(0, productImages.length - 2));
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        const mainImg = productImages.length > 0 ? productImages[mainImageIndex] || productImages[0] : productForm.image;
        const productData = {
            name: productForm.name,
            price: parseFloat(productForm.price),
            cost: productForm.cost ? parseFloat(productForm.cost) : undefined,
            stock: parseInt(productForm.stock),
            category: productForm.category || 'General',
            image: mainImg || '',
            images: productImages,
            mainImageIndex: mainImageIndex,
            brand: productForm.brand || undefined,
            sku: productForm.sku || undefined,
            color: productForm.color || undefined,
            description: productForm.description || undefined,
            discount: productForm.discount ? parseFloat(productForm.discount) : 0,
            updatedAt: new Date().toISOString()
        };

        try {
            if (editingProduct) {
                await updateDoc(doc(db, 'products', editingProduct.id), productData);
            } else {
                const newId = productForm.sku?.toLowerCase().replace(/\s+/g, '-') || crypto.randomUUID();
                await setDoc(doc(db, 'products', newId), {
                    ...productData,
                    id: newId,
                    createdAt: new Date().toISOString()
                });
            }
            setShowProductModal(false);
            setEditingProduct(null);
        } catch (error) {
            console.error("Error saving product:", error);
        }
    };

    const onDeleteProduct = async (id: string) => {
        if (window.confirm('¿Eliminar producto?')) {
            await deleteDoc(doc(db, 'products', id));
        }
    };

    // Roles Management
    const handleAddNewRole = async () => {
        const newRole = {
            name: 'Nuevo Rol',
            permissions: [],
            description: 'Rol recién creado'
        };
        const ref = await addDoc(collection(db, 'roles'), newRole);
        // Select it
        // (Real-time listener will update list)
    };

    const togglePermission = async (permId: string) => {
        if (!selectedRole) return;
        const permission = permId as Permission;
        const newPerms = selectedRole.permissions.includes(permission)
            ? selectedRole.permissions.filter(p => p !== permission)
            : [...selectedRole.permissions, permission];

        await updateDoc(doc(db, 'roles', selectedRole.id), { permissions: newPerms });
        setSelectedRole({ ...selectedRole, permissions: newPerms });
    };

    const saveRoleDetails = async () => {
        if (!selectedRole) return;
        await updateDoc(doc(db, 'roles', selectedRole.id), {
            name: tempRoleName,
            description: tempRoleDesc
        });
        setSelectedRole({ ...selectedRole, name: tempRoleName, description: tempRoleDesc });
        setIsEditingRole(false);
    };

    const startEditingRole = () => {
        setIsEditingRole(true);
    };

    const handleDeleteRole = async (id: string) => {
        if (window.confirm('¿Eliminar este rol?')) {
            await deleteDoc(doc(db, 'roles', id));
            setSelectedRole(null);
        }
    };

    // Sort Icon Helper
    const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
        if (sortConfig.key !== columnKey) return <ArrowUp size={14} className="text-slate-300 opacity-0 group-hover:opacity-50" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="text-purple-500" />
            : <ArrowDown size={14} className="text-purple-500" />;
    };

    if (loadingData) {
        return <div className="p-8 text-center text-slate-500">Cargando panel...</div>;
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-8 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                        Panel de Control
                    </h1>
                    <p className="text-slate-500 dark:text-gray-400 mt-1">
                        Bienvenido, {userProfile?.displayName || 'Usuario'} | {userProfile?.role}
                    </p>
                </div>

                <div className="flex gap-3">
                    {/* Settings Button (Manager+) */}
                    {isManager && (
                        <button
                            onClick={() => setShowSettingsModal(true)}
                            className="p-3 rounded-full bg-white dark:bg-white/5 shadow-sm hover:shadow-md transition-all text-slate-600 dark:text-gray-300"
                        >
                            <Settings size={20} />
                        </button>
                    )}

                    {/* Role Manager (Admin Only) */}
                    {isAdmin && (
                        <button
                            onClick={() => setShowRolesModal(true)}
                            className="p-3 rounded-full bg-white dark:bg-white/5 shadow-sm hover:shadow-md transition-all text-slate-600 dark:text-gray-300"
                            title="Gestionar Roles"
                        >
                            <Users size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <GlassCard className="sticky top-4 z-30 p-1 flex overflow-x-auto no-scrollbar max-w-full">
                <div className="flex bg-gray-100 dark:bg-white/10 rounded-full p-1 gap-1 w-full md:w-auto">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 md:flex-none px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'overview' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white'}`}
                    >
                        <LayoutDashboard size={16} /> Panel General
                    </button>
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`flex-1 md:flex-none px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'inventory' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white'}`}
                    >
                        <Box size={16} /> Inventario
                    </button>
                    <button
                        onClick={() => setActiveTab('kardex')}
                        className={`flex-1 md:flex-none px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'kardex' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white'}`}
                    >
                        <Calendar size={16} /> Kardex
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`flex-1 md:flex-none px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'reports' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white'}`}
                    >
                        <PieChart size={16} /> Reportes
                    </button>
                </div>
            </GlassCard>

            <div className="min-h-[500px]">
                {activeTab === 'overview' ? (
                    <>
                        <FinancialOverview
                            income={income}
                            expense={expense}
                            profit={profit}
                            currencySymbol={currency?.symbol || '$'}
                        />

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Chart */}
                            <GlassCard className="p-6 lg:col-span-2 min-h-[400px]">
                                <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                                    <BarChart size={20} className="text-purple-600 dark:text-purple-400" /> Flujo de Caja
                                </h3>
                                <div className="h-[300px] w-full">
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
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                            <RechartsTooltip contentStyle={{ borderRadius: '12px' }} />
                                            <Area type="monotone" dataKey="income" name="Ingresos" stroke="#4ade80" fill="url(#colorIncome)" />
                                            <Area type="monotone" dataKey="expense" name="Egresos" stroke="#f87171" fill="url(#colorExpense)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </GlassCard>

                            {/* Gemini AI */}
                            <GlassCard className="p-6 flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                                        <Sparkles size={20} className="text-yellow-500" /> Insights AI
                                    </h3>
                                </div>
                                <div className="flex-1 bg-white/50 dark:bg-black/20 rounded-2xl p-4 overflow-y-auto mb-4 text-sm text-slate-700 dark:text-gray-300">
                                    {analyzing ? 'Analizando...' : aiInsight || 'Haz clic para analizar tus finanzas.'}
                                </div>
                                <button
                                    onClick={handleGeminiAnalysis}
                                    disabled={analyzing}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold"
                                >
                                    Analizar
                                </button>
                            </GlassCard>

                            {/* Transactions Table (Simplified for Port) */}
                            <GlassCard className="p-6 lg:col-span-3">
                                <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Transacciones Recientes</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b dark:border-white/10 text-slate-500">
                                                <th className="py-3 px-2 w-10">
                                                    <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} />
                                                </th>
                                                <th className="py-3 px-2 cursor-pointer" onClick={() => requestSort('description')}>Descripción <SortIcon columnKey="description" /></th>
                                                <th className="py-3 px-2">Fecha</th>
                                                <th className="py-3 px-2">Tipo</th>
                                                <th className="py-3 px-2 text-right cursor-pointer" onClick={() => requestSort('amount')}>Monto <SortIcon columnKey="amount" /></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedTransactions.slice(0, 50).map(t => (
                                                <tr key={t.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                                                    <td className="py-3 px-2">
                                                        <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => handleSelectOne(t.id)} />
                                                    </td>
                                                    <td className="py-3 px-2">{t.description}</td>
                                                    <td className="py-3 px-2">{new Date(t.date).toLocaleDateString()}</td>
                                                    <td className="py-3 px-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs ${t.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {t.type === 'INCOME' ? 'Ingreso' : 'Egreso'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-2 text-right font-medium">
                                                        {currency.symbol}{t.amount.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>
                        </div>
                    </>
                ) : activeTab === 'inventory' ? (
                    <div className="space-y-6">
                        {/* Inventory Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <GlassCard className="p-4">
                                <div className="text-sm text-slate-500 dark:text-gray-400">Total Productos</div>
                                <div className="text-2xl font-bold dark:text-white">{products.length}</div>
                            </GlassCard>
                            {BRANCHES.map(branch => {
                                const branchTotal = allInventory
                                    .filter(i => i.branchId === branch.id)
                                    .reduce((sum, i) => sum + i.stock, 0);
                                return (
                                    <GlassCard key={branch.id} className="p-4">
                                        <div className="text-sm text-slate-500 dark:text-gray-400">{branch.name}</div>
                                        <div className="text-2xl font-bold dark:text-white">{branchTotal} <span className="text-sm font-normal text-gray-400">unidades</span></div>
                                    </GlassCard>
                                );
                            })}
                        </div>

                        {/* Search + Add */}
                        <GlassCard className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="relative w-full max-w-md">
                                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar producto..."
                                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border-none outline-none dark:text-white"
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 shrink-0"
                            >
                                <Plus size={18} /> Nuevo Producto
                            </button>
                        </GlassCard>

                        {/* Inventory Table with Branch Columns */}
                        <GlassCard className="p-6 overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b dark:border-white/10 text-slate-500 text-xs uppercase">
                                        <th className="py-3 px-2">Producto</th>
                                        <th className="py-3 px-2">Categoria</th>
                                        <th className="py-3 px-2 text-right">Precio</th>
                                        {BRANCHES.map(b => (
                                            <th key={b.id} className="py-3 px-2 text-center">{b.name.replace('Sucursal ', '')}</th>
                                        ))}
                                        <th className="py-3 px-2 text-center font-bold">Total</th>
                                        <th className="py-3 px-2 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInventorySummary.map(item => (
                                        <tr key={item.productId} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                                            <td className="py-3 px-2">
                                                <div className="flex items-center gap-2">
                                                    <img src={item.image} alt={item.productName} className="w-8 h-8 rounded-lg object-cover" />
                                                    <span className="font-medium dark:text-white">{item.productName}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2 text-gray-500">{item.category}</td>
                                            <td className="py-3 px-2 text-right dark:text-white">{currency.symbol}{item.price.toFixed(2)}</td>
                                            {item.stockByBranch.map(sb => (
                                                <td key={sb.branchId} className="py-3 px-2 text-center">
                                                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${sb.stock === 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                        sb.lowStock ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        }`}>
                                                        {sb.stock}
                                                    </span>
                                                </td>
                                            ))}
                                            <td className="py-3 px-2 text-center">
                                                <span className="font-bold dark:text-white">{item.totalStock}</span>
                                            </td>
                                            <td className="py-3 px-2 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={() => { const p = products.find(pr => pr.id === item.productId); if (p) { setEditingProduct(p); setShowProductModal(true); } }} className="p-1 hover:text-purple-600 dark:text-gray-400"><Edit2 size={16} /></button>
                                                    <button onClick={() => onDeleteProduct(item.productId)} className="p-1 hover:text-red-600 dark:text-gray-400"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-50 dark:bg-white/5 font-bold">
                                        <td colSpan={3} className="py-3 px-2 dark:text-white">TOTALES</td>
                                        {BRANCHES.map(branch => {
                                            const total = allInventory.filter(i => i.branchId === branch.id).reduce((s, i) => s + i.stock, 0);
                                            return <td key={branch.id} className="py-3 px-2 text-center dark:text-white">{total}</td>;
                                        })}
                                        <td className="py-3 px-2 text-center dark:text-white">{allInventory.reduce((s, i) => s + i.stock, 0)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </GlassCard>
                    </div>
                ) : activeTab === 'kardex' ? (
                    <div className="space-y-6">
                        {/* Kardex Filters */}
                        <GlassCard className="p-4">
                            <div className="flex flex-wrap gap-4 items-end">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Sucursal</label>
                                    <select
                                        value={selectedBranchFilter}
                                        onChange={e => setSelectedBranchFilter(e.target.value)}
                                        className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm dark:text-white"
                                    >
                                        <option value="all">Todas</option>
                                        {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Producto</label>
                                    <select
                                        value={kardexProductFilter}
                                        onChange={e => setKardexProductFilter(e.target.value)}
                                        className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm dark:text-white"
                                    >
                                        <option value="all">Todos</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                                    <select
                                        value={kardexTypeFilter}
                                        onChange={e => setKardexTypeFilter(e.target.value)}
                                        className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm dark:text-white"
                                    >
                                        <option value="all">Todos</option>
                                        <option value="ENTRADA">Entrada</option>
                                        <option value="SALIDA">Salida</option>
                                        <option value="TRANSFERENCIA">Transferencia</option>
                                        <option value="AJUSTE">Ajuste</option>
                                    </select>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
                                    {filteredKardexMovements.length} movimientos
                                </div>
                            </div>
                        </GlassCard>

                        {/* Kardex Table (Virtualized) */}
                        <GlassCard className="p-6">
                            <h3 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
                                <Calendar size={20} className="text-purple-500" /> Movimientos de Inventario (Kardex)
                            </h3>
                            <VirtualTable<InventoryMovement>
                                data={filteredKardexMovements}
                                rowHeight={56}
                                maxHeight={600}
                                emptyMessage="Sin movimientos para los filtros seleccionados"
                                columns={[
                                    {
                                        key: 'date', header: 'Fecha', width: '12%',
                                        render: (m) => (
                                            <div className="text-xs text-gray-500 whitespace-nowrap">
                                                {new Date(m.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: '2-digit' })}
                                                <br /><span className="text-gray-400">{new Date(m.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        )
                                    },
                                    {
                                        key: 'branch', header: 'Sucursal', width: '12%',
                                        render: (m) => (
                                            <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium text-xs">
                                                {m.branchName || m.branchId}
                                            </span>
                                        )
                                    },
                                    {
                                        key: 'type', header: 'Tipo', width: '11%',
                                        render: (m) => (
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${m.type === 'ENTRADA' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                m.type === 'SALIDA' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    m.type === 'TRANSFERENCIA' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                            }`}>{m.type}</span>
                                        )
                                    },
                                    {
                                        key: 'product', header: 'Producto', width: '16%',
                                        render: (m) => <span className="font-medium dark:text-white">{m.productName}</span>
                                    },
                                    {
                                        key: 'qty', header: 'Cantidad', width: '9%',
                                        render: (m) => (
                                            <span className={`font-bold ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {m.quantity > 0 ? '+' : ''}{m.quantity}
                                            </span>
                                        )
                                    },
                                    { key: 'prev', header: 'Anterior', width: '8%', render: (m) => <span className="text-gray-500">{m.previousStock}</span> },
                                    { key: 'new', header: 'Nuevo', width: '8%', render: (m) => <span className="font-medium dark:text-white">{m.newStock}</span> },
                                    { key: 'reason', header: 'Motivo', width: '16%', render: (m) => <span className="text-xs text-gray-500 truncate">{m.reason}</span> },
                                    { key: 'user', header: 'Usuario', width: '8%', render: (m) => <span className="text-xs text-gray-500">{m.userName || m.userId}</span> },
                                ]}
                            />
                        </GlassCard>
                    </div>
                ) : (
                    <ReportsDashboard />
                )}
            </div>

            {/* Product Modal - Multi Image Support */}
            {showProductModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <GlassCard className="w-full max-w-2xl p-6 bg-white dark:bg-[#1a1a1a] my-8">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold dark:text-white">{editingProduct ? 'Editar' : 'Nuevo'} Producto</h3>
                            <button onClick={() => setShowProductModal(false)}><X size={24} className="dark:text-white" /></button>
                        </div>
                        <form onSubmit={handleSaveProduct} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input className="w-full p-2 border rounded-lg dark:bg-white/5 dark:text-white dark:border-gray-700" placeholder="Nombre *" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} required />
                                <input className="w-full p-2 border rounded-lg dark:bg-white/5 dark:text-white dark:border-gray-700" placeholder="Marca" value={productForm.brand} onChange={e => setProductForm({ ...productForm, brand: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <input className="w-full p-2 border rounded-lg dark:bg-white/5 dark:text-white dark:border-gray-700" placeholder="Precio *" type="number" step="0.01" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} required />
                                <input className="w-full p-2 border rounded-lg dark:bg-white/5 dark:text-white dark:border-gray-700" placeholder="Costo" type="number" step="0.01" value={productForm.cost} onChange={e => setProductForm({ ...productForm, cost: e.target.value })} />
                                <input className="w-full p-2 border rounded-lg dark:bg-white/5 dark:text-white dark:border-gray-700" placeholder="Stock *" type="number" value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: e.target.value })} required />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <input className="w-full p-2 border rounded-lg dark:bg-white/5 dark:text-white dark:border-gray-700" placeholder="Categoria" value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })} />
                                <input className="w-full p-2 border rounded-lg dark:bg-white/5 dark:text-white dark:border-gray-700" placeholder="SKU" value={productForm.sku} onChange={e => setProductForm({ ...productForm, sku: e.target.value })} />
                                <input className="w-full p-2 border rounded-lg dark:bg-white/5 dark:text-white dark:border-gray-700" placeholder="Descuento %" type="number" value={productForm.discount} onChange={e => setProductForm({ ...productForm, discount: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input className="w-full p-2 border rounded-lg dark:bg-white/5 dark:text-white dark:border-gray-700" placeholder="Color" value={productForm.color} onChange={e => setProductForm({ ...productForm, color: e.target.value })} />
                                <input className="w-full p-2 border rounded-lg dark:bg-white/5 dark:text-white dark:border-gray-700" placeholder="Descripcion" value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} />
                            </div>

                            {/* Multi-Image Section */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-bold dark:text-white">Imagenes ({productImages.length}/10)</h4>
                                    <span className="text-xs text-gray-400">Click en imagen para seleccionar como principal</span>
                                </div>

                                {/* Image Grid */}
                                {productImages.length > 0 && (
                                    <div className="grid grid-cols-5 gap-2">
                                        {productImages.map((img, idx) => (
                                            <div key={idx} className={`relative group aspect-square rounded-lg overflow-hidden border-2 cursor-pointer ${idx === mainImageIndex ? 'border-purple-500 ring-2 ring-purple-300' : 'border-gray-200 dark:border-gray-700'}`} onClick={() => setMainImageIndex(idx)}>
                                                <img src={img} alt={`Img ${idx + 1}`} className="w-full h-full object-cover" />
                                                {idx === mainImageIndex && (
                                                    <div className="absolute top-1 left-1 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">Principal</div>
                                                )}
                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add Image URL */}
                                {productImages.length < 10 && (
                                    <div className="flex gap-2">
                                        <input
                                            className="flex-1 p-2 border rounded-lg dark:bg-white/5 dark:text-white dark:border-gray-700 text-sm"
                                            placeholder="URL de imagen..."
                                            value={newImageUrl}
                                            onChange={e => setNewImageUrl(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddImage(); } }}
                                        />
                                        <button type="button" onClick={handleAddImage} className="px-3 py-2 bg-gray-100 dark:bg-white/10 rounded-lg text-sm font-medium dark:text-white hover:bg-gray-200 dark:hover:bg-white/20">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors">Guardar Producto</button>
                        </form>
                    </GlassCard>
                </div>
            )}

            {/* Roles Modal (Simplified) */}
            {showRolesModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <GlassCard className="w-full max-w-lg p-6 bg-white dark:bg-[#1a1a1a]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold dark:text-white">Gestión Roles</h3>
                            <button onClick={() => setShowRolesModal(false)}><X size={24} /></button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Funcionalidad completa en desarrollo. Usa la consola de Firebase para roles avanzados.</p>
                        <ul className="space-y-2">
                            {roles.map(r => (
                                <li key={r.id} className="p-2 border rounded flex justify-between">
                                    <span>{r.name}</span>
                                    <span className="text-xs text-gray-400">{r.permissions.length} perms</span>
                                </li>
                            ))}
                        </ul>
                    </GlassCard>
                </div>
            )}

            {/* Settings Modal */}
            {showSettingsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <GlassCard className="w-full max-w-lg p-6 bg-white dark:bg-[#1a1a1a]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold dark:text-white">Configuración</h3>
                            <button onClick={() => setShowSettingsModal(false)}><X size={24} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Impuesto (%)</label>
                                <input
                                    type="number"
                                    value={taxRate}
                                    onChange={(e) => updateTaxRate(Number(e.target.value))}
                                    className="w-full p-2 border rounded dark:bg-white/5"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Alerta Stock Bajo</label>
                                <input
                                    type="number"
                                    value={lowStockThreshold}
                                    onChange={(e) => updateLowStockThreshold(Number(e.target.value))}
                                    className="w-full p-2 border rounded dark:bg-white/5"
                                />
                            </div>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};
