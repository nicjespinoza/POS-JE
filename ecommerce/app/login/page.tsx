'use client';
import React, { useState } from 'react';
import { signInWithEmailAndPassword, auth } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            toast.success('Bienvenido de nuevo');
            router.push('/');
        } catch (err) {
            toast.error('Error al iniciar sesión. Verifique sus credenciales.');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />

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
                        <h1 className="text-3xl font-bold tracking-tighter mb-2">Iniciar Sesión</h1>
                        <p className="text-gray-400 text-sm">Accede a tu cuenta para gestionar pedidos y regalías.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold ml-1">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full mt-2 px-4 py-3 rounded-xl bg-black/20 border border-white/10 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
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
                                className="w-full mt-2 px-4 py-3 rounded-xl bg-black/20 border border-white/10 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                                placeholder="••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-white text-black font-bold rounded-xl hover:scale-[1.02] transition-transform"
                        >
                            Entrar
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-gray-500">
                        ¿No tienes cuenta?{' '}
                        <Link href="/register" className="text-purple-400 hover:text-purple-300 font-medium">
                            Regístrate aquí
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
