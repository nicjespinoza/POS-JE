'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Package, Plus, Minus, Search, X, ArrowLeft, TrendingUp, TrendingDown,
    ArrowLeftRight, AlertTriangle, Clock, Check, Filter
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../providers/DataProvider';
import { InventoryItem, InventoryMovement, MovementType, Product } from '../../lib/types';
import {
    getInventoryByBranch,
    getInventoryMovements,
    addStock,
    adjustStock,
    addInventoryBatch
} from '../../services/inventoryService';
import { db, doc, setDoc } from '../../lib/firebase';

interface POSInventoryProps {
    onClose: () => void;
}

export const POSInventory: React.FC<POSInventoryProps> = ({ onClose }) => {
    const { userProfile } = useAuth();
    const { products, currency } = useData();
    const branchId = userProfile?.branchId || 'suc-1';
    const branchName = branchId === 'suc-1' ? 'Sucursal Centro' : branchId === 'suc-2' ? 'Sucursal Norte' : 'Sucursal Sur';

    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [movements, setMovements] = useState<InventoryMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'stock' | 'kardex' | 'entrada'>('stock');

    // Entry form
    const [entryProduct, setEntryProduct] = useState<string>('');
    const [entryQuantity, setEntryQuantity] = useState<number>(0);
    const [entryCost, setEntryCost] = useState<number>(0);
    const [entryReason, setEntryReason] = useState<string>('Compra de mercancia');
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // Kardex filter
    const [kardexFilter, setKardexFilter] = useState<string>('all');

    useEffect(() => {
        const unsubInv = getInventoryByBranch(branchId, (items) => {
            setInventory(items);
            setLoading(false);
        });
        const unsubMov = getInventoryMovements(branchId, 100, (items) => {
            setMovements(items);
        });
        return () => { unsubInv(); unsubMov(); };
    }, [branchId]);

    // Merge products with inventory
    const inventoryView = useMemo(() => {
        return products.map(p => {
            const inv = inventory.find(i => i.productId === p.id);
            return {
                ...p,
                branchStock: inv?.stock ?? 0,
                lowStock: (inv?.stock ?? 0) <= (inv?.lowStockThreshold ?? 5)
            };
        }).filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.category.toLowerCase().includes(search.toLowerCase()) ||
            (p.brand || '').toLowerCase().includes(search.toLowerCase())
        );
    }, [products, inventory, search]);

    const filteredMovements = useMemo(() => {
        if (kardexFilter === 'all') return movements;
        return movements.filter(m => m.type === kardexFilter);
    }, [movements, kardexFilter]);

    const totalStock = inventoryView.reduce((sum, p) => sum + p.branchStock, 0);
    const lowStockCount = inventoryView.filter(p => p.lowStock && p.branchStock > 0).length;
    const outOfStockCount = inventoryView.filter(p => p.branchStock === 0).length;

    const handleAddStock = async () => {
        if (!entryProduct || entryQuantity <= 0 || entryCost <= 0) return;
        setSaving(true);
        try {
            const product = products.find(p => p.id === entryProduct);
            if (!product) throw new Error('Producto no encontrado');

            const currentInv = inventory.find(i => i.productId === entryProduct);
            const currentStock = currentInv?.stock ?? 0;

            // Add batch (FIFO)
            await addInventoryBatch(
                entryProduct,
                branchId,
                entryQuantity,
                entryCost,
                userProfile?.uid || 'unknown'
            );

            // Record movement
            const movId = crypto.randomUUID();
            await setDoc(doc(db, 'inventory_movements', movId), {
                id: movId,
                productId: entryProduct,
                productName: product.name,
                branchId: branchId,
                branchName: branchName,
                type: MovementType.ENTRADA,
                quantity: entryQuantity,
                previousStock: currentStock,
                newStock: currentStock + entryQuantity,
                reason: entryReason,
                userId: userProfile?.uid || 'unknown',
                userName: userProfile?.displayName || 'Usuario',
                createdAt: new Date().toISOString()
            });

            setSuccessMsg(`+${entryQuantity} unidades de ${product.name} ingresadas`);
            setEntryProduct('');
            setEntryQuantity(0);
            setEntryCost(0);
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (error: any) {
            alert('Error: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const getMovementIcon = (type: string) => {
        switch (type) {
            case 'ENTRADA': return <TrendingUp size={16} className="text-green-500" />;
            case 'SALIDA': return <TrendingDown size={16} className="text-red-500" />;
            case 'TRANSFERENCIA': return <ArrowLeftRight size={16} className="text-blue-500" />;
            case 'AJUSTE': return <AlertTriangle size={16} className="text-amber-500" />;
            default: return <Clock size={16} className="text-gray-500" />;
        }
    };

    const getMovementColor = (type: string) => {
        switch (type) {
            case 'ENTRADA': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'SALIDA': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'TRANSFERENCIA': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'AJUSTE': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <div className="text-white text-xl">Cargando inventario...</div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-950 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                            <ArrowLeft size={20} className="dark:text-white" />
                        </button>
                        <div>
                            <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                                <Package size={24} className="text-purple-500" /> Inventario
                            </h2>
                            <p className="text-sm text-gray-500">{branchName} ({branchId})</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                        <X size={20} className="dark:text-white" />
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 p-4 shrink-0">
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalStock}</div>
                        <div className="text-xs text-gray-500">Total Unidades</div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl">
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{lowStockCount}</div>
                        <div className="text-xs text-gray-500">Stock Bajo</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{outOfStockCount}</div>
                        <div className="text-xs text-gray-500">Sin Stock</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-4 shrink-0">
                    {[
                        { key: 'stock', label: 'Stock Actual', icon: Package },
                        { key: 'entrada', label: 'Ingreso Mercancia', icon: Plus },
                        { key: 'kardex', label: 'Kardex', icon: Clock },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all ${activeTab === tab.key
                                ? 'bg-gray-100 dark:bg-gray-800 text-purple-600 dark:text-purple-400'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <tab.icon size={16} /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4">
                    {activeTab === 'stock' && (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar producto, marca, categoria..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none dark:text-white"
                                />
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-500 text-xs uppercase">
                                            <th className="py-3 px-4 text-left">Producto</th>
                                            <th className="py-3 px-2 text-left">Marca</th>
                                            <th className="py-3 px-2 text-left">Categoria</th>
                                            <th className="py-3 px-2 text-right">Precio</th>
                                            <th className="py-3 px-2 text-center">Stock</th>
                                            <th className="py-3 px-2 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inventoryView.map(p => (
                                            <tr key={p.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                                                        <div>
                                                            <div className="font-medium dark:text-white">{p.name}</div>
                                                            <div className="text-xs text-gray-400">{p.sku || '-'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-2 text-gray-600 dark:text-gray-400">{p.brand || '-'}</td>
                                                <td className="py-3 px-2 text-gray-600 dark:text-gray-400">{p.category}</td>
                                                <td className="py-3 px-2 text-right dark:text-white">{currency.symbol}{p.price.toFixed(2)}</td>
                                                <td className="py-3 px-2 text-center">
                                                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${p.branchStock === 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                        p.lowStock ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        }`}>
                                                        {p.branchStock}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 text-right font-medium dark:text-white">
                                                    {currency.symbol}{(p.branchStock * p.price).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
                                            <td colSpan={4} className="py-3 px-4 dark:text-white">TOTAL</td>
                                            <td className="py-3 px-2 text-center dark:text-white">{totalStock}</td>
                                            <td className="py-3 px-2 text-right dark:text-white">
                                                {currency.symbol}{inventoryView.reduce((sum, p) => sum + (p.branchStock * p.price), 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'entrada' && (
                        <div className="max-w-lg mx-auto space-y-6">
                            {successMsg && (
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl flex items-center gap-3">
                                    <Check size={20} className="text-green-600" />
                                    <span className="text-green-700 dark:text-green-400 font-medium">{successMsg}</span>
                                </div>
                            )}

                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl space-y-4">
                                <h3 className="text-lg font-bold dark:text-white">Ingreso de Mercancia</h3>

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Producto</label>
                                    <select
                                        value={entryProduct}
                                        onChange={e => setEntryProduct(e.target.value)}
                                        className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="">Seleccionar producto...</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.sku || p.id})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Cantidad</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={entryQuantity || ''}
                                            onChange={e => setEntryQuantity(parseInt(e.target.value) || 0)}
                                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Costo Unitario</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={entryCost || ''}
                                            onChange={e => setEntryCost(parseFloat(e.target.value) || 0)}
                                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Motivo</label>
                                    <select
                                        value={entryReason}
                                        onChange={e => setEntryReason(e.target.value)}
                                        className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="Compra de mercancia">Compra de mercancia</option>
                                        <option value="Devolucion de cliente">Devolucion de cliente</option>
                                        <option value="Transferencia recibida">Transferencia recibida</option>
                                        <option value="Ajuste de inventario">Ajuste de inventario</option>
                                    </select>
                                </div>

                                {entryProduct && entryQuantity > 0 && entryCost > 0 && (
                                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl">
                                        <div className="text-sm text-gray-600 dark:text-gray-400">Resumen:</div>
                                        <div className="text-lg font-bold dark:text-white">
                                            {entryQuantity} unidades x {currency.symbol}{entryCost.toFixed(2)} = {currency.symbol}{(entryQuantity * entryCost).toFixed(2)}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleAddStock}
                                    disabled={saving || !entryProduct || entryQuantity <= 0 || entryCost <= 0}
                                    className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? 'Procesando...' : <><Plus size={18} /> Registrar Entrada</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'kardex' && (
                        <div className="space-y-4">
                            <div className="flex gap-2 flex-wrap">
                                {['all', 'ENTRADA', 'SALIDA', 'TRANSFERENCIA', 'AJUSTE'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setKardexFilter(f)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${kardexFilter === f
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                                            }`}
                                    >
                                        {f === 'all' ? 'Todos' : f}
                                    </button>
                                ))}
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-500 text-xs uppercase">
                                            <th className="py-3 px-4 text-left">Fecha</th>
                                            <th className="py-3 px-2 text-left">Tipo</th>
                                            <th className="py-3 px-2 text-left">Producto</th>
                                            <th className="py-3 px-2 text-center">Cant</th>
                                            <th className="py-3 px-2 text-center">Anterior</th>
                                            <th className="py-3 px-2 text-center">Nuevo</th>
                                            <th className="py-3 px-2 text-left">Motivo</th>
                                            <th className="py-3 px-2 text-left">Usuario</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredMovements.length === 0 ? (
                                            <tr><td colSpan={8} className="py-8 text-center text-gray-400">Sin movimientos</td></tr>
                                        ) : filteredMovements.map(m => (
                                            <tr key={m.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                                <td className="py-3 px-4 text-xs text-gray-500">
                                                    {new Date(m.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: '2-digit' })}
                                                    <br />
                                                    <span className="text-gray-400">{new Date(m.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </td>
                                                <td className="py-3 px-2">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getMovementColor(m.type)}`}>
                                                        {getMovementIcon(m.type)} {m.type}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 font-medium dark:text-white">{m.productName}</td>
                                                <td className="py-3 px-2 text-center">
                                                    <span className={`font-bold ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {m.quantity > 0 ? '+' : ''}{m.quantity}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 text-center text-gray-500">{m.previousStock}</td>
                                                <td className="py-3 px-2 text-center font-medium dark:text-white">{m.newStock}</td>
                                                <td className="py-3 px-2 text-xs text-gray-500 max-w-[150px] truncate">{m.reason}</td>
                                                <td className="py-3 px-2 text-xs text-gray-500">{m.userName}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
