'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';

interface ProductCardProps {
    id: string | number;
    name: string;
    price: number;
    category: string;
    image: string;
    delay?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({ id, name, price, category, image, delay = 0 }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            viewport={{ once: true }}
            className="group relative"
        >
            <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-gray-900 relative mb-4">
                <img
                    src={image}
                    alt={name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                    <button className="w-full py-3 bg-white text-black font-bold rounded-xl translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-center gap-2">
                        <ShoppingBag size={18} /> Añadir
                    </button>
                </div>
                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                    ${price.toFixed(2)}
                </div>
            </div>

            <div>
                <div className="text-xs text-purple-400 font-semibold mb-1 uppercase tracking-wider">{category}</div>
                <h3 className="text-lg font-bold group-hover:text-purple-400 transition-colors">{name}</h3>
            </div>
        </motion.div>
    );
};
