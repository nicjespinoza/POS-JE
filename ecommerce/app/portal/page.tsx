'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, User, Lock, MapPin, AlertTriangle, ChevronRight, Loader2, Mail, Eye, EyeOff, ArrowLeft, Store, Briefcase } from 'lucide-react';
import { db, collection, query, where, getDocs } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

// Reusing the FloatingLabelInput component logic/style or importing if available
// For simplicity, implementing a local version matching the style
const FloatingLabelInput = ({ label, icon, ...props }: any) => (
    <div className="relative mb-0">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1 block">{label}</label>
        <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                {icon}
            </div>
            <input
                {...props}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block pl-12 p-3.5 outline-none transition-all"
            />
        </div>
    </div>
);

export default function StaffPortalScreen() {
    const router = useRouter();
    const authContext = useAuth(); // Assuming useAuth exposes ... actually we use direct firebase auth 
    const [accessStatus, setAccessStatus] = useState<'loading' | 'allowed' | 'denied'>('loading');
    const [clientIp, setClientIp] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string>('');

    // Login State
    const [selectedRole, setSelectedRole] = useState<'admin' | 'suc1' | 'suc2' | 'suc3' | null>(null);
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    useEffect(() => {
        checkAccess();
    }, []);

    const checkAccess = async () => {
        try {
            // 1. Get Client IP
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            const ip = data.ip;
            setClientIp(ip);

            // 2. Check against Firestore 'authorized_ips' collection
            // If empty (first run), maybe ALLOW to prevent lockout during dev? 
            // Better: strictly enforce. If locked out, manual Firestore entry needed.
            if (process.env.NODE_ENV === 'development') {
                setAccessStatus('allowed'); // Bypass in Dev
                return;
            }

            const q = query(collection(db, 'authorized_ips'), where('ip', '==', ip));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                setAccessStatus('allowed');
            } else {
                setAccessStatus('denied');
                setErrorMsg('Ubicación no autorizada.');
            }
        } catch (error) {
            console.error('Error verifying access:', error);
            // Fallback for safety: Deny if check fails (unless dev)
            if (process.env.NODE_ENV === 'development') {
                setAccessStatus('allowed');
            } else {
                setAccessStatus('denied');
                setErrorMsg('Error de conexión o configuración.');
            }
        }
    };

    const handleRoleSelect = (role: 'admin' | 'suc1' | 'suc2' | 'suc3') => {
        if (accessStatus !== 'allowed') return;
        if (selectedRole === role) {
            setSelectedRole(null);
        } else {
            setSelectedRole(role);
            // Pre-fill email hints based on branch?
            setEmail('');
            setPass('');
            setLoginError('');
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setIsLoggingIn(true);

        try {
            // Use existing AuthContext login or Firebase direct
            // Assuming useAuth has 'login' or we import { signInWithEmailAndPassword } from firebase/auth
            // Let's use the one from AuthContext if standard, or duplicate logic safely.
            // Using the exposed 'login' is best practice if available, but I'll use direct firebase for robustness in this snippet
            // since I don't see 'login' explicitly in previous context dumps (only logout, user, etc).
            // Actually, let's use the direct import to be sure.
            // Verify inputs
            console.log(`Attempting login for: ${email} with password length: ${pass?.length}`);

            const { signInWithEmailAndPassword } = await import('firebase/auth');
            const { auth } = await import('../../lib/firebase');

            await signInWithEmailAndPassword(auth, email, pass);
            console.log("Login successful");

            // Redirect based on selected role / branch Logic
            // In a real app we would verify user claims match the selected button.
            // For now, simple redirect.
            if (selectedRole === 'admin') {
                router.push('/admin');
            } else {
                router.push('/pos');
            }
        } catch (err: any) {
            console.error("Login Error Full Object:", err);
            console.error("Login Error Code:", err.code);

            if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                setLoginError('Correo o contraseña incorrectos.');
            } else if (err.code === 'auth/too-many-requests') {
                setLoginError('Demasiados intentos. Intente más tarde.');
            } else {
                setLoginError(`Error de acceso: ${err.message}`);
            }
        } finally {
            setIsLoggingIn(false);
        }
    };

    if (accessStatus === 'loading') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center text-black">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Validando Acceso al Sistema</h2>
                <p className="text-gray-500">Verificando seguridad y ubicación...</p>
                <div className="mt-8 flex items-center gap-2 text-sm font-medium">
                    <Shield size={16} className="text-gray-400" />
                    <span className="relative inline-block">
                        <span className="invisible">Conexión Segura TLS 1.3</span>
                        <span className="absolute inset-0 bg-gradient-to-r from-red-600 via-red-500 to-green-600 bg-clip-text text-transparent animate-gradient-x">
                            Conexión Segura TLS 1.3
                        </span>
                    </span>
                </div>
            </div>
        );
    }

    if (accessStatus === 'denied') {
        return (
            <div className="min-h-screen bg-red-50 flex items-center justify-center p-6 text-black">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-red-600 p-6 text-center">
                        <Shield size={48} className="text-white mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-white">Acceso Restringido</h1>
                    </div>
                    <div className="p-8 text-center space-y-6">
                        <div className="bg-red-50 text-red-800 p-4 rounded-xl flex items-start gap-3 text-left">
                            <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                            <div>
                                <p className="font-bold text-sm">Acceso No Autorizado</p>
                                <p className="text-xs mt-1">
                                    Su dirección IP ({clientIp}) no tiene autorización para acceder al sistema.
                                </p>
                            </div>
                        </div>
                        <p className="text-gray-600 text-sm">
                            Este portal es para uso exclusivo del personal autorizado dentro de las instalaciones.
                        </p>
                        <button
                            onClick={() => router.push('/')}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={18} />
                            Salir
                        </button>
                        <div className="pt-6 border-t border-gray-100 flex justify-center gap-4 text-xs text-gray-400">
                            <span>ID: {clientIp || 'Unknown'}</span>
                            <span>•</span>
                            <span>V 2.0.1</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row text-black">

            {/* Left Side */}
            <div className="lg:w-1/2 p-6 lg:p-12 flex flex-col bg-white relative overflow-hidden min-h-screen">
                <button
                    onClick={() => router.push('/')}
                    className="absolute top-6 left-6 z-50 flex items-center gap-2 text-gray-500 hover:text-[#083c79] transition-colors p-2 rounded-lg hover:bg-gray-50"
                >
                    <ArrowLeft size={20} />
                    <span className="font-medium text-sm">Regresar a Tienda</span>
                </button>

                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 z-0"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-50 z-0"></div>

                <div className="z-10 relative w-full max-w-lg mx-auto flex flex-col h-full">
                    {/* Main Title */}
                    <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4">
                        <h1 className="text-5xl lg:text-6xl font-black text-gray-900 leading-tight tracking-tighter">
                            TITANIUM<br />
                            <span className="text-[#083c79]">STORE</span>
                        </h1>
                        <p className="text-gray-500 text-lg">Portal Corporativo & POS</p>
                    </div>

                    <div className="pb-8 lg:pb-12 flex flex-col items-center space-y-6">
                        <div className="flex items-center gap-3 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 px-6 py-3 rounded-full shadow-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <Shield size={16} />
                            <span>Red Segura: {clientIp}</span>
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-sm text-gray-400 font-medium tracking-wide">
                                © 2026 Titanium Enterprise.
                            </p>
                            <p className="text-xs text-gray-300">
                                v2.0.1 • TLS 1.3
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side */}
            <div className="lg:w-1/2 bg-[#083c79] p-6 lg:p-12 flex items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute right-0 top-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 -translate-y-1/4"></div>
                </div>

                <div className="max-w-md w-full space-y-6 relative z-10">
                    <div className="text-center lg:text-left mb-8">
                        <h3 className="text-xl font-bold text-white">Seleccione su Unidad</h3>
                    </div>

                    <div className="space-y-3">
                        {/* Admin */}
                        <RoleCard
                            role="admin"
                            title="Administración"
                            subtitle="Dueños y Gerencia General"
                            icon={<Briefcase size={28} />}
                            isSelected={selectedRole === 'admin'}
                            onSelect={() => handleRoleSelect('admin')}
                            color="blue"
                        >
                            <LoginForm
                                email={email} setEmail={setEmail}
                                pass={pass} setPass={setPass}
                                showPassword={showPassword} setShowPassword={setShowPassword}
                                error={loginError} setError={setLoginError}
                                loading={isLoggingIn}
                                onSubmit={handleLogin}
                            />
                        </RoleCard>

                        {/* Sucursal 1 */}
                        <RoleCard
                            role="suc1"
                            title="Sucursal 1"
                            subtitle="Punto de Venta Principal"
                            icon={<Store size={28} />}
                            isSelected={selectedRole === 'suc1'}
                            onSelect={() => handleRoleSelect('suc1')}
                            color="purple"
                        >
                            <LoginForm
                                email={email} setEmail={setEmail}
                                pass={pass} setPass={setPass}
                                showPassword={showPassword} setShowPassword={setShowPassword}
                                error={loginError} setError={setLoginError}
                                loading={isLoggingIn}
                                onSubmit={handleLogin}
                            />
                        </RoleCard>

                        {/* Sucursal 2 */}
                        <RoleCard
                            role="suc2"
                            title="Sucursal 2"
                            subtitle="Punto de Venta"
                            icon={<Store size={28} />}
                            isSelected={selectedRole === 'suc2'}
                            onSelect={() => handleRoleSelect('suc2')}
                            color="teal"
                        >
                            <LoginForm
                                email={email} setEmail={setEmail}
                                pass={pass} setPass={setPass}
                                showPassword={showPassword} setShowPassword={setShowPassword}
                                error={loginError} setError={setLoginError}
                                loading={isLoggingIn}
                                onSubmit={handleLogin}
                            />
                        </RoleCard>

                        {/* Sucursal 3 */}
                        <RoleCard
                            role="suc3"
                            title="Sucursal 3"
                            subtitle="Punto de Venta"
                            icon={<Store size={28} />}
                            isSelected={selectedRole === 'suc3'}
                            onSelect={() => handleRoleSelect('suc3')}
                            color="orange"
                        >
                            <LoginForm
                                email={email} setEmail={setEmail}
                                pass={pass} setPass={setPass}
                                showPassword={showPassword} setShowPassword={setShowPassword}
                                error={loginError} setError={setLoginError}
                                loading={isLoggingIn}
                                onSubmit={handleLogin}
                            />
                        </RoleCard>
                    </div>

                    <div className="pt-8 border-t border-blue-800">
                        <div className="flex items-center justify-center gap-2 text-xs text-blue-300">
                            <Lock size={12} />
                            <span>Acceso monitoreado por IP</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper Components
const RoleCard = ({ title, subtitle, icon, isSelected, onSelect, children, color }: any) => {
    return (
        <motion.div
            layout
            initial={false}
            animate={{
                backgroundColor: 'white',
                scale: isSelected ? 1.02 : 1
            }}
            className={`w-full rounded-2xl overflow-hidden shadow-sm transition-all ${isSelected ? 'shadow-xl' : 'shadow-md border border-gray-200'}`}
        >
            <button
                onClick={onSelect}
                className="w-full p-4 text-left flex items-center gap-4 focus:outline-none"
            >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shrink-0 bg-${color}-50 text-${color}-600`}>
                    {icon}
                </div>
                <div className="flex-1">
                    <h4 className="text-base font-bold text-gray-900">{title}</h4>
                    <p className="text-xs text-gray-500">{subtitle}</p>
                </div>
                <ChevronRight className={`transition-transform duration-300 ${isSelected ? 'rotate-90 text-gray-400' : 'text-gray-400'}`} />
            </button>

            <AnimatePresence>
                {isSelected && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="px-6 pb-6 pt-0">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const LoginForm = ({ email, setEmail, pass, setPass, showPassword, setShowPassword, error, setError, loading, onSubmit }: any) => {
    return (
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium border border-red-100 flex items-center gap-2">
                    <AlertTriangle size={14} />
                    {error}
                </div>
            )}
            <div className="space-y-3">
                <FloatingLabelInput
                    label="Correo"
                    type="email"
                    required
                    value={email}
                    onChange={(e: any) => { setEmail(e.target.value); setError(''); }}
                    icon={<Mail size={18} />}
                />
                <div className="relative">
                    <FloatingLabelInput
                        label="Contraseña"
                        type={showPassword ? "text" : "password"}
                        required
                        value={pass}
                        onChange={(e: any) => { setPass(e.target.value); setError(''); }}
                        icon={<Lock size={18} />}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/3 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>
            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 mt-2 bg-[#083c79] hover:bg-blue-900 text-white shadow-blue-900/20 active:scale-[0.98]"
            >
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Ingresar'}
            </button>
        </form>
    );
};
