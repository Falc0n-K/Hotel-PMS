import React, { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export interface RevenuePoint {
  month: string;
  revenue: number;
}

// Encaissements réels par mois (table payments), six derniers mois.
export default function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const { tr } = useI18n();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [containerWidth, setContainerWidth] = useState(500);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize listener
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Data mapping
  const paddingX = 40;
  const paddingY = 30;
  const height = 180;
  const width = Math.max(containerWidth, 200);

  // Min and max formulas
  const total = data.reduce((sum, d) => sum + d.revenue, 0);
  const minRevenue = 0;
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1) * 1.15;

  // Coordinate converter
  const getCoordinates = () => {
    const stepX = (width - paddingX * 2) / (data.length - 1);
    return data.map((item, index) => {
      const x = paddingX + index * stepX;
      // Map revenue inverse to SVG y coordinate (0 at top, height at bottom)
      const ratio = (item.revenue - minRevenue) / (maxRevenue - minRevenue);
      const y = height - paddingY - ratio * (height - paddingY * 2);
      return { x, y, ...item };
    });
  };

  const pts = getCoordinates();

  // Draw smooth SVG bezier line of points
  // Simple cubic bezier control point calculation
  const getBezierPath = () => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      // Control points for smooth organic curve
      const cp1x = p0.x + (p1.x - p0.x) / 3;
      const cp1y = p0.y;
      const cp2x = p0.x + (2 * (p1.x - p0.x)) / 3;
      const cp2y = p1.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const linePath = getBezierPath();
  const areaPath = linePath ? `${linePath} L ${pts[pts.length - 1].x} ${height - paddingY} L ${pts[0].x} ${height - paddingY} Z` : '';

  const formatCurrency = (val: number) => {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(val)} FCFA`;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Find closest point by X coordinate
    const stepX = (width - paddingX * 2) / (data.length - 1);
    let index = Math.round((x - paddingX) / stepX);
    index = Math.max(0, Math.min(data.length - 1, index));
    
    setHoveredIndex(index);
    setMousePos({ x, y });
  };

  return (
    <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex-1 flex flex-col min-w-[320px] md:min-w-[450px]">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 tracking-tight">{tr('Revenus', 'Revenue')}</h4>
          <p className="text-[11px] text-slate-400 font-medium">{tr('Encaissements enregistrés (hors taxe de séjour)', 'Recorded payments (excluding tourist tax)')}</p>
        </div>

        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-600 rounded-lg">
          <Calendar className="w-3.5 h-3.5" />
          {tr('6 derniers mois', 'Last 6 months')}
        </span>
      </div>

      {/* Target and Total */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{tr('Total encaissé', 'Total collected')}</span>
        <span className="text-2xl font-extrabold text-[#09153D] tracking-tight font-mono">{formatCurrency(total)}</span>
      </div>

      {/* Actual Chart SVG Block */}
      <div ref={containerRef} className="relative flex-grow h-44 w-full select-none mt-2">
        <svg
          className="w-full h-full overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Gradients */}
          <defs>
            <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EA580C" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#EA580C" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="50%" stopColor="#EA580C" />
              <stop offset="100%" stopColor="#C2410C" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {Array.from({ length: 4 }).map((_, i) => {
            const gridVal = minRevenue + (i * (maxRevenue - minRevenue)) / 3;
            // Map grid position
            const ratio = (gridVal - minRevenue) / (maxRevenue - minRevenue);
            const y = height - paddingY - ratio * (height - paddingY * 2);
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 10}
                  y={y + 3}
                  textAnchor="end"
                  className="font-mono text-[9px] font-semibold fill-slate-300"
                >
                  {i === 0 ? '0' : `${Math.round(gridVal / 1000)}k`}
                </text>
              </g>
            );
          })}

          {/* Area under bezier */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#orangeGradient)"
            />
          )}

          {/* Bezier curve path */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="url(#lineStroke)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          )}

          {/* Highlight markers */}
          {pts.map((p, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 7 : 4}
                  className={`${isHovered ? 'fill-orange-600 stroke-white stroke-2' : 'fill-white stroke-orange-500 stroke-2'} cursor-pointer transition-all duration-150`}
                />
              </g>
            );
          })}

          {/* Active pointer guide bar */}
          {hoveredIndex !== null && pts[hoveredIndex] && (
            <line
              x1={pts[hoveredIndex].x}
              y1={paddingY}
              x2={pts[hoveredIndex].x}
              y2={height - paddingY}
              stroke="#EA580C"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              className="opacity-50 pointer-events-none"
            />
          )}

          {/* X axis labels */}
          {pts.map((p, i) => (
            <text
              key={i}
              x={p.x}
              y={height - 8}
              textAnchor="middle"
              className="text-[10px] font-bold font-sans fill-slate-400"
            >
              {p.month}
            </text>
          ))}
        </svg>

        {/* Dynamic HTML Tooltip */}
        {hoveredIndex !== null && pts[hoveredIndex] && (
          <div
            className="absolute bg-[#09153D] text-white p-3 rounded-xl border border-slate-700/50 shadow-xl z-10 pointer-events-none"
            style={{
              left: Math.min(pts[hoveredIndex].x - 64, width - 150),
              top: Math.max(pts[hoveredIndex].y - 82, 0),
            }}
          >
            <p className="text-[10px] font-semibold text-orange-400 capitalize">{pts[hoveredIndex].month} 2026</p>
            <p className="text-xs font-bold font-mono mt-0.5">{formatCurrency(pts[hoveredIndex].revenue)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
