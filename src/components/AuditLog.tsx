import { useMemo, useState } from 'react';
import type { Property } from '../lib/auth';
import { run } from '../lib/pmsData';
import { supabase } from '../lib/supabase';
import { useQuery } from '../lib/query';
import { addDays } from '../lib/dates';
import { Badge, Card, Empty, ErrorNote, Field, Input, Loading, PageHeader, Select, Table, type Tone } from './ui';

interface Entry {
  id: number;
  actor_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

const TABLES: Record<string, string> = {
  reservations: 'Réservation',
  payments: 'Paiement',
  invoices: 'Facture',
  credit_notes: 'Avoir',
  folio_charges: 'Prestation',
  rooms: 'Chambre',
  room_types: 'Type de chambre',
  rate_plans: 'Plan tarifaire',
  rates: 'Tarif',
  memberships: 'Accès',
  properties: 'Établissement',
  cash_sessions: 'Caisse',
  maintenance_orders: 'Maintenance',
  payment_links: 'Lien de paiement',
  guests: 'Export clients',
  accounting: 'Export comptable',
};

const ACTIONS: Record<string, { label: string; tone: Tone }> = {
  insert: { label: 'Création', tone: 'green' },
  update: { label: 'Modification', tone: 'blue' },
  delete: { label: 'Suppression', tone: 'red' },
  export: { label: 'Export', tone: 'violet' },
};

const IGNORED = new Set(['updated_at', 'created_at', 'stay']);

// Ce qui a changé, champ par champ (les champs techniques sont masqués).
function diff(e: Entry): string {
  if (e.action === 'export') return `${(e.new_data?.rows as number) ?? 0} lignes`;
  if (e.action === 'insert') {
    const d = e.new_data ?? {};
    return ['code', 'display_number', 'number', 'name', 'amount', 'status', 'role'].filter((k) => d[k] !== undefined).map((k) => `${k} = ${d[k]}`).join(', ');
  }
  if (e.action === 'update' && e.old_data && e.new_data) {
    return Object.keys(e.new_data)
      .filter((k) => !IGNORED.has(k) && JSON.stringify(e.new_data![k]) !== JSON.stringify(e.old_data![k]))
      .map((k) => `${k} : ${String(e.old_data![k] ?? '∅')} → ${String(e.new_data![k] ?? '∅')}`)
      .join(' ; ');
  }
  return '';
}

// Journal d'audit écrit par la base (triggers) : qui a fait quoi, et quand.
// Lecture réservée à la direction et aux auditeurs.
export default function AuditLog({ property, today }: { property: Property; today: string }) {
  const [table, setTable] = useState('');
  const [from, setFrom] = useState(addDays(today, -7));
  const [to, setTo] = useState(today);

  const entries = useQuery(async () => {
    let q = supabase
      .from('audit_log')
      .select('id, actor_id, action, table_name, record_id, old_data, new_data, created_at')
      .eq('property_id', property.id)
      .gte('created_at', `${from}T00:00:00`)
      .lt('created_at', `${addDays(to, 1)}T00:00:00`)
      .order('created_at', { ascending: false })
      .limit(500);
    if (table) q = q.eq('table_name', table);
    const rows = (await run(q)) as Entry[];
    const ids = [...new Set(rows.map((r) => r.actor_id).filter(Boolean) as string[])];
    const profiles = ids.length
      ? ((await run(supabase.from('profiles').select('id, full_name, email').in('id', ids))) as { id: string; full_name: string | null; email: string | null }[])
      : [];
    return { rows, names: new Map(profiles.map((p) => [p.id, p.full_name || p.email || '—'])) };
  }, [property.id, table, from, to]);

  const rows = useMemo(() => entries.data?.rows ?? [], [entries.data]);

  return (
    <div className="fade-in-up">
      <PageHeader title="Journal d’audit" subtitle="Toutes les opérations sensibles, enregistrées par la base et non modifiables." />
      <div className="flex flex-wrap gap-3 mb-4">
        <Field label="Du"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="Au"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <Field label="Objet">
          <Select value={table} onChange={(e) => setTable(e.target.value)}>
            <option value="">Tous</option>
            {Object.entries(TABLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
      </div>
      <ErrorNote message={entries.error} />
      <Card>
        {entries.loading && !entries.data ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty>Aucune opération sur la période.</Empty>
        ) : (
          <Table head={['Date', 'Utilisateur', 'Action', 'Objet', 'Détail']}>
            {rows.map((e) => (
              <tr key={e.id}>
                <td className="p-3 whitespace-nowrap">{new Date(e.created_at).toLocaleString('fr-FR')}</td>
                <td className="p-3">{e.actor_id ? entries.data?.names.get(e.actor_id) ?? '—' : <span className="text-slate-400">Système</span>}</td>
                <td className="p-3"><Badge tone={ACTIONS[e.action]?.tone ?? 'slate'}>{ACTIONS[e.action]?.label ?? e.action}</Badge></td>
                <td className="p-3">{TABLES[e.table_name] ?? e.table_name}</td>
                <td className="p-3 text-slate-600 max-w-xl break-words">{diff(e)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
