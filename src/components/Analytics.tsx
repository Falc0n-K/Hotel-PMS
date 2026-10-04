import { useMemo, useState } from 'react';
import type { Property } from '../lib/auth';
import { SOURCE_LABELS, run, type BookingSource, type ReservationStatus } from '../lib/pmsData';
import { supabase } from '../lib/supabase';
import { useQuery } from '../lib/query';
import { addDays, formatMoney, nightsBetween } from '../lib/dates';
import { Card, Empty, ErrorNote, Field, Input, Loading, PageHeader, Stat, Table } from './ui';

interface Res {
  status: ReservationStatus;
  check_in: string;
  check_out: string;
  room_amount: number | null;
  total_amount: number;
  source: BookingSource;
  created_at: string;
  room: { room_type: { name: string } | null } | null;
}

interface Props {
  property: Property;
  roomCount: number;
  today: string;
}

// Indicateurs hôteliers calculés sur les nuitées de la période :
// TO (taux d'occupation), PMC (prix moyen chambre, ADR) et RevPAR.
export default function Analytics({ property, roomCount, today }: Props) {
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);

  const data = useQuery(async () => {
    const res = (await run(
      supabase
        .from('reservations')
        .select('status, check_in, check_out, room_amount, total_amount, source, created_at, room:rooms(room_type:room_types(name))')
        .eq('property_id', property.id)
        .lt('check_in', addDays(to, 1))
        .gt('check_out', from),
    )) as unknown as Res[];
    const extras = (await run(
      supabase.from('folio_charges').select('amount').eq('property_id', property.id).gte('created_at', `${from}T00:00:00`).lt('created_at', `${addDays(to, 1)}T00:00:00`),
    )) as { amount: number }[];
    return { res, extras: extras.reduce((s, c) => s + c.amount, 0) };
  }, [property.id, from, to]);

  const kpi = useMemo(() => {
    const res = data.data?.res ?? [];
    const periodNights = Math.max(nightsBetween(from, addDays(to, 1)), 1);
    const sold = res.filter((r) => ['checked_in', 'checked_out', 'confirmed', 'option'].includes(r.status));
    let roomNights = 0;
    let roomRevenue = 0;
    const bySource = new Map<BookingSource, { nights: number; revenue: number }>();
    const byType = new Map<string, { nights: number; revenue: number }>();
    for (const r of sold) {
      const total = nightsBetween(r.check_in, r.check_out);
      const inStart = r.check_in > from ? r.check_in : from;
      const inEnd = r.check_out < addDays(to, 1) ? r.check_out : addDays(to, 1);
      const nights = nightsBetween(inStart, inEnd);
      const revenue = Math.round(((r.room_amount ?? r.total_amount) * nights) / Math.max(total, 1));
      roomNights += nights;
      roomRevenue += revenue;
      const s = bySource.get(r.source) ?? { nights: 0, revenue: 0 };
      bySource.set(r.source, { nights: s.nights + nights, revenue: s.revenue + revenue });
      const type = r.room?.room_type?.name ?? '—';
      const t = byType.get(type) ?? { nights: 0, revenue: 0 };
      byType.set(type, { nights: t.nights + nights, revenue: t.revenue + revenue });
    }
    const available = roomCount * periodNights;
    const created = res.filter((r) => r.created_at.slice(0, 10) >= from && r.created_at.slice(0, 10) <= to);
    return {
      occupancy: available ? Math.round((roomNights / available) * 1000) / 10 : 0,
      adr: roomNights ? Math.round(roomRevenue / roomNights) : 0,
      revpar: available ? Math.round(roomRevenue / available) : 0,
      roomRevenue,
      roomNights,
      cancellations: created.filter((r) => r.status === 'cancelled').length,
      noShows: res.filter((r) => r.status === 'no_show').length,
      createdCount: created.length,
      bySource: [...bySource.entries()].sort((a, b) => b[1].revenue - a[1].revenue),
      byType: [...byType.entries()].sort((a, b) => b[1].revenue - a[1].revenue),
    };
  }, [data.data, from, to, roomCount]);

  return (
    <div className="fade-in-up">
      <PageHeader title="Statistiques" subtitle="Indicateurs calculés à partir des réservations (nuitées vendues sur la période)." />
      <div className="flex flex-wrap gap-3 mb-6">
        <Field label="Du"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="Au"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      <ErrorNote message={data.error} />
      {data.loading && !data.data ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <Stat label="Taux d’occupation" value={`${kpi.occupancy.toLocaleString('fr-FR')} %`} hint={`${kpi.roomNights} nuitées vendues`} />
            <Stat label="Prix moyen chambre (PMC)" value={formatMoney(kpi.adr)} />
            <Stat label="RevPAR" value={formatMoney(kpi.revpar)} hint="Revenu hébergement par chambre disponible" />
            <Stat label="CA hébergement" value={formatMoney(kpi.roomRevenue)} hint={`+ ${formatMoney(data.data?.extras ?? 0)} d’extras`} />
          </div>
          <div className="grid xl:grid-cols-2 gap-4">
            <Card title="Par provenance">
              {kpi.bySource.length === 0 ? <Empty>Aucune donnée.</Empty> : (
                <Table head={['Provenance', 'Nuitées', 'CA', 'Part']}>
                  {kpi.bySource.map(([s, v]) => (
                    <tr key={s}>
                      <td className="p-3 font-semibold">{SOURCE_LABELS[s]}</td>
                      <td className="p-3 font-mono">{v.nights}</td>
                      <td className="p-3 font-mono">{formatMoney(v.revenue)}</td>
                      <td className="p-3 font-mono">{kpi.roomRevenue ? Math.round((v.revenue / kpi.roomRevenue) * 100) : 0} %</td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
            <Card title="Par type de chambre">
              {kpi.byType.length === 0 ? <Empty>Aucune donnée.</Empty> : (
                <Table head={['Type', 'Nuitées', 'CA', 'PMC']}>
                  {kpi.byType.map(([t, v]) => (
                    <tr key={t}>
                      <td className="p-3 font-semibold">{t}</td>
                      <td className="p-3 font-mono">{v.nights}</td>
                      <td className="p-3 font-mono">{formatMoney(v.revenue)}</td>
                      <td className="p-3 font-mono">{formatMoney(v.nights ? Math.round(v.revenue / v.nights) : 0)}</td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
            <Card title="Réservations de la période">
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <dt className="text-slate-500">Créées</dt><dd className="font-mono font-bold">{kpi.createdCount}</dd>
                <dt className="text-slate-500">Annulées</dt><dd className="font-mono font-bold">{kpi.cancellations}</dd>
                <dt className="text-slate-500">No-show</dt><dd className="font-mono font-bold">{kpi.noShows}</dd>
                <dt className="text-slate-500">Chambres en service</dt><dd className="font-mono font-bold">{roomCount}</dd>
              </dl>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
