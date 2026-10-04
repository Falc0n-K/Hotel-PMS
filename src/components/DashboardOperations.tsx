import React, { useMemo, useState } from 'react';
import { LogIn, LogOut, Brush, Check, AlertTriangle } from 'lucide-react';
import type { Room } from '../types';
import type { HousekeepingTaskRow, ReservationRow } from '../lib/pmsData';
import { paidAmount } from '../lib/pmsData';
import { formatMoney } from '../lib/dates';

interface Props {
  today: string;
  rooms: Room[];
  reservations: ReservationRow[];
  tasks: HousekeepingTaskRow[];
  showBalances: boolean;
  canCompleteTasks: boolean;
  onCompleteTask: (task: HousekeepingTaskRow) => Promise<void>;
}

// Tableau de bord orienté action : ce que la réception et le ménage ont à
// faire aujourd'hui, tiré directement des réservations et des tâches.
export default function DashboardOperations({
  today,
  rooms,
  reservations,
  tasks,
  showBalances,
  canCompleteTasks,
  onCompleteTask,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const roomNumber = useMemo(() => new Map(rooms.map((r) => [r.id, r.number])), [rooms]);

  const arrivals = reservations.filter(
    (r) => (r.status === 'confirmed' || r.status === 'option') && r.check_in <= today && r.check_out > today,
  );
  const departures = reservations.filter((r) => r.status === 'checked_in' && r.check_out <= today);
  const unpaid = reservations.filter(
    (r) => r.status === 'checked_in' && paidAmount(r) < r.total_amount,
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
      <Panel icon={LogIn} title="Arrivées du jour" count={arrivals.length} empty="Aucune arrivée attendue.">
        {arrivals.map((r) => (
          <Line
            key={r.id}
            left={r.guest?.full_name ?? 'Client'}
            sub={`${r.code}${r.check_in < today ? ' · arrivée en retard' : ''}`}
            right={`Ch. ${roomNumber.get(r.room_id) ?? '?'}`}
            warn={r.check_in < today}
          />
        ))}
      </Panel>

      <Panel icon={LogOut} title="Départs du jour" count={departures.length} empty="Aucun départ prévu.">
        {departures.map((r) => (
          <Line
            key={r.id}
            left={r.guest?.full_name ?? 'Client'}
            sub={
              showBalances
                ? `Solde : ${formatMoney(r.total_amount - paidAmount(r))}`
                : r.code
            }
            right={`Ch. ${roomNumber.get(r.room_id) ?? '?'}`}
            warn={r.check_out < today}
          />
        ))}
      </Panel>

      <Panel icon={Brush} title="Chambres à préparer" count={tasks.length} empty="Aucune tâche de ménage ouverte.">
        {error && <p className="text-[11px] text-red-600 font-semibold px-1">{error}</p>}
        {tasks.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-2 py-2 border-b border-slate-50 last:border-0">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800">Chambre {roomNumber.get(t.room_id) ?? '?'}</p>
              <p className="text-[10px] text-slate-400 truncate">{t.notes ?? 'Ménage'}</p>
            </div>
            {canCompleteTasks && (
              <button
                onClick={() => onCompleteTask(t).catch((e: Error) => setError(e.message))}
                className="shrink-0 flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-emerald-100"
              >
                <Check className="w-3 h-3" /> Prête
              </button>
            )}
          </div>
        ))}
      </Panel>

      {showBalances && unpaid.length > 0 && (
        <div className="xl:col-span-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {unpaid.length} séjour{unpaid.length > 1 ? 's' : ''} en cours avec un solde à encaisser (total{' '}
            {formatMoney(unpaid.reduce((s, r) => s + r.total_amount - paidAmount(r), 0))}).
          </span>
        </div>
      )}
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  count,
  empty,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Icon className="w-4 h-4 text-orange-600" /> {title}
        </h4>
        <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {count === 0 ? <p className="text-[11px] text-slate-400 italic py-4 text-center">{empty}</p> : children}
      </div>
    </div>
  );
}

function Line({ left, sub, right, warn }: { left: string; sub: string; right: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-slate-50 last:border-0">
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-800 truncate">{left}</p>
        <p className={`text-[10px] truncate ${warn ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>{sub}</p>
      </div>
      <span className="shrink-0 text-[11px] font-mono font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-lg">{right}</span>
    </div>
  );
}
