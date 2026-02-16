'use client';

import React, { useState } from 'react';
import { Product } from '@/lib/types';
import { useCart } from '@/contexts/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Heart, Share2, ChevronRight, Star, Truck, ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ProductDetailsClientProps {
    product: Product;
}

export const ProductDetailsClient: React.FC<ProductDetailsClientProps> = ({ product }) => {
    const { addToCart } = useCart();
    // Ensure images array includes the main image if not present, and handle potential missing images array
    const allImages = [product.image, ...(product.images || [])].filter(Boolean);
    const [selectedImage, setSelectedImage] = useState(allImages[0]);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [isHoveringImage, setIsHoveringImage] = useState(false);

    // Mock sizes for shoes - in a real app this would come from product data
    const SIZES = ['38', '39', '40', '41', '42', '43', '44'];

    const discountPercentage = product.discount || 0;
    const finalPrice = product.price * (1 - discountPercentage / 100);

    const handleAddToCart = () => {
        if (!selectedSize) {
            // Toast or visual cue that size is required could go here
            // For now we just add it, but in a real shoe store size is mandatory
        }
        addToCart(product);
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30 pb-20">

            {/* Navigation Breadcrumb */}
            <nav className="pt-24 px-6 max-w-7xl mx-auto flex items-center gap-2 text-sm text-gray-400 mb-8">
                <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
                <ChevronRight size={14} />
                <Link href={`/catalog/${product.category?.toLowerCase() || 'all'}`} className="hover:text-white transition-colors capitalize">
                    {product.category || 'Catálogo'}
                </Link>
                <ChevronRight size={14} />
                <span className="text-white truncate max-w-[200px]">{product.name}</span>
            </nav>

            <main className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">

                {/* Left Column: Gallery */}
                <div className="space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="aspect-[4/5] w-full bg-gray-900 rounded-3xl overflow-hidden relative group"
                        onMouseEnter={() => setIsHoveringImage(true)}
                        onMouseLeave={() => setIsHoveringImage(false)}
                    >
                        <motion.img
                            key={selectedImage}
                            src={selectedImage}
                            alt={product.name}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="w-full h-full object-cover"
                        />

                        {/* Discount Badge on Main Image */}
                        {discountPercentage > 0 && (
                            <div className="absolute top-6 left-6 bg-red-600 text-white px-4 py-2 rounded-full font-bold shadow-lg z-10">
                                -{discountPercentage}% OFF
                            </div>
                        )}

                        <button className="absolute top-6 right-6 p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-red-500 transition-all z-10">
                            <Heart size={20} />
                        </button>
                    </motion.div>

                    {/* Thumbnail Strip */}
                    <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                        {allImages.map((img, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelectedImage(img)}
                                className={`relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === img ? 'border-purple-500 shadow-purple-500/20 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            >
                                <img src={img} alt={`View ${idx}`} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Column: Product Info */}
                <div className="flex flex-col justify-center">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold uppercase tracking-wider border border-purple-500/20">
                                {product.category || 'General'}
                            </span>
                            <div className="flex items-center gap-1 text-yellow-400 text-sm">
                                <Star size={14} fill="currentColor" />
                                <span className="font-medium">4.8</span>
                                <span className="text-gray-500 ml-1">(124 reseñas)</span>
                            </div>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-6 leading-tight">
                            {product.name}
                        </h1>

                        <div className="flex items-end gap-4 mb-8">
                            <span className="text-4xl font-bold text-white">${finalPrice.toFixed(2)}</span>
                            {discountPercentage > 0 && (
                                <span className="text-xl text-gray-500 line-through mb-1">${product.price.toFixed(2)}</span>
                            )}
                        </div>

                        <p className="text-gray-400 leading-relaxed mb-8 text-lg">
                            Diseñados para la excelencia, estos zapatos combinan tecnología de vanguardia con un estilo inconfundible.
                            Perfectos para el día a día o para destacar en ocasiones especiales. La calidad premium se siente en cada paso.
                        </p>

                        {/* Size Selector */}
                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-3">
                                <label className="font-medium text-gray-300">Seleccionar Talla (EU)</label>
                                <button className="text-xs text-purple-400 hover:text-purple-300 underline">Guía de Tallas</button>
                            </div>
                            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                                {SIZES.map(size => (
                                    <button
                                        key={size}
                                        onClick={() => setSelectedSize(size)}
                                        className={`py-3 rounded-lg text-sm font-bold transition-all ${selectedSize === size
                                            ? 'bg-white text-black shadow-lg scale-105'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 mb-10">
                            <button
                                onClick={handleAddToCart}
                                className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                                <ShoppingBag size={22} />
                                Añadir al Carrito
                            </button>
                            <button className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10">
                                <Share2 size={24} />
                            </button>
                        </div>

                        {/* Value Props */}
                        <div className="grid grid-cols-2 gap-4 pt-8 border-t border-white/10">
                            <div className="flex items-center gap-3 text-sm text-gray-300">
                                <div className="p-2 rounded-full bg-blue-500/10 text-blue-400">
                                    <Truck size={18} />
                                </div>
                                <span>Envío Gratis &gt; $100</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-300">
                                <div className="p-2 rounded-full bg-green-500/10 text-green-400">
                                    <ShieldCheck size={18} />
                                </div>
                                <span>Garantía de 30 días</span>
                            </div>
                        </div>

                    </motion.div>
                </div>
            </main>

        </div>
    );
};
