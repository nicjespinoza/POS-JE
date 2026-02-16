'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, ArrowRight, TrendingUp, Zap } from 'lucide-react';
import { getAllProductsBatched } from '../services/productService';
import { Product } from '../lib/types';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // [SCALABILITY] Load initial batch for trends. Use Paginated page for optimization if catalog grows.
        const all = await getAllProductsBatched();
        // Simple "Trends" logic: Take first 6 for now.
        setProducts(all.slice(0, 6));
      } catch (error) {
        console.error("Error loading products", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">

      {/* Navbar (Simple Mock) */}
      <nav className="fixed w-full z-50 px-6 py-4 glass bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <a href="/portal" className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
            Titanium Store
          </a>
          <div className="hidden md:flex gap-8 text-sm font-medium text-gray-300">
            <a href="/catalog/hombre" className="hover:text-white transition-colors">Hombre</a>
            <a href="/catalog/mujer" className="hover:text-white transition-colors">Mujer</a>
            <a href="/catalog/ninos" className="hover:text-white transition-colors">Niños</a>
            <a href="#" className="hover:text-white transition-colors">Rebajas</a>
          </div>
          <div className="flex gap-4">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors relative">
              <ShoppingBag size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-purple-500 rounded-full"></span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]" />

        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto mt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block py-1 px-3 rounded-full bg-white/5 border border-white/10 text-xs font-semibold tracking-wide text-purple-300 mb-6">
              NUEVA COLECCIÓN 2026
            </span>
            <h1 className="text-6xl md:text-9xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-600">
              WALK ON AIR
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto font-light mb-10">
              Redefiniendo el calzado urbano con tecnología premium y diseño vanguardista.
            </p>

            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <button className="px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform flex items-center justify-center gap-2">
                Ver Catálogo <ArrowRight size={20} />
              </button>
              <button className="px-8 py-4 bg-white/5 border border-white/10 backdrop-blur-md rounded-full hover:bg-white/10 transition-colors font-medium">
                Saber Más
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trending Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Zap className="text-yellow-400" /> Tendencias
            </h2>
            <p className="text-gray-400">Lo más buscado esta semana.</p>
          </div>
          <button className="text-purple-400 hover:text-purple-300 text-sm font-medium">Ver todo</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-gray-500">Cargando productos...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group relative"
              >
                <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-gray-900 relative mb-4">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-600" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                    <button className="w-full py-3 bg-white text-black font-bold rounded-xl translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      Añadir al Carrito
                    </button>
                  </div>
                  <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                    ${product.price}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-purple-400 font-semibold mb-1 uppercase tracking-wider">{product.category}</div>
                  <h3 className="text-lg font-bold group-hover:text-purple-400 transition-colors">{product.name}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Footer Mock */}
      <footer className="py-12 border-t border-white/10 bg-black text-center text-gray-500 text-sm">
        <p>© 2026 Titanium Store. Designed with AI.</p>
      </footer>
    </div>
  );
}
