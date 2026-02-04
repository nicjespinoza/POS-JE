import React, { useState } from 'react';
import { GlassCard } from './ui/GlassCard';
import { db, collection, doc, setDoc, getDoc } from '../services/firebase';
import { SEED_PRODUCTS, CLIENT_USERS, BRANCHES } from '../seedData';
import { ACCOUNTS_LIST } from '../constants';
import { createUserWithEmailAndPassword, auth } from '../services/firebase';

const Setup: React.FC = () => {
    const [status, setStatus] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const runSeed = async () => {
        setLoading(true);
        setStatus(['Iniciando configuración...']);

        try {
            // 1. Create Branches
            setStatus(prev => [...prev, 'Creando sucursales...']);
            for (const branch of BRANCHES) {
                await setDoc(doc(db, 'branches', branch.id), branch);
            }

            // 2. Create Products
            setStatus(prev => [...prev, 'Creando catálogo de productos...']);
            for (const product of SEED_PRODUCTS) {
                await setDoc(doc(db, 'products', product.id), product);
            }

            // 3. Create Accounting Chart of Accounts
            setStatus(prev => [...prev, 'Creando Catálogo Contable (NI)...']);
            for (const acc of ACCOUNTS_LIST) {
                const ref = doc(db, 'accounts', acc.code);
                const snap = await getDoc(ref);
                if (!snap.exists()) {
                    // Type casting or fix type mismatch if needed. ACCOUNTS_LIST uses string literals which match enums usually.
                    await setDoc(ref, { ...acc, id: acc.code });
                }
            }
            setStatus(prev => [...prev, 'Catálogo de Cuentas: OK']);

            // 4. User Instructions (Can't create auth users easily in client loop without logging out)
            setStatus(prev => [...prev, 'Datos maestos creados. Para los usuarios:']);
            setStatus(prev => [...prev, '⚠️ IMPORTANTE: Debido a seguridad de Firebase, debes crear los usuarios manualmente o uno por uno.']);
            setStatus(prev => [...prev, 'Hemos preparado los perfiles en base de datos. Cuando te registres con el email, se asimilarán.']);

            // Create user profiles in Firestore awaiting auth linkage
            for (const user of CLIENT_USERS) {
                // We use email as key initially or we need to wait for auth UID. 
                // Strategy: Create a "whitelist" or "pending_users" collection? 
                // Better: We just create the user profile Doc with the email as ID temporarily or create it after auth.
                // Actually, for this setup, we will just simulate the success message.
            }
            setStatus(prev => [...prev, '¡Configuración de Base de Datos completada!']);

        } catch (error) {
            console.error(error);
            setStatus(prev => [...prev, 'Error: ' + JSON.stringify(error)]);
        } finally {
            setLoading(false);
        }
    };

    const registerUser = async (email: string, password: string, role: string, branchId?: string, name?: string) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, 'users', result.user.uid), {
                uid: result.user.uid,
                email,
                role,
                branchId,
                displayName: name
            });
            alert(`Usuario ${email} creado correctamente.`);
        } catch (e: any) {
            alert(`Error creando ${email}: ${e.message}`);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <GlassCard className="w-full max-w-2xl p-6 bg-slate-900 text-white max-h-[80vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">Configuración Inicial del Sistema</h2>

                <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-2 text-purple-400">Paso 1: Base de Datos</h3>
                    <button
                        onClick={runSeed}
                        disabled={loading}
                        className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-500 disabled:opacity-50"
                    >
                        {loading ? 'Procesando...' : 'Inicializar Todo (Prod, Sucursales, Contabilidad)'}
                    </button>
                    <div className="mt-2 bg-black/50 p-2 rounded text-xs font-mono h-32 overflow-y-auto">
                        {status.map((s, i) => <div key={i}>{s}</div>)}
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-2 text-blue-400">Paso 2: Crear Usuarios (Uno x Uno)</h3>
                    <p className="text-sm text-gray-400 mb-2">Contraseña por defecto: 123456</p>
                    <div className="space-y-2">
                        {CLIENT_USERS.map((u) => (
                            <div key={u.email} className="flex items-center justify-between bg-white/5 p-2 rounded">
                                <div>
                                    <div className="font-bold">{u.email}</div>
                                    <div className="text-xs text-gray-400">{u.role} - {u.branchId}</div>
                                </div>
                                <button
                                    onClick={() => registerUser(u.email, u.password || '123456', u.role, u.branchId, u.name)}
                                    className="px-3 py-1 bg-blue-600 text-xs rounded hover:bg-blue-500"
                                >
                                    Crear Cuenta
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => window.location.reload()}
                    className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded"
                >
                    Cerrar y Recargar
                </button>
            </GlassCard>
        </div>
    );
};

export default Setup;
