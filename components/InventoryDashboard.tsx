/**
 * Dashboard de Inventario Centralizado
 * Vista para el Super Admin para controlar el inventario de todas las sucursales
 */

import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from './ui/GlassCard';
import {
    Package,
    TrendingUp,
    TrendingDown,
    ArrowLeftRight,
    AlertTriangle,
    Search,
    Filter,
    RefreshCw,
    Plus,
    Minus,
    ArrowRight,
    Clock,
    MapPin,
    X,
    Check
} from 'lucide-react';
import {
    InventoryItem,
    InventoryMovement,
    InventorySummary,
    Product,
    Branch,
    MovementType
} from '../types';
import {
    getInventoryByBranch,
    getInventoryMovements,
    createInventorySummary,
    addStock,
    transferStock,
    adjustStock
} from '../services/inventoryService';
import { useAuth } from '../contexts/AuthContext';

interface InventoryDashboardProps {
    products: Product[];
    branches: Branch[];
    onClose: () => void;
}

export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({
    products,
    branches,
    onClose
}) => {
    const { userProfile } = useAuth();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [movements, setMovements] = useState<InventoryMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<'overview' | 'movements' | 'transfer'>('overview');

    // Modal states
    const [showAddStockModal, setShowAddStockModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<InventorySummary | null>(null);

    // Form states
    const [stockQuantity, setStockQuantity] = useState<number>(0);
    const [stockReason, setStockReason] = useState<string>('');
    const [transferFrom, setTransferFrom] = useState<string>('');
    const [transferTo, setTransferTo] = useState<string>('');
    const [transferQuantity, setTransferQuantity] = useState<number>(0);

    // Cargar datos de inventario
    useEffect(() => {
        const unsubInventory = getInventoryByBranch('all', (items) => {
            setInventory(items);
            setLoading(false);
        });

        const unsubMovements = getInventoryMovements('all', 100, (items) => {
            setMovements(items);
        });

        return () => {
            unsubInventory();
            unsubMovements();
        };
    }, []);

    // Resumen consolidado
    const inventorySummary = useMemo(() => {
        return createInventorySummary(products, inventory, branches);
    }, [products, inventory, branches]);

    // Filtrar por búsqueda
    const filteredSummary = useMemo(() => {
        return inventorySummary.filter(item =>
            item.productName.toLowerCase().includes(search.toLowerCase()) ||
            item.category.toLowerCase().includes(search.toLowerCase())
        );
    }, [inventorySummary, search]);

    // Estadísticas
    const stats = useMemo(() => {
        const totalProducts = products.length;
        const totalStock = inventorySummary.reduce((sum, item) => sum + item.totalStock, 0);
        const lowStockItems = inventorySummary.filter(item =>
            item.stockByBranch.some(b => b.lowStock && b.stock > 0)
        ).length;
        const outOfStock = inventorySummary.filter(item => item.totalStock === 0).length;

        return { totalProducts, totalStock, lowStockItems, outOfStock };
    }, [inventorySummary, products]);

    // Iconos de tipo de movimiento
    const getMovementIcon = (type: MovementType) => {
        switch (type) {
            case MovementType.ENTRADA: return <TrendingUp className="text-green-500" size={16} />;
            case MovementType.SALIDA: return <TrendingDown className="text-red-500" size={16} />;
            case MovementType.TRANSFERENCIA: return <ArrowLeftRight className="text-blue-500" size={16} />;
            case MovementType.AJUSTE: return <RefreshCw className="text-orange-500" size={16} />;
            case MovementType.DEVOLUCION: return <ArrowRight className="text-purple-500" size={16} />;
            default: return <Package size={16} />;
        }
    };

    // Manejar agregar stock
    const handleAddStock = async () => {
        if (!selectedProduct || stockQuantity <= 0 || !selectedBranch || selectedBranch === 'all') return;

        const branchData = branches.find(b => b.id === selectedBranch);
        const currentStock = selectedProduct.stockByBranch.find(b => b.branchId === selectedBranch)?.stock || 0;

        try {
            await addStock(
                selectedProduct.productId,
                selectedProduct.productName,
                selectedBranch,
                branchData?.name || '',
                stockQuantity,
                currentStock,
                stockReason || 'Entrada de mercancía',
                userProfile?.uid || '',
                userProfile?.displayName || ''
            );
            setShowAddStockModal(false);
            setStockQuantity(0);
            setStockReason('');
            setSelectedProduct(null);
        } catch (error) {
            console.error('Error adding stock:', error);
            alert('Error al agregar stock');
        }
    };

    // Manejar transferencia
    const handleTransfer = async () => {
        if (!selectedProduct || transferQuantity <= 0 || !transferFrom || !transferTo) return;

        const fromBranch = branches.find(b => b.id === transferFrom);
        const toBranch = branches.find(b => b.id === transferTo);
        const fromStock = selectedProduct.stockByBranch.find(b => b.branchId === transferFrom)?.stock || 0;
        const toStock = selectedProduct.stockByBranch.find(b => b.branchId === transferTo)?.stock || 0;

        try {
            await transferStock(
                selectedProduct.productId,
                selectedProduct.productName,
                transferFrom,
                fromBranch?.name || '',
                transferTo,
                toBranch?.name || '',
                transferQuantity,
                fromStock,
                toStock,
                userProfile?.uid || '',
                userProfile?.displayName || ''
            );
            setShowTransferModal(false);
            setTransferQuantity(0);
            setTransferFrom('');
            setTransferTo('');
            setSelectedProduct(null);
        } catch (error) {
            console.error('Error transferring stock:', error);
            alert('Error al transferir: ' + (error as Error).message);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <GlassCard className="w-full max-w-7xl h-[90vh] flex flex-col bg-white dark:bg-[#0a0a0a] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <Package className="text-purple-500" />
                            Control de Inventario
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                            Gestión centralizada de stock en todas las sucursales
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                        <X size={24} className="text-slate-500" />
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-4 p-6">
                    <div className="bg-purple-50 dark:bg-purple-500/10 rounded-xl p-4 border border-purple-100 dark:border-purple-500/20">
                        <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Total Productos</div>
                        <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">{stats.totalProducts}</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-4 border border-blue-100 dark:border-blue-500/20">
                        <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Stock Total</div>
                        <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.totalStock}</div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4 border border-amber-100 dark:border-amber-500/20">
                        <div className="text-sm text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                            <AlertTriangle size={14} /> Stock Bajo
                        </div>
                        <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">{stats.lowStockItems}</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-100 dark:border-red-500/20">
                        <div className="text-sm text-red-600 dark:text-red-400 font-medium">Agotados</div>
                        <div className="text-3xl font-bold text-red-700 dark:text-red-300">{stats.outOfStock}</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 px-6">
                    {(['overview', 'movements', 'transfer'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                                }`}
                        >
                            {tab === 'overview' && 'Vista General'}
                            {tab === 'movements' && 'Movimientos'}
                            {tab === 'transfer' && 'Transferencias'}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="px-6 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <RefreshCw className="animate-spin text-purple-500" size={32} />
                        </div>
                    ) : activeTab === 'overview' ? (
                        /* Vista General de Inventario */
                        <div className="space-y-3">
                            {filteredSummary.map((item) => (
                                <div
                                    key={item.productId}
                                    className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/10"
                                >
                                    <div className="flex items-center gap-4">
                                        <img
                                            src={item.image}
                                            alt={item.productName}
                                            className="w-16 h-16 rounded-lg object-cover"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white">{item.productName}</h3>
                                                    <p className="text-sm text-slate-500 dark:text-gray-400">{item.category}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                                        {item.totalStock}
                                                    </div>
                                                    <div className="text-xs text-slate-500 dark:text-gray-400">Stock Total</div>
                                                </div>
                                            </div>

                                            {/* Stock por sucursal */}
                                            <div className="flex gap-4 mt-3">
                                                {item.stockByBranch.map((branch) => (
                                                    <div
                                                        key={branch.branchId}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${branch.lowStock && branch.stock > 0
                                                                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                                                : branch.stock === 0
                                                                    ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                                                                    : 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                                                            }`}
                                                    >
                                                        <MapPin size={14} />
                                                        <span className="font-medium">{branch.branchName}:</span>
                                                        <span className="font-bold">{branch.stock}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Acciones */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedProduct(item);
                                                    setShowAddStockModal(true);
                                                }}
                                                className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                                                title="Agregar Stock"
                                            >
                                                <Plus size={18} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedProduct(item);
                                                    setShowTransferModal(true);
                                                }}
                                                className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                                                title="Transferir"
                                            >
                                                <ArrowLeftRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : activeTab === 'movements' ? (
                        /* Historial de Movimientos */
                        <div className="space-y-2">
                            {movements.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 dark:text-gray-400">
                                    No hay movimientos registrados
                                </div>
                            ) : (
                                movements.map((movement) => (
                                    <div
                                        key={movement.id}
                                        className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10"
                                    >
                                        {getMovementIcon(movement.type)}
                                        <div className="flex-1">
                                            <div className="font-medium text-slate-900 dark:text-white">
                                                {movement.productName}
                                            </div>
                                            <div className="text-sm text-slate-500 dark:text-gray-400">
                                                {movement.reason} • {movement.branchName}
                                            </div>
                                        </div>
                                        <div className={`font-bold ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                                        </div>
                                        <div className="text-sm text-slate-500 dark:text-gray-400 flex items-center gap-1">
                                            <Clock size={14} />
                                            {new Date(movement.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        /* Tab de Transferencias */
                        <div className="text-center py-12">
                            <ArrowLeftRight className="mx-auto text-slate-400 mb-4" size={48} />
                            <p className="text-slate-500 dark:text-gray-400">
                                Selecciona un producto en "Vista General" y usa el botón de transferencia
                            </p>
                        </div>
                    )}
                </div>

                {/* Modal Agregar Stock */}
                {showAddStockModal && selectedProduct && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
                        <GlassCard className="w-full max-w-md p-6 bg-white dark:bg-[#1a1a1a]">
                            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
                                Agregar Stock: {selectedProduct.productName}
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-600 dark:text-gray-400">Sucursal</label>
                                    <select
                                        value={selectedBranch}
                                        onChange={(e) => setSelectedBranch(e.target.value)}
                                        className="w-full mt-1 px-4 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                                    >
                                        <option value="">Seleccionar sucursal</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-600 dark:text-gray-400">Cantidad</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={stockQuantity}
                                        onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                                        className="w-full mt-1 px-4 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-600 dark:text-gray-400">Motivo</label>
                                    <input
                                        type="text"
                                        value={stockReason}
                                        onChange={(e) => setStockReason(e.target.value)}
                                        placeholder="Ej: Compra a proveedor"
                                        className="w-full mt-1 px-4 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowAddStockModal(false)}
                                    className="flex-1 py-2 rounded-lg bg-gray-200 dark:bg-gray-800"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAddStock}
                                    className="flex-1 py-2 rounded-lg bg-green-600 text-white font-medium"
                                >
                                    Agregar
                                </button>
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* Modal Transferir */}
                {showTransferModal && selectedProduct && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
                        <GlassCard className="w-full max-w-md p-6 bg-white dark:bg-[#1a1a1a]">
                            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
                                Transferir: {selectedProduct.productName}
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-600 dark:text-gray-400">Desde Sucursal</label>
                                    <select
                                        value={transferFrom}
                                        onChange={(e) => setTransferFrom(e.target.value)}
                                        className="w-full mt-1 px-4 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                                    >
                                        <option value="">Seleccionar origen</option>
                                        {branches.map(b => {
                                            const stock = selectedProduct.stockByBranch.find(s => s.branchId === b.id)?.stock || 0;
                                            return (
                                                <option key={b.id} value={b.id}>{b.name} (Stock: {stock})</option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div className="flex justify-center">
                                    <ArrowRight className="text-slate-400" size={24} />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-600 dark:text-gray-400">Hacia Sucursal</label>
                                    <select
                                        value={transferTo}
                                        onChange={(e) => setTransferTo(e.target.value)}
                                        className="w-full mt-1 px-4 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                                    >
                                        <option value="">Seleccionar destino</option>
                                        {branches.filter(b => b.id !== transferFrom).map(b => {
                                            const stock = selectedProduct.stockByBranch.find(s => s.branchId === b.id)?.stock || 0;
                                            return (
                                                <option key={b.id} value={b.id}>{b.name} (Stock: {stock})</option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-600 dark:text-gray-400">Cantidad a Transferir</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={transferQuantity}
                                        onChange={(e) => setTransferQuantity(parseInt(e.target.value) || 0)}
                                        className="w-full mt-1 px-4 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowTransferModal(false)}
                                    className="flex-1 py-2 rounded-lg bg-gray-200 dark:bg-gray-800"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleTransfer}
                                    className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-medium"
                                >
                                    Transferir
                                </button>
                            </div>
                        </GlassCard>
                    </div>
                )}
            </GlassCard>
        </div>
    );
};

export default InventoryDashboard;
