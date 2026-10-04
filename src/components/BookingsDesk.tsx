import { useMemo, useState } from 'react';
import { Plus, Search, Download, Star } from 'lucide-react';
import type { Room } from '../types';
import type { Property } from '../lib/auth';
import type { AppRole } from '../lib/roles';
import { canManageReservations } from '../lib/roles';
import {
  SOURCE_LABELS, STATUS_LABELS, balanceOf, rpc, type PmsActions, type RatePlanRow, type ReservationRow, type ReservationStatus,
} from '../lib/pmsData';
import { formatDate, formatMoney, nightsBetween } from '../lib/dates';
import { downloadCsv, toCsv } from '../lib/csv';
import { Badge, Button, Empty, ErrorNote, Input, PageHeader, Select, Stat, Table, useAction } from './ui';
import ReservationForm from './reservations/ReservationForm';
import ReservationDrawer, { STATUS_TONES } from './reservations/ReservationDrawer';
import { useI18n } from '../lib/i18n';

interface Props {
  rooms: Room[];
  reservations: ReservationRow[];
  ratePlans: RatePlanRow[];
  property: Property;
  role: AppRole;
  today: string;
  actions: PmsActions;
}

type Filter = 'upcoming' | 'arrivals' | 'in_house' | 'departures' | 'all' | ReservationStatus;

export default function BookingsDesk({ rooms, reservations, ratePlans, property, role, today, actions }: Props) {
  const { tr } = useI18n();
  const canWrite = canManageReservations(role);
  const canExport = ['owner', 'general_manager', 'reservation_manager', 'accountant', 'auditor'].includes(role);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const { error, run } = useAction();

  const roomNumber = useMemo(() => new Map(rooms.map((r) => [r.id, r.number])), [rooms]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reservations
      .filter((r) => {
        switch (filter) {
          case 'upcoming': return ['option', 'confirmed', 'checked_in'].includes(r.status);
          case 'arrivals': return ['option', 'confirmed'].includes(r.status) && r.check_in <= today;
          case 'in_house': return r.status === 'checked_in';
          case 'departures': return r.status === 'checked_in' && r.check_out <= today;
          case 'all': return true;
          default: return r.status === filter;
        }
      })
      .filter((r) =>
        !q ||
        r.code.toLowerCase().includes(q) ||
        (r.guest?.full_name ?? '').toLowerCase().includes(q) ||
        (r.guest?.phone ?? '').includes(q) ||
        (roomNumber.get(r.room_id) ?? '').includes(q),
      )
      .sort((a, b) => (filter === 'all' ? b.check_in.localeCompare(a.check_in) : a.check_in.localeCompare(b.check_in)));
  }, [reservations, filter, query, today, roomNumber]);

  const stats = useMemo(() => {
    const live = reservations.filter((r) => ['option', 'confirmed', 'checked_in'].includes(r.status));
    return {
      arrivals: live.filter((r) => r.status !== 'checked_in' && r.check_in === today).length,
      inHouse: live.filter((r) => r.status === 'checked_in').length,
      departures: live.filter((r) => r.status === 'checked_in' && r.check_out === today).length,
      due: live.filter((r) => r.status === 'checked_in').reduce((s, r) => s + Math.max(balanceOf(r), 0), 0),
    };
  }, [reservations, today]);

  const exportCsv = () =>
    run(async () => {
      const rows = filtered.map((r) => ({
        code: r.code,
        guest: r.guest?.full_name ?? '',
        room: roomNumber.get(r.room_id) ?? '',
        check_in: r.check_in,
        check_out: r.check_out,
        nights: nightsBetween(r.check_in, r.check_out),
        status: STATUS_LABELS[r.status],
        source: SOURCE_LABELS[r.source],
        total: r.total_amount,
        balance: balanceOf(r),
      }));
      await rpc('log_export', { p_property: property.id, p_kind: 'reservations', p_rows: rows.length });
      downloadCsv(
        `reservations-${property.code}-${today}.csv`,
        toCsv(rows, [
          { key: 'code', label: tr('Référence', 'Reference') }, { key: 'guest', label: tr('Client', 'Guest') }, { key: 'room', label: tr('Chambre', 'Room') },
          { key: 'check_in', label: tr('Arrivée', 'Arrival') }, { key: 'check_out', label: tr('Départ', 'Departure') }, { key: 'nights', label: tr('Nuits', 'Nights') },
          { key: 'status', label: tr('Statut', 'Status') }, { key: 'source', label: tr('Provenance', 'Source') }, { key: 'total', label: tr('Montant séjour', 'Stay amount') },
          { key: 'balance', label: tr('Solde', 'Balance') },
        ]),
      );
    });

  const open = reservations.find((r) => r.id === openId);

  return (
    <div className="fade-in-up">
      <PageHeader
        title={tr('Réservations', 'Reservations')}
        subtitle={tr(`Toutes les réservations de ${property.name} (90 derniers jours et à venir).`, `All reservations for ${property.name} (last 90 days and upcoming).`)}
        actions={
          <>
            {canExport && <Button variant="secondary" icon={Download} onClick={exportCsv}>{tr('Exporter', 'Export')}</Button>}
            {canWrite && <Button icon={Plus} disabled={rooms.length === 0} title={rooms.length === 0 ? tr('Ajoutez d’abord des chambres', 'Add rooms first') : undefined} onClick={() => setCreating(true)}>{tr('Nouvelle réservation', 'New reservation')}</Button>}
          </>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Stat label={tr('Arrivées du jour', 'Today’s arrivals')} value={String(stats.arrivals)} />
        <Stat label={tr('En séjour', 'In house')} value={String(stats.inHouse)} />
        <Stat label={tr('Départs du jour', 'Today’s departures')} value={String(stats.departures)} />
        <Stat label={tr('Soldes à encaisser', 'Balances to collect')} value={formatMoney(stats.due)} hint={tr('Clients en séjour', 'In-house guests')} />
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input className="pl-8" placeholder={tr('Client, référence, téléphone, chambre…', 'Guest, reference, phone, room…')} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={tr('Rechercher', 'Search')} />
        </div>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="w-full md:w-60" aria-label={tr('Filtre', 'Filter')}>
          <option value="upcoming">{tr('En cours et à venir', 'Current and upcoming')}</option>
          <option value="arrivals">{tr('Arrivées à traiter', 'Pending arrivals')}</option>
          <option value="in_house">{tr('En séjour', 'In house')}</option>
          <option value="departures">{tr('Départs à traiter', 'Pending departures')}</option>
          <option value="all">{tr('Toutes', 'All')}</option>
          <option value="checked_out">{tr('Parties', 'Checked out')}</option>
          <option value="cancelled">{tr('Annulées', 'Cancelled')}</option>
          <option value="no_show">No-show</option>
        </Select>
      </div>

      <ErrorNote message={error} />

      {filtered.length === 0 ? (
        <Empty>{tr('Aucune réservation pour ce filtre.', 'No reservations for this filter.')}</Empty>
      ) : (
        <Table head={[tr('Référence', 'Reference'), tr('Client', 'Guest'), tr('Chambre', 'Room'), tr('Séjour', 'Stay'), tr('Provenance', 'Source'), tr('Statut', 'Status'), tr('Montant', 'Amount'), tr('Solde', 'Balance')]}>
          {filtered.map((r) => {
            const balance = balanceOf(r);
            return (
              <tr key={r.id} onClick={() => setOpenId(r.id)} className="hover:bg-slate-50 cursor-pointer">
                <td className="p-3 font-mono font-bold text-[#09153D]">
                  {r.code}
                  {r.invoices[0] && <span className="block text-[9px] text-emerald-600">{tr('Facture', 'Invoice')} {r.invoices[r.invoices.length - 1].display_number}</span>}
                </td>
                <td className="p-3">
                  <span className="font-bold text-slate-800">{r.guest?.full_name ?? tr('Client', 'Guest')}</span>
                  {r.guest?.vip && <Star className="inline w-3 h-3 ml-1 text-violet-500" aria-label="VIP" />}
                  <span className="block text-[10px] text-slate-400">{r.guest?.phone}</span>
                </td>
                <td className="p-3 font-mono font-bold">{roomNumber.get(r.room_id) ?? '?'}</td>
                <td className="p-3 whitespace-nowrap">
                  {formatDate(r.check_in)} → {formatDate(r.check_out)}
                  <span className="block text-[10px] text-slate-400">{tr(`${nightsBetween(r.check_in, r.check_out)} nuit(s) · ${r.adults + r.children} pers.`, `${nightsBetween(r.check_in, r.check_out)} night(s) · ${r.adults + r.children} guests`)}</span>
                </td>
                <td className="p-3">{SOURCE_LABELS[r.source]}</td>
                <td className="p-3"><Badge tone={STATUS_TONES[r.status]}>{STATUS_LABELS[r.status]}</Badge></td>
                <td className="p-3 font-mono text-right">{formatMoney(r.total_amount)}</td>
                <td className={`p-3 font-mono text-right font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatMoney(balance)}</td>
              </tr>
            );
          })}
        </Table>
      )}

      {creating && (
        <ReservationForm
          rooms={rooms}
          ratePlans={ratePlans}
          today={today}
          breakfastPrice={property.breakfast_price}
          propertyId={property.id}
          actions={actions}
          onClose={() => setCreating(false)}
          onSaved={(id) => {
            setCreating(false);
            if (id) setOpenId(id);
          }}
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
