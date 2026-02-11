'use client';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, collection, query, where, orderBy, onSnapshot, doc, getDoc } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Package, Gift, LogOut, User as UserIcon } from 'lucide-react';

export default function DashboardPage() {
    const { user, userProfile, loading, logout } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [royaltyPoints, setRoyaltyPoints] = useState(0);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // Fetch User Data & Orders — gate on userProfile to ensure auth token is ready
    useEffect(() => {
        if (!user || !userProfile) return;

        // 1. Get Loyalty Points from 'users' collection
        const unsubUser = onSnapshot(doc(db, 'users', user.uid), (doc) => {
            if (doc.exists()) {
                setRoyaltyPoints(doc.data().royaltyPoints || 0);
            }
        }, (err) => console.warn('Dashboard user listener:', err.message));

        // 2. Get Orders
        const q = query(
            collection(db, 'orders'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubOrders = onSnapshot(q, (snapshot) => {
            const items: any[] = [];
            snapshot.forEach(doc => {
                items.push({ id: doc.id, ...doc.data() });
            });
            setOrders(items);
        }, (err) => console.warn('Dashboard orders listener:', err.message));

        return () => {
            unsubUser();
            unsubOrders();
        };
    }, [user, userProfile]);

    if (loading || !user) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Cargando...</div>;

    return (
        <div className="min-h-screen bg-black text-white pt-24 pb-12 px-6">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <UserIcon className="text-purple-400" /> Hola, {user.displayName || 'Cliente'}
                        </h1>
                        <p className="text-gray-400 mt-1">Bienvenido a tu panel de control.</p>
                    </div>
                    <button
                        onClick={() => { logout(); router.push('/'); }}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors flex items-center gap-2"
                    >
                        <LogOut size={16} /> Cerrar Sesión
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Stats / Loyalty Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 p-8 rounded-3xl border border-white/10 relative overflow-hidden"
                    >
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 text-purple-300 font-medium mb-2">
                                <Gift size={20} /> Puntos Titanium
                            </div>
                            <div className="text-5xl font-bold mb-4">{royaltyPoints}</div>
                            <p className="text-sm text-gray-300">
                                Ganas 5% de cashback en puntos por cada compra. ¡Úsalos en tu próximo pedido!
                            </p>
                        </div>
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Gift size={150} />
                        </div>
                    </motion.div>

                    {/* Orders History */}
                    <div className="md:col-span-2 space-y-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Package className="text-blue-400" /> Mis Pedidos Recientes
                        </h2>

                        {orders.length === 0 ? (
                            <div className="bg-white/5 rounded-2xl p-8 text-center border border-white/10 text-gray-400">
                                Aún no has realizado ninguna compra.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map((order) => (
                                    <motion.div
                                        key={order.id}
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                                                    ID: {order.id.slice(0, 8)}...
                                                </div>
                                                <div className="font-semibold text-lg">
                                                    {order.createdAt?.toDate().toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase
                                          ${order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                                                    order.status === 'shipped' ? 'bg-blue-500/20 text-blue-400' :
                                                        order.status === 'verifying_payment' ? 'bg-orange-500/20 text-orange-400' :
                                                            'bg-purple-500/20 text-purple-400'}`
                                            }>
                                                {order.status === 'processing' ? 'Pago Exitoso / Procesando' :
                                                    order.status === 'verifying_payment' ? 'Verificando Pago' :
                                                        order.status === 'shipped' ? 'Enviado' :
                                                            order.status === 'delivered' ? 'Entregado' : order.status}
                                            </div>
                                        </div>

                                        {order.status === 'verifying_payment' && (
                                            <div className="mb-4 bg-orange-900/20 border border-orange-900/50 p-3 rounded-lg text-xs text-orange-200">
                                                ⏳ Tu pago por transferencia está en revisión. Esto puede tomar de 24 a 72 horas.
                                                Te notificaremos cuando sea aprobado.
                                            </div>
                                        )}

                                        <div className="space-y-2 mb-4">
                                            {order.items.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between text-sm">
                                                    <span className="text-gray-300">{item.quantity}x {item.name}</span>
                                                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                                            <span className="text-sm text-gray-400">Total Pagado</span>
                                            <span className="text-xl font-bold">${order.total.toFixed(2)}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
