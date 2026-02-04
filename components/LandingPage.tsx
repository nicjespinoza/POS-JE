
import React, { useState } from 'react';
import { GlassCard } from './ui/GlassCard';
import { Role } from '../types';
import { ArrowRight, BarChart3, Lock, Zap, Sun, Moon, Settings } from 'lucide-react';
import Setup from './Setup';

interface LandingPageProps {
  onLogin: (role: Role) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, toggleTheme, isDark }) => {
  const [showSetup, setShowSetup] = useState(false);
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black text-slate-900 dark:text-white relative overflow-hidden selection:bg-purple-500/30 transition-colors duration-300">
      {/* Abstract Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]" />

      <nav className="relative z-10 p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-slate-800 to-slate-400 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
          Titanium POS
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            {isDark ? <Sun size={20} className="text-gray-300" /> : <Moon size={20} className="text-slate-700" />}
          </button>
          <button
            onClick={() => setShowSetup(true)}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-gray-400"
            title="Configuración Inicial"
          >
            <Settings size={20} />
          </button>
          <div className="h-6 w-px bg-gray-300 dark:bg-white/10" />
          <button
            onClick={() => onLogin(Role.CASHIER)}
            className="px-4 py-2 rounded-full text-sm font-medium text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Acceso Cajero
          </button>
          <button
            onClick={() => onLogin(Role.ADMIN)}
            className="px-6 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black text-sm font-medium hover:bg-slate-700 dark:hover:bg-gray-200 transition-all flex items-center gap-2"
          >
            Acceso Admin <ArrowRight size={16} />
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 mt-16 lg:mt-32">
        <div className="text-center mb-24">
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8">
            <span className="block text-transparent bg-clip-text bg-gradient-to-b from-slate-900 to-slate-500 dark:from-white dark:to-gray-500">
              El Futuro del
            </span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-b from-slate-600 to-slate-400 dark:from-gray-200 dark:to-gray-600">
              Control Retail.
            </span>
          </h1>
          <p className="text-xl text-slate-500 dark:text-gray-400 max-w-2xl mx-auto mb-12 font-light">
            Experimenta la estética iPhone 17 en tu negocio.
            Analítica impulsada por IA, POS fluido y claridad financiera total para 2025.
          </p>
          <div className="flex justify-center gap-6">
            <button
              onClick={() => onLogin(Role.ADMIN)}
              className="group relative px-8 py-4 bg-white/40 dark:bg-white/10 backdrop-blur-md border border-white/60 dark:border-white/20 rounded-full text-lg font-medium text-slate-900 dark:text-white overflow-hidden transition-all hover:bg-white/60 dark:hover:bg-white/20 hover:scale-105 shadow-lg"
            >
              <span className="relative z-10">Iniciar Sistema Contable</span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>

        {/* Bento Grid Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-32">
          <GlassCard className="p-8 md:col-span-2 h-80 flex flex-col justify-between relative overflow-hidden group">
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-full bg-slate-900/5 dark:bg-white/10 flex items-center justify-center mb-4">
                <BarChart3 className="text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-2xl font-semibold mb-2 text-slate-900 dark:text-white">Finanzas con IA</h3>
              <p className="text-slate-500 dark:text-gray-400">Impulsado por Gemini 2.5. Obtén consejos estratégicos en tiempo real basados en tu flujo de caja.</p>
            </div>
            <div className="absolute right-[-20px] bottom-[-20px] w-64 h-64 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors" />
          </GlassCard>

          <GlassCard className="p-8 h-80 flex flex-col justify-between relative overflow-hidden group">
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-full bg-slate-900/5 dark:bg-white/10 flex items-center justify-center mb-4">
                <Zap className="text-yellow-500 dark:text-yellow-400" />
              </div>
              <h3 className="text-2xl font-semibold mb-2 text-slate-900 dark:text-white">POS Ultra Rápido</h3>
              <p className="text-slate-500 dark:text-gray-400">Diseñado para velocidad. Procesa pagos en segundos con una interfaz fluida.</p>
            </div>
            <div className="absolute right-[-20px] bottom-[-20px] w-48 h-48 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/20 transition-colors" />
          </GlassCard>

          <GlassCard className="p-8 h-80 flex flex-col justify-between relative overflow-hidden group">
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-full bg-slate-900/5 dark:bg-white/10 flex items-center justify-center mb-4">
                <Lock className="text-blue-500 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-semibold mb-2 text-slate-900 dark:text-white">Seguridad de Roles</h3>
              <p className="text-slate-500 dark:text-gray-400">Interfaces dedicadas para Admins y Cajeros. Mantén tus datos seguros.</p>
            </div>
            <div className="absolute right-[-20px] bottom-[-20px] w-48 h-48 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors" />
          </GlassCard>

          <GlassCard className="p-8 md:col-span-2 h-80 flex items-center justify-center relative overflow-hidden">
            <div className="text-center">
              <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-400 dark:from-gray-200 dark:to-gray-500">
                Diseñado para 2025
              </h3>
            </div>
          </GlassCard>
        </div>
      </main>

      {showSetup && <Setup />}
    </div>
  );
};
