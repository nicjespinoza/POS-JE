'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, doc, onSnapshot } from '../lib/firebase';
import { toast } from 'sonner';
import { CartItem } from '../lib/types';

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: any) => void;
    removeFromCart: (id: string) => void;
    clearCart: () => void;
    total: number;
    count: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<CartItem[]>([]);

    // Real-time Stock Validation
    useEffect(() => {
        if (cart.length === 0) return;

        const unsubscribes = cart.map((item) => {
            // Listen to specific product stock changes in 'inventory' or 'stocks' collection
            // Assuming 'products' contains the master data and stock for now, 
            // or if using the POS structure: 'products' has stock? 
            // Plan said: stocks/{branchId}_{productId}. 
            // For E-commerce, we aggregate or pick a main warehouse branch (e.g., 'suc1' or 'warehouse').
            // Let's assume 'suc1' is the main for now or check global product doc if simplified.
            // Based on POS DataContext: products collection had stock directly in simplified mode?
            // Let's check DataContext.tsx logic again.
            // Actually, let's use a safe fallback: check 'products' collection first.

            return onSnapshot(doc(db, 'products', item.id), (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = docSnapshot.data();
                    const currentStock = data.stock || 0;

                    // Alert if stock drops below cart quantity
                    if (currentStock < item.quantity) {
                        toast.error(`⚠️ Stock insuficiente para ${item.name}. Disponible: ${currentStock}`);
                        // Auto-update cart to max available? Or just warn?
                        // Let's just warn for now to avoid confusing UI jumps, or clamp it.
                        updateQuantity(item.id, currentStock);
                    }
                } else {
                    toast.error(`❌ El producto ${item.name} ya no está disponible.`);
                    removeFromCart(item.id);
                }
            });
        });

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [cart]);

    const addToCart = (product: any) => {
        setCart(prev => {
            const existing = prev.find(p => p.id === product.id);
            if (existing) {
                if (existing.quantity + 1 > product.stock) {
                    toast.error('No hay más stock disponible');
                    return prev;
                }
                return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
            }
            if (product.stock < 1) {
                toast.error('Producto agotado');
                return prev;
            }
            return [...prev, { ...product, quantity: 1 }];
        });
        toast.success('Agregado al carrito');
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const updateQuantity = (id: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(id);
            return;
        }
        setCart(prev => prev.map(p => p.id === id ? { ...p, quantity } : p));
    };

    const clearCart = () => setCart([]);

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, total, count }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within a CartProvider');
    return context;
};
