'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Search, ShoppingBag, Plus, Minus, Trash2, Edit2, X, CreditCard, Banknote, Landmark,
    Smartphone, ArrowLeft, CheckCircle2, History, LayoutGrid, Sun, Moon, LogOut,
    ArrowUp, ArrowDown, Columns, Box, Calculator as CalcIcon, DollarSign, TrendingUp // Added missing icons
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../providers/DataProvider';
import { Product, Transaction, TransactionType, Role, CartItem } from '../../lib/types'; // Updated Types Import
import { processAtomicSale } from '../../services/inventoryService'; // Updated Import
import { doc, getDoc } from 'firebase/firestore'; // Check if needed, maybe for specific actions
import { db } from '../../lib/firebase';
import { POSInventory } from './POSInventory';

// Types for POS Component

interface LayoutConfig {
    columns: number;
    density: 'compact' | 'normal' | 'comfortable';
    elementOrder: ('image' | 'name' | 'price' | 'meta')[];
}

// Helpers
const ProductCardImage = ({ src, alt, isOutOfStock }: { src?: string, alt: string, isOutOfStock: boolean }) => (
    <div className="w-full h-full relative">
        <img
            src={src || "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500"}
            alt={alt}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${isOutOfStock ? 'grayscale' : ''}`}
            onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500";
            }}
        />
    </div>
);

const CartItemImage = ({ src, alt }: { src?: string, alt: string }) => (
    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 shrink-0 border border-gray-200 dark:border-white/10">
        <img
            src={src || "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500"}
            alt={alt}
            className="w-full h-full object-cover"
        />
    </div>
);


export const POS: React.FC = () => {
    // Hooks
    const { userProfile, logout } = useAuth(); // Assuming logout is exposed or we handle it
    const { products, categories, currency, lowStockThreshold, taxRate, addTransaction } = useData();

    // State
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
    const [cart, setCart] = useState<CartItem[]>([]);

    // UI State
    const [isCheckoutMode, setIsCheckoutMode] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Móvil'>('Efectivo');
    const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null); // Quick edit if needed
    const [editingCartItem, setEditingCartItem] = useState<{ id: string, quantity: number, name: string } | null>(null);

    // Layout
    const [showLayoutModal, setShowLayoutModal] = useState(false);
    const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>({
        columns: 4,
        density: 'normal',
        elementOrder: ['image', 'name', 'price', 'meta']
    });

    // Theme (Handled by next-themes usually, but kept local state for now if needed, or stripped)
    const [isDark, setIsDark] = useState(true); // Default dark for "Premium" feel

    // Inventory
    const [showInventory, setShowInventory] = useState(false);

    // Calculator
    const [showCalculator, setShowCalculator] = useState(false);
    const [calcDisplay, setCalcDisplay] = useState('0');

    // Stats
    const salesStats = useMemo(() => {
        // Mock stats for UI - in real app would aggregate from transactions
        return { todayTotal: 0, todayCount: 0, weekTotal: 0, weekCount: 0 };
    }, []);

    // Load Cart from LocalStorage
    useEffect(() => {
        const savedCart = localStorage.getItem('pos_cart');
        if (savedCart) setCart(JSON.parse(savedCart));
    }, []);

    useEffect(() => {
        localStorage.setItem('pos_cart', JSON.stringify(cart));
    }, [cart]);

    // Filtering
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, search, selectedCategory]);

    // Derive categories from products
    const productCategories = useMemo(() => {
        const cats = new Set(products.map(p => p.category));
        return Array.from(cats);
    }, [products]);

    // Cart Logic
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const setItemQuantity = (id: string, qty: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) return { ...item, quantity: Math.max(0, qty) };
            return item;
        }).filter(item => item.quantity > 0));
    };

    const triggerRemoveItem = (item: CartItem) => {
        setCart(prev => prev.filter(i => i.id !== item.id));
    };

    // Totals
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    // Checkout
    const triggerCheckout = async () => {
        if (processing) return;
        setProcessing(true);
        try {
            // Create Transaction Object
            const transaction: Transaction = {
                id: crypto.randomUUID(), // will be overwritten by addTransaction internal logic or handled there
                date: new Date().toISOString(),
                amount: total,
                type: TransactionType.INCOME,
                category: 'Venta',
                description: `Venta POS - ${cart.length} productos`,
                paymentMethod: paymentMethod,
                status: 'COMPLETED',
                branchId: userProfile?.branchId || 'main',
                userId: userProfile?.uid || 'unknown',
                items: cart
            };

            await addTransaction(transaction); // data provider handles Atomic sale

            setCart([]);
            setIsCheckoutMode(false);
            // Show Success Toast/Animation
            alert('Venta procesada con éxito!');
        } catch (error) {
            console.error("Sale failed", error);
            alert('Error al procesar la venta.');
        } finally {
            setProcessing(false);
        }
    };

    const handleLogoutClick = () => {
        // Implement logout logic
        window.location.reload(); // Simple reload to clear auth state if handled by higher level
    };

    // Calculator Logic (Basic)
    const handleCalcInput = (btn: string) => {
        if (btn === 'C') setCalcDisplay('0');
        else if (btn === '=') {
            try { setCalcDisplay(eval(calcDisplay).toString()); } catch { setCalcDisplay('Error'); }
        } else {
            setCalcDisplay(prev => prev === '0' ? btn : prev + btn);
        }
    };

    const toggleTheme = () => setIsDark(!isDark);

    const getCategoryColor = (cat: string) => 'border-gray-200 text-gray-500'; // Simplified

    return (
        <div className={`flex flex-col h-screen bg-[#f0f0f3] dark:bg-black text-slate-900 dark:text-white transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
            {/* Header */}
            <GlassCard className="m-4 p-4 flex justify-between items-center z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                        POS System
                    </h1>
                    {/* Currency Selector (Visual only for now) */}
                    <div className="hidden md:flex bg-gray-100 dark:bg-white/10 rounded-lg p-1">
                        <button className="px-3 py-1 rounded-md bg-white dark:bg-white/20 shadow-sm text-xs font-bold text-slate-900 dark:text-white">NIO</button>
                        <button className="px-3 py-1 text-xs font-medium text-slate-500 dark:text-gray-400">USD</button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowInventory(true)}
                        className="px-4 py-2 rounded-xl bg-purple-600 text-white font-medium text-sm flex items-center gap-2 hover:bg-purple-700 transition-colors"
                    >
                        <Box size={18} /> Inventario
                    </button>
                    <button
                        onClick={() => setShowLayoutModal(true)}
                        className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button onClick={toggleTheme} className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
                        {isDark ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    {/* Logout */}
                    <button className="p-3 rounded-full hover:bg-red-50 text-red-500">
                        <LogOut size={20} />
                    </button>
                </div>
            </GlassCard>

            <div className="flex flex-1 overflow-hidden px-4 pb-4 gap-4">
                {/* Main Content (Products) */}
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    {/* Search Bar */}
                    <GlassCard className="p-4 shrink-0 flex flex-col gap-4">
                        <div className="relative w-full">
                            <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar productos..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border-none outline-none dark:text-white"
                            />
                        </div>
                        {/* Categories */}
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            <button
                                onClick={() => setSelectedCategory('Todos')}
                                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === 'Todos' ? 'bg-slate-900 dark:bg-white text-white dark:text-black' : 'bg-gray-100 dark:bg-white/5'}`}
                            >
                                Todos
                            </button>
                            {productCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-slate-900 dark:bg-white text-white dark:text-black' : 'bg-gray-100 dark:bg-white/5'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Grid */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                        <div className="grid gap-4 pb-20 md:pb-0" style={{ gridTemplateColumns: `repeat(${layoutConfig.columns}, minmax(0, 1fr))` }}>
                            {filteredProducts.map(product => {
                                const isOutOfStock = product.stock <= 0;
                                return (
                                    <GlassCard
                                        key={product.id}
                                        onClick={() => !isOutOfStock && addToCart(product)}
                                        className={`group relative overflow-hidden border-0 cursor-pointer transition-all hover:bg-white/60 dark:hover:bg-white/10 ${isOutOfStock ? 'opacity-50 grayscale' : ''} p-4`}
                                    >
                                        <div className="aspect-square w-full rounded-xl mb-3 overflow-hidden">
                                            <ProductCardImage src={product.image} alt={product.name} isOutOfStock={isOutOfStock} />
                                        </div>
                                        <h3 className="font-semibold dark:text-white truncate">{product.name}</h3>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">{product.category}</span>
                                            <span className="font-bold dark:text-white">{currency.symbol}{product.price.toFixed(2)}</span>
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">Stock: {product.stock}</div>
                                    </GlassCard>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Sidebar Cart */}
                <GlassCard className="w-full md:w-[400px] flex flex-col shrink-0 border-l border-white/20">
                    {!isCheckoutMode ? (
                        <>
                            <div className="p-5 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
                                <h2 className="text-xl font-bold dark:text-white">Carrito ({cart.reduce((a, c) => a + c.quantity, 0)})</h2>
                                <button onClick={() => setCart([])} className="text-red-500 text-sm">Limpiar</button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {cart.map(item => (
                                    <div key={item.id} className="flex gap-3 p-3 rounded-2xl bg-white/40 dark:bg-white/5 border border-transparent hover:border-gray-200">
                                        <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden">
                                            <img src={item.image} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-medium dark:text-white truncate">{item.name}</h4>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-xs text-gray-500">{currency.symbol}{item.price}</span>
                                                <div className="flex items-center gap-2 bg-white dark:bg-black/40 rounded-lg p-0.5">
                                                    <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-gray-100"><Minus size={12} /></button>
                                                    <span className="text-xs font-bold w-4 text-center dark:text-white">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-gray-100"><Plus size={12} /></button>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => triggerRemoveItem(item)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                            <div className="p-5 bg-white/50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10">
                                <div className="flex justify-between mb-4 dark:text-white">
                                    <span>Total</span>
                                    <span className="text-xl font-bold">{currency.symbol}{total.toFixed(2)}</span>
                                </div>
                                <button
                                    onClick={() => cart.length > 0 && setIsCheckoutMode(true)}
                                    disabled={cart.length === 0}
                                    className="w-full py-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-bold shadow-lg disabled:opacity-50"
                                >
                                    Cobrar
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="p-5 border-b flex items-center gap-3">
                                <button onClick={() => setIsCheckoutMode(false)}><ArrowLeft size={20} className="dark:text-white" /></button>
                                <h2 className="text-xl font-bold dark:text-white">Pago</h2>
                            </div>
                            <div className="flex-1 p-5 space-y-6">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-3 block uppercase">Método</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['Tarjeta', 'Efectivo', 'Transferencia', 'Móvil'].map(m => (
                                            <button
                                                key={m}
                                                onClick={() => setPaymentMethod(m as any)}
                                                className={`p-4 rounded-xl border flex flex-col items-center gap-2 ${paymentMethod === m ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white dark:bg-white/5 dark:text-gray-400'}`}
                                            >
                                                <CreditCard size={20} /> <span className="text-xs font-bold">{m}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3 dark:text-gray-300">
                                    <div className="flex justify-between text-sm"><span>Subtotal</span><span>{currency.symbol}{subtotal.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-sm"><span>Impuesto ({taxRate}%)</span><span>{currency.symbol}{taxAmount.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-2xl font-bold border-t pt-4 dark:text-white"><span>Total</span><span>{currency.symbol}{total.toFixed(2)}</span></div>
                                </div>
                            </div>
                            <div className="p-5">
                                <button
                                    onClick={triggerCheckout}
                                    disabled={processing}
                                    className="w-full py-4 rounded-xl bg-green-600 text-white font-bold shadow-lg flex justify-center items-center gap-2"
                                >
                                    {processing ? 'Procesando...' : <><span className="mr-2">Confirmar Pago</span> <CheckCircle2 size={20} /></>}
                                </button>
                            </div>
                        </>
                    )}
                </GlassCard>
            </div>

            {/* Inventory Modal */}
            {showInventory && <POSInventory onClose={() => setShowInventory(false)} />}
        </div>
    );
};
