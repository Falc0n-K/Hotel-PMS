/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { CalendarRange, ChevronDown } from 'lucide-react';
import { occupancyTrendData } from '../data';

export default function OccupancyChart() {
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [timeframe, setTimeframe] = useState('7 Derniers Jours');
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);

  const data = occupancyTrendData;
  const totalCapacity = 120; // 120 rooms total capacity

  return (
    <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex-1 flex flex-col min-w-[320px] md:min-w-[400px]">
      {/* Header section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 tracking-tight">Tendance d'Occupation</h4>
          <p className="text-[11px] text-slate-400 font-medium">Indicateurs journaliers du flux de clients</p>
        </div>

        {/* Dropdown filters */}
        <div className="relative">
          <button
            onClick={() => setShowTimeframeDropdown(!showTimeframeDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-slate-600 rounded-lg cursor-pointer transition-colors"
          >
            <span>{timeframe}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          
          {showTimeframeDropdown && (
            <div className="absolute right-0 mt-1.5 w-36 bg-white border border-slate-100 rounded-lg shadow-lg py-1.5 z-30">
              {['Aujourd\'hui', '7 Derniers Jours', 'Ce Mois', 'Mois Dernier'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setTimeframe(opt);
                    setShowTimeframeDropdown(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Legend block */}
      <div className="flex items-center gap-4 mb-6">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Légende :</label>
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
          <span className="w-3 h-3 rounded bg-orange-500 inline-block"></span>
          <span>Occupé</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
          <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200 inline-block"></span>
          <span>Disponible</span>
        </div>
      </div>

      {/* Columns Area */}
      <div className="flex-grow flex items-end justify-between gap-2.5 h-44 border-b border-slate-100 pb-1.5 px-2 relative">
        {data.map((item, index) => {
          const occupiedPercent = (item.occupied / totalCapacity) * 100;
          const availablePercent = (item.available / totalCapacity) * 100;
          const isHovered = hoveredBarIndex === index;

          return (
            <div
              key={item.day}
              className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer"
              onMouseEnter={() => setHoveredBarIndex(index)}
              onMouseLeave={() => setHoveredBarIndex(null)}
            >
              {/* Stacked interactive bars */}
              <div className="w-full max-w-[28px] h-full flex flex-col justify-end rounded-t-md overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:scale-105">
                {/* Available segment: top component of stacked column */}
                <div
                  className={`w-full transition-colors duration-200 ${
                    isHovered ? 'bg-orange-100/50' : 'bg-slate-50/75'
                  }`}
                  style={{ height: `${availablePercent}%` }}
                />

                {/* Occupied segment: bottom core of stacked column */}
                <div
                  className={`w-full transition-all duration-200 ${
                    isHovered ? 'bg-orange-600' : 'bg-orange-500'
                  }`}
                  style={{ height: `${occupiedPercent}%` }}
                />
              </div>

              {/* Day ticker on bottom X line */}
              <span className="text-[9.5px] font-bold text-slate-400 mt-2 font-mono">
                {item.day.split(' ')[0]} {/* display number day or short day */}
              </span>
              <span className="text-[8px] text-slate-300 font-semibold font-sans lowercase">
                {item.day.split(' ')[1]}
              </span>

              {/* Hover dialog popup */}
              {isHovered && (
                <div className="absolute bottom-16 bg-[#09153D] text-white p-2.5 rounded-xl text-center shadow-lg border border-slate-700/60 z-10 w-32 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                  <p className="text-[10px] font-bold text-orange-400">{item.day}</p>
                  <p className="text-xs font-bold font-mono mt-0.5">
                    {item.occupied} Occ. ({Math.round(occupiedPercent)}%)
                  </p>
                  <p className="text-[9px] text-slate-300 font-medium mt-0.5">
                    {item.available} Libres ({Math.round(availablePercent)}%)
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
