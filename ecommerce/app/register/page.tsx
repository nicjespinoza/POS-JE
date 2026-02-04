'use client';
import React, { useState } from 'react';
import { createUserWithEmailAndPassword, auth, db, doc, setDoc } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create extra user doc in 'users' or 'customers' collection
            // Standardizing on 'users' for now, distinguishing by 'role'
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                name,
                email,
                role: 'customer',
                createdAt: new Date(),
                royaltyPoints: 0
            });

            toast.success('Cuenta creada exitosamente');
            router.push('/');
        } catch (err: any) {
            console.error(err);
            toast.error('Error al registrarse: ' + err.message);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />

            <div className="w-full max-w-md relative z-10">
                <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8">
                    <ArrowLeft size={20} /> Volver a la tienda
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl"
                >
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold tracking-tighter mb-2">Crear Cuenta</h1>
                        <p className="text-gray-400 text-sm">Únete a Titanium para beneficios exclusivos.</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-6">
                        <div>
                            <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold ml-1">Nombre Completo</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full mt-2 px-4 py-3 rounded-xl bg-black/20 border border-white/10 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                placeholder="Juan Pérez"
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold ml-1">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full mt-2 px-4 py-3 rounded-xl bg-black/20 border border-white/10 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                placeholder="tu@email.com"
                            />
                        </div>
                        <div>
                            <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold ml-1">Contraseña</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full mt-2 px-4 py-3 rounded-xl bg-black/20 border border-white/10 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                placeholder="••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-white text-black font-bold rounded-xl hover:scale-[1.02] transition-transform"
                        >
                            Registrarse
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-gray-500">
                        ¿Ya tienes cuenta?{' '}
                        <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                            Entra aquí
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
