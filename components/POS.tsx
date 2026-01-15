
import React, { useState, useMemo, useEffect } from 'react';
import { GlassCard } from './ui/GlassCard';
import { Product, CartItem, Transaction, TransactionType } from '../types';
import { Search, ShoppingBag, Plus, Minus, Trash2, CreditCard, LogOut, Sun, Moon, Globe, PackagePlus, X, Calculator as CalcIcon, Delete, AlertTriangle, CheckCircle2, Edit2, Filter, Banknote, Landmark, Image as ImageIcon, LayoutGrid, ArrowUp, ArrowDown, Columns, Smartphone, Package, Save, Printer, History, Calendar, DollarSign, Box, ArrowLeft, FileText, TrendingUp, Eye } from 'lucide-react';
import { CURRENCIES } from '../constants';

interface POSProps {
  products: Product[];
  transactions: Transaction[]; 
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onProcessSale: (transaction: Transaction) => void;
  onLogout: () => void;
  toggleTheme: () => void;
  isDark: boolean;
  currency: { code: string, symbol: string };
  onCurrencyChange: (code: string) => void;
  taxRate: number;
  lowStockThreshold: number;
}

type LayoutElement = 'image' | 'name' | 'meta' | 'price';

interface LayoutConfig {
  columns: number;
  elementOrder: LayoutElement[];
  density: 'compact' | 'normal' | 'comfortable';
}

// Internal component to handle image loading errors in the grid
const ProductCardImage = ({ src, alt, isOutOfStock }: { src: string, alt: string, isOutOfStock: boolean }) => {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="flex flex-col items-center justify-center text-slate-300 dark:text-white/20 w-full h-full bg-gray-50 dark:bg-white/5">
         <Package size={48} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={`w-full h-full object-cover shadow-sm`} 
      onError={() => setError(true)}
    />
  );
};

// Internal component to handle image loading errors in the cart
const CartItemImage = ({ src, alt }: { src: string, alt: string }) => {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
       <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 text-slate-400 dark:text-gray-500">
           <Package size={18} />
       </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className="w-10 h-10 rounded-lg object-cover bg-gray-200 dark:bg-gray-800 flex-shrink-0"
      onError={() => setError(true)} 
    />
  );
};

export const POS: React.FC<POSProps> = ({ 
  products, 
  transactions,
  onAddProduct,
  onUpdateProduct,
  onProcessSale, 
  onLogout, 
  toggleTheme, 
  isDark,
  currency,
  onCurrencyChange,
  taxRate,
  lowStockThreshold
}) => {
  // Initialize cart from local storage
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem('titanium_pos_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error("Error restaurando carrito", error);
      return [];
    }
  });

  // Layout Configuration State
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(() => {
    try {
      const savedLayout = localStorage.getItem('titanium_pos_layout');
      return savedLayout ? JSON.parse(savedLayout) : {
        columns: 4,
        elementOrder: ['image', 'name', 'meta', 'price'],
        density: 'normal'
      };
    } catch {
      return { columns: 4, elementOrder: ['image', 'name', 'meta', 'price'], density: 'normal' };
    }
  });
  
  const [showLayoutModal, setShowLayoutModal] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('Tarjeta');
  
  // Checkout Steps State
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);

  // Notification State
  const [notification, setNotification] = useState<{message: string, type: 'warning' | 'success'} | null>(null);

  // Add Product Modal State (Removed functionality but kept state structure to prevent breaks if referenced)
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    category: '',
    stock: '',
    image: ''
  });

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Quick View Product State
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  // Edit Cart Item State
  const [editingCartItem, setEditingCartItem] = useState<{id: string, quantity: number, name: string} | null>(null);

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // Calculator State
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');

  // Checkout Result Modal State
  const [checkoutResult, setCheckoutResult] = useState<{
      warnings: {name: string, remaining: number}[], 
      total: number,
      transaction: Transaction
  } | null>(null);

  // Confirmation Modal State
  const [confirmState, setConfirmState] = useState<{
    type: 'CHECKOUT' | 'REMOVE_ITEM' | 'LOGOUT' | 'ADD_PRODUCT';
    id?: string;
    title: string;
    message: string;
    actionLabel: string;
    isDangerous?: boolean;
    item?: CartItem; // Optional item reference for removals
  } | null>(null);

  // Persist cart to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('titanium_pos_cart', JSON.stringify(cart));
    // If cart becomes empty, reset checkout mode
    if (cart.length === 0) setIsCheckoutMode(false);
  }, [cart]);

  // Persist layout config
  useEffect(() => {
    localStorage.setItem('titanium_pos_layout', JSON.stringify(layoutConfig));
  }, [layoutConfig]);

  // Derive unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['Todas', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  // Sales Statistics Logic
  const salesStats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toLocaleDateString();
    
    const sales = transactions.filter(t => t.type === TransactionType.INCOME);

    const todaySales = sales.filter(t => new Date(t.date).toLocaleDateString() === todayStr);
    const todayTotal = todaySales.reduce((acc, t) => acc + t.amount, 0);
    const todayCount = todaySales.length;

    // Week stats calculation kept for summary but removed from history modal
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const weekSales = sales.filter(t => new Date(t.date) >= startOfWeek);
    const weekTotal = weekSales.reduce((acc, t) => acc + t.amount, 0);
    const weekCount = weekSales.length;
    
    const recentSales = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { todayTotal, todayCount, weekTotal, weekCount, recentSales };
  }, [transactions]);

  const filteredHistory = useMemo(() => {
     return salesStats.recentSales.filter(t => 
        t.description.toLowerCase().includes(historySearch.toLowerCase()) ||
        t.id.toLowerCase().includes(historySearch.toLowerCase()) ||
        (t.category && t.category.toLowerCase().includes(historySearch.toLowerCase()))
     );
  }, [salesStats.recentSales, historySearch]);


  const getCategoryColor = (category: string) => {
    const colors = [
      'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30',
      'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-200 dark:border-purple-500/30',
      'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 border-green-200 dark:border-green-500/30',
      'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 border-orange-200 dark:border-orange-500/30',
      'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300 border-pink-200 dark:border-pink-500/30',
      'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 border-teal-200 dark:border-teal-500/30',
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30',
      'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
    ];
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const getPaymentIcon = (method?: string) => {
    switch(method) {
      case 'Efectivo': return <Banknote size={14} />;
      case 'Tarjeta': return <CreditCard size={14} />;
      case 'Transferencia': return <Landmark size={14} />;
      case 'Móvil': return <Smartphone size={14} />;
      default: return <CreditCard size={14} />;
    }
  };

  const showToast = (message: string, type: 'warning' | 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      showToast(`¡${product.name} está agotado!`, 'warning');
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    const currentQty = existingItem ? existingItem.quantity : 0;

    if (currentQty + 1 > product.stock) {
      showToast(`Stock insuficiente. Solo quedan ${product.stock}.`, 'warning');
      return;
    }

    if (product.stock - (currentQty + 1) < lowStockThreshold) {
       showToast(`Advertencia: Stock bajo para ${product.name}`, 'warning');
    }

    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const triggerRemoveItem = (item: CartItem) => {
    setConfirmState({
      type: 'REMOVE_ITEM',
      item: item,
      title: 'Eliminar Producto',
      message: `¿Estás seguro de que deseas eliminar ${item.name} del carrito?`,
      actionLabel: 'Eliminar',
      isDangerous: true
    });
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    if (delta > 0) {
       const product = products.find(p => p.id === id);
       if (product && item.quantity + delta > product.stock) {
         showToast(`No puedes agregar más. Stock límite alcanzado.`, 'warning');
         return;
       }
       setCart(cart.map(item => item.id === id ? { ...item, quantity: item.quantity + delta } : item));
    } else {
       if (item.quantity + delta <= 0) {
         triggerRemoveItem(item);
       } else {
         setCart(cart.map(item => item.id === id ? { ...item, quantity: item.quantity + delta } : item));
       }
    }
  };

  const setItemQuantity = (id: string, qty: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    if (qty <= 0) {
      const item = cart.find(i => i.id === id);
      if (item) triggerRemoveItem(item);
      return;
    }

    if (qty > product.stock) {
      showToast(`Cantidad excede el stock disponible (${product.stock})`, 'warning');
      setCart(cart.map(item => item.id === id ? { ...item, quantity: product.stock } : item));
      return;
    }
    
    setCart(cart.map(item => item.id === id ? { ...item, quantity: qty } : item));
  };

  const sendLowStockEmail = (items: {name: string, remaining: number}[]) => {
     console.log("SENDING EMAIL ALERT TO ADMIN:", items);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    const invalidItems = cart.filter(item => {
        const product = products.find(p => p.id === item.id);
        return !product || product.stock < item.quantity;
    });

    if (invalidItems.length > 0) {
        showToast(`Error: ${invalidItems[0].name} no tiene suficiente stock.`, 'warning');
        return;
    }

    setProcessing(true);
    
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    const lowStockWarnings: {name: string, remaining: number}[] = [];
    
    cart.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (product) {
            const remaining = product.stock - item.quantity;
            if (remaining < lowStockThreshold) {
                lowStockWarnings.push({ name: product.name, remaining });
            }
        }
    });

    if (lowStockWarnings.length > 0) {
        sendLowStockEmail(lowStockWarnings);
    }

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      type: TransactionType.INCOME,
      amount: total,
      date: new Date().toISOString(),
      description: `Venta POS - ${cart.length} ítems`,
      category: 'Ventas',
      items: [...cart],
      paymentMethod: paymentMethod
    };

    setTimeout(() => {
      onProcessSale(transaction);
      setCart([]);
      setIsCheckoutMode(false); 
      setProcessing(false);
      setCheckoutResult({ warnings: lowStockWarnings, total, transaction });
    }, 1500);
  };

  const triggerCheckout = () => {
    setConfirmState({
      type: 'CHECKOUT',
      title: 'Confirmar Venta',
      message: `¿Procesar venta por ${currency.symbol}${(cart.reduce((acc, item) => acc + (item.price * item.quantity), 0) * (1 + taxRate/100)).toFixed(2)} usando ${paymentMethod}?`,
      actionLabel: 'Proceder'
    });
  };

  const handleLogoutClick = () => {
    setConfirmState({
      type: 'LOGOUT',
      title: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas salir del sistema?',
      actionLabel: 'Salir',
      isDangerous: true
    });
  };

  // Add product logic (Internal function to handle state updates)
  const executeAddProduct = () => {
    onAddProduct({
      id: crypto.randomUUID(),
      name: newProduct.name,
      price: parseFloat(newProduct.price),
      category: newProduct.category || 'General',
      stock: parseInt(newProduct.stock) || 0,
      image: newProduct.image
    });
    setShowAddProductModal(false);
    setNewProduct({ name: '', price: '', category: '', stock: '', image: '' });
    showToast('Producto agregado correctamente', 'success');
  };

  const handleConfirmAction = () => {
    if (!confirmState) return;
    
    if (confirmState.type === 'CHECKOUT') {
      handleCheckout();
    } else if (confirmState.type === 'REMOVE_ITEM') {
      if (confirmState.item) removeFromCart(confirmState.item.id);
    } else if (confirmState.type === 'LOGOUT') {
      onLogout();
    } else if (confirmState.type === 'ADD_PRODUCT') {
      executeAddProduct();
    }
    
    setConfirmState(null);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const moveLayoutElement = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...layoutConfig.elementOrder];
    if (direction === 'up') {
      if (index === 0) return;
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    } else {
      if (index === newOrder.length - 1) return;
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setLayoutConfig({ ...layoutConfig, elementOrder: newOrder });
  };

  const handleCalcInput = (val: string) => {
    if (val === 'C') {
        setCalcDisplay('0');
    } else if (val === '=') {
        try {
            const result = eval(calcDisplay.replace(/x/g, '*'));
            setCalcDisplay(String(result));
        } catch {
            setCalcDisplay('Error');
        }
    } else {
        setCalcDisplay(prev => prev === '0' ? val : prev + val);
    }
  };

  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProduct.name && newProduct.price) {
      if (isNaN(parseFloat(newProduct.price)) || parseFloat(newProduct.price) < 0) {
        showToast('Por favor ingresa un precio válido', 'warning');
        return;
      }

      setConfirmState({
        type: 'ADD_PRODUCT',
        title: 'Confirmar Nuevo Producto',
        message: `¿Estás seguro de que deseas agregar "${newProduct.name}" al inventario?`,
        actionLabel: 'Agregar',
        isDangerous: false
      });
    }
  };

  const handleUpdateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct && editingProduct.name && editingProduct.price) {
      onUpdateProduct(editingProduct);
      setEditingProduct(null);
      showToast('Producto actualizado correctamente', 'success');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-black text-slate-900 dark:text-white overflow-hidden transition-colors duration-300">
      
      <style>
        {`
        @media print {
            @page {
                size: 80mm auto;
                margin: 0;
            }
            body {
                background: white;
                color: black;
                font-family: 'Courier New', monospace;
            }
            body * {
                visibility: hidden;
            }
            #receipt-print-area, #receipt-print-area * {
                visibility: visible;
            }
            #receipt-print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 10px;
                background: white;
                color: black;
            }
            .no-print {
                display: none !important;
            }
        }
        `}
      </style>

      {/* Receipt Template (Hidden normally, Visible on Print) */}
      <div id="receipt-print-area" className="hidden print:block fixed inset-0 bg-white z-[9999] p-2 text-black font-mono text-xs leading-tight">
        {checkoutResult && (
          <div className="max-w-[80mm] mx-auto">
             <div className="text-center mb-4">
                <h1 className="text-xl font-bold uppercase">Titanium POS</h1>
                <p>Tu Tienda de Confianza</p>
                <p className="text-[10px]">================================</p>
             </div>
             
             <div className="mb-3 text-[10px]">
                <p className="flex justify-between"><span>FECHA:</span> <span>{new Date(checkoutResult.transaction.date).toLocaleDateString()}</span></p>
                <p className="flex justify-between"><span>HORA:</span> <span>{new Date(checkoutResult.transaction.date).toLocaleTimeString()}</span></p>
                <p className="flex justify-between items-start"><span className="shrink-0">FOLIO:</span> <span className="break-all text-right">{checkoutResult.transaction.id.toUpperCase().slice(0, 18)}</span></p>
                <p className="flex justify-between"><span>PAGO:</span> <span>{checkoutResult.transaction.paymentMethod?.toUpperCase()}</span></p>
             </div>

             <div className="mb-2 border-b border-black border-dashed pb-2">
                <div className="flex justify-between font-bold mb-1 border-b border-black pb-1">
                   <span>CANT/DESC</span>
                   <span>IMPORTE</span>
                </div>
                {checkoutResult.transaction.items?.map((item: any, i: number) => (
                    <div key={i} className="mb-2">
                       <div className="font-bold">{item.name}</div>
                       <div className="flex justify-between">
                          <span>{item.quantity} x {currency.symbol}{item.price.toFixed(2)}</span>
                          <span>{currency.symbol}{(item.quantity * item.price).toFixed(2)}</span>
                       </div>
                    </div>
                ))}
             </div>

             <div className="flex justify-between mb-1 mt-2">
                <span>SUBTOTAL:</span>
                <span>{currency.symbol}{(checkoutResult.total / (1 + taxRate/100)).toFixed(2)}</span>
             </div>
             <div className="flex justify-between mb-2 pb-2 border-b border-black border-dashed">
                <span>IMPUESTO ({taxRate}%):</span>
                <span>{currency.symbol}{(checkoutResult.total - (checkoutResult.total / (1 + taxRate/100))).toFixed(2)}</span>
             </div>
             
             <div className="flex justify-between font-bold text-xl my-3">
                <span>TOTAL:</span>
                <span>{currency.symbol}{checkoutResult.total.toFixed(2)}</span>
             </div>
             
             {/* Change calculation could go here if Amount Tendered was captured */}

             <div className="text-center text-[10px] mt-6">
                <p>*** GRACIAS POR SU COMPRA ***</p>
                <p>No se aceptan devoluciones</p>
                <p>sin este ticket.</p>
                <br />
                <p>www.titaniumpos.com</p>
             </div>
          </div>
        )}
      </div>

      <div className="flex flex-col h-full print:hidden">
        {/* Toast Notification */}
        {notification && (
            <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${notification.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-green-500 text-white'}`}>
                {notification.type === 'warning' ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                <span className="font-medium">{notification.message}</span>
            </div>
        )}

        {/* Confirmation Modal */}
        {confirmState && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <GlassCard className="w-full max-w-sm p-6 bg-white dark:bg-[#1a1a1a] shadow-2xl border border-white/20">
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{confirmState.title}</h3>
              <p className="text-slate-600 dark:text-gray-300 mb-6">{confirmState.message}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmState(null)}
                  className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmAction}
                  className={`flex-1 py-3 rounded-xl font-medium text-white transition-colors ${confirmState.isDangerous ? 'bg-red-600 hover:bg-red-500' : 'bg-purple-600 hover:bg-purple-500'}`}
                >
                  {confirmState.actionLabel}
                </button>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Checkout Result Modal */}
        {checkoutResult && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <GlassCard className="w-full max-w-md p-8 bg-white dark:bg-[#1a1a1a] flex flex-col items-center text-center relative">
                    <button 
                        onClick={() => setCheckoutResult(null)}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 transition-colors"
                        title="Cerrar / Nueva Venta"
                    >
                        <X size={20} />
                    </button>

                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/30">
                        <CheckCircle2 size={40} className="text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">¡Venta Exitosa!</h2>
                    <p className="text-slate-500 dark:text-gray-400 mb-6">Total Cobrado: <span className="text-slate-900 dark:text-white font-bold">{currency.symbol}{checkoutResult.total.toFixed(2)}</span></p>
                    
                    <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 w-full mb-6 border border-gray-100 dark:border-white/10 text-left">
                        <p className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">Folio de Transacción</p>
                        <p className="font-mono text-sm text-slate-900 dark:text-white truncate select-all">{checkoutResult.transaction.id}</p>
                    </div>

                    {checkoutResult.warnings.length > 0 && (
                        <div className="w-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 mb-6 text-left">
                            <h4 className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold mb-2">
                                <AlertTriangle size={18} /> Advertencia de Inventario
                            </h4>
                            <ul className="space-y-1">
                                {checkoutResult.warnings.map((w, idx) => (
                                    <li key={idx} className="text-sm text-amber-800 dark:text-amber-300">
                                        • {w.name} (Disponibles: {w.remaining})
                                    </li>
                                ))}
                            </ul>
                            <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 italic">Se ha enviado una alerta de stock al administrador.</p>
                        </div>
                    )}

                    <div className="flex flex-col gap-3 w-full">
                        <button 
                            onClick={handlePrintReceipt}
                            className="w-full px-8 py-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-lg"
                        >
                            <Printer size={24} /> Imprimir Ticket
                        </button>
                    </div>
                </GlassCard>
            </div>
        )}

        {/* History & Stats Modal */}
        {showHistoryModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4">
                <GlassCard className="w-full max-w-3xl p-6 bg-white dark:bg-[#1a1a1a] flex flex-col h-[80vh]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <History /> Historial de Ventas
                        </h3>
                        <button onClick={() => setShowHistoryModal(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Search in History */}
                    <div className="mb-4 relative">
                        <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Buscar por ID, descripción o categoría..." 
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 outline-none focus:ring-2 focus:ring-purple-500/50 text-slate-900 dark:text-white text-sm transition-all"
                        />
                    </div>

                    {/* Transaction List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100 dark:bg-white/5 sticky top-0 backdrop-blur-md">
                                <tr>
                                    <th className="p-3 text-xs font-medium text-slate-500 dark:text-gray-400 uppercase">Hora</th>
                                    <th className="p-3 text-xs font-medium text-slate-500 dark:text-gray-400 uppercase">Descripción</th>
                                    <th className="p-3 text-xs font-medium text-slate-500 dark:text-gray-400 uppercase text-center">Método</th>
                                    <th className="p-3 text-xs font-medium text-slate-500 dark:text-gray-400 uppercase text-center">Items</th>
                                    <th className="p-3 text-xs font-medium text-slate-500 dark:text-gray-400 uppercase text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {filteredHistory.map(t => (
                                    <tr key={t.id} className="hover:bg-white dark:hover:bg-white/5 transition-colors">
                                        <td className="p-3 text-sm text-slate-700 dark:text-gray-300 whitespace-nowrap">
                                            {new Date(t.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            <div className="text-[10px] text-slate-400">{new Date(t.date).toLocaleDateString()}</div>
                                        </td>
                                        <td className="p-3 text-sm text-slate-700 dark:text-gray-300 max-w-[150px] truncate">
                                            {t.description}
                                            <div className="text-[10px] text-slate-400 font-mono select-all">#{t.id.slice(0, 8)}</div>
                                        </td>
                                        <td className="p-3 text-center">
                                             {t.paymentMethod && (
                                                <div className="flex items-center justify-center text-slate-500 dark:text-gray-400" title={t.paymentMethod}>
                                                    {getPaymentIcon(t.paymentMethod)}
                                                </div>
                                             )}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className="inline-block px-2 py-0.5 rounded-md bg-gray-200 dark:bg-white/10 text-xs font-medium">
                                                {t.items?.reduce((acc, i) => acc + i.quantity, 0) || 0}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                            {currency.symbol}{t.amount.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                                {filteredHistory.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-400">No se encontraron ventas.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>
            </div>
        )}

        {/* Header */}
        <GlassCard className="m-4 p-4 flex justify-between items-center z-20 shrink-0">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-gray-400 pl-2">
              Titanium POS
            </div>
            <div className="h-6 w-px bg-gray-300 dark:bg-white/10 mx-2" />
            
            {/* Currency Selector */}
            <div className="relative hidden md:block">
               <select
                 value={currency.code}
                 onChange={(e) => onCurrencyChange(e.target.value)}
                 className="appearance-none pl-9 pr-4 py-2 rounded-full bg-gray-100 dark:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-white/10 text-sm font-medium outline-none cursor-pointer transition-colors"
               >
                 {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
               </select>
               <Globe size={14} className="absolute left-3 top-2.5 text-slate-500 dark:text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowHistoryModal(true)}
              className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 transition-colors"
              title="Historial de Ventas"
            >
              <History size={20} />
            </button>

            <button 
              onClick={() => setShowLayoutModal(true)}
              className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 transition-colors"
              title="Configurar Diseño"
            >
              <LayoutGrid size={20} />
            </button>
            
            <button
              onClick={toggleTheme}
              className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 transition-colors"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="h-6 w-px bg-gray-300 dark:bg-white/10" />
            <button 
              onClick={handleLogoutClick}
              className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm font-medium"
            >
              <LogOut size={18} /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </GlassCard>

        <div className="flex flex-1 overflow-hidden px-4 pb-4 gap-4">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              
              {/* Daily & Weekly Summary Stats */}
              <div className="grid grid-cols-2 gap-4 shrink-0">
                  <GlassCard className="p-3 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400 font-medium">
                          <DollarSign size={14} className="text-green-500" /> Ventas Hoy
                      </div>
                      <div className="flex justify-between items-end">
                          <span className="text-lg font-bold text-slate-900 dark:text-white">{currency.symbol}{salesStats.todayTotal.toFixed(2)}</span>
                          <span className="text-[10px] bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">{salesStats.todayCount} ops</span>
                      </div>
                  </GlassCard>
                  <GlassCard className="p-3 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400 font-medium">
                          <TrendingUp size={14} className="text-blue-500" /> Ventas Semana
                      </div>
                      <div className="flex justify-between items-end">
                          <span className="text-lg font-bold text-slate-900 dark:text-white">{currency.symbol}{salesStats.weekTotal.toFixed(2)}</span>
                          <span className="text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">{salesStats.weekCount} ops</span>
                      </div>
                  </GlassCard>
              </div>

              {/* Search and Categories Bar */}
              <GlassCard className="p-4 shrink-0 flex flex-col gap-4">
                 <div className="relative w-full">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                    <input 
                      type="text" 
                      placeholder="Buscar productos..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border-none focus:ring-2 focus:ring-purple-500/50 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 transition-all"
                    />
                 </div>
                 
                 {/* Category Filter Pills */}
                 <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {categories.map(cat => {
                       const isSelected = selectedCategory === cat;
                       return (
                         <button
                           key={cat}
                           onClick={() => setSelectedCategory(cat)}
                           className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                             isSelected 
                               ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg' 
                               : 'bg-gray-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                           }`}
                         >
                           {cat}
                         </button>
                       );
                    })}
                 </div>
              </GlassCard>

              {/* Product Grid */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                  <div className={`grid gap-4 pb-20 md:pb-0`} style={{ gridTemplateColumns: `repeat(${layoutConfig.columns}, minmax(0, 1fr))` }}>
                    {filteredProducts.map(product => {
                      const isLowStock = product.stock < lowStockThreshold && product.stock > 0;
                      const isOutOfStock = product.stock <= 0;
                      
                      return (
                        <GlassCard 
                          key={product.id} 
                          onClick={() => {
                             if (!isOutOfStock) {
                                // Instead of adding immediately, open quick view
                                setViewingProduct(product);
                             }
                          }}
                          className={`group relative overflow-hidden border-0 cursor-pointer transition-all duration-200 hover:bg-white/60 dark:hover:bg-white/10
                             ${isOutOfStock ? 'opacity-60 grayscale cursor-not-allowed' : ''}
                             ${isLowStock ? 'ring-2 ring-amber-400/50 dark:ring-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10' : ''}
                             ${layoutConfig.density === 'compact' ? 'p-2' : layoutConfig.density === 'comfortable' ? 'p-6' : 'p-4'}
                          `}
                        > 
                          {isLowStock && !isOutOfStock && (
                              <div className="absolute top-2 right-2 z-10 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                                  BAJO STOCK
                              </div>
                          )}

                          <div className="flex flex-col h-full">
                             {layoutConfig.elementOrder.map((element, idx) => {
                               if (element === 'image') {
                                 return (
                                   <div key={idx} className="aspect-square w-full overflow-hidden rounded-xl mb-3 relative bg-gray-100 dark:bg-white/5">
                                      <ProductCardImage src={product.image} alt={product.name} isOutOfStock={isOutOfStock} />
                                      {/* Edit Button */}
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setEditingProduct(product); }}
                                        className="absolute top-2 left-2 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                          <Edit2 size={14} />
                                      </button>
                                      
                                      {!isOutOfStock && (
                                          <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                addToCart(product);
                                            }}
                                            className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-slate-900 dark:text-white shadow-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                            title="Agregar directamente"
                                          >
                                              <Plus size={18} />
                                          </button>
                                      )}
                                      {isOutOfStock && (
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                              <span className="text-white font-bold tracking-widest text-sm border-2 border-white px-3 py-1">AGOTADO</span>
                                          </div>
                                      )}
                                   </div>
                                 );
                               } else if (element === 'name') {
                                 return (
                                   <h3 key={idx} className="font-semibold text-slate-900 dark:text-white text-lg leading-tight mb-1 truncate px-1">
                                      {product.name}
                                   </h3>
                                 );
                               } else if (element === 'meta') {
                                 return (
                                   <div key={idx} className="flex justify-between items-center mb-2 px-1">
                                      <span className={`text-[10px] px-2 py-0.5 rounded-md border ${getCategoryColor(product.category)}`}>
                                          {product.category}
                                      </span>
                                      <span className={`text-xs ${isLowStock ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-gray-400'}`}>
                                          Stock: {product.stock}
                                      </span>
                                   </div>
                                 );
                               } else if (element === 'price') {
                                 return (
                                   <div key={idx} className="mt-auto font-bold text-slate-900 dark:text-white px-1 pb-1">
                                      {currency.symbol}{product.price.toFixed(2)}
                                   </div>
                                 );
                               }
                               return null;
                             })}
                          </div>
                        </GlassCard>
                      );
                    })}
                    
                    {filteredProducts.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 dark:text-gray-600">
                            <ShoppingBag size={64} className="mb-4 opacity-20" />
                            <p className="text-lg">No se encontraron productos.</p>
                        </div>
                    )}
                  </div>
              </div>
          </div>

          {/* Sidebar Cart */}
          <GlassCard className="w-full md:w-[400px] flex flex-col shrink-0 border-l border-white/20 transition-all duration-300">
            {!isCheckoutMode ? (
              // --- VIEW 1: CART ITEMS LIST ---
              <>
                <div className="p-5 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
                   <div className="flex items-center gap-2">
                      <div className="bg-slate-900 dark:bg-white text-white dark:text-black w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                          {cart.reduce((acc, item) => acc + item.quantity, 0)}
                      </div>
                      <h2 className="text-xl font-bold">Carrito</h2>
                   </div>
                   <button 
                      onClick={() => setCart([])} 
                      className="text-xs text-red-500 hover:text-red-600 font-medium hover:underline disabled:opacity-50"
                      disabled={cart.length === 0}
                   >
                      Limpiar
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-gray-600 opacity-60">
                      <ShoppingBag size={48} className="mb-4" strokeWidth={1.5} />
                      <p>El carrito está vacío</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="group flex gap-3 p-3 rounded-2xl bg-white/40 dark:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-colors">
                        <CartItemImage src={item.image} alt={item.name} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                              <h4 className="font-medium text-slate-900 dark:text-white truncate pr-2">{item.name}</h4>
                              <span className="font-semibold text-slate-900 dark:text-white shrink-0">
                                  {currency.symbol}{(item.price * item.quantity).toFixed(2)}
                              </span>
                          </div>
                          <div className="flex justify-between items-center">
                             <p className="text-xs text-slate-500 dark:text-gray-400">{currency.symbol}{item.price}</p>
                             
                             <div className="flex items-center gap-2 bg-white dark:bg-black/40 rounded-lg p-0.5 border border-gray-100 dark:border-white/5">
                                <button 
                                  onClick={() => updateQuantity(item.id, -1)}
                                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 transition-colors"
                                >
                                  <Minus size={12} />
                                </button>
                                
                                <button 
                                  onClick={() => setEditingCartItem({ id: item.id, quantity: item.quantity, name: item.name })}
                                  className="text-xs font-semibold w-6 text-center hover:text-purple-500 transition-colors"
                                >
                                   {item.quantity}
                                </button>

                                <button 
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 transition-colors"
                                >
                                  <Plus size={12} />
                                </button>
                             </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col justify-between items-end">
                            <button 
                               onClick={() => triggerRemoveItem(item)}
                               className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                               <Trash2 size={14} />
                            </button>
                            <button
                               onClick={() => setEditingCartItem({ id: item.id, quantity: item.quantity, name: item.name })}
                               className="p-1.5 rounded-lg text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                            >
                               <Edit2 size={14} />
                            </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer View 1: Simple Total + Charge Button */}
                <div className="p-5 bg-white/50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10 backdrop-blur-md">
                   <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-medium text-slate-500 dark:text-gray-400">Total Estimado</span>
                      <span className="text-xl font-bold text-slate-900 dark:text-white">{currency.symbol}{total.toFixed(2)}</span>
                   </div>
                   <button 
                      onClick={() => {
                        if (cart.length > 0) setIsCheckoutMode(true);
                        else showToast("El carrito está vacío", "warning");
                      }}
                      disabled={cart.length === 0}
                      className="w-full py-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                   >
                      Cobrar
                   </button>
                </div>
              </>
            ) : (
              // --- VIEW 2: CHECKOUT DETAILS & PAYMENT ---
              <>
                <div className="p-5 border-b border-gray-100 dark:border-white/10 flex items-center gap-3">
                   <button 
                     onClick={() => setIsCheckoutMode(false)}
                     className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 transition-colors"
                   >
                     <ArrowLeft size={20} />
                   </button>
                   <h2 className="text-xl font-bold">Resumen de Pago</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                   {/* Mini Order Summary */}
                   <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
                      <div className="flex justify-between items-center mb-2">
                         <span className="text-sm font-medium text-slate-500 dark:text-gray-400">Items en orden</span>
                         <span className="text-sm font-bold text-slate-900 dark:text-white">{cart.reduce((acc, i) => acc + i.quantity, 0)} productos</span>
                      </div>
                      <div className="flex -space-x-2 overflow-hidden py-2">
                          {cart.slice(0, 5).map(item => (
                             <img key={item.id} src={item.image} alt="" className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-[#1a1a1a] object-cover" />
                          ))}
                          {cart.length > 5 && (
                             <div className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-[#1a1a1a] bg-gray-200 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold">+{cart.length - 5}</div>
                          )}
                      </div>
                   </div>

                   {/* Payment Method Selector */}
                   <div>
                       <label className="text-xs font-medium text-slate-500 dark:text-gray-400 mb-3 block uppercase tracking-wider">Método de Pago</label>
                       <div className="grid grid-cols-2 gap-3">
                           <button 
                              onClick={() => setPaymentMethod('Tarjeta')}
                              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${paymentMethod === 'Tarjeta' ? 'bg-purple-50 dark:bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-300 shadow-sm' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-slate-500 hover:bg-gray-50 dark:hover:bg-white/10'}`}
                           >
                               <CreditCard size={24} className="mb-2" />
                               <span className="text-xs font-bold">Tarjeta</span>
                           </button>
                           <button 
                              onClick={() => setPaymentMethod('Efectivo')}
                              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${paymentMethod === 'Efectivo' ? 'bg-green-50 dark:bg-green-500/20 border-green-500 text-green-700 dark:text-green-300 shadow-sm' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-slate-500 hover:bg-gray-50 dark:hover:bg-white/10'}`}
                           >
                               <Banknote size={24} className="mb-2" />
                               <span className="text-xs font-bold">Efectivo</span>
                           </button>
                           <button 
                              onClick={() => setPaymentMethod('Transferencia')}
                              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${paymentMethod === 'Transferencia' ? 'bg-blue-50 dark:bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-slate-500 hover:bg-gray-50 dark:hover:bg-white/10'}`}
                           >
                               <Landmark size={24} className="mb-2" />
                               <span className="text-xs font-bold">Transf.</span>
                           </button>
                           <button 
                              onClick={() => setPaymentMethod('Móvil')}
                              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${paymentMethod === 'Móvil' ? 'bg-orange-50 dark:bg-orange-500/20 border-orange-500 text-orange-700 dark:text-orange-300 shadow-sm' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-slate-500 hover:bg-gray-50 dark:hover:bg-white/10'}`}
                           >
                               <Smartphone size={24} className="mb-2" />
                               <span className="text-xs font-bold">Móvil</span>
                           </button>
                       </div>
                   </div>
                </div>

                {/* Footer View 2: Detailed Totals + Proceed Button */}
                <div className="p-5 bg-white/50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10 backdrop-blur-md">
                   <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-sm text-slate-500 dark:text-gray-400">
                         <span>Subtotal</span>
                         <span>{currency.symbol}{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-500 dark:text-gray-400">
                         <span>Impuesto ({taxRate}%)</span>
                         <span>{currency.symbol}{taxAmount.toFixed(2)}</span>
                      </div>
                      <div 
                          className="flex justify-between text-2xl font-bold text-slate-900 dark:text-white pt-4 border-t border-gray-200 dark:border-white/10 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                              setCalcDisplay(total.toFixed(2));
                              setShowCalculator(true);
                          }}
                          title="Abrir Calculadora"
                      >
                         <span>Total</span>
                         <span className="flex items-center gap-2">{currency.symbol}{total.toFixed(2)} <CalcIcon size={20} className="text-slate-400" /></span>
                      </div>
                   </div>

                   <button 
                      onClick={triggerCheckout}
                      disabled={processing}
                      className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-lg shadow-lg hover:shadow-green-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                   >
                      {processing ? (
                        <>
                           <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                           Procesando...
                        </>
                      ) : (
                        <>
                           Proceder <CheckCircle2 size={20} />
                        </>
                      )}
                   </button>
                </div>
              </>
            )}
          </GlassCard>
        </div>

        {/* Quick View Modal */}
        {viewingProduct && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <GlassCard className="w-full max-w-2xl bg-white dark:bg-[#1a1a1a] p-0 overflow-hidden flex flex-col md:flex-row shadow-2xl">
                 <div className="w-full md:w-1/2 h-64 md:h-auto bg-gray-100 dark:bg-white/5 relative">
                     <ProductCardImage src={viewingProduct.image} alt={viewingProduct.name} isOutOfStock={viewingProduct.stock <= 0} />
                     <button 
                       onClick={() => setViewingProduct(null)}
                       className="absolute top-4 left-4 p-2 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white md:hidden"
                     >
                        <X size={24} />
                     </button>
                 </div>
                 <div className="w-full md:w-1/2 p-8 flex flex-col relative">
                     <button 
                       onClick={() => setViewingProduct(null)}
                       className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white hidden md:block"
                     >
                        <X size={24} />
                     </button>

                     <div className="mb-6">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 border ${getCategoryColor(viewingProduct.category)}`}>
                            {viewingProduct.category}
                        </span>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white leading-tight mb-2">
                            {viewingProduct.name}
                        </h2>
                        <div className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                            {currency.symbol}{viewingProduct.price.toFixed(2)}
                        </div>
                     </div>

                     <div className="space-y-4 mb-8">
                        <div className="flex justify-between items-center p-4 rounded-xl bg-gray-50 dark:bg-white/5">
                            <span className="text-slate-500 dark:text-gray-400 font-medium">Stock Disponible</span>
                            <span className={`font-bold ${
                                viewingProduct.stock <= 0 ? 'text-red-500' : 
                                viewingProduct.stock < lowStockThreshold ? 'text-amber-500' : 'text-green-500'
                            }`}>
                                {viewingProduct.stock > 0 ? `${viewingProduct.stock} unidades` : 'Agotado'}
                            </span>
                        </div>
                     </div>

                     <div className="mt-auto">
                        <button 
                            onClick={() => {
                                addToCart(viewingProduct);
                                setViewingProduct(null);
                            }}
                            disabled={viewingProduct.stock <= 0}
                            className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-lg shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            <ShoppingBag size={20} />
                            {viewingProduct.stock <= 0 ? 'Agotado' : 'Agregar al Carrito'}
                        </button>
                     </div>
                 </div>
             </GlassCard>
           </div>
        )}

        {/* Edit Product Modal */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4">
             <GlassCard className="w-full max-w-lg p-6 bg-white dark:bg-[#1a1a1a]">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-bold text-slate-900 dark:text-white">Editar Producto</h3>
                   <button onClick={() => setEditingProduct(null)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                      <X size={24} />
                   </button>
                </div>
                
                <form onSubmit={handleUpdateProductSubmit} className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                         <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-gray-300">Nombre</label>
                         <input 
                           required
                           type="text" 
                           value={editingProduct.name}
                           onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                           className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-colors text-slate-900 dark:text-white"
                         />
                      </div>
                      <div>
                         <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-gray-300">Precio</label>
                         <input 
                           required
                           type="number" 
                           min="0"
                           step="0.01"
                           value={editingProduct.price}
                           onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})}
                           className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-colors text-slate-900 dark:text-white"
                         />
                      </div>
                      <div>
                         <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-gray-300">Stock</label>
                         <input 
                           type="number" 
                           min="0"
                           value={editingProduct.stock}
                           onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value) || 0})}
                           className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-colors text-slate-900 dark:text-white"
                         />
                      </div>
                      <div className="col-span-2">
                         <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-gray-300">Categoría</label>
                         <input 
                           type="text" 
                           value={editingProduct.category}
                           onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                           className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-colors text-slate-900 dark:text-white"
                         />
                      </div>
                      <div className="col-span-2">
                         <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-gray-300">URL Imagen</label>
                         <input 
                           type="url" 
                           value={editingProduct.image}
                           onChange={e => setEditingProduct({...editingProduct, image: e.target.value})}
                           className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-colors text-slate-900 dark:text-white"
                         />
                      </div>
                   </div>
                   
                   <div className="flex gap-3 mt-6">
                      <button 
                        type="button"
                        onClick={() => setEditingProduct(null)}
                        className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-800 text-slate-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 transition-colors flex items-center justify-center gap-2"
                      >
                          <Save size={18} /> Guardar
                      </button>
                   </div>
                </form>
             </GlassCard>
          </div>
        )}

        {/* Edit Cart Item Quantity Modal */}
        {editingCartItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4">
             <GlassCard className="w-full max-w-sm p-6 bg-white dark:bg-[#1a1a1a]">
                <h3 className="text-lg font-bold mb-1 text-slate-900 dark:text-white">Editar Cantidad</h3>
                <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">{editingCartItem.name}</p>
                
                <div className="flex items-center gap-4 mb-6">
                    <button 
                      onClick={() => setEditingCartItem(prev => prev ? {...prev, quantity: Math.max(0, prev.quantity - 1)} : null)}
                      className="p-4 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                    >
                        <Minus size={24} />
                    </button>
                    <input 
                       type="number"
                       min="0"
                       value={editingCartItem.quantity}
                       onChange={(e) => setEditingCartItem(prev => prev ? {...prev, quantity: parseInt(e.target.value) || 0} : null)}
                       className="w-full text-center text-3xl font-bold bg-transparent outline-none text-slate-900 dark:text-white border-b-2 border-purple-500 pb-2"
                    />
                    <button 
                      onClick={() => setEditingCartItem(prev => prev ? {...prev, quantity: prev.quantity + 1} : null)}
                      className="p-4 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                    >
                        <Plus size={24} />
                    </button>
                </div>

                <div className="flex gap-3">
                    <button 
                       onClick={() => setEditingCartItem(null)}
                       className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-800 text-slate-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                       onClick={() => {
                           setItemQuantity(editingCartItem.id, editingCartItem.quantity);
                           setEditingCartItem(null);
                       }}
                       className="flex-1 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-bold hover:scale-105 transition-transform"
                    >
                        Confirmar
                    </button>
                </div>
             </GlassCard>
          </div>
        )}

        {/* Calculator Modal */}
        {showCalculator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
             <GlassCard className="w-full max-w-[320px] p-0 overflow-hidden bg-[#f0f0f3] dark:bg-[#1c1c1e] shadow-2xl border-none ring-1 ring-white/20">
                {/* Display */}
                <div className="bg-[#2c2c2e] p-6 text-right">
                    <button onClick={() => setShowCalculator(false)} className="absolute top-4 left-4 text-gray-500 hover:text-white"><X size={20} /></button>
                    <div className="text-white text-5xl font-light tracking-tight truncate">{calcDisplay}</div>
                </div>
                
                {/* Keypad */}
                <div className="grid grid-cols-4 gap-[1px] bg-[#3a3a3c] border-t border-[#3a3a3c]">
                   {['C', '+/-', '%', '/', '7', '8', '9', 'x', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='].map((btn, i) => (
                      <button 
                        key={btn}
                        onClick={() => handleCalcInput(btn)}
                        className={`h-20 text-2xl font-medium transition-colors active:opacity-70
                          ${btn === '0' ? 'col-span-2 text-left pl-8' : ''}
                          ${['/', 'x', '-', '+', '='].includes(btn) 
                              ? 'bg-orange-500 text-white' 
                              : ['C', '+/-', '%'].includes(btn) 
                                  ? 'bg-[#d4d4d2] dark:bg-[#a5a5a5] text-black' 
                                  : 'bg-white dark:bg-[#333333] text-black dark:text-white'
                          }
                        `}
                      >
                          {btn}
                      </button>
                   ))}
                </div>
             </GlassCard>
          </div>
        )}

        {/* Layout Config Modal */}
        {showLayoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4">
             <GlassCard className="w-full max-w-md p-6 bg-white dark:bg-[#1a1a1a]">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Diseño del Grid</h3>
                    <button onClick={() => setShowLayoutModal(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                        <X size={24} />
                    </button>
                 </div>

                 <div className="mb-6">
                     <label className="flex items-center gap-2 text-sm font-medium mb-4 text-slate-700 dark:text-gray-300">
                         <Columns size={16} /> Columnas ({layoutConfig.columns})
                     </label>
                     <input 
                        type="range" 
                        min="2" 
                        max="6" 
                        step="1" 
                        value={layoutConfig.columns} 
                        onChange={(e) => setLayoutConfig({...layoutConfig, columns: parseInt(e.target.value)})}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                     />
                     <div className="flex justify-between text-xs text-slate-400 mt-2">
                         <span>Grande</span>
                         <span>Pequeño</span>
                     </div>
                 </div>

                 <div className="mb-6">
                     <label className="flex items-center gap-2 text-sm font-medium mb-4 text-slate-700 dark:text-gray-300">
                         <Box size={16} /> Densidad (Espaciado)
                     </label>
                     <div className="grid grid-cols-3 gap-2">
                         {['compact', 'normal', 'comfortable'].map((d) => (
                             <button
                                key={d}
                                onClick={() => setLayoutConfig({...layoutConfig, density: d as any})}
                                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors capitalize ${
                                   layoutConfig.density === d 
                                   ? 'bg-purple-100 dark:bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-300' 
                                   : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                                }`}
                             >
                                 {d === 'comfortable' ? 'Amplia' : d === 'compact' ? 'Compacta' : 'Normal'}
                             </button>
                         ))}
                     </div>
                 </div>

                 <div>
                     <label className="flex items-center gap-2 text-sm font-medium mb-4 text-slate-700 dark:text-gray-300">
                         <LayoutGrid size={16} /> Orden de Elementos
                     </label>
                     <div className="space-y-2">
                         {layoutConfig.elementOrder.map((el, idx) => (
                             <div key={el} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                 <span className="capitalize text-sm font-medium text-slate-700 dark:text-gray-300">
                                     {el === 'meta' ? 'Categoría & Stock' : el === 'name' ? 'Nombre' : el === 'image' ? 'Imagen' : 'Precio'}
                                 </span>
                                 <div className="flex gap-1">
                                     <button 
                                        onClick={() => moveLayoutElement(idx, 'up')}
                                        disabled={idx === 0}
                                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30"
                                     >
                                         <ArrowUp size={14} />
                                     </button>
                                     <button 
                                        onClick={() => moveLayoutElement(idx, 'down')}
                                        disabled={idx === layoutConfig.elementOrder.length - 1}
                                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30"
                                     >
                                         <ArrowDown size={14} />
                                     </button>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
             </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
};
