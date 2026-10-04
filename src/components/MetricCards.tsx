import { Wallet, CalendarDays, ArrowUpRight, ArrowDownRight, BedDouble } from 'lucide-react';
import { formatMoney } from '../lib/dates';

export interface DashboardStats {
  monthRevenue: number | null; // null : rôle sans accès aux données financières
  newReservations7d: number;
  arrivalsDone: number;
  arrivalsExpected: number;
  departuresDone: number;
  departuresExpected: number;
  occupancyRate: number;
}

// Indicateurs du jour calculés depuis la base. Pas de tendance inventée :
// une variation n'apparaîtra que lorsqu'elle sera calculée sur des données.
export default function MetricCards({ stats }: { stats: DashboardStats }) {
  const cards = [
    stats.monthRevenue !== null && {
      label: 'Encaissé ce mois',
      value: formatMoney(stats.monthRevenue),
      hint: 'Paiements enregistrés depuis le 1er',
      icon: Wallet,
    },
    {
      label: 'Réservations créées',
      value: String(stats.newReservations7d),
      hint: 'Sur les 7 derniers jours',
      icon: CalendarDays,
    },
    {
      label: 'Arrivées du jour',
      value: `${stats.arrivalsDone} / ${stats.arrivalsExpected}`,
      hint: 'Enregistrées / attendues',
      icon: ArrowUpRight,
    },
    {
      label: 'Départs du jour',
      value: `${stats.departuresDone} / ${stats.departuresExpected}`,
      hint: 'Effectués / prévus',
      icon: ArrowDownRight,
    },
    {
      label: 'Occupation',
      value: `${stats.occupancyRate} %`,
      hint: 'Chambres occupées ce soir',
      icon: BedDouble,
    },
  ].filter(Boolean) as { label: string; value: string; hint: string; icon: typeof Wallet }[];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6 mb-8 w-full">
      {cards.map((c) => (
        <div key={c.label} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{c.label}</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
              <c.icon className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-[#09153D] tracking-tight font-mono">{c.value}</h3>
          <p className="text-[11px] text-slate-400 font-medium mt-1">{c.hint}</p>
        </div>
      ))}
    </div>
  );
}
