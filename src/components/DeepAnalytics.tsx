import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  TrendingUp, 
  Coins, 
  BarChart3, 
  Percent, 
  ShieldAlert, 
  DollarSign, 
  Calendar, 
  Users, 
  Sliders, 
  Sparkles, 
  Clock, 
  ArrowUpRight, 
  CheckCircle2, 
  Activity, 
  Info, 
  Download,
  Flame,
  LineChart,
  Grid
} from 'lucide-react';
import { RBACRole } from '../types';

interface DeepAnalyticsProps {
  currentHotel: string;
  currentRole: RBACRole;
  onAddNotification: (title: string, message: string, type: 'réservation' | 'paiement' | 'alerte' | 'info') => void;
}

// Tailored historical and simulator dataset per hotel
const hotelDemographics = {
  'Royal Saly': [
    { source: 'France', percentage: 40, color: '#EA580C' },
    { source: 'Allemagne', percentage: 22, color: '#F97316' },
    { source: 'Sénégal (Local/VIP)', percentage: 20, color: '#FB923C' },
    { source: 'Royaume-Uni', percentage: 11, color: '#FDBA74' },
    { source: 'Autres', percentage: 7, color: '#CBD5E1' }
  ],
  'Nema Kadior': [
    { source: 'Sénégal (Business/Admin)', percentage: 45, color: '#EA580C' },
    { source: 'France (ONG/Coop)', percentage: 25, color: '#F97316' },
    { source: 'Guinée-Bissau', percentage: 12, color: '#FB923C' },
    { source: 'Mali', percentage: 10, color: '#FDBA74' },
    { source: 'Autres', percentage: 8, color: '#CBD5E1' }
  ],
  'Les Pélicans du Saloum': [
    { source: 'Belgique / Pays-Bas', percentage: 35, color: '#EA580C' },
    { source: 'France (Écotourisme)', percentage: 30, color: '#F97316' },
    { source: 'Sénégal (Excursions)', percentage: 15, color: '#FB923C' },
    { source: 'États-Unis', percentage: 12, color: '#FDBA74' },
    { source: 'Autres', percentage: 8, color: '#CBD5E1' }
  ]
};

const historicalRevPAR = {
  'Royal Saly': [
    { month: 'Jan', revenue: 165, expenses: 95, profit: 70 },
    { month: 'Fév', revenue: 178, expenses: 98, profit: 80 },
    { month: 'Mar', revenue: 195, expenses: 102, profit: 93 },
    { month: 'Avr', revenue: 160, expenses: 92, profit: 68 },
    { month: 'Mai', revenue: 155, expenses: 88, profit: 67 },
    { month: 'Juin', revenue: 185, expenses: 95, profit: 90 }
  ],
  'Nema Kadior': [
    { month: 'Jan', revenue: 98, expenses: 62, profit: 36 },
    { month: 'Fév', revenue: 102, expenses: 64, profit: 38 },
    { month: 'Mar', revenue: 115, expenses: 68, profit: 47 },
    { month: 'Avr', revenue: 108, expenses: 65, profit: 43 },
    { month: 'Mai', revenue: 112, expenses: 64, profit: 48 },
    { month: 'Juin', revenue: 118, expenses: 66, profit: 52 }
  ],
  'Les Pélicans du Saloum': [
    { month: 'Jan', revenue: 110, expenses: 75, profit: 35 },
    { month: 'Fév', revenue: 125, expenses: 78, profit: 47 },
    { month: 'Mar', revenue: 140, expenses: 85, profit: 55 },
    { month: 'Avr', revenue: 115, expenses: 80, profit: 35 },
    { month: 'Mai', revenue: 98, expenses: 72, profit: 26 },
    { month: 'Juin', revenue: 105, expenses: 74, profit: 31 }
  ]
};

export default function DeepAnalytics({
  currentHotel,
  currentRole,
  onAddNotification
}: DeepAnalyticsProps) {
  
  // Strict check for permissions
  if ((currentRole as string) !== 'Propriétaire d\'Hôtel' && (currentRole as string) !== 'Directeur Financier') {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm max-w-2xl mx-auto my-12 fade-in-up flex flex-col items-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-extrabold text-[#09153D] font-sans">Accès Interdit • Profil Non Autorisé</h3>
        <p className="text-xs text-slate-500 mt-2 max-w-md leading-relaxed text-center">
          La console Deep Analytics comporte les calculs d'optimisation RevPAR, les prévisions de chiffre d'affaires et les modèles de rendements elasticité-prix pour l'établissement <strong>{currentHotel}</strong>. Votre profil <strong>{currentRole}</strong> n'est pas autorisé par la direction à accéder à cette console de pilotage.
        </p>
      </div>
    );
  }

  // Custom Analytics Page State
  const [activeTab, setActiveTab] = useState<'kpi' | 'simulation' | 'demographics'>('kpi');
  const [metricTimeframe, setMetricTimeframe] = useState<'30' | '90' | '180'>('90');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeLine, setActiveLine] = useState<'revenue' | 'profit' | 'expenses'>('revenue');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Simulation parameters for interactive model
  const [simPriceChange, setSimPriceChange] = useState<number>(0); // percentage change -20 to +40
  const [simMarketingBoost, setSimMarketingBoost] = useState<number>(0); // 0 to 4 steps

  // Ref for chart size calculation
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(600);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setChartWidth(entry.contentRect.width);
      }
    });
    observer.observe(chartContainerRef.current);
    return () => observer.disconnect();
  }, [activeTab]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Calculate metrics based on selected hotel
  const baseMetrics = useMemo(() => {
    switch (currentHotel) {
      case 'Nema Kadior':
        return {
          adr: 125,
          occupancy: 74,
          alos: 3.2,
          excursionsRate: 48,
          revPar: 92.50,
          cac: 24,
          goppar: 55.20,
          roomCleanupTime: 28, // Cleaning speed metric for Housekeeping
          pmsScore: 94
        };
      case 'Les Pélicans du Saloum':
        return {
          adr: 145,
          occupancy: 68,
          alos: 4.5,
          excursionsRate: 88,
          revPar: 98.60,
          cac: 18,
          goppar: 62.10,
          roomCleanupTime: 35,
          pmsScore: 91
        };
      case 'Royal Saly':
      default:
        return {
          adr: 190,
          occupancy: 82,
          alos: 5.8,
          excursionsRate: 62,
          revPar: 155.80,
          cac: 32,
          goppar: 112.50,
          roomCleanupTime: 24,
          pmsScore: 97
        };
    }
  }, [currentHotel]);

  // Handle simulations based on sliders
  const simulatedValues = useMemo(() => {
    const base = baseMetrics;
    
    // Simple heuristic pricing/marketing model
    // Raising price reduces occupancy but increases ADR.
    // Marketing increases occupancy with extra cost ($3 CAC multiplier).
    const priceMultiplier = 1 + (simPriceChange / 100);
    
    // Elasticity factor: for every +10% price, occupancy drops by -6% points.
    // If marketing is boosted, it softens the drop (+5% points per step).
    const priceElasticityDrop = (simPriceChange > 0) 
      ? (simPriceChange * 0.6) 
      : (simPriceChange * 0.4); // reduction reduces price, increases occupancy up to physical limit
      
    const marketingOccupancyGain = simMarketingBoost * 4.5;
    
    // Calculate new simulated occupancy (constrained between 35% and 98%)
    const simOccupancy = Math.max(35, Math.min(98, Math.round(base.occupancy - priceElasticityDrop + marketingOccupancyGain)));
    const simADR = Math.round(base.adr * priceMultiplier);
    const simRevPar = Number(((simADR * simOccupancy) / 100).toFixed(2));
    
    // GOPPAR impact calculation (approx. profit accounting for marketing cost)
    // Extra marketing step adds +$2 cost per room.
    const marketingCostImpact = simMarketingBoost * 3.5;
    const simGoppar = Number((simRevPar * 0.72 - marketingCostImpact).toFixed(2));
    
    const profitPercentChange = Math.round(((simGoppar - base.goppar) / base.goppar) * 100);

    return {
      occupancy: simOccupancy,
      adr: simADR,
      revPar: simRevPar,
      goppar: simGoppar,
      profitChange: profitPercentChange
    };
  }, [baseMetrics, simPriceChange, simMarketingBoost]);

  // Actionable PMS Intelligence Recommendations
  const intelligentInsights = useMemo(() => {
    const list: string[] = [];
    if (currentHotel === 'Royal Saly') {
      list.push("Augmenter de +8% les tarifs week-end sur Booking.com pour compenser la forte demande française.");
      list.push("Créer un forfait d'excursion 'Coucher de soleil Saly' pour augmenter l’attach rate qui stagne à 62%.");
      list.push("Répartir les chambres Deluxe Océan en priorité aux clients directs pour économiser sur la CAC moyenne ($32).");
    } else if (currentHotel === 'Nema Kadior') {
      list.push("Optimiser l’inventaire en semaine : Proposer des tarifs préférentiels 'Corporate Casamance' pour dynamiser l'occupation du lundi au jeudi.");
      list.push("Investir dans le marketing local pour capter plus de voyageurs de transit de Guinée-Bissau (+12% du mix client).");
      list.push("Réduire le temps de ménage moyen (28 min) : Ajuster les plannings du matin lors des pics de check-out professionnels.");
    } else {
      list.push("Mettre en avant le forfait écotouristique 'Oiseaux du Saloum' sur le canal Direct, qui offre 35% de marge en plus.");
      list.push("Améliorer la couverture Wifi des bungalows fleuve pour accroître la note globale sur TripAdvisor (recommandé par 88% des clients).");
      list.push("Le canal Direct domine (35%). Supprimer les forfaits Expedia moins rentables sur les mois de haute saison (Jan-Mar).");
    }
    return list;
  }, [currentHotel]);

  // Download simulation model report
  const handleExportData = () => {
    onAddNotification(
      "Rapport décisionnel généré",
      `Le fichier d'analyse analytique approfondie pour ${currentHotel} a été compilé.`,
      "info"
    );
    triggerToast("Rapport téléchargeable d'analytique exporté en mémoire (.CSV / PDF)");
  };

  const currentTimelineData = historicalRevPAR[currentHotel as keyof typeof historicalRevPAR] || historicalRevPAR['Royal Saly'];
  const currentDemographics = hotelDemographics[currentHotel as keyof typeof hotelDemographics] || hotelDemographics['Royal Saly'];

  // Handle RBAC Screen restriction
  // Housekeeping Staff shouldn't see confidential financial reports
  if (currentRole === 'Responsable Ménage') {
    return (
      <div className="space-y-6 fade-in-up">
        {/* Header */}
        <div className="text-left">
          <h2 className="text-2xl font-black text-[#09153D] tracking-tight font-sans">Performance Operationnelle et Ménage</h2>
          <p className="text-xs text-slate-400 font-medium font-sans">
            Analyses et métriques opérationnelles simplifiées rattachées au profil {currentRole} - {currentHotel}
          </p>
        </div>

        {/* Top Operational Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-[24px] border border-slate-100 text-left shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Vitesse de Rotation Chambre</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-black text-[#09153D] font-mono">{baseMetrics.roomCleanupTime}</span>
              <span className="text-xs text-slate-400 font-bold font-sans">Minutes / suite</span>
            </div>
            <p className="text-[11px] text-green-600 font-bold mt-1">✓ En ligne avec l'objectif de 30 mins</p>
          </div>

          <div className="bg-white p-5 rounded-[24px] border border-slate-100 text-left shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Score d'Inspection Téranga</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-black text-orange-600 font-mono">{baseMetrics.pmsScore}%</span>
            </div>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">Sur la base de 120 contrôles</p>
          </div>

          <div className="bg-white p-5 rounded-[24px] border border-slate-100 text-left shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Taux d'Occupation Actuel</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-black text-emerald-650 font-mono">{baseMetrics.occupancy}%</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Charge logistique élevée ce jour</p>
          </div>
        </div>

        {/* Security Warning Panel for details */}
        <div className="bg-amber-50 rounded-[28px] border border-amber-200/80 p-8 text-center max-w-2xl mx-auto space-y-4">
          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="font-extrabold text-[#09153D] text-lg">Données Financières Confidentielles</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              La console d'analyse analytique approfondie (RevPAR, ADR, GOPPAR et modélisateurs de marge) est restreinte aux profils de Direction financière et Propriétaire.
            </p>
          </div>
          <div className="pt-2">
            <p className="text-xs text-slate-400 italic">
              Veuillez contacter l'administrateur du Desk Senegal Hotels si vous devez modifier vos habilitations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in-up">
      
      {/* Toast alert */}
      {toastMessage && (
        <div className="bg-[#09153D] text-white px-4 py-3 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 fixed top-6 right-6 z-50 animate-in fade-in duration-200">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <h2 className="text-2xl font-black text-[#09153D] tracking-tight font-sans">Analytique Approfondie (Deep Analytics)</h2>
          <p className="text-xs text-slate-400 font-medium font-sans">
            Indicateurs hôteliers macro-analytiques, simulateur d'élasticité prix/rentabilité et mix géographique des clients de {currentHotel}.
          </p>
        </div>

        <button
          onClick={handleExportData}
          className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/10 self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Exporter le Rapport Décisionnel</span>
        </button>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-slate-100 select-none">
        <button
          onClick={() => setActiveTab('kpi')}
          className={`pb-3.5 px-6 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'kpi' 
              ? 'border-orange-600 text-[#09153D] font-extrabold' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span>Indicateurs & Performance (KPI)</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('simulation')}
          className={`pb-3.5 px-6 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'simulation' 
              ? 'border-orange-600 text-[#09153D] font-extrabold' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            <span>Simulateur d'Élastiticté Tarifaire</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('demographics')}
          className={`pb-3.5 px-6 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'demographics' 
              ? 'border-orange-600 text-[#09153D] font-extrabold' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Mix Géographique Clients</span>
          </div>
        </button>
      </div>

      {/* CORE KPI SUMMARY BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-[22px] border border-slate-100 shadow-sm text-left flex items-center justify-between">
          <div>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">RevPAR</span>
            <span className="text-2xl font-black text-[#09153D] font-mono block mt-1">
              ${baseMetrics.revPar.toFixed(2)}
            </span>
            <span className="text-[10px] text-green-600 font-semibold flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="w-3" />
              <span>+6.2% versus 2025</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <Coins className="w-5.5 h-5.5" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-[22px] border border-slate-100 shadow-sm text-left flex items-center justify-between">
          <div>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Prix Moyen (ADR)</span>
            <span className="text-2xl font-black text-[#09153D] font-mono block mt-1">
              ${baseMetrics.adr}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold block mt-1">Gamme touristique stable</span>
          </div>
          <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5.5 h-5.5" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-[22px] border border-slate-100 shadow-sm text-left flex items-center justify-between">
          <div>
            <span className="text-[9px] font-extrabold text-[#09153D]/50 uppercase tracking-widest block">Occupation Moyenne</span>
            <span className="text-2xl font-black text-[#09153D] font-mono block mt-1">
              {baseMetrics.occupancy}%
            </span>
            <span className="text-[10px] text-green-600 font-semibold flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="w-3" />
              <span>+4.1% par rapport au mois dernier</span>
            </span>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Percent className="w-5.5 h-5.5" />
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-[22px] border border-slate-100 shadow-sm text-left flex items-center justify-between">
          <div>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">CAC</span>
            <span className="text-2xl font-black text-rose-600 font-mono block mt-1">
              ${baseMetrics.cac}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-1">Coût d'acquisition moyen</span>
          </div>
          <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <Clock className="w-5.5 h-5.5" />
          </div>
        </div>
      </div>

      {/* DYNAMIC TAB CONTENTS */}
      {activeTab === 'kpi' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Multi-series Chart (8 Cols) */}
          <div className="lg:col-span-8 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm text-left space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-extrabold text-[#09153D] text-md">Historique de Yield Management</h3>
                <p className="text-[11px] text-slate-400 font-medium">Evolution du RevPAR et de l'efficience énergétique sur les 6 derniers mois</p>
              </div>

              {/* Data Series Toggles */}
              <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-xl gap-1 select-none">
                <button
                  onClick={() => setActiveLine('revenue')}
                  className={`px-3 py-1.5 text-[10.5px] font-bold rounded-lg cursor-pointer transition-all ${
                    activeLine === 'revenue' 
                      ? 'bg-[#09153D] text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  RevPAR ($)
                </button>
                <button
                  onClick={() => setActiveLine('profit')}
                  className={`px-3 py-1.5 text-[10.5px] font-bold rounded-lg cursor-pointer transition-all ${
                    activeLine === 'profit' 
                      ? 'bg-orange-600 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Marge ($/chambre)
                </button>
                <button
                  onClick={() => setActiveLine('expenses')}
                  className={`px-3 py-1.5 text-[10.5px] font-bold rounded-lg cursor-pointer transition-all ${
                    activeLine === 'expenses' 
                      ? 'bg-rose-600 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Coûts fixes
                </button>
              </div>
            </div>

            {/* SVG Graph Area */}
            <div ref={chartContainerRef} className="relative h-64 w-full select-none mt-4">
              <svg className="w-full h-full overflow-visible">
                {/* Defs/Gradients */}
                <defs>
                  <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={activeLine === 'revenue' ? '#09153D' : activeLine === 'profit' ? '#EA580C' : '#E11D48'} stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                {[0, 1, 2, 3, 4].map((grid, gIdx) => {
                  const y = 30 + gIdx * 45;
                  return (
                    <g key={gIdx}>
                      <line
                        x1={40}
                        y1={y}
                        x2={chartWidth - 20}
                        y2={y}
                        stroke="#f1f5f9"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />
                    </g>
                  );
                })}

                {/* Cubic Bezier Plotter */}
                {(() => {
                  const pts = currentTimelineData.map((item, index) => {
                    const stepX = (chartWidth - 60) / (currentTimelineData.length - 1);
                    const x = 40 + index * stepX;
                    const val = activeLine === 'revenue' ? item.revenue : activeLine === 'profit' ? item.profit : item.expenses;
                    // Max limits formulas
                    const maxVal = activeLine === 'revenue' ? 220 : activeLine === 'profit' ? 120 : 120;
                    const minVal = activeLine === 'revenue' ? 60 : activeLine === 'profit' ? 20 : 20;
                    const ratio = (val - minVal) / (maxVal - minVal);
                    const y = 200 - ratio * 150;
                    return { x, y, val, month: item.month };
                  });

                  // Create Smooth Curve
                  let d = `M ${pts[0].x} ${pts[0].y}`;
                  for (let i = 0; i < pts.length - 1; i++) {
                    const p0 = pts[i];
                    const p1 = pts[i + 1];
                    const cp1x = p0.x + (p1.x - p0.x) / 3;
                    const cp1y = p0.y;
                    const cp2x = p0.x + (2 * (p1.x - p0.x)) / 3;
                    const cp2y = p1.y;
                    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
                  }

                  const areaPath = `${d} L ${pts[pts.length - 1].x} 210 L ${pts[0].x} 210 Z`;

                  return (
                    <g>
                      {/* Filled bottom area */}
                      <path d={areaPath} fill="url(#primaryGradient)" />

                      {/* Line */}
                      <path 
                        d={d} 
                        fill="none" 
                        stroke={activeLine === 'revenue' ? '#09153D' : activeLine === 'profit' ? '#EA580C' : '#E11D48'} 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                      />

                      {/* Circle points & event triggers */}
                      {pts.map((p, pIdx) => {
                        const isHovered = hoveredIndex === pIdx;
                        return (
                          <g key={pIdx}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={isHovered ? 7 : 4}
                              className={`cursor-pointer transition-all duration-150 ${
                                activeLine === 'revenue' 
                                  ? 'fill-white stroke-[#09153D] stroke-2' 
                                  : activeLine === 'profit' 
                                  ? 'fill-white stroke-orange-500 stroke-2' 
                                  : 'fill-white stroke-rose-500 stroke-2'
                              }`}
                              onMouseEnter={() => setHoveredIndex(pIdx)}
                              onMouseLeave={() => setHoveredIndex(null)}
                            />
                            {/* X-axis labels */}
                            <text
                              x={p.x}
                              y={235}
                              textAnchor="middle"
                              className="font-sans text-[10px] font-bold fill-slate-400"
                            >
                              {p.month}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}

              </svg>

              {/* Dynamic Popup Tooltip */}
              {hoveredIndex !== null && currentTimelineData[hoveredIndex] && (
                <div 
                  className="absolute bg-[#09153D] text-white p-3 rounded-xl border border-slate-700/50 shadow-xl z-10 pointer-events-none"
                  style={{
                    left: Math.min(40 + hoveredIndex * ((chartWidth - 60) / (currentTimelineData.length - 1)) - 60, chartWidth - 140),
                    top: 10,
                  }}
                >
                  <p className="text-[9.5px] font-bold text-orange-400">{currentTimelineData[hoveredIndex].month} 2026</p>
                  <div className="space-y-0.5 mt-1">
                    <p className="text-xs font-mono font-bold">
                      RevPar: ${currentTimelineData[hoveredIndex].revenue}
                    </p>
                    <p className="text-[10px] text-slate-350">
                      Marge nette : <span className="text-emerald-400">${currentTimelineData[hoveredIndex].profit}</span>
                    </p>
                    <p className="text-[10px] text-slate-350">
                      Coûts : ${currentTimelineData[hoveredIndex].expenses}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Actionable Insight Panel (4 Cols) */}
          <div className="lg:col-span-4 space-y-4 text-left">
            <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-extrabold text-[#09153D] text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  <span>PMS Intelligence Pro</span>
                </h3>
                <p className="text-[10px] text-slate-450">Analyses d'aide à la décision adaptées à la Téranga</p>
              </div>

              <div className="space-y-3.5">
                {intelligentInsights.map((insight, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="p-1 bg-orange-100 text-orange-700 rounded-lg text-xs leading-none mt-0.5 font-bold">
                      {idx + 1}
                    </span>
                    <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                      {insight}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-[#09153D] text-white p-3.5 rounded-xl text-left select-none relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10 font-black text-5xl">
                  $$
                </div>
                <h4 className="text-[11px] font-bold text-orange-400 uppercase tracking-widest block">GOPPAR Actuel de l'Hôtel</h4>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black font-mono">${baseMetrics.goppar.toFixed(2)}</span>
                  <span className="text-[9.5px] text-slate-300">par chambre libre/jour</span>
                </div>
                <p className="text-[10px] text-slate-300 mt-1 leading-normal">
                  Votre bénéfice opérationnel brut par chambre est supérieur à 75% du secteur sénégalais.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'simulation' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Simulation Sliders (5 Cols) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm text-left space-y-6">
            <div>
              <h3 className="font-extrabold text-[#09153D] text-md">Calculateur d'Impression Marges</h3>
              <p className="text-[11px] text-slate-400 font-semibold">Simulez les variations de prix pour voir le point de bascule de rentabilité</p>
            </div>

            {/* Slider 1: Nightly pricing offset */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">Ajustement du Tarif Journalier moyen (ADR)</span>
                <span className={`font-black ${simPriceChange >= 0 ? 'text-green-600' : 'text-red-650'}`}>
                  {simPriceChange >= 0 ? `+${simPriceChange}` : simPriceChange}%
                </span>
              </div>
              
              <input 
                type="range"
                min="-20"
                max="40"
                step="5"
                value={simPriceChange}
                onChange={(e) => setSimPriceChange(Number(e.target.value))}
                className="w-full accent-orange-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer appearance-none"
              />

              <div className="flex justify-between text-[9px] text-slate-400 font-bold select-none">
                <span>Dépression tarifaire (-20%)</span>
                <span>Normal</span>
                <span>Majoration Premium (+40%)</span>
              </div>
            </div>

            {/* Slider 2: Marketing budget boost steps */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">Investissement Budgétaire Marketing</span>
                <span className="font-black text-orange-650 font-mono">
                  Échelon {simMarketingBoost} / 4
                </span>
              </div>

              <input 
                type="range"
                min="0"
                max="4"
                step="1"
                value={simMarketingBoost}
                onChange={(e) => setSimMarketingBoost(Number(e.target.value))}
                className="w-full accent-orange-600 h-1.5 bg-slate-100 rounded-lg cursor-pointer appearance-none"
              />

              <div className="flex justify-between text-[9px] text-slate-400 font-bold select-none">
                <span>Organique</span>
                <span>Sponsors OTA</span>
                <span>Régies Google & Metasearch</span>
              </div>
            </div>

            {/* Information disclaimer */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 inline-flex items-start gap-2 text-xs text-slate-500 font-medium">
              <Info className="w-4 h-4 text-orange-550 shrink-0 mt-0.5" />
              <span>
                <strong>Modèle Elasticité-PMS :</strong> Basé sur l'historique de fréquentation du site de Petite-Côte/Casamance durant les 12 derniers mois.
              </span>
            </div>
          </div>

          {/* RIGHT: Results Compare Panel (7 Cols) */}
          <div className="lg:col-span-7 bg-[#09153D] text-white p-6 rounded-[24px] border border-slate-700 shadow-md text-left space-y-6">
            <div>
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block">Simulation en Direct</span>
              <h3 className="font-black text-xl text-white tracking-tight font-sans">Résultats Élastiques Estimés</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              
              {/* Outcome 1: ADR */}
              <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-left">
                <span className="text-[10px] text-slate-350 font-bold block">Prix de Nuit Estimé</span>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-2xl font-black font-mono text-white">${simulatedValues.adr}</span>
                  <span className="text-[10px] text-slate-300">vs ${baseMetrics.adr}</span>
                </div>
              </div>

              {/* Outcome 2: Occupancy */}
              <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-left">
                <span className="text-[10px] text-slate-350 font-bold block">Taux d'Occupation</span>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-2xl font-black font-mono text-white">{simulatedValues.occupancy}%</span>
                  <span className="text-[10px] text-slate-300">vs {baseMetrics.occupancy}%</span>
                </div>
              </div>

              {/* Outcome 3: RevPAR */}
              <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-left">
                <span className="text-[10px] text-slate-350 font-bold block">RevPAR Projeté</span>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-2xl font-black font-mono text-white">${simulatedValues.revPar}</span>
                  <span className="text-[10px] text-slate-300">vs ${baseMetrics.revPar}</span>
                </div>
              </div>

              {/* Outcome 4: GOPPAR Profit change */}
              <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-left relative overflow-hidden">
                <span className="text-[10px] text-slate-350 font-bold block">Marge Estimée (GOPPAR)</span>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-2xl font-black font-mono text-white">${simulatedValues.goppar}</span>
                  <span className="text-[10px] text-slate-300">vs ${baseMetrics.goppar}</span>
                </div>
              </div>

            </div>

            {/* Profit margin change badge */}
            <div className={`p-4 rounded-2xl flex items-center justify-between ${
              simulatedValues.profitChange >= 0 
                ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-950/40 border border-rose-500/20 text-rose-400'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  simulatedValues.profitChange >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                }`}>
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black">Efficacité Profit de votre stratégie</h4>
                  <p className="text-[10px] text-slate-300 mt-0.5">Sur la base du chiffre d'affaires total</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl font-black font-mono">
                  {simulatedValues.profitChange >= 0 ? `+${simulatedValues.profitChange}` : simulatedValues.profitChange}%
                </span>
                <span className="text-[9px] block text-slate-350">versus normal</span>
              </div>
            </div>

            {/* Recommendation block based on simulator change */}
            <div className="text-xs text-slate-300 italic flex items-start gap-1">
              <span>💡</span>
              {simulatedValues.profitChange > 12 ? (
                <span><strong>Excellente configuration :</strong> La majoration des tarifs compensée par un budget de prospection digital est idéale pour la saison actuelle.</span>
              ) : simulatedValues.profitChange < -5 ? (
                <span><strong>Alerte sous-optimisation :</strong> La baisse tarifaire ne recrée pas assez d'occupation pour éponger les charges fixes opérationnelles.</span>
              ) : (
                <span>La modification apporte un rendement stable sur le long terme. Surveillez l'attach rate des activités annexes pour un supplément de revenu.</span>
              )}
            </div>

          </div>

        </div>
      )}

      {activeTab === 'demographics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Geographics breakdown list (6 Cols) */}
          <div className="lg:col-span-6 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm text-left space-y-4">
            <div>
              <h3 className="font-extrabold text-[#09153D] text-md">Mix Géographique de Clientèle</h3>
              <p className="text-[11px] text-slate-400 font-medium">Origines géographiques de la clientèle de l'hôtel {currentHotel}</p>
            </div>

            <div className="space-y-4 select-none pt-2">
              {currentDemographics.map((dem, idx) => {
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: dem.color }}
                        />
                        <span className="font-bold">{dem.source}</span>
                      </span>
                      <span className="font-mono font-black text-[#09153D]">{dem.percentage}%</span>
                    </div>

                    {/* Bar graphic */}
                    <div className="h-2 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-300" 
                        style={{ width: `${dem.percentage}%`, backgroundColor: dem.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visual Map/Stats Cards details (6 Cols) */}
          <div className="lg:col-span-6 space-y-4 text-left">
            
            <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
              <div>
                <h4 className="font-extrabold text-[#09153D] text-xs uppercase tracking-widest block">Indicateurs de Fidélisation</h4>
                <p className="text-[10.5px] text-slate-400 mt-0.5 font-medium">Répartition de fidélité et clients habitués</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Taux de Retour</span>
                  <span className="text-xl font-black text-[#09153D] font-mono block mt-1">24.5%</span>
                  <p className="text-[9.5px] text-green-600 font-bold mt-1">✓ Excellent (+2.1%)</p>
                </div>

                <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Clients VIP</span>
                  <span className="text-xl font-black text-orange-600 font-mono block mt-1">112 Clients</span>
                  <p className="text-[9.5px] text-slate-400 font-medium mt-1">Enregistrés au PMS</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="space-y-1 text-xs">
                  <h5 className="font-extrabold text-[#09153D]">Note d'Analyse Régionale</h5>
                  <p className="text-slate-500 leading-normal text-[11px]">
                    L'attrait international varie fortement selon la saison de la Téranga. Durant l'hiver européen (novembre à avril), l'occupation internationale d'origine française et allemande représente 72% de notre chiffre d'affaires. Le tourisme d'affaires ouest-africain prend le relais sur les mois d'été.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
