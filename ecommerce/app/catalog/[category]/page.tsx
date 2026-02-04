'use client';
import React, { use } from 'react'; // Import use
import { ProductCard } from '../../../components/ProductCard';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// Mock Data (simulating database)
const ALL_PRODUCTS = [
    { id: 101, name: 'Nike Air Zoom Alpha', price: 189.99, category: 'hombre', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff' },
    { id: 102, name: 'Adidas Ultraboost', price: 160.00, category: 'hombre', image: 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2' },
    { id: 103, name: 'Puma RS-X', price: 110.00, category: 'mujer', image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5' },
    { id: 104, name: 'Reebok Classic', price: 85.00, category: 'mujer', image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a' },
    { id: 105, name: 'Jordan Kids High', price: 120.00, category: 'ninos', image: 'https://images.unsplash.com/photo-1577909337422-0dceb1626f63' },
    { id: 106, name: 'Vans Old Skool', price: 60.00, category: 'ninos', image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77' },
    { id: 107, name: 'New Balance 574', price: 90.00, category: 'hombre', image: 'https://images.unsplash.com/photo-1539185441755-769473a23570' },
    { id: 108, name: 'Converse All Star', price: 55.00, category: 'mujer', image: 'https://images.unsplash.com/photo-1627577534431-7b0683057e96' },
];

const CATEGORY_INFO: Record<string, { title: string; desc: string }> = {
    'hombre': { title: 'Colección Hombre', desc: 'Rendimiento y estilo urbano para el hombre moderno.' },
    'mujer': { title: 'Colección Mujer', desc: 'Elegancia deportiva y confort sin compromisos.' },
    'ninos': { title: 'Kids & Junior', desc: 'Durabilidad y moda para las futuras estrellas.' },
};

// Next.js 15 requires params to be a Promise or handled with 'use'
// We will simply await it if we were in an async server component, 
// but since this is a client component ('use client'), we need to unwrap it if it comes as a promise, 
// OR simpler: Component({ params }: { params: Promise<{ category: string }> })
// Let's use the standard async Server Component pattern but wrapped for client? 
// Actually for client components in Next 15, we might need `useParams` from next/navigation 
// OR stick to Server Component for data fetching and pass to Client Component.
// Let's simplify: Make this a Server Component by removing 'use client' and extracting the interactive parts.
// BUT, we want framer-motion which needs 'use client'.
// So, the page will be 'use client' and we use `use` from React to unwrap params if needed, 
// or `useParams` hook. Let's use `useParams` hook from `next/navigation`.

import { useParams } from 'next/navigation';

export default function CategoryPage() {
    const params = useParams();
    const category = params.category as string; // 'hombre', 'mujer', 'ninos'

    if (!CATEGORY_INFO[category]) {
        // In a real app we might redirect or show 404
        // return notFound(); 
        // For now, simple fallback
        return <div className="min-h-screen flex items-center justify-center text-white">Categoría no encontrada</div>;
    }

    const { title, desc } = CATEGORY_INFO[category];
    const products = ALL_PRODUCTS.filter(p => p.category === category);

    return (
        <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">
            <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group">
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Volver al Inicio
                </Link>

                <header className="mb-16 text-center">
                    <span className="text-purple-400 font-bold tracking-widest uppercase text-sm">{category}</span>
                    <h1 className="text-4xl md:text-6xl font-bold mt-2 mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-600">
                        {title}
                    </h1>
                    <p className="text-xl text-gray-400 font-light max-w-2xl mx-auto">
                        {desc}
                    </p>
                </header>

                {products.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {products.map((product, i) => (
                            <ProductCard
                                key={product.id}
                                {...product}
                                delay={i * 0.1}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500">
                        <p>No hay productos disponibles en esta categoría por el momento.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
