/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrendingUp, TrendingDown, CalendarDays, KeyRound, ArrowUpRight, ArrowDownRight, DollarSign } from 'lucide-react';

interface MetricCardsProps {
  // Let the parent provide current state so it stays interactive
  stats?: {
    totalRevenue: number;
    newReservations: number;
    checkedIn: number;
    checkedOut: number;
  };
}

export default function MetricCards({ stats }: MetricCardsProps) {
  const currentStats = stats || {
    totalRevenue: 58240,
    newReservations: 128,
    checkedIn: 94,
    checkedOut: 76
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 0
    }).format(val) + ' FCFA';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8 w-full">
      {/* CARD 1: TOTAL EARNINGS */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-600"></div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
            REVENUS TOTAUX
          </span>
          <div className="flex items-center gap-1 bg-[#09153D] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
            <TrendingUp className="w-3 h-3 text-orange-400" />
            <span>+15.6%</span>
          </div>
        </div>
        
        <div className="mt-2">
          <h3 className="text-3xl font-extrabold text-[#09153D] tracking-tight font-sans">
            {formatCurrency(currentStats.totalRevenue)}
          </h3>
          <p className="text-[11px] text-slate-400 font-medium mt-1">
            cumulés depuis la semaine dernière
          </p>
        </div>
        
        <div className="absolute bottom-0 right-0 left-1.5 h-1 bg-gradient-to-r from-orange-500/10 to-transparent"></div>
      </div>

      {/* CARD 2: NEW RESERVATIONS */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
            NOUVELLES RÉSERVATIONS
          </span>
          <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
            <CalendarDays className="w-4 h-4" />
          </div>
        </div>
        
        <div className="mt-2">
          <h3 className="text-3xl font-extrabold text-[#09153D] tracking-tight">
            {currentStats.newReservations}
          </h3>
          
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md">
              <TrendingUp className="w-2.5 h-2.5" />
              +12.4%
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              depuis la semaine dernière
            </span>
          </div>
        </div>
      </div>

      {/* CARD 3: GUESTS CHECKED IN */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
            CLIENTS ARRIVÉS
          </span>
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        
        <div className="mt-2">
          <h3 className="text-3xl font-extrabold text-[#09153D] tracking-tight">
            {currentStats.checkedIn}
          </h3>
          
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md">
              <TrendingUp className="w-2.5 h-2.5" />
              +8.7%
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              par rapport à la semaine dernière
            </span>
          </div>
        </div>
      </div>

      {/* CARD 4: GUESTS CHECKED OUT */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
            CLIENTS PARTIS
          </span>
          <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
            <ArrowDownRight className="w-4 h-4" />
          </div>
        </div>
        
        <div className="mt-2">
          <h3 className="text-3xl font-extrabold text-[#09153D] tracking-tight">
            {currentStats.checkedOut}
          </h3>
          
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-50 text-red-500 px-2 py-0.5 rounded-md">
              <TrendingDown className="w-2.5 h-2.5" />
              -3.2%
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              par rapport à la semaine précédente
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
