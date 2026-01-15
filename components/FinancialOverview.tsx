
import React from 'react';
import { GlassCard } from './ui/GlassCard';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface FinancialOverviewProps {
  income: number;
  expense: number;
  profit: number;
  currencySymbol: string;
}

export const FinancialOverview: React.FC<FinancialOverviewProps> = ({ 
  income, 
  expense, 
  profit, 
  currencySymbol 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Income Card */}
      <GlassCard className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 rounded-2xl bg-green-500/10 text-green-600 dark:text-green-400">
            <TrendingUp size={24} />
          </div>
          <span className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider">
            Ingresos (Filtrado)
          </span>
        </div>
        <div className="text-3xl font-bold text-slate-900 dark:text-white">
          {currencySymbol}{income.toFixed(2)}
        </div>
      </GlassCard>

      {/* Expense Card */}
      <GlassCard className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
            <TrendingDown size={24} />
          </div>
          <span className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider">
            Egresos (Filtrado)
          </span>
        </div>
        <div className="text-3xl font-bold text-slate-900 dark:text-white">
          {currencySymbol}{expense.toFixed(2)}
        </div>
      </GlassCard>

      {/* Net Profit Card */}
      <GlassCard className="p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 dark:from-purple-500/10 dark:to-blue-500/10 pointer-events-none" />
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Wallet size={24} />
          </div>
          <span className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider">
            Utilidad Neta
          </span>
        </div>
        <div className="text-3xl font-bold text-slate-900 dark:text-white relative z-10">
          {currencySymbol}{profit.toFixed(2)}
        </div>
        <div className={`text-sm mt-2 relative z-10 flex items-center gap-1 ${profit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
          Balance {profit >= 0 ? 'Positivo' : 'Negativo'}
        </div>
      </GlassCard>
    </div>
  );
};
