import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Wrench } from 'lucide-react';
import type { Room } from '../types';
import type { Property } from '../lib/auth';
import type { AppRole } from '../lib/roles';
import { canManageReservations } from '../lib/roles';
import { STATUS_LABELS, run, type PmsActions, type RatePlanRow, type ReservationRow, balanceOf } from '../lib/pmsData';
import { supabase } from '../lib/supabase';
import { useQuery } from '../lib/query';
import { addDays, formatDate, nightsBetween } from '../lib/dates';
import { Button, ErrorNote, PageHeader, Select, useAction } from './ui';
import ReservationForm from './reservations/ReservationForm';
import ReservationDrawer from './reservations/ReservationDrawer';

interface Props {
  rooms: Room[];
  reservations: ReservationRow[];
  ratePlans: RatePlanRow[];
  property: Property;
  role: AppRole;
  today: string;
  actions: PmsActions;
}

const BAR_COLORS: Record<ReservationRow['status'], string> = {
  option: 'bg-amber-100 border-amber-300 text-amber-900',
  confirmed: 'bg-sky-100 border-sky-300 text-sky-900',
  checked_in: 'bg-orange-500 border-orange-600 text-white',
  checked_out: 'bg-slate-200 border-slate-300 text-slate-600',
  cancelled: 'hidden',
  no_show: 'hidden',
};

const SHOWN: ReservationRow['status'][] = ['option', 'confirmed', 'checked_in', 'checked_out'];

// Planning de la réception : une ligne par chambre, une colonne par nuit.
// Un clic sur une case libre crée une réservation, un glisser-déposer déplace
// le séjour (les règles de disponibilité restent vérifiées par le serveur).
export default function RoomRack({ rooms, reservations, ratePlans, property, role, today, actions }: Props) {
  const canWrite = canManageReservations(role);
  const [span, setSpan] = useState(14);
  const [start, setStart] = useState(addDays(today, -1));
  const [creating, setCreating] = useState<{ roomId: string; checkIn: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const { error, run: act } = useAction();

  const days = useMemo(() => Array.from({ length: span }, (_, i) => addDays(start, i)), [start, span]);
  const end = days[days.length - 1];

  const blocks = useQuery(
    async () =>
      (await run(
        supabase
          .from('maintenance_orders')
          .select('id, room_id, title, blocks_from, blocks_to')
          .eq('property_id', property.id)
          .neq('status', 'resolved')
          .not('blocks_from', 'is', null),
      )) as { id: string; room_id: string; title: string; blocks_from: string; blocks_to: string }[],
    [property.id, rooms],
  );

  const sortedRooms = useMemo(
    () => [...rooms].sort((a, b) => a.floor - b.floor || a.number.localeCompare(b.number, 'fr', { numeric: true })),
    [rooms],
  );

  const visible = useMemo(
    () => reservations.filter((r) => SHOWN.includes(r.status) && r.check_in <= end && r.check_out > start),
    [reservations, start, end],
  );

  const occupancy = useMemo(
    () =>
      days.map((d) => visible.filter((r) => r.status !== 'checked_out' && r.check_in <= d && r.check_out > d).length),
    [days, visible],
  );

  // Position d'un intervalle [from, to) dans la fenêtre (colonnes CSS 1-indexées).
  const place = (from: string, to: string) => {
    const startCol = from < start ? 0 : nightsBetween(start, from);
    const endCol = Math.min(span, nightsBetween(start, to));
    return { startCol: startCol + 2, spanCols: Math.max(endCol - startCol, 1), clippedLeft: from < start };
  };

  const moveTo = (reservation: ReservationRow, roomId: string, day: string) => {
    const inHouse = reservation.status === 'checked_in';
    const length = nightsBetween(reservation.check_in, reservation.check_out);
    const checkIn = inHouse ? reservation.check_in : day;
    const checkOut = inHouse ? reservation.check_out : addDays(day, length);
    const target = rooms.find((r) => r.id === roomId);
    if (roomId === reservation.room_id && checkIn === reservation.check_in) return;
    const what = inHouse
      ? `Déloger ${reservation.guest?.full_name ?? 'le client'} vers la chambre ${target?.number} ?`
      : `Déplacer ${reservation.code} en chambre ${target?.number} du ${formatDate(checkIn)} au ${formatDate(checkOut)} ? Le prix sera recalculé.`;
    if (!confirm(what)) return;
    act(() =>
      actions.updateReservation(reservation.id, {
        roomId,
        checkIn,
        checkOut,
        adults: reservation.adults,
        children: reservation.children,
        breakfast: reservation.breakfast,
        notes: reservation.notes ?? '',
        ratePlanId: reservation.rate_plan_id,
        source: reservation.source,
      }),
    );
  };

  const open = reservations.find((r) => r.id === openId);
  const columns = `minmax(110px, 140px) repeat(${span}, minmax(44px, 1fr))`;

  return (
    <div className="fade-in-up">
      <PageHeader
        title="Planning des chambres"
        subtitle="Cliquez sur une case libre pour réserver, glissez un séjour pour le déplacer ou déloger le client."
        actions={
          <>
            <Button variant="secondary" icon={ChevronLeft} onClick={() => setStart(addDays(start, -7))} aria-label="Semaine précédente" />
            <Button variant="secondary" onClick={() => setStart(addDays(today, -1))}>Aujourd’hui</Button>
            <Button variant="secondary" icon={ChevronRight} onClick={() => setStart(addDays(start, 7))} aria-label="Semaine suivante" />
            <Select value={span} onChange={(e) => setSpan(Number(e.target.value))} className="w-28" aria-label="Période">
              <option value={7}>7 jours</option>
              <option value={14}>14 jours</option>
              <option value={30}>30 jours</option>
            </Select>
            {canWrite && rooms.length > 0 && <Button icon={Plus} onClick={() => setCreating({ roomId: rooms[0].id, checkIn: today })}>Réservation</Button>}
          </>
        }
      />

      <ErrorNote message={error} />

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-x-auto mt-3">
        <div className="min-w-max">
          <div className="grid sticky top-0 bg-white z-10 border-b border-slate-100" style={{ gridTemplateColumns: columns }}>
            <div className="p-2 text-[10px] font-bold text-slate-400 uppercase">Chambre</div>
            {days.map((d) => {
              const date = new Date(`${d}T12:00:00Z`);
              const weekend = [0, 6].includes(date.getUTCDay());
              return (
                <div key={d} className={`p-1.5 text-center border-l border-slate-50 ${d === today ? 'bg-orange-50' : weekend ? 'bg-slate-50/70' : ''}`}>
                  <p className="text-[9px] uppercase text-slate-400 font-bold">{date.toLocaleDateString('fr-FR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '')}</p>
                  <p className={`text-xs font-black ${d === today ? 'text-orange-600' : 'text-slate-700'}`}>{date.getUTCDate()}</p>
                </div>
              );
            })}
          </div>

          {sortedRooms.map((room) => {
            const roomRes = visible.filter((r) => r.room_id === room.id);
            const roomBlocks = (blocks.data ?? []).filter((b) => b.room_id === room.id && b.blocks_from <= end && b.blocks_to > start);
            return (
              <div key={room.id} className="grid relative border-b border-slate-50 h-11" style={{ gridTemplateColumns: columns }}>
                <div className="px-2 flex flex-col justify-center border-r border-slate-100 bg-white sticky left-0 z-[5]">
                  <span className="text-xs font-black text-slate-800">{room.number}</span>
                  <span className="text-[9px] text-slate-400 truncate">{room.category}</span>
                </div>
                {days.map((d, i) => (
                  <div
                    key={d}
                    style={{ gridColumn: i + 2, gridRow: 1 }}
                    className={`border-l border-slate-50 ${d === today ? 'bg-orange-50/40' : ''} ${canWrite ? 'hover:bg-sky-50 cursor-pointer' : ''}`}
                    onClick={() => canWrite && setCreating({ roomId: room.id, checkIn: d < today ? today : d })}
                    onDragOver={(e) => canWrite && dragId && e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const res = reservations.find((r) => r.id === dragId);
                      setDragId(null);
                      if (res) moveTo(res, room.id, d);
                    }}
                    aria-label={`Chambre ${room.number}, ${formatDate(d)}`}
                  />
                ))}
                {roomBlocks.map((b) => {
                  const p = place(b.blocks_from, b.blocks_to);
                  return (
                    <div
                      key={b.id}
                      title={`Hors service : ${b.title}`}
                      style={{ gridColumn: `${p.startCol} / span ${p.spanCols}`, gridRow: 1 }}
                      className="m-1 rounded-lg border border-red-300 text-red-800 text-[10px] font-bold px-2 flex items-center gap-1 overflow-hidden pointer-events-none"
                    >
                      <span className="absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fecaca 0 6px,transparent 6px 12px)' }} />
                      <Wrench className="w-3 h-3 shrink-0 relative" />
                      <span className="truncate relative">{b.title}</span>
                    </div>
                  );
                })}
                {roomRes.map((r) => {
                  const p = place(r.check_in, r.check_out);
                  const movable = canWrite && ['option', 'confirmed', 'checked_in'].includes(r.status);
                  const due = balanceOf(r) > 0 && r.status === 'checked_in';
                  return (
                    <button
                      key={r.id}
                      draggable={movable}
                      onDragStart={(e) => {
                        setDragId(r.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => setOpenId(r.id)}
                      title={`${r.guest?.full_name ?? 'Client'} · ${STATUS_LABELS[r.status]} · ${formatDate(r.check_in)} → ${formatDate(r.check_out)}`}
                      style={{ gridColumn: `${p.startCol} / span ${p.spanCols}`, gridRow: 1 }}
                      className={`relative z-[2] my-1.5 ${p.clippedLeft ? 'ml-0 rounded-l-none' : 'ml-1'} mr-1 rounded-lg border text-[10px] font-bold px-2 text-left truncate cursor-pointer ${BAR_COLORS[r.status]} ${movable ? 'active:cursor-grabbing' : ''}`}
                    >
                      {due && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600 mr-1 align-middle" aria-label="Solde dû" />}
                      {r.guest?.full_name ?? 'Client'}
                    </button>
                  );
                })}
              </div>
            );
          })}

          <div className="grid bg-slate-50/60" style={{ gridTemplateColumns: columns }}>
            <div className="p-2 text-[10px] font-bold text-slate-500 uppercase">Occupation</div>
            {occupancy.map((n, i) => (
              <div key={days[i]} className="p-1.5 text-center text-[10px] font-mono font-bold text-slate-600 border-l border-slate-100">
                {rooms.length ? Math.round((n / rooms.length) * 100) : 0}%
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mt-4 text-[11px] text-slate-500">
        <Legend className="bg-amber-100 border-amber-300" label="Option" />
        <Legend className="bg-sky-100 border-sky-300" label="Confirmée" />
        <Legend className="bg-orange-500 border-orange-600" label="En séjour" />
        <Legend className="bg-slate-200 border-slate-300" label="Partie" />
        <Legend className="bg-red-100 border-red-300" label="Hors service" />
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-600" /> Solde dû</span>
      </div>

      {creating && (
        <ReservationForm
          rooms={rooms}
          ratePlans={ratePlans}
          today={today}
          breakfastPrice={property.breakfast_price}
          propertyId={property.id}
          actions={actions}
          initial={creating}
          onClose={() => setCreating(null)}
          onSaved={() => setCreating(null)}
        />
      )}
      {open && (
        <ReservationDrawer
          reservation={open}
          rooms={rooms}
          ratePlans={ratePlans}
          property={property}
          role={role}
          today={today}
          actions={actions}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-4 h-3 rounded border ${className}`} />
      {label}
    </span>
  );
}

