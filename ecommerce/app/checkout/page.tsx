'use client';
import React, { useEffect, useState } from 'react';
import { db, collection, addDoc, Timestamp, storage, ref, uploadBytes, getDownloadURL } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Truck, CreditCard, ChevronRight, UploadCloud, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { processAtomicSale } from '../../services/inventoryService';
import { Transaction, TransactionType } from '../../lib/types';

export default function CheckoutPage() {
    const { user, loading, userProfile } = useAuth();
    const { cart, total, clearCart } = useCart();
    const router = useRouter();

    const [step, setStep] = useState(1); // 1: Address, 2: Payment
    const [address, setAddress] = useState({
        street: '',
        city: '',
        zip: '',
        country: 'Costa Rica'
    });

    // Payment State
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer'>('card');
    const [transferImage, setTransferImage] = useState<string>('');
    const [uploadingImage, setUploadingImage] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            toast.error('Debes iniciar sesión para comprar');
            router.push('/login?redirect=/checkout');
        }
    }, [user, loading, router]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setUploadingImage(true);
            try {
                const storageRef = ref(storage, `receipts/${user?.uid}/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                setTransferImage(url);
                toast.success('Comprobante subido correctamente');
            } catch (error) {
                console.error(error);
                toast.error('Error al subir la imagen');
            } finally {
                setUploadingImage(false);
            }
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Cargando...</div>;
    if (!user) return null; // Will redirect

    if (cart.length === 0) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-2xl font-bold mb-4">Tu carrito está vacío</h1>
                <button onClick={() => router.push('/')} className="text-purple-400 font-bold hover:underline">
                    Volver a la tienda
                </button>
            </div>
        )
    }

    const handleProcessPayment = async () => {
        if (!user) return;
        if (processing) return;

        setProcessing(true);

        try {
            // 1. Simulate Payment Gateway Delay if Card
            if (paymentMethod === 'card') {
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }

            // 2. Prepare Transaction Data
            const status = paymentMethod === 'transfer' ? 'PENDING_VERIFICATION' : 'COMPLETED';
            const transactionId = crypto.randomUUID();

            // Build Unified Transaction Object
            const transactionData: Transaction = {
                id: transactionId,
                date: new Date().toISOString(),
                amount: total,
                type: TransactionType.INCOME,
                category: paymentMethod === 'transfer' ? 'Venta Online (Transferencia)' : 'Venta Online (Tarjeta)',
                description: `Pedido Web - ${user.email} - ${cart.length} items`,
                paymentMethod: paymentMethod === 'transfer' ? 'Transferencia' : 'Tarjeta',
                status: status,
                branchId: 'main', // Default for online sales
                userId: user.uid,
                customerName: user.displayName || user.email || 'Cliente Web',
                items: cart
            };

            // 3. Process Sale (Atomic Inventory Update)
            const atomicItems = cart.map(item => ({
                productId: item.id,
                branchId: 'main',
                quantity: item.quantity,
                productName: item.name
            }));

            // Only deduct inventory immediately if payment is confirmed (Card) or if we reserve stock for transfers?
            // For now, let's treat both as "Sales" that deduct stock to prevent overselling.
            // If transfer fails, admin can cancel/refund (add stock back).
            await processAtomicSale(
                transactionData,
                atomicItems,
                user.uid,
                user.displayName || 'Cliente Web'
            );

            // 4. Save Order Metadata (Optional, if we want a separate orders collection, but transactions + inventory_movements is often enough)
            // But CheckoutUI usually expects an order ID. We can use transactionID.
            // Existing code used 'orders', let's stick to it for the UI dashboard compatibility if needed.
            // But ideally we unify to 'transactions'.
            // Let's Add back 'orders' for backward compat with whatever 'dashboard' uses.
            // (Assuming 'dashboard' reads orders). If not, we can remove later.
            const orderData = {
                userId: user.uid,
                customerName: user.displayName || user.email,
                items: cart,
                total: total,
                status: status,
                address: address,
                createdAt: Timestamp.now(),
                paymentMethod: paymentMethod === 'transfer' ? 'Bank Transfer' : 'Credit Card',
                proofOfPayment: paymentMethod === 'transfer' ? transferImage : null,
                transactionId: transactionId,
                branchId: 'main'
            };
            await addDoc(collection(db, 'orders'), orderData);


            // 5. Clear and Redirect
            clearCart();
            toast.success(paymentMethod === 'transfer' ? 'Pedido realizado. Esperando verificación.' : '¡Compra realizada con éxito!');
            router.push('/dashboard');

        } catch (error) {
            console.error("Order processing error:", error);
            toast.error('Error al procesar el pedido. Intenta nuevamente.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white pt-24 pb-12 px-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">

                {/* Left Column: Forms */}
                <div>
                    <div className="flex items-center gap-4 mb-8 text-sm">
                        <span className={`flex items-center gap-2 ${step >= 1 ? 'text-white' : 'text-gray-600'}`}>
                            <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">1</span>
                            Envío
                        </span>
                        <div className="w-12 h-px bg-white/10" />
                        <span className={`flex items-center gap-2 ${step >= 2 ? 'text-white' : 'text-gray-600'}`}>
                            <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">2</span>
                            Pago
                        </span>
                    </div>

                    {step === 1 && (
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <Truck className="text-purple-400" /> Dirección de Envío
                            </h2>
                            <div className="space-y-4">
                                <input
                                    type="text" placeholder="Dirección Exacta"
                                    className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-purple-500 transition-colors"
                                    value={address.street} onChange={e => setAddress({ ...address, street: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="text" placeholder="Ciudad"
                                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-purple-500 transition-colors"
                                        value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })}
                                    />
                                    <input
                                        type="text" placeholder="Código Postal"
                                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-purple-500 transition-colors"
                                        value={address.zip} onChange={e => setAddress({ ...address, zip: e.target.value })}
                                    />
                                </div>

                                <button
                                    onClick={() => setStep(2)}
                                    disabled={!address.street || !address.city}
                                    className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6 flex items-center justify-center gap-2"
                                >
                                    Continuar al Pago <ChevronRight size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <CreditCard className="text-purple-400" /> Método de Pago
                            </h2>

                            <div className="flex gap-4 mb-6">
                                <button
                                    onClick={() => setPaymentMethod('card')}
                                    className={`flex-1 p-4 rounded-xl border ${paymentMethod === 'card' ? 'bg-purple-600/20 border-purple-500' : 'bg-white/5 border-white/10 hover:bg-white/10'} transition-all flex flex-col items-center gap-2`}
                                >
                                    <CreditCard size={24} />
                                    <span className="font-semibold">Tarjeta</span>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('transfer')}
                                    className={`flex-1 p-4 rounded-xl border ${paymentMethod === 'transfer' ? 'bg-purple-600/20 border-purple-500' : 'bg-white/5 border-white/10 hover:bg-white/10'} transition-all flex flex-col items-center gap-2`}
                                >
                                    <UploadCloud size={24} />
                                    <span className="font-semibold">Transferencia</span>
                                </button>
                            </div>

                            {paymentMethod === 'card' ? (
                                <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 p-6 rounded-2xl mb-6 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                                        <CreditCard size={120} />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-4">Tarjeta de Crédito / Débito</h3>
                                    <p className="text-sm text-gray-400 mb-6">Procesado de forma segura por BAC Credomatic / Tilopay.</p>
                                    <div className="space-y-4 relative z-10">
                                        <input type="text" placeholder="Número de Tarjeta" className="w-full bg-black/50 border border-white/10 p-3 rounded-lg" disabled />
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="text" placeholder="MM/YY" className="w-full bg-black/50 border border-white/10 p-3 rounded-lg" disabled />
                                            <input type="text" placeholder="CVC" className="w-full bg-black/50 border border-white/10 p-3 rounded-lg" disabled />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl mb-6">
                                    <h3 className="text-lg font-semibold mb-2">Transferencia Bancaria</h3>
                                    <p className="text-sm text-gray-400 mb-4">
                                        Realiza la transferencia a la cuenta <strong>CR1234567890</strong> (BAC) y sube el comprobante.
                                    </p>

                                    <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-purple-500/50 transition-colors relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        {uploadingImage ? (
                                            <div className="flex flex-col items-center gap-2 text-purple-400">
                                                <Loader2 className="animate-spin" /> Subiendo comprobante...
                                            </div>
                                        ) : transferImage ? (
                                            <div className="relative">
                                                <img src={transferImage} alt="Comprobante" className="max-h-40 mx-auto rounded-lg" />
                                                <div className="mt-2 text-green-400 text-sm font-semibold">¡Comprobante cargado!</div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-gray-400">
                                                <UploadCloud size={32} />
                                                <span>Clic para subir imagen del comprobante</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {paymentMethod === 'card' && (
                                <div className="flex items-center gap-2 text-xs text-green-400 mb-6 bg-green-900/20 p-3 rounded-lg border border-green-900/50">
                                    <Lock size={14} /> Conexión cifrada SSL de 256-bits.
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button onClick={() => setStep(1)} className="px-6 py-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                                    Atrás
                                </button>
                                <button
                                    onClick={handleProcessPayment}
                                    disabled={processing || (paymentMethod === 'transfer' && !transferImage)}
                                    className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-blue-600 font-bold rounded-xl hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {processing ? <Loader2 className="animate-spin" /> : (paymentMethod === 'transfer' ? 'Confirmar Transferencia' : `Pagar $${total.toFixed(2)}`)}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Right Column: Order Summary */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 h-fit">
                    <h3 className="text-xl font-bold mb-6">Resumen del Pedido</h3>
                    <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {cart.map((item) => (
                            <div key={item.id} className="flex gap-4 items-center">
                                <img src={item.image} className="w-16 h-16 rounded-xl object-cover bg-gray-800" />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-sm">{item.name}</h4>
                                    <p className="text-xs text-gray-400">Cant: {item.quantity}</p>
                                </div>
                                <div className="font-bold text-sm">
                                    ${(item.price * item.quantity).toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-white/10 pt-4 space-y-2">
                        <div className="flex justify-between text-gray-400 text-sm">
                            <span>Subtotal</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-400 text-sm">
                            <span>Envío</span>
                            <span>Gratis</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold pt-4 border-t border-white/10 mt-4">
                            <span>Total</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
