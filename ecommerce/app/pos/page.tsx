'use client';

import { POS } from '../../components/pos/POS';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function POSPage() {
    const { userProfile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !userProfile) {
            router.push('/login');
        }
    }, [userProfile, loading, router]);

    if (loading || !userProfile) return <div className="min-h-screen flex items-center justify-center">Cargando punto de venta...</div>;

    return (
        <div className="min-h-screen overflow-hidden">
            <POS />
        </div>
    );
}
