'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { getProfitAndLoss, getInventoryValuation, analyzeFinancialHealth, ReportPnL } from '../../services/reportingService';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Package,
    Sparkles,
    Calendar,
    Search,
    PieChart,
    Activity
} from 'lucide-react';
import { CURRENCIES } from '../../lib/constants';

export const ReportsDashboard: React.FC = () => {
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const [pnl, setPnl] = useState<ReportPnL | null>(null);
    const [inventoryValue, setInventoryValue] = useState<number>(0);
    const [aiInsight, setAiInsight] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const currencySymbol = 'C$'; // Default to Nicaraguan Cordoba for reports

    const fetchReports = async () => {
        setLoading(true);
        try {
            // 1. Get P&L
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            const pnlData = await getProfitAndLoss(start, end);
            setPnl(pnlData);

            // 2. Get Inventory Value (Current Snapshot)
            const invVal = await getInventoryValuation();
            setInventoryValue(invVal);

            // 3. AI Analysis
            const insight = await analyzeFinancialHealth(pnlData);
            setAiInsight(insight);

        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []); // Initial load

    return (
        <div className="space-y-6">

            {/* Header Controls */}
            <GlassCard className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400">
                    <PieChart size={20} />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Reportes Financieros</h2>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:border-purple-500"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    <button
                        onClick={fetchReports}
                        disabled={loading}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {loading ? <Activity className="animate-spin" size={16} /> : <Search size={16} />}
                        Generar Reporte
                    </button>
                </div>
            </GlassCard>

            {/* AI Insight Banner */}
            {aiInsight && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 flex items-start gap-4">
                    <div className="p-2 bg-blue-500/20 rounded-full text-blue-600 dark:text-blue-400">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-1">Análisis Inteligente</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{aiInsight}</p>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <GlassCard className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-xl bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">Ventas Totales (Ingresos)</p>
                    <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                        {currencySymbol}{pnl?.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h3>
                </GlassCard>

                <GlassCard className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">
                            <Package size={24} />
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">Costo de Ventas (FIFO)</p>
                    <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                        -{currencySymbol}{pnl?.cogs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h3>
                    <p className="text-xs text-orange-500 mt-2">Costo real de mercadería vendida</p>
                </GlassCard>

                <GlassCard className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
                            <TrendingDown size={24} />
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">Gastos Operativos</p>
                    <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                        -{currencySymbol}{pnl?.expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h3>
                </GlassCard>

                <GlassCard className="p-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors duration-500" />
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                                <DollarSign size={24} />
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">Utilidad Neta</p>
                        <h3 className={`text-2xl font-bold mt-1 ${(pnl?.netProfit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {currencySymbol}{pnl?.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </h3>
                        <p className="text-xs text-slate-400 mt-2">
                            Margen: {pnl?.revenue ? ((pnl.netProfit / pnl.revenue) * 100).toFixed(1) : 0}%
                        </p>
                    </div>
                </GlassCard>
            </div>

            {/* Inventory Valuation Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <GlassCard className="p-6 col-span-1">
                    <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
                        <Package size={18} className="text-purple-500" />
                        Valuación de Bodega
                    </h3>
                    <div className="flex flex-col gap-4">
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                            <p className="text-sm text-slate-500">Valor Total en Inventario</p>
                            <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                                {currencySymbol}{inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-slate-400 mt-2">Calculado sumando costo real de todos los lotes activos.</p>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-6 col-span-1 lg:col-span-2">
                    <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Desglose por Cuentas</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-gray-50 dark:bg-white/5 rounded-lg">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Cuenta</th>
                                    <th className="px-4 py-3 text-right">Monto</th>
                                    <th className="px-4 py-3 rounded-r-lg text-right">% Ingresos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                                {Object.entries(pnl?.details.revenueByAccount || {}).map(([acc, val]) => (
                                    <tr key={acc}>
                                        <td className="px-4 py-3 font-medium text-green-600 dark:text-green-400">{acc}</td>
                                        <td className="px-4 py-3 text-right">{currencySymbol}{val.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right">100%</td>
                                    </tr>
                                ))}
                                {Object.entries(pnl?.details.expensesByAccount || {}).map(([acc, val]) => (
                                    <tr key={acc}>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{acc}</td>
                                        <td className="px-4 py-3 text-right font-medium">{currencySymbol}{val.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right text-slate-400">
                                            {pnl && pnl.revenue > 0 ? ((val / pnl.revenue) * 100).toFixed(1) : '0.0'}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {(!pnl?.details.revenueByAccount && !pnl?.details.expensesByAccount) && (
                            <div className="text-center py-8 text-slate-500">No hay datos para el periodo seleccionado.</div>
                        )}
                    </div>
                </GlassCard>
            </div>

        </div>
    );
};
