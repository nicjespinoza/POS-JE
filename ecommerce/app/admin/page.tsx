'use client';

import { AdminDashboard } from '../../components/admin/AdminDashboard';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Role } from '../../lib/types';

export default function AdminPage() {
    const { userProfile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        console.log("AdminPage Check:", { loading, userProfile, role: userProfile?.role });

        if (!loading && !userProfile) {
            console.log("Redirecting to login (No Profile)");
            router.push('/login');
        } else if (!loading && userProfile) {
            const role = userProfile.role;
            // Loose comparison just in case of enum issues
            if (role !== Role.ADMIN && role !== Role.MANAGER && (role as string) !== 'ADMIN' && (role as string) !== 'MANAGER') {
                console.log("Redirecting to Home (Insufficient Role):", role);
                router.push('/');
            }
        }
    }, [userProfile, loading, router]);

    if (loading || !userProfile) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-black text-slate-800 dark:text-white">
            <AdminDashboard />
        </div>
    );
}
