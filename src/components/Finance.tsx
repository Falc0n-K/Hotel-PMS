import React, { useMemo, useState } from 'react';
import { Lock, Unlock, ShieldCheck, Download, Printer, Moon, Undo2 } from 'lucide-react';
import type { Property } from '../lib/auth';
import type { AppRole } from '../lib/roles';
import { PAYMENT_METHOD_LABELS, rpc, run, type PaymentMethod } from '../lib/pmsData';
import { supabase } from '../lib/supabase';
import { useQuery } from '../lib/query';
import { addDays, formatDate, formatMoney } from '../lib/dates';
import { downloadCsv, toCsv } from '../lib/csv';
import { Badge, Button, Card, Empty, ErrorNote, Field, Input, Loading, Modal, PageHeader, Stat, Table, Tabs, useAction } from './ui';
import InvoicePrint, { type InvoiceDoc } from './reservations/InvoicePrint';
import { useI18n } from '../lib/i18n';

interface Props {
  property: Property;
  role: AppRole;
  userId: string;
  today: string;
  onChanged: () => void;
}

type Tab = 'cash' | 'payments' | 'online' | 'invoices' | 'night' | 'exports';

interface Session {
  id: string;
  opened_by: string;
  opened_at: string;
  opening_float: number;
  closed_at: string | null;
  expected_cash: number | null;
  counted_cash: number | null;
  closing_note: string | null;
  validated_by: string | null;
  validated_at: string | null;
}

export default function Finance({ property, role, userId, today, onChanged }: Props) {
  const { tr } = useI18n();
  const finance = ['owner', 'general_manager', 'accountant', 'auditor'].includes(role);
  const tabs: { id: Tab; label: string }[] = [
    { id: 'cash', label: tr('Caisse', 'Cash register') },
    ...(finance ? [{ id: 'payments' as Tab, label: tr('Paiements', 'Payments') }, { id: 'online' as Tab, label: tr('Paiements en ligne', 'Online payments') }, { id: 'invoices' as Tab, label: tr('Factures et avoirs', 'Invoices and credit notes') }] : []),
    { id: 'night', label: tr('Audit de nuit', 'Night audit') },
    ...(finance ? [{ id: 'exports' as Tab, label: tr('Exports comptables', 'Accounting exports') }] : []),
  ];
  const [tab, setTab] = useState<Tab>('cash');
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);

  return (
    <div className="fade-in-up">
      <PageHeader title={tr('Caisse & Finance', 'Cashier & finance')} subtitle={tr(`Encaissements, facturation et clôtures de ${property.name}.`, `Payments, invoicing and closings for ${property.name}.`)} />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={tabs} />
      {(tab === 'payments' || tab === 'online' || tab === 'invoices' || tab === 'exports') && (
        <div className="flex flex-wrap gap-3 mb-4">
          <Field label={tr('Du', 'From')}><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label={tr('Au', 'To')}><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
      )}
      {tab === 'cash' && <CashTab property={property} role={role} userId={userId} onChanged={onChanged} />}
      {tab === 'payments' && <PaymentsTab property={property} from={from} to={to} />}
      {tab === 'online' && <OnlinePaymentsTab property={property} from={from} to={to} />}
      {tab === 'invoices' && <InvoicesTab property={property} role={role} from={from} to={to} />}
      {tab === 'night' && <NightAuditTab property={property} role={role} today={today} onChanged={onChanged} />}
      {tab === 'exports' && <ExportsTab property={property} from={from} to={to} />}
    </div>
  );
}

const endOfDay = (d: string) => `${addDays(d, 1)}T00:00:00`;

// ── Caisse ─────────────────────────────────────────────────────────────────

function CashTab({ property, role, userId, onChanged }: { property: Property; role: AppRole; userId: string; onChanged: () => void }) {
  const { tr } = useI18n();
  const canValidate = ['owner', 'general_manager', 'accountant'].includes(role);
  const [closing, setClosing] = useState<Session | null>(null);
  const [float, setFloat] = useState(0);
  const { busy, error, run: act } = useAction();

  const data = useQuery(async () => {
    const sessions = (await run(
      supabase
        .from('cash_sessions')
        .select('id, opened_by, opened_at, opening_float, closed_at, expected_cash, counted_cash, closing_note, validated_by, validated_at')
        .eq('property_id', property.id)
        .order('opened_at', { ascending: false })
        .limit(50),
    )) as Session[];
    const ids = [...new Set(sessions.flatMap((s) => [s.opened_by, s.validated_by]).filter(Boolean) as string[])];
    const profiles = ids.length
      ? ((await run(supabase.from('profiles').select('id, full_name, email').in('id', ids))) as { id: string; full_name: string | null; email: string | null }[])
      : [];
    const mine = sessions.find((s) => s.opened_by === userId && !s.closed_at);
    const cashIn = mine
      ? ((await run(supabase.from('payments').select('amount').eq('cash_session_id', mine.id))) as { amount: number }[]).reduce((s, p) => s + p.amount, 0)
      : 0;
    return { sessions, mine, cashIn, names: new Map(profiles.map((p) => [p.id, p.full_name || p.email || '—'])) };
  }, [property.id, userId]);

  const refresh = async () => {
    await data.reload();
    onChanged();
  };

  if (data.loading && !data.data) return <Loading />;
  const d = data.data;

  return (
    <div className="space-y-4">
      <ErrorNote message={error ?? data.error} />
      <Card title={tr('Ma caisse', 'My cash register')}>
        {d?.mine ? (
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="grid grid-cols-3 gap-6 text-xs">
              <div><p className="text-slate-400">{tr('Ouverte le', 'Opened on')}</p><p className="font-bold">{new Date(d.mine.opened_at).toLocaleString('fr-FR')}</p></div>
              <div><p className="text-slate-400">{tr('Fonds de caisse', 'Opening float')}</p><p className="font-bold font-mono">{formatMoney(d.mine.opening_float)}</p></div>
              <div><p className="text-slate-400">{tr('Espèces attendues', 'Expected cash')}</p><p className="font-bold font-mono">{formatMoney(d.mine.opening_float + d.cashIn)}</p></div>
            </div>
            <Button icon={Lock} onClick={() => setClosing(d.mine!)}>{tr('Fermer ma caisse', 'Close my cash register')}</Button>
          </div>
        ) : (
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                await rpc('open_cash_session', { p_property: property.id, p_opening_float: float });
                await refresh();
              });
            }}
          >
            <Field label={tr('Fonds de caisse (FCFA)', 'Opening float (FCFA)')}><Input type="number" min={0} value={float} onChange={(e) => setFloat(Math.max(0, Math.trunc(Number(e.target.value))))} /></Field>
            <Button type="submit" icon={Unlock} busy={busy}>{tr('Ouvrir ma caisse', 'Open my cash register')}</Button>
            <p className="text-[11px] text-slate-400 w-full">{tr('Les encaissements en espèces exigent une caisse ouverte à votre nom.', 'Cash payments require a cash register opened in your name.')}</p>
          </form>
        )}
      </Card>

      <Card title={tr('Clôtures', 'Closings')}>
        {!d?.sessions.length ? (
          <Empty>{tr('Aucune caisse.', 'No cash register sessions.')}</Empty>
        ) : (
          <Table head={[tr('Caissier', 'Cashier'), tr('Ouverture', 'Opened'), tr('Fermeture', 'Closed'), tr('Attendu', 'Expected'), tr('Compté', 'Counted'), tr('Écart', 'Variance'), tr('Validation', 'Validation')]}>
            {d.sessions.map((s) => {
              const gap = s.counted_cash !== null && s.expected_cash !== null ? s.counted_cash - s.expected_cash : null;
              return (
                <tr key={s.id}>
                  <td className="p-3 font-semibold">{d.names.get(s.opened_by) ?? '—'}</td>
                  <td className="p-3">{new Date(s.opened_at).toLocaleString('fr-FR')}</td>
                  <td className="p-3">{s.closed_at ? new Date(s.closed_at).toLocaleString('fr-FR') : <Badge tone="amber">{tr('Ouverte', 'Open')}</Badge>}</td>
                  <td className="p-3 font-mono">{s.expected_cash !== null ? formatMoney(s.expected_cash) : '—'}</td>
                  <td className="p-3 font-mono">{s.counted_cash !== null ? formatMoney(s.counted_cash) : '—'}</td>
                  <td className={`p-3 font-mono font-bold ${gap ? 'text-red-600' : 'text-emerald-600'}`} title={s.closing_note ?? undefined}>{gap !== null ? formatMoney(gap) : '—'}</td>
                  <td className="p-3">
                    {s.validated_at ? (
                      <Badge tone="green">{tr('Validée par', 'Validated by')} {d.names.get(s.validated_by!) ?? '—'}</Badge>
                    ) : s.closed_at && canValidate && s.opened_by !== userId ? (
                      <Button variant="secondary" icon={ShieldCheck} busy={busy} onClick={() => act(async () => { await rpc('validate_cash_session', { p_session: s.id }); await refresh(); })}>{tr('Valider', 'Validate')}</Button>
                    ) : s.closed_at ? (
                      <span className="text-[10px] text-slate-400">{tr('En attente (par une autre personne)', 'Pending (by another person)')}</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {closing && d && (
        <CloseModal
          expected={closing.opening_float + d.cashIn}
          onClose={() => setClosing(null)}
          onSubmit={async (counted, note) => {
            const gap = await rpc<number>('close_cash_session', { p_session: closing.id, p_counted: counted, p_note: note || null });
            await refresh();
            return gap;
          }}
        />
      )}
    </div>
  );
}

function CloseModal({ expected, onClose, onSubmit }: { expected: number; onClose: () => void; onSubmit: (counted: number, note: string) => Promise<number> }) {
  const { tr } = useI18n();
  const [counted, setCounted] = useState(expected);
  const [note, setNote] = useState('');
  const [gap, setGap] = useState<number | null>(null);
  const { busy, error, run: act } = useAction();
  return (
    <Modal title={tr('Fermeture de caisse', 'Cash register closing')} subtitle={tr(`Espèces attendues : ${formatMoney(expected)}`, `Expected cash: ${formatMoney(expected)}`)} onClose={onClose}>
      {gap !== null ? (
        <div className="space-y-3">
          <p className={`text-sm font-bold ${gap === 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {tr(`Caisse fermée. Écart : ${formatMoney(gap)}. Elle doit maintenant être validée par une autre personne.`, `Cash register closed. Variance: ${formatMoney(gap)}. It must now be validated by another person.`)}
          </p>
          <div className="flex justify-end"><Button onClick={onClose}>{tr('Terminé', 'Done')}</Button></div>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const g = await act(() => onSubmit(counted, note));
            if (g !== undefined) setGap(g);
          }}
        >
          <Field label={tr('Espèces comptées (FCFA)', 'Counted cash (FCFA)')}><Input type="number" min={0} value={counted} onChange={(e) => setCounted(Math.max(0, Math.trunc(Number(e.target.value))))} /></Field>
          <Field label={tr('Commentaire (obligatoire en cas d’écart)', 'Comment (required if there is a variance)')}><Input value={note} onChange={(e) => setNote(e.target.value)} required={counted !== expected} /></Field>
          <ErrorNote message={error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>{tr('Annuler', 'Cancel')}</Button>
            <Button type="submit" busy={busy}>{tr('Fermer la caisse', 'Close the cash register')}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ── Paiements ──────────────────────────────────────────────────────────────

interface PaymentLine {
  id: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  created_at: string;
  reservation: { code: string; guest: { full_name: string } | null } | null;
}

function usePayments(propertyId: string, from: string, to: string) {
  return useQuery(
    async () =>
      (await run(
        supabase
          .from('payments')
          .select('id, amount, method, reference, created_at, reservation:reservations(code, guest:guests(full_name))')
          .eq('property_id', propertyId)
          .gte('created_at', `${from}T00:00:00`)
          .lt('created_at', endOfDay(to))
          .order('created_at', { ascending: false }),
      )) as unknown as PaymentLine[],
    [propertyId, from, to],
  );
}

function PaymentsTab({ property, from, to }: { property: Property; from: string; to: string }) {
  const { tr } = useI18n();
  const payments = usePayments(property.id, from, to);
  const { error, run: act } = useAction();
  const byMethod = useMemo(() => {
    const m = new Map<PaymentMethod, number>();
    (payments.data ?? []).forEach((p) => m.set(p.method, (m.get(p.method) ?? 0) + p.amount));
    return [...m.entries()];
  }, [payments.data]);

  if (payments.loading && !payments.data) return <Loading />;
  const rows = payments.data ?? [];
  const total = rows.reduce((s, p) => s + p.amount, 0);

  const exportCsv = () =>
    act(async () => {
      await rpc('log_export', { p_property: property.id, p_kind: 'payments', p_rows: rows.length });
      downloadCsv(
        `paiements-${property.code}-${from}-${to}.csv`,
        toCsv(
          rows.map((p) => ({
            date: p.created_at.slice(0, 16).replace('T', ' '),
            code: p.reservation?.code ?? '',
            guest: p.reservation?.guest?.full_name ?? '',
            method: PAYMENT_METHOD_LABELS[p.method],
            reference: p.reference ?? '',
            amount: p.amount,
          })),
          [
            { key: 'date', label: tr('Date', 'Date') }, { key: 'code', label: tr('Réservation', 'Reservation') }, { key: 'guest', label: tr('Client', 'Guest') },
            { key: 'method', label: tr('Moyen', 'Method') }, { key: 'reference', label: tr('Référence', 'Reference') }, { key: 'amount', label: tr('Montant', 'Amount') },
          ],
        ),
      );
    });

  return (
    <div className="space-y-4">
      <ErrorNote message={error ?? payments.error} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat label={tr('Total encaissé', 'Total collected')} value={formatMoney(total)} hint={tr(`${rows.length} opérations`, `${rows.length} transactions`)} />
        {byMethod.slice(0, 3).map(([m, v]) => <Stat key={m} label={PAYMENT_METHOD_LABELS[m]} value={formatMoney(v)} />)}
      </div>
      <Card title={tr('Journal des paiements', 'Payment log')} actions={<Button variant="secondary" icon={Download} onClick={exportCsv}>{tr('Exporter', 'Export')}</Button>}>
        {rows.length === 0 ? (
          <Empty>{tr('Aucun paiement sur la période.', 'No payments in this period.')}</Empty>
        ) : (
          <Table head={[tr('Date', 'Date'), tr('Réservation', 'Reservation'), tr('Client', 'Guest'), tr('Moyen', 'Method'), tr('Référence', 'Reference'), tr('Montant', 'Amount')]}>
            {rows.map((p) => (
              <tr key={p.id}>
                <td className="p-3 whitespace-nowrap">{new Date(p.created_at).toLocaleString('fr-FR')}</td>
                <td className="p-3 font-mono">{p.reservation?.code}</td>
                <td className="p-3">{p.reservation?.guest?.full_name ?? '—'}</td>
                <td className="p-3">{PAYMENT_METHOD_LABELS[p.method]}</td>
                <td className="p-3 text-slate-500">{p.reference ?? '—'}</td>
                <td className={`p-3 font-mono font-bold text-right ${p.amount < 0 ? 'text-red-600' : ''}`}>{formatMoney(p.amount)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}

// ── Paiements en ligne (rapprochement PayDunya / Stripe) ──────────────────

type LinkStatus = 'pending' | 'open' | 'paid' | 'expired' | 'failed';
type LinkProvider = 'stripe' | 'paydunya';

interface PaymentLinkLine {
  id: string;
  reservation_id: string;
  provider: LinkProvider;
  amount: number;
  status: LinkStatus;
  provider_ref: string | null;
  checkout_url: string | null;
  payment_id: string | null;
  created_at: string;
  completed_at: string | null;
  last_error: string | null;
  reservation: { code: string } | null;
}

const LINK_STATUS: Record<LinkStatus, { fr: string; en: string; tone: 'slate' | 'blue' | 'green' | 'amber' | 'red' }> = {
  pending: { fr: 'En préparation', en: 'Pending', tone: 'slate' },
  open: { fr: 'Ouvert', en: 'Open', tone: 'blue' },
  paid: { fr: 'Payé', en: 'Paid', tone: 'green' },
  expired: { fr: 'Expiré', en: 'Expired', tone: 'amber' },
  failed: { fr: 'Échec', en: 'Failed', tone: 'red' },
};
const PROVIDER_LABELS: Record<LinkProvider, string> = { stripe: 'Stripe', paydunya: 'PayDunya' };
const STALE_MS = 24 * 3600 * 1000;

function OnlinePaymentsTab({ property, from, to }: { property: Property; from: string; to: string }) {
  const { tr } = useI18n();
  const { error, run: act } = useAction();
  const [onlyAnomalies, setOnlyAnomalies] = useState(false);
  const links = useQuery(
    async () =>
      (await run(
        supabase
          .from('payment_links')
          .select('id, reservation_id, provider, amount, status, provider_ref, checkout_url, payment_id, created_at, completed_at, last_error, reservation:reservations(code)')
          .eq('property_id', property.id)
          .gte('created_at', `${from}T00:00:00`)
          .lt('created_at', endOfDay(to))
          .order('created_at', { ascending: false }),
      )) as unknown as PaymentLinkLine[],
    [property.id, from, to],
  );

  // Anomalies : lien resté ouvert plus de 24 h, échec, ou payé sans paiement rattaché.
  const anomalyOf = (l: PaymentLinkLine, now: number): string | null => {
    if ((l.status === 'open' || l.status === 'pending') && now - new Date(l.created_at).getTime() > STALE_MS)
      return tr('Ouvert depuis plus de 24 h', 'Open for more than 24 h');
    if (l.status === 'failed') return l.last_error ? tr(`Échec : ${l.last_error}`, `Failed: ${l.last_error}`) : tr('Échec', 'Failed');
    if (l.status === 'paid' && !l.payment_id) return tr('Payé sans paiement enregistré', 'Paid without a recorded payment');
    return null;
  };

  const now = Date.now();
  const rows = (links.data ?? []).map((l) => ({ ...l, anomaly: anomalyOf(l, now) }));

  const totals = (() => {
    const byProvider = new Map<LinkProvider, { count: number; paid: number }>();
    const byStatus = new Map<LinkStatus, { count: number; amount: number }>();
    rows.forEach((l) => {
      const p = byProvider.get(l.provider) ?? { count: 0, paid: 0 };
      p.count += 1;
      if (l.status === 'paid') p.paid += l.amount;
      byProvider.set(l.provider, p);
      const st = byStatus.get(l.status) ?? { count: 0, amount: 0 };
      st.count += 1;
      st.amount += l.amount;
      byStatus.set(l.status, st);
    });
    return { byProvider: [...byProvider.entries()], byStatus: [...byStatus.entries()] };
  })();

  if (links.loading && !links.data) return <Loading />;
  const anomalies = rows.filter((l) => l.anomaly).length;
  const shown = onlyAnomalies ? rows.filter((l) => l.anomaly) : rows;
  const statusLabel = (s: LinkStatus) => tr(LINK_STATUS[s].fr, LINK_STATUS[s].en);

  const exportCsv = () =>
    act(async () => {
      await rpc('log_export', { p_property: property.id, p_kind: 'payments', p_rows: shown.length });
      downloadCsv(
        `paiements-en-ligne-${property.code}-${from}-${to}.csv`,
        toCsv(
          shown.map((l) => ({
            date: l.created_at.slice(0, 16).replace('T', ' '),
            code: l.reservation?.code ?? '',
            provider: PROVIDER_LABELS[l.provider],
            amount: l.amount,
            status: statusLabel(l.status),
            provider_ref: l.provider_ref ?? '',
            payment_id: l.payment_id ?? '',
            completed_at: l.completed_at ? l.completed_at.slice(0, 16).replace('T', ' ') : '',
            anomaly: l.anomaly ?? '',
          })),
          [
            { key: 'date', label: tr('Date', 'Date') }, { key: 'code', label: tr('Réservation', 'Reservation') }, { key: 'provider', label: tr('Prestataire', 'Provider') },
            { key: 'amount', label: tr('Montant', 'Amount') }, { key: 'status', label: tr('Statut', 'Status') }, { key: 'provider_ref', label: tr('Réf. prestataire', 'Provider ref.') },
            { key: 'payment_id', label: tr('Paiement', 'Payment') }, { key: 'completed_at', label: tr('Finalisé le', 'Completed at') }, { key: 'anomaly', label: tr('Anomalie', 'Anomaly') },
          ],
        ),
      );
    });

  return (
    <div className="space-y-4">
      <ErrorNote message={error ?? links.error} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat
          label={tr('Encaissé en ligne', 'Collected online')}
          value={formatMoney(rows.filter((l) => l.status === 'paid').reduce((s, l) => s + l.amount, 0))}
          hint={tr(`${rows.length} liens sur la période`, `${rows.length} links in this period`)}
        />
        {(['paydunya', 'stripe'] as LinkProvider[]).map((p) => {
          const v = totals.byProvider.find(([k]) => k === p)?.[1];
          return <Stat key={p} label={PROVIDER_LABELS[p]} value={formatMoney(v?.paid ?? 0)} hint={tr(`${v?.count ?? 0} liens`, `${v?.count ?? 0} links`)} />;
        })}
        <Stat label={tr('Anomalies', 'Anomalies')} value={String(anomalies)} hint={tr('À vérifier', 'To check')} />
      </div>
      <Card title={tr('Par statut', 'By status')}>
        {totals.byStatus.length === 0 ? (
          <Empty>{tr('Aucun lien de paiement sur la période.', 'No payment links in this period.')}</Empty>
        ) : (
          <div className="flex flex-wrap gap-3">
            {totals.byStatus.map(([s, v]) => (
              <div key={s} className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                <Badge tone={LINK_STATUS[s].tone}>{statusLabel(s)}</Badge>
                <span className="font-bold">{v.count}</span>
                <span className="font-mono text-slate-500">{formatMoney(v.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card
        title={tr('Liens de paiement', 'Payment links')}
        actions={
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
              <input type="checkbox" className="accent-orange-600" checked={onlyAnomalies} onChange={(e) => setOnlyAnomalies(e.target.checked)} />
              {tr('Anomalies seulement', 'Anomalies only')}
            </label>
            <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={!shown.length}>{tr('Exporter', 'Export')}</Button>
          </div>
        }
      >
        {shown.length === 0 ? (
          <Empty>{tr('Aucun lien à afficher.', 'No links to show.')}</Empty>
        ) : (
          <Table head={[tr('Date', 'Date'), tr('Réservation', 'Reservation'), tr('Prestataire', 'Provider'), tr('Statut', 'Status'), tr('Réf. prestataire', 'Provider ref.'), tr('Anomalie', 'Anomaly'), tr('Montant', 'Amount')]}>
            {shown.map((l) => (
              <tr key={l.id} className={l.anomaly ? 'bg-red-50/60' : undefined}>
                <td className="p-3 whitespace-nowrap">{new Date(l.created_at).toLocaleString('fr-FR')}</td>
                <td className="p-3 font-mono">{l.reservation?.code ?? '—'}</td>
                <td className="p-3">{PROVIDER_LABELS[l.provider]}</td>
                <td className="p-3"><Badge tone={LINK_STATUS[l.status].tone}>{statusLabel(l.status)}</Badge></td>
                <td className="p-3 text-slate-500 font-mono">
                  {l.checkout_url ? <a href={l.checkout_url} target="_blank" rel="noreferrer" className="underline hover:text-orange-600">{l.provider_ref ?? tr('Lien', 'Link')}</a> : l.provider_ref ?? '—'}
                </td>
                <td className="p-3 text-red-700 font-semibold">{l.anomaly ?? ''}</td>
                <td className="p-3 font-mono font-bold text-right">{formatMoney(l.amount)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}

// ── Factures et avoirs ─────────────────────────────────────────────────────

interface InvoiceLine extends InvoiceDoc {
  reservation: { code: string; guest: { full_name: string; address: string | null; email: string | null } | null } | null;
  credit_notes: { id: string; display_number: string; issued_at: string; reason: string; amount: number }[];
}

function useInvoices(propertyId: string, from: string, to: string) {
  return useQuery(
    async () =>
      (await run(
        supabase
          .from('invoices')
          .select('id, display_number, issued_at, subtotal, vat_amount, tourist_tax, total, lines, reservation:reservations(code, guest:guests(full_name, address, email)), credit_notes(id, display_number, issued_at, reason, amount)')
          .eq('property_id', propertyId)
          .gte('issued_at', `${from}T00:00:00`)
          .lt('issued_at', endOfDay(to))
          .order('number', { ascending: false }),
      )) as unknown as InvoiceLine[],
    [propertyId, from, to],
  );
}

function InvoicesTab({ property, role, from, to }: { property: Property; role: AppRole; from: string; to: string }) {
  const { tr } = useI18n();
  const invoices = useInvoices(property.id, from, to);
  const canCredit = ['owner', 'general_manager', 'accountant'].includes(role);
  const [printing, setPrinting] = useState<InvoiceLine | null>(null);
  const { busy, error, run: act } = useAction();
  if (invoices.loading && !invoices.data) return <Loading />;
  const rows = invoices.data ?? [];
  const live = rows.filter((i) => !i.credit_notes.length);
  return (
    <div className="space-y-4">
      <ErrorNote message={error ?? invoices.error} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat label={tr('Chiffre d’affaires TTC', 'Revenue incl. tax')} value={formatMoney(live.reduce((s, i) => s + i.total, 0))} hint={tr('Hors factures annulées', 'Excluding cancelled invoices')} />
        <Stat label={tr('TVA collectée', 'VAT collected')} value={formatMoney(live.reduce((s, i) => s + i.vat_amount, 0))} />
        <Stat label={tr('Taxe de séjour', 'Tourist tax')} value={formatMoney(live.reduce((s, i) => s + i.tourist_tax, 0))} />
        <Stat label={tr('Avoirs', 'Credit notes')} value={String(rows.length - live.length)} />
      </div>
      <Card title={tr('Factures', 'Invoices')}>
        {rows.length === 0 ? (
          <Empty>{tr('Aucune facture sur la période.', 'No invoices in this period.')}</Empty>
        ) : (
          <Table head={[tr('Numéro', 'Number'), tr('Date', 'Date'), tr('Réservation', 'Reservation'), tr('Client', 'Guest'), tr('HT', 'Excl. tax'), tr('TVA', 'VAT'), tr('TTC', 'Incl. tax'), '']}>
            {rows.map((i) => (
              <tr key={i.id} className={i.credit_notes.length ? 'opacity-60' : ''}>
                <td className="p-3 font-mono font-bold">
                  {i.display_number}
                  {i.credit_notes[0] && <span className="block text-[9px] text-red-600">{tr('Avoir', 'Credit note')} {i.credit_notes[0].display_number}</span>}
                </td>
                <td className="p-3">{formatDate(i.issued_at.slice(0, 10))}</td>
                <td className="p-3 font-mono">{i.reservation?.code}</td>
                <td className="p-3">{i.reservation?.guest?.full_name ?? '—'}</td>
                <td className="p-3 font-mono text-right">{formatMoney(i.subtotal)}</td>
                <td className="p-3 font-mono text-right">{formatMoney(i.vat_amount)}</td>
                <td className="p-3 font-mono text-right font-bold">{formatMoney(i.total)}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button variant="ghost" icon={Printer} onClick={() => setPrinting(i)} aria-label={tr('Imprimer', 'Print')} />
                  {canCredit && !i.credit_notes.length && (
                    <Button
                      variant="ghost"
                      icon={Undo2}
                      busy={busy}
                      aria-label={tr('Émettre un avoir', 'Issue a credit note')}
                      onClick={() => {
                        const reason = prompt(tr(`Motif de l’avoir sur ${i.display_number} :`, `Reason for the credit note on ${i.display_number}:`));
                        if (reason) act(async () => { await rpc('issue_credit_note', { p_invoice: i.id, p_reason: reason }); await invoices.reload(); });
                      }}
                    />
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {printing && (
        <InvoicePrint
          invoice={{ ...printing, credit_note: printing.credit_notes[0] ?? null }}
          property={property}
          guest={printing.reservation?.guest ?? null}
          reservationCode={printing.reservation?.code ?? ''}
          onDone={() => setPrinting(null)}
        />
      )}
    </div>
  );
}

// ── Audit de nuit ──────────────────────────────────────────────────────────

interface Audit {
  id: string;
  business_date: string;
  run_at: string;
  run_by: string | null;
  no_shows: number;
  arrivals: number;
  departures: number;
  in_house: number;
  rooms_total: number;
  rooms_occupied: number;
  room_revenue: number;
  extras_revenue: number;
  payments_total: number;
}

function NightAuditTab({ property, role, today, onChanged }: { property: Property; role: AppRole; today: string; onChanged: () => void }) {
  const { tr } = useI18n();
  const canRun = ['owner', 'general_manager', 'reservation_manager', 'front_desk'].includes(role);
  const audits = useQuery(
    async () => (await run(supabase.from('night_audits').select('*').eq('property_id', property.id).order('business_date', { ascending: false }).limit(60))) as Audit[],
    [property.id],
  );
  const { busy, error, run: act } = useAction();
  const yesterday = addDays(today, -1);
  const done = audits.data?.some((a) => a.business_date === yesterday);

  return (
    <div className="space-y-4">
      <Card title={tr('Clôture de journée', 'End of day')}>
        <p className="text-xs text-slate-600 mb-3">
          {tr(
            'L’audit de nuit passe automatiquement chaque nuit à 2 h 30 (heure de Dakar). Il clôt la journée, déclare no-show les arrivées non présentées et fige les indicateurs. Vous pouvez le lancer à la main pour la veille.',
            'The night audit runs automatically every night at 2:30 a.m. (Dakar time). It closes the day, marks arrivals that did not show up as no-shows and freezes the indicators. You can run it manually for the previous day.',
          )}
        </p>
        {done ? (
          <Badge tone="green">{tr(`Journée du ${formatDate(yesterday)} clôturée`, `Day of ${formatDate(yesterday)} closed`)}</Badge>
        ) : canRun ? (
          <Button
            icon={Moon}
            busy={busy}
            onClick={() =>
              confirm(tr(`Clôturer la journée du ${formatDate(yesterday)} ? Les arrivées non présentées passeront en no-show.`, `Close the day of ${formatDate(yesterday)}? Arrivals that did not show up will be marked as no-shows.`)) &&
              act(async () => {
                await rpc('run_night_audit', { p_property: property.id, p_date: yesterday });
                await audits.reload();
                onChanged();
              })
            }
          >
            {tr(`Clôturer la journée du ${formatDate(yesterday)}`, `Close the day of ${formatDate(yesterday)}`)}
          </Button>
        ) : null}
        <div className="mt-3"><ErrorNote message={error ?? audits.error} /></div>
      </Card>
      <Card title={tr('Historique', 'History')}>
        {!audits.data?.length ? (
          <Empty>{tr('Aucun audit de nuit.', 'No night audits.')}</Empty>
        ) : (
          <Table head={[tr('Journée', 'Day'), tr('Occupation', 'Occupancy'), tr('Arrivées', 'Arrivals'), tr('Départs', 'Departures'), tr('No-show', 'No-show'), tr('CA hébergement', 'Room revenue'), tr('Extras', 'Extras'), tr('Encaissé', 'Collected')]}>
            {audits.data.map((a) => (
              <tr key={a.id}>
                <td className="p-3 font-bold">{formatDate(a.business_date)}{!a.run_by && <span className="block text-[9px] text-slate-400">{tr('automatique', 'automatic')}</span>}</td>
                <td className="p-3 font-mono">{a.rooms_occupied}/{a.rooms_total} ({a.rooms_total ? Math.round((a.rooms_occupied / a.rooms_total) * 100) : 0} %)</td>
                <td className="p-3 font-mono">{a.arrivals}</td>
                <td className="p-3 font-mono">{a.departures}</td>
                <td className="p-3 font-mono">{a.no_shows}</td>
                <td className="p-3 font-mono text-right">{formatMoney(a.room_revenue)}</td>
                <td className="p-3 font-mono text-right">{formatMoney(a.extras_revenue)}</td>
                <td className="p-3 font-mono text-right">{formatMoney(a.payments_total)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}

// ── Exports comptables ─────────────────────────────────────────────────────

// Comptes du plan SYSCOHADA révisé utilisés par défaut. À faire valider par
// l'expert-comptable de l'établissement avant import dans le logiciel comptable.
const ACCOUNTS = {
  customers: '411100',
  sales: '706100',
  vat: '443100',
  touristTax: '447800',
  cash: '571100',
  bank: '521100',
  mobile: '585100',
};

const PAYMENT_ACCOUNT: Record<PaymentMethod, string> = {
  cash: ACCOUNTS.cash,
  card: ACCOUNTS.bank,
  bank_transfer: ACCOUNTS.bank,
  wave: ACCOUNTS.mobile,
  orange_money: ACCOUNTS.mobile,
  other: ACCOUNTS.bank,
};

function ExportsTab({ property, from, to }: { property: Property; from: string; to: string }) {
  const { tr } = useI18n();
  const invoices = useInvoices(property.id, from, to);
  const payments = usePayments(property.id, from, to);
  const { busy, error, run: act } = useAction();

  const journal = () =>
    act(async () => {
      const lines: Record<string, unknown>[] = [];
      const push = (date: string, journalCode: string, piece: string, account: string, label: string, debit: number, credit: number) =>
        lines.push({ date, journal: journalCode, piece, account, label, debit: debit || '', credit: credit || '' });

      for (const i of invoices.data ?? []) {
        const d = i.issued_at.slice(0, 10);
        const label = `Facture ${i.display_number} ${i.reservation?.guest?.full_name ?? ''}`.trim();
        push(d, 'VT', i.display_number, ACCOUNTS.customers, label, i.total, 0);
        push(d, 'VT', i.display_number, ACCOUNTS.sales, label, 0, i.subtotal);
        push(d, 'VT', i.display_number, ACCOUNTS.vat, label, 0, i.vat_amount);
        if (i.tourist_tax) push(d, 'VT', i.display_number, ACCOUNTS.touristTax, label, 0, i.tourist_tax);
        for (const c of i.credit_notes) {
          const cd = c.issued_at.slice(0, 10);
          const cl = `Avoir ${c.display_number} sur ${i.display_number}`;
          push(cd, 'VT', c.display_number, ACCOUNTS.customers, cl, 0, i.total);
          push(cd, 'VT', c.display_number, ACCOUNTS.sales, cl, i.subtotal, 0);
          push(cd, 'VT', c.display_number, ACCOUNTS.vat, cl, i.vat_amount, 0);
          if (i.tourist_tax) push(cd, 'VT', c.display_number, ACCOUNTS.touristTax, cl, i.tourist_tax, 0);
        }
      }
      for (const p of payments.data ?? []) {
        const d = p.created_at.slice(0, 10);
        const label = `Règlement ${PAYMENT_METHOD_LABELS[p.method]} ${p.reservation?.code ?? ''}`.trim();
        const amount = Math.abs(p.amount);
        if (p.amount > 0) {
          push(d, 'TR', p.reservation?.code ?? '', PAYMENT_ACCOUNT[p.method], label, amount, 0);
          push(d, 'TR', p.reservation?.code ?? '', ACCOUNTS.customers, label, 0, amount);
        } else {
          push(d, 'TR', p.reservation?.code ?? '', ACCOUNTS.customers, `Remboursement ${label}`, amount, 0);
          push(d, 'TR', p.reservation?.code ?? '', PAYMENT_ACCOUNT[p.method], `Remboursement ${label}`, 0, amount);
        }
      }
      await rpc('log_export', { p_property: property.id, p_kind: 'accounting', p_rows: lines.length });
      downloadCsv(
        `journal-${property.code}-${from}-${to}.csv`,
        toCsv(lines, [
          { key: 'date', label: tr('Date', 'Date') }, { key: 'journal', label: tr('Journal', 'Journal') }, { key: 'piece', label: tr('Pièce', 'Document') },
          { key: 'account', label: tr('Compte', 'Account') }, { key: 'label', label: tr('Libellé', 'Description') }, { key: 'debit', label: tr('Débit', 'Debit') },
          { key: 'credit', label: tr('Crédit', 'Credit') },
        ]),
      );
    });

  const invoicesCsv = () =>
    act(async () => {
      const rows = invoices.data ?? [];
      await rpc('log_export', { p_property: property.id, p_kind: 'invoices', p_rows: rows.length });
      downloadCsv(
        `factures-${property.code}-${from}-${to}.csv`,
        toCsv(
          rows.map((i) => ({
            number: i.display_number, date: i.issued_at.slice(0, 10), reservation: i.reservation?.code ?? '',
            guest: i.reservation?.guest?.full_name ?? '', subtotal: i.subtotal, vat: i.vat_amount, tax: i.tourist_tax,
            total: i.total, credit: i.credit_notes[0]?.display_number ?? '',
          })),
          [
            { key: 'number', label: tr('Numéro', 'Number') }, { key: 'date', label: tr('Date', 'Date') }, { key: 'reservation', label: tr('Réservation', 'Reservation') },
            { key: 'guest', label: tr('Client', 'Guest') }, { key: 'subtotal', label: tr('HT', 'Excl. tax') }, { key: 'vat', label: tr('TVA', 'VAT') },
            { key: 'tax', label: tr('Taxe de séjour', 'Tourist tax') }, { key: 'total', label: tr('TTC', 'Incl. tax') }, { key: 'credit', label: tr('Avoir', 'Credit note') },
          ],
        ),
      );
    });

  if ((invoices.loading && !invoices.data) || (payments.loading && !payments.data)) return <Loading />;
  return (
    <div className="space-y-4">
      <ErrorNote message={error ?? invoices.error ?? payments.error} />
      <Card title={tr('Journal comptable (SYSCOHADA)', 'Accounting journal (SYSCOHADA)')}>
        <p className="text-xs text-slate-600 mb-3">
          {tr(
            `Écritures de ventes (journal VT) et de trésorerie (journal TR) de la période, au format CSV. Comptes par défaut : clients ${ACCOUNTS.customers}, ventes ${ACCOUNTS.sales}, TVA collectée ${ACCOUNTS.vat}, taxe de séjour ${ACCOUNTS.touristTax}, caisse ${ACCOUNTS.cash}, banque ${ACCOUNTS.bank}, mobile money ${ACCOUNTS.mobile}. Faites-les valider par votre expert-comptable.`,
            `Sales entries (VT journal) and cash entries (TR journal) for the period, in CSV format. Default accounts: customers ${ACCOUNTS.customers}, sales ${ACCOUNTS.sales}, VAT collected ${ACCOUNTS.vat}, tourist tax ${ACCOUNTS.touristTax}, cash ${ACCOUNTS.cash}, bank ${ACCOUNTS.bank}, mobile money ${ACCOUNTS.mobile}. Have them validated by your chartered accountant.`,
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button icon={Download} busy={busy} onClick={journal}>{tr('Journal comptable', 'Accounting journal')}</Button>
          <Button variant="secondary" icon={Download} busy={busy} onClick={invoicesCsv}>{tr('Registre des factures', 'Invoice register')}</Button>
        </div>
      </Card>
    </div>
  );
}

export type { React };
