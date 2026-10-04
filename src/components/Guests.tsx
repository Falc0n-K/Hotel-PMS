import { useMemo, useState } from 'react';
import { Search, Download, Pencil, EyeOff, Star } from 'lucide-react';
import type { Property } from '../lib/auth';
import type { AppRole } from '../lib/roles';
import { STATUS_LABELS, rpc, run, type ReservationStatus } from '../lib/pmsData';
import { supabase } from '../lib/supabase';
import { useQuery } from '../lib/query';
import { formatDate, formatMoney } from '../lib/dates';
import { downloadCsv, toCsv } from '../lib/csv';
import { Badge, Button, Card, Empty, ErrorNote, Input, Loading, PageHeader, Table, useAction } from './ui';
import { GuestModal, STATUS_TONES, type GuestFull } from './reservations/ReservationDrawer';

interface GuestRow extends GuestFull {
  created_at: string;
  anonymized_at: string | null;
  reservations: { id: string; code: string; status: ReservationStatus; check_in: string; check_out: string; total_amount: number }[];
}

interface Props {
  property: Property;
  role: AppRole;
}

export default function Guests({ property, role }: Props) {
  const canEdit = ['owner', 'general_manager', 'reservation_manager', 'front_desk'].includes(role);
  const isManagement = ['owner', 'general_manager'].includes(role);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<GuestFull | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const { busy, error, run: act } = useAction();

  const guests = useQuery(async () => {
    let q = supabase
      .from('guests')
      .select('*, reservations(id, code, status, check_in, check_out, total_amount)')
      .eq('property_id', property.id)
      .order('created_at', { ascending: false })
      .limit(200);
    const term = query.trim().replace(/[%,()]/g, ' ');
    if (term.length >= 2) q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,id_document_number.ilike.%${term}%`);
    return (await run(q)) as unknown as GuestRow[];
  }, [property.id, query]);

  const rows = guests.data ?? [];
  const current = rows.find((g) => g.id === selected);
  const spent = (g: GuestRow) => g.reservations.filter((r) => !['cancelled', 'no_show'].includes(r.status)).reduce((s, r) => s + r.total_amount, 0);

  const stays = useMemo(
    () => (current ? [...current.reservations].sort((a, b) => b.check_in.localeCompare(a.check_in)) : []),
    [current],
  );

  const exportCsv = () =>
    act(async () => {
      await rpc('log_export', { p_property: property.id, p_kind: 'guests', p_rows: rows.length });
      downloadCsv(
        `clients-${property.code}.csv`,
        toCsv(
          rows.filter((g) => !g.anonymized_at).map((g) => ({
            name: g.full_name, email: g.email ?? '', phone: g.phone ?? '', nationality: g.nationality ?? '',
            stays: g.reservations.length, spent: spent(g), vip: g.vip ? 'oui' : '', consent: g.marketing_consent ? 'oui' : 'non',
          })),
          [
            { key: 'name', label: 'Nom' }, { key: 'email', label: 'E-mail' }, { key: 'phone', label: 'Téléphone' },
            { key: 'nationality', label: 'Nationalité' }, { key: 'stays', label: 'Séjours' }, { key: 'spent', label: 'Montant total' },
            { key: 'vip', label: 'VIP' }, { key: 'consent', label: 'Consentement marketing' },
          ],
        ),
      );
    });

  return (
    <div className="fade-in-up">
      <PageHeader
        title="Clients"
        subtitle="Fiches clients, historique des séjours et fiche de police. Données personnelles : accès limité et journalisé."
        actions={isManagement ? <Button variant="secondary" icon={Download} busy={busy} onClick={exportCsv}>Exporter</Button> : undefined}
      />
      <div className="relative md:w-96 mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <Input className="pl-8" placeholder="Nom, e-mail, téléphone, n° de pièce…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Rechercher un client" />
      </div>
      <ErrorNote message={error ?? guests.error} />

      <div className="grid xl:grid-cols-[1fr_380px] gap-4 mt-2">
        <Card>
          {guests.loading && !guests.data ? (
            <Loading />
          ) : rows.length === 0 ? (
            <Empty>Aucun client.</Empty>
          ) : (
            <Table head={['Client', 'Contact', 'Séjours', 'Montant total', '']}>
              {rows.map((g) => (
                <tr key={g.id} onClick={() => setSelected(g.id)} className={`cursor-pointer hover:bg-slate-50 ${selected === g.id ? 'bg-orange-50/40' : ''}`}>
                  <td className="p-3">
                    <span className="font-bold text-slate-800">{g.full_name}</span>
                    {g.vip && <Star className="inline w-3 h-3 ml-1 text-violet-500" aria-label="VIP" />}
                    {g.anonymized_at && <Badge>Anonymisé</Badge>}
                    {g.nationality && <span className="block text-[10px] text-slate-400">{g.nationality}</span>}
                  </td>
                  <td className="p-3 text-slate-600">{g.phone}<span className="block text-[10px] text-slate-400">{g.email}</span></td>
                  <td className="p-3 font-mono">{g.reservations.length}</td>
                  <td className="p-3 font-mono">{formatMoney(spent(g))}</td>
                  <td className="p-3 text-right">
                    {canEdit && !g.anonymized_at && (
                      <Button variant="ghost" icon={Pencil} aria-label="Modifier" onClick={(e) => { e.stopPropagation(); setEditing(g); }} />
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card title={current ? current.full_name : 'Historique'}>
          {!current ? (
            <Empty>Sélectionnez un client.</Empty>
          ) : (
            <div className="space-y-3">
              <dl className="grid grid-cols-2 gap-1 text-xs">
                <dt className="text-slate-400">Pièce</dt><dd className="font-semibold">{[current.id_document_type, current.id_document_number].filter(Boolean).join(' ') || '—'}</dd>
                <dt className="text-slate-400">Né(e) le</dt><dd className="font-semibold">{current.birth_date ? formatDate(current.birth_date) : '—'}</dd>
                <dt className="text-slate-400">Résidence</dt><dd className="font-semibold">{current.country_of_residence ?? '—'}</dd>
                <dt className="text-slate-400">Client depuis</dt><dd className="font-semibold">{formatDate(current.created_at.slice(0, 10))}</dd>
              </dl>
              <ul className="divide-y divide-slate-100 text-xs">
                {stays.map((s) => (
                  <li key={s.id} className="py-2 flex justify-between gap-2">
                    <span>
                      <span className="font-mono font-bold">{s.code}</span> · {formatDate(s.check_in)} → {formatDate(s.check_out)}
                    </span>
                    <Badge tone={STATUS_TONES[s.status]}>{STATUS_LABELS[s.status]}</Badge>
                  </li>
                ))}
              </ul>
              {isManagement && !current.anonymized_at && (
                <Button
                  variant="danger"
                  icon={EyeOff}
                  busy={busy}
                  onClick={() =>
                    confirm(`Anonymiser définitivement ${current.full_name} ? Les données personnelles seront effacées, les factures conservées.`) &&
                    act(async () => {
                      await rpc('anonymize_guest', { p_guest: current.id });
                      await guests.reload();
                    })
                  }
                >
                  Anonymiser (droit à l’effacement)
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>

      {editing && <GuestModal guest={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); guests.reload(); }} />}
    </div>
  );
}
