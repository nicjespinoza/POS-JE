'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, doc, setDoc } from '../../lib/firebase';

export default function SetupDbPage() {
    const { user } = useAuth();
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const initializeDB = async () => {
        if (!user) {
            setStatus('Debes iniciar sesión primero.');
            return;
        }

        setLoading(true);
        setStatus('Iniciando configuración...');

        try {
            // 1. Authorized Users (Access Control)
            const users = [
                { email: 'admin@webdesignje.com', role: 'ADMIN', branchId: null },
                { email: 'suc1@webdesignje.com', role: 'SUC1', branchId: 'suc-1' },
                { email: 'suc2@webdesignje.com', role: 'SUC2', branchId: 'suc-2' },
                { email: 'suc3@webdesignje.com', role: 'SUC3', branchId: 'suc-3' },
            ];

            for (const u of users) {
                await setDoc(doc(db, 'access_users', u.email), {
                    email: u.email,
                    role: u.role,
                    branchId: u.branchId,
                    authorized: true,
                    createdAt: new Date().toISOString()
                });
            }
            setStatus(s => s + '\nUsuarios de Acceso creados.');

            // 2. Authorized IPs (Example)
            // User asked for "TU_DIRECCION_IP" and "Sucursal Central"
            await setDoc(doc(db, 'authorized_ips', 'central_office'), {
                ip: '190.123.45.67', // Example, user can edit in console
                label: 'Sucursal Central',
                branchId: 'admin',
                createdAt: new Date().toISOString()
            });
            setStatus(s => s + '\nIPs de ejemplo creadas.');

            // 3. Ensure Self is Admin in 'users' collection too (Redundancy)
            if (user.email === 'admin@webdesignje.com') {
                await setDoc(doc(db, 'users', user.uid), {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || 'Admin',
                    role: 'ADMIN',
                    photoURL: user.photoURL
                }, { merge: true });
                setStatus(s => s + '\nPermisos de superusuario forzados en tu perfil.');
            }

            setStatus(s => s + '\n\n¡ÉXITO! La base de datos ha sido inicializada.');

        } catch (error: any) {
            console.error(error);
            setStatus('ERROR: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto font-sans text-slate-800 dark:text-white">
            <h1 className="text-2xl font-bold mb-4">Inicialización de Base de Datos</h1>
            <p className="mb-4">
                Esta herramienta creará las colecciones <code>access_users</code> y <code>authorized_ips</code> necesarias.
            </p>

            <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded mb-6">
                <p><strong>Usuario Actual:</strong> {user?.email || 'No conectado'}</p>
                <p className="text-sm text-gray-500">Debes ser admin@webdesignje.com para ejecutar esto (según reglas).</p>
            </div>

            <button
                onClick={initializeDB}
                disabled={loading || !user}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50"
            >
                {loading ? 'Procesando...' : 'CREAR BASE DE DATOS'}
            </button>

            <pre className="mt-8 p-4 bg-black text-green-400 rounded overflow-auto whitespace-pre-wrap">
                {status}
            </pre>
        </div>
    );
}
