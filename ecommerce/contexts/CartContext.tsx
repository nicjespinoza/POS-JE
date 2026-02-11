'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, doc, onSnapshot } from '../lib/firebase';
import { toast } from 'sonner';
import { CartItem } from '../lib/types';

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: unknown) => void;
    removeFromCart: (id: string) => void;
    clearCart: () => void;
    total: number;
    count: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<CartItem[]>([]);

    const removeFromCart = useCallback((id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    }, []);

    const updateQuantity = useCallback((id: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(id);
            return;
        }
        setCart(prev => prev.map(p => p.id === id ? { ...p, quantity } : p));
    }, [removeFromCart]);

    // Real-time Stock Validation
    useEffect(() => {
        if (cart.length === 0) return;

        const unsubscribes = cart.map((item) => {
            return onSnapshot(doc(db, 'products', item.id), (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const data = docSnapshot.data();
                    const currentStock = data.stock || 0;

                    // Alert if stock drops below cart quantity
                    if (currentStock < item.quantity) {
                        toast.error(`⚠️ Stock insuficiente para ${item.name}. Disponible: ${currentStock}`);
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
    }, [cart, updateQuantity, removeFromCart]);

    const addToCart = (product: unknown) => {
        const p = product as { id: string; stock: number; name: string; price: number };
        setCart(prev => {
            const existing = prev.find(item => item.id === p.id);
            if (existing) {
                if (existing.quantity + 1 > p.stock) {
                    toast.error('No hay más stock disponible');
                    return prev;
                }
                return prev.map(item => item.id === p.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            if (p.stock < 1) {
                toast.error('Producto agotado');
                return prev;
            }
            return [...prev, { ...p, quantity: 1 } as CartItem];
        });
        toast.success('Agregado al carrito');
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
