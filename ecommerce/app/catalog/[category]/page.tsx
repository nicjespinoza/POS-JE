import React from 'react';
import { ProductCard } from '../../../components/ProductCard';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getAllProductsBatched } from '../../../services/productService';
import { Product } from '../../../lib/types';

// [SCALABILITY] Pre-render these category pages at build time.
export async function generateStaticParams() {
    // Generate these paths.
    // If you add a new category, you need to rebuild.
    return [
        { category: 'hombre' },
        { category: 'mujer' },
        { category: 'ninos' },
        { category: 'rebajas' },
    ];
}

const CATEGORY_INFO: Record<string, { title: string; desc: string }> = {
    'hombre': { title: 'Colección Hombre', desc: 'Rendimiento y estilo urbano para el hombre moderno.' },
    'mujer': { title: 'Colección Mujer', desc: 'Elegancia deportiva y confort sin compromisos.' },
    'ninos': { title: 'Kids & Junior', desc: 'Durabilidad y moda para las futuras estrellas.' },
    'rebajas': { title: 'Oportunidades Únicas', desc: 'Los mejores precios por tiempo limitado.' },
};

export default async function CategoryPage(props: { params: Promise<{ category: string }> }) {
    const params = await props.params;
    const category = params.category;

    // Allow fallback for unknown categories if needed, or show error
    const info = CATEGORY_INFO[category] || { title: category.toUpperCase(), desc: 'Explora nuestra colección.' };

    let products: Product[] = [];
    try {
        const all = await getAllProductsBatched();
        products = all.filter(p => p.category && p.category.toLowerCase() === category.toLowerCase());
    } catch (e) {
        console.error("Failed to fetch products for category", category);
    }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">
            <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group">
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Volver al Inicio
                </Link>

                <header className="mb-16 text-center">
                    <span className="text-purple-400 font-bold tracking-widest uppercase text-sm">{category}</span>
                    <h1 className="text-4xl md:text-6xl font-bold mt-2 mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-600">
                        {info.title}
                    </h1>
                    <p className="text-xl text-gray-400 font-light max-w-2xl mx-auto">
                        {info.desc}
                    </p>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {products.length > 0 ? (
                        products.map((product, i) => (
                            <ProductCard
                                key={product.id}
                                {...product}
                                delay={i * 0.1}
                            />
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20 text-gray-500">
                            <p>No hay productos disponibles en esta categoría por el momento.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
