'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { db, doc, collection, query, where, onSnapshot } from '../lib/firebase';
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

    // [SCALABILITY] Stable key that only changes when cart item IDs change (not quantities)
    const cartIdKey = useMemo(() => cart.map(c => c.id).sort().join(','), [cart]);
    // Keep a ref to current cart for use inside listener without re-subscribing
    const cartRef = useRef(cart);
    cartRef.current = cart;

    // [SCALABILITY] Batched real-time stock validation using 'in' queries
    // Replaces N individual listeners with ceil(N/30) batch listeners
    useEffect(() => {
        const currentIds = cartRef.current.map(item => item.id);
        if (currentIds.length === 0) return;

        // Firestore 'in' queries support max 30 values
        const chunks: string[][] = [];
        for (let i = 0; i < currentIds.length; i += 30) {
            chunks.push(currentIds.slice(i, i + 30));
        }

        const unsubscribes = chunks.map(chunk => {
            const q = query(
                collection(db, 'products'),
                where('__name__', 'in', chunk)
            );

            return onSnapshot(q, (snapshot) => {
                snapshot.docChanges().forEach(change => {
                    const productId = change.doc.id;
                    const cartItem = cartRef.current.find(c => c.id === productId);
                    if (!cartItem) return;

                    if (change.type === 'modified') {
                        const data = change.doc.data();
                        const currentStock = data.stock || 0;
                        if (currentStock < cartItem.quantity) {
                            toast.error(`Stock insuficiente para ${cartItem.name}. Disponible: ${currentStock}`);
                            updateQuantity(productId, currentStock);
                        }
                    } else if (change.type === 'removed') {
                        toast.error(`El producto ${cartItem.name} ya no esta disponible.`);
                        removeFromCart(productId);
                    }
                });
            });
        });

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cartIdKey, updateQuantity, removeFromCart]);

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
