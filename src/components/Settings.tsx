import React, { lazy, Suspense, useState } from 'react';
import { Plus, Save, Trash2, Lock } from 'lucide-react';
import type { Property } from '../lib/auth';
import { run, type RatePlanRow, type RoomTypeRow } from '../lib/pmsData';
import { supabase } from '../lib/supabase';
import { useQuery } from '../lib/query';
import { formatDate, formatMoney } from '../lib/dates';
import type { Room } from '../types';
import {
  Badge, Button, Card, Checkbox, Empty, ErrorNote, Field, Input, Loading, Modal, PageHeader, Select, Table, Tabs, useAction,
} from './ui';
import { useI18n } from '../lib/i18n';

interface Props {
  property: Property;
  roomTypes: RoomTypeRow[];
  ratePlans: RatePlanRow[];
  rooms: Room[];
  aal2: boolean;
  onChanged: () => Promise<void> | void;
}

type Tab = 'property' | 'types' | 'rates' | 'distribution' | 'security' | 'import';

// Conditions du plan (colonnes ajoutées par la migration exploitation 7).
type PlanRow = RatePlanRow & { cancel_free_days?: number; cancel_fee_nights?: number; no_show_fee_nights?: number; deposit_percent?: number };
type PlanConditions = Required<Pick<PlanRow, 'cancel_free_days' | 'cancel_fee_nights' | 'no_show_fee_nights' | 'deposit_percent'>>;
const DEFAULT_CONDITIONS: PlanConditions = { cancel_free_days: 1, cancel_fee_nights: 1, no_show_fee_nights: 1, deposit_percent: 0 };

const Distribution = lazy(() => import('./Distribution'));
const ImportData = lazy(() => import('./ImportData'));

export default function Settings({ property, roomTypes, ratePlans, rooms, aal2, onChanged }: Props) {
  const { tr } = useI18n();
  const [tab, setTab] = useState<Tab>('property');
  return (
    <div className="fade-in-up">
      <PageHeader title={tr('Paramètres & Tarifs', 'Settings & rates')} subtitle={tr(`Configuration de ${property.name}. Chaque modification est journalisée.`, `${property.name} configuration. Every change is logged.`)} />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'property', label: tr('Établissement', 'Property') },
          { id: 'types', label: tr('Types de chambre', 'Room types') },
          { id: 'rates', label: tr('Tarifs', 'Rates') },
          { id: 'distribution', label: tr('Distribution', 'Distribution') },
          { id: 'security', label: tr('Notifications et sécurité', 'Notifications and security') },
          { id: 'import', label: tr('Import de données', 'Data import') },
        ]}
      />
      {tab === 'property' && <PropertyForm property={property} onChanged={onChanged} />}
      {tab === 'types' && <RoomTypes property={property} roomTypes={roomTypes} onChanged={onChanged} />}
      {tab === 'rates' && <Rates property={property} roomTypes={roomTypes} ratePlans={ratePlans} onChanged={onChanged} />}
      {tab === 'distribution' && (
        <Suspense fallback={<Loading />}>
          <Distribution property={property} rooms={rooms} onChanged={onChanged} />
        </Suspense>
      )}
      {tab === 'security' && <Security property={property} aal2={aal2} onChanged={onChanged} />}
      {tab === 'import' && (
        <Suspense fallback={<Loading />}>
          <ImportData property={property} onChanged={onChanged} />
        </Suspense>
      )}
    </div>
  );
}

async function updateProperty(id: string, fields: Partial<Property>) {
  await run(supabase.from('properties').update(fields).eq('id', id).select('id').single());
}

// ── Établissement ──────────────────────────────────────────────────────────

function PropertyForm({ property, onChanged }: { property: Property; onChanged: () => Promise<void> | void }) {
  const { tr } = useI18n();
  const [p, setP] = useState(property);
  const [saved, setSaved] = useState(false);
  const { busy, error, run: act } = useAction();
  const text = (k: keyof Property) => ({
    value: (p[k] as string | null) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setP((prev) => ({ ...prev, [k]: e.target.value || null })),
  });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    const ok = await act(async () => {
      await updateProperty(p.id, {
        name: p.name, legal_name: p.legal_name, address: p.address, city: p.city, phone: p.phone, email: p.email,
        ninea: p.ninea, rccm: p.rccm, timezone: p.timezone, check_in_time: p.check_in_time, check_out_time: p.check_out_time,
        vat_rate_bp: p.vat_rate_bp, tourist_tax_per_night: p.tourist_tax_per_night, breakfast_price: p.breakfast_price,
      });
      await onChanged();
      return true;
    });
    if (ok) setSaved(true);
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Card title={tr('Identité et mentions légales (imprimées sur les factures)', 'Identity and legal details (printed on invoices)')}>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label={tr('Nom commercial', 'Trading name')}><Input required minLength={2} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
          <Field label={tr('Raison sociale', 'Legal name')}><Input {...text('legal_name')} /></Field>
          <Field label={tr('Code (factures)', 'Code (invoices)')} hint={tr('Non modifiable : sert à la numérotation', 'Read-only: used for numbering')}><Input value={p.code} disabled /></Field>
          <Field label={tr('Adresse', 'Address')}><Input {...text('address')} /></Field>
          <Field label={tr('Ville', 'City')}><Input {...text('city')} /></Field>
          <Field label={tr('Téléphone', 'Phone')}><Input {...text('phone')} /></Field>
          <Field label={tr('E-mail', 'Email')}><Input type="email" {...text('email')} /></Field>
          <Field label="NINEA"><Input {...text('ninea')} /></Field>
          <Field label="RCCM"><Input {...text('rccm')} /></Field>
        </div>
      </Card>
      <Card title={tr('Exploitation', 'Operations')}>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label={tr('Heure d’arrivée', 'Check-in time')}><Input type="time" value={p.check_in_time.slice(0, 5)} onChange={(e) => setP({ ...p, check_in_time: e.target.value })} /></Field>
          <Field label={tr('Heure de départ', 'Check-out time')}><Input type="time" value={p.check_out_time.slice(0, 5)} onChange={(e) => setP({ ...p, check_out_time: e.target.value })} /></Field>
          <Field label={tr('Fuseau horaire', 'Time zone')}>
            <Select value={p.timezone} onChange={(e) => setP({ ...p, timezone: e.target.value })}>
              {['Africa/Dakar', 'Africa/Abidjan', 'Africa/Bamako', 'Africa/Conakry', 'Africa/Lome', 'Africa/Douala', 'Europe/Paris'].map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </Select>
          </Field>
          <Field label={tr('TVA (%)', 'VAT (%)')} hint={tr('18 % au Sénégal, 10 % pour l’hébergement agréé selon le régime', '18% in Senegal, 10% for approved accommodation depending on the tax regime')}>
            <Input type="number" min={0} max={100} step={0.5} value={p.vat_rate_bp / 100} onChange={(e) => setP({ ...p, vat_rate_bp: Math.round(Number(e.target.value) * 100) })} />
          </Field>
          <Field label={tr('Taxe de séjour (FCFA / adulte / nuit)', 'Tourist tax (FCFA / adult / night)')} hint={tr('Selon la délibération de la commune', 'As set by the municipal council')}>
            <Input type="number" min={0} value={p.tourist_tax_per_night} onChange={(e) => setP({ ...p, tourist_tax_per_night: Math.max(0, Math.trunc(Number(e.target.value))) })} />
          </Field>
          <Field label={tr('Petit-déjeuner (FCFA / pers. / nuit)', 'Breakfast (FCFA / person / night)')}>
            <Input type="number" min={0} value={p.breakfast_price} onChange={(e) => setP({ ...p, breakfast_price: Math.max(0, Math.trunc(Number(e.target.value))) })} />
          </Field>
        </div>
      </Card>
      <ErrorNote message={error} />
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-xs font-semibold text-emerald-600">{tr('Enregistré', 'Saved')}</span>}
        <Button type="submit" icon={Save} busy={busy}>{tr('Enregistrer', 'Save')}</Button>
      </div>
    </form>
  );
}

// ── Types de chambre ───────────────────────────────────────────────────────

function RoomTypes({ property, roomTypes, onChanged }: { property: Property; roomTypes: RoomTypeRow[]; onChanged: () => Promise<void> | void }) {
  const { tr } = useI18n();
  const [rows, setRows] = useState(roomTypes);
  const [name, setName] = useState('');
  const [rate, setRate] = useState(50000);
  const [capacity, setCapacity] = useState(2);
  const { busy, error, run: act } = useAction();
  const save = (t: RoomTypeRow) =>
    act(async () => {
      await run(supabase.from('room_types').update({ name: t.name, base_rate: t.base_rate, capacity: t.capacity }).eq('id', t.id).select('id'));
      await onChanged();
    });
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    act(async () => {
      const created = await run(
        supabase.from('room_types').insert({ property_id: property.id, name, base_rate: rate, capacity }).select('id, name, base_rate, capacity').single(),
      );
      setRows((r) => [...r, created as RoomTypeRow]);
      setName('');
      await onChanged();
    });
  };
  return (
    <div className="space-y-4">
      <Card title={tr('Types de chambre', 'Room types')} actions={<span className="text-[11px] text-slate-400">{tr('Le tarif de base s’applique quand aucun prix de période n’est défini.', 'The base rate applies when no period price is set.')}</span>}>
        {rows.length === 0 ? (
          <Empty>{tr('Aucun type de chambre.', 'No room types.')}</Empty>
        ) : (
          <Table head={[tr('Nom', 'Name'), tr('Tarif de base (FCFA / nuit)', 'Base rate (FCFA / night)'), tr('Capacité', 'Capacity'), '']}>
            {rows.map((t, i) => (
              <tr key={t.id}>
                <td className="p-2"><Input value={t.name} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></td>
                <td className="p-2"><Input type="number" min={0} value={t.base_rate} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, base_rate: Math.trunc(Number(e.target.value)) } : x)))} /></td>
                <td className="p-2"><Input type="number" min={1} max={20} value={t.capacity} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, capacity: Math.trunc(Number(e.target.value)) } : x)))} /></td>
                <td className="p-2 text-right"><Button variant="secondary" icon={Save} busy={busy} onClick={() => save(t)}>{tr('Enregistrer', 'Save')}</Button></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Card title={tr('Ajouter un type', 'Add a room type')}>
        <form onSubmit={add} className="grid md:grid-cols-4 gap-3 items-end">
          <Field label={tr('Nom', 'Name')}><Input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('Suite Océan', 'Ocean Suite')} /></Field>
          <Field label={tr('Tarif de base', 'Base rate')}><Input type="number" min={0} value={rate} onChange={(e) => setRate(Math.trunc(Number(e.target.value)))} /></Field>
          <Field label={tr('Capacité', 'Capacity')}><Input type="number" min={1} max={20} value={capacity} onChange={(e) => setCapacity(Math.trunc(Number(e.target.value)))} /></Field>
          <Button type="submit" icon={Plus} busy={busy}>{tr('Ajouter', 'Add')}</Button>
        </form>
      </Card>
      <ErrorNote message={error} />
    </div>
  );
}

// ── Tarifs ─────────────────────────────────────────────────────────────────

interface RateRow {
  id: string;
  room_type_id: string;
  rate_plan_id: string;
  start_date: string;
  end_date: string;
  price: number | null;
  closed: boolean;
  min_stay: number | null;
}

function Rates({ property, roomTypes, ratePlans, onChanged }: { property: Property; roomTypes: RoomTypeRow[]; ratePlans: RatePlanRow[]; onChanged: () => Promise<void> | void }) {
  const { tr } = useI18n();
  const [planId, setPlanId] = useState(ratePlans.find((p) => p.is_default)?.id ?? ratePlans[0]?.id ?? '');
  const [newPlan, setNewPlan] = useState(false);
  const [newRate, setNewRate] = useState(false);
  const { busy, error, run: act } = useAction();
  const plan = ratePlans.find((p) => p.id === planId) as PlanRow | undefined;

  const rates = useQuery(
    async () =>
      planId
        ? ((await run(
            supabase.from('rates').select('id, room_type_id, rate_plan_id, start_date, end_date, price, closed, min_stay').eq('rate_plan_id', planId).order('start_date'),
          )) as RateRow[])
        : [],
    [planId],
  );
  const typeName = new Map(roomTypes.map((t) => [t.id, t.name]));

  const updatePlan = (fields: Partial<PlanRow>) =>
    act(async () => {
      if (fields.is_default) {
        await run(supabase.from('rate_plans').update({ is_default: false }).eq('property_id', property.id).eq('is_default', true).select('id'));
      }
      await run(supabase.from('rate_plans').update(fields).eq('id', planId).select('id'));
      await onChanged();
    });

  return (
    <div className="space-y-4">
      <Card
        title={tr('Plans tarifaires', 'Rate plans')}
        actions={<Button variant="secondary" icon={Plus} onClick={() => setNewPlan(true)}>{tr('Nouveau plan', 'New plan')}</Button>}
      >
        <div className="flex flex-wrap gap-2 mb-4">
          {ratePlans.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlanId(p.id)}
              className={`text-xs font-bold px-3 py-2 rounded-xl border cursor-pointer ${p.id === planId ? 'bg-orange-600 text-white border-orange-600' : 'bg-white border-slate-200 text-slate-700'}`}
            >
              {p.name} {p.is_default && '★'} {!p.active && tr('(inactif)', '(inactive)')}
            </button>
          ))}
        </div>
        {plan && (
          <div className="flex flex-wrap items-end gap-4">
            <Field label={tr('Durée minimale (nuits)', 'Minimum stay (nights)')}>
              <Input type="number" min={1} max={60} defaultValue={plan.min_stay} onBlur={(e) => Number(e.target.value) !== plan.min_stay && updatePlan({ min_stay: Number(e.target.value) })} className="w-28" />
            </Field>
            <Checkbox label={tr('Petit-déjeuner inclus', 'Breakfast included')} checked={plan.breakfast_included} onChange={(e) => updatePlan({ breakfast_included: e.target.checked })} />
            <Checkbox label={tr('Actif', 'Active')} checked={plan.active} disabled={plan.is_default} onChange={(e) => updatePlan({ active: e.target.checked })} />
            {!plan.is_default && <Button variant="secondary" busy={busy} onClick={() => updatePlan({ is_default: true, active: true })}>{tr('Définir par défaut', 'Set as default')}</Button>}
          </div>
        )}
        {plan && <PlanConditionsForm key={plan.id} plan={plan} onSave={(f) => updatePlan(f)} />}
      </Card>

      <Card
        title={`${tr('Prix par période', 'Period prices')}${plan ? ` · ${plan.name}` : ''}`}
        actions={plan && roomTypes.length > 0 ? <Button icon={Plus} onClick={() => setNewRate(true)}>{tr('Ajouter une période', 'Add a period')}</Button> : undefined}
      >
        <p className="text-[11px] text-slate-500 mb-3">
          {tr(
            'Pour chaque nuit, le prix de la période la plus récente s’applique ; à défaut, le tarif de base du type de chambre. Une période « fermée » bloque la vente ; la durée minimale s’applique aux arrivées dans la période.',
            'For each night, the price of the most recent period applies; otherwise, the room type’s base rate. A “closed” period blocks sales; the minimum stay applies to arrivals within the period.',
          )}
        </p>
        {rates.loading && !rates.data ? (
          <Loading />
        ) : !rates.data?.length ? (
          <Empty>{tr('Aucun prix de période : le tarif de base s’applique.', 'No period prices: the base rate applies.')}</Empty>
        ) : (
          <Table head={[tr('Type', 'Type'), tr('Du', 'From'), tr('Au (inclus)', 'To (inclusive)'), tr('Prix / nuit', 'Price / night'), tr('Restriction', 'Restriction'), '']}>
            {rates.data.map((r) => (
              <tr key={r.id}>
                <td className="p-3 font-semibold">{typeName.get(r.room_type_id) ?? '—'}</td>
                <td className="p-3">{formatDate(r.start_date)}</td>
                <td className="p-3">{formatDate(r.end_date)}</td>
                <td className="p-3 font-mono">{r.price !== null ? formatMoney(r.price) : '—'}</td>
                <td className="p-3">
                  {r.closed && <Badge tone="red">{tr('Fermé à la vente', 'Closed to sale')}</Badge>}
                  {r.min_stay && <Badge tone="amber">{tr(`${r.min_stay} nuits min.`, `${r.min_stay} nights min.`)}</Badge>}
                </td>
                <td className="p-3 text-right">
                  <Button
                    variant="ghost"
                    icon={Trash2}
                    aria-label={tr('Supprimer', 'Delete')}
                    busy={busy}
                    onClick={() => confirm(tr('Supprimer cette période ?', 'Delete this period?')) && act(async () => { await run(supabase.from('rates').delete().eq('id', r.id).select('id')); await rates.reload(); })}
                  />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <ErrorNote message={error ?? rates.error} />

      {newPlan && (
        <PlanModal
          onClose={() => setNewPlan(false)}
          onSubmit={async (name, code, minStay, breakfast, conditions) => {
            const created = (await run(
              supabase.from('rate_plans').insert({ property_id: property.id, name, code, min_stay: minStay, breakfast_included: breakfast, ...conditions }).select('id').single(),
            )) as { id: string };
            await onChanged();
            setPlanId(created.id);
          }}
        />
      )}
      {newRate && plan && (
        <RateModal
          roomTypes={roomTypes}
          onClose={() => setNewRate(false)}
          onSubmit={async (v) => {
            await run(
              supabase
                .from('rates')
                .insert(
                  v.typeIds.map((t) => ({
                    property_id: property.id, room_type_id: t, rate_plan_id: plan.id, start_date: v.from, end_date: v.to,
                    price: v.closed ? null : v.price, closed: v.closed, min_stay: v.minStay || null,
                  })),
                )
                .select('id'),
            );
            await rates.reload();
          }}
        />
      )}
    </div>
  );
}

const CONDITION_LIMITS: Record<keyof PlanConditions, number> = { cancel_free_days: 365, cancel_fee_nights: 30, no_show_fee_nights: 30, deposit_percent: 100 };
const clampCondition = (k: keyof PlanConditions, v: number) => Math.min(CONDITION_LIMITS[k], Math.max(0, Math.trunc(v) || 0));

function conditionFields(tr: (fr: string, en: string) => string): { key: keyof PlanConditions; label: string }[] {
  return [
    { key: 'cancel_free_days', label: tr('Annulation gratuite jusqu’à (jours avant l’arrivée)', 'Free cancellation up to (days before arrival)') },
    { key: 'cancel_fee_nights', label: tr('Nuits facturées si annulation tardive', 'Nights charged for late cancellation') },
    { key: 'no_show_fee_nights', label: tr('Nuits facturées en cas de no-show', 'Nights charged for a no-show') },
    { key: 'deposit_percent', label: tr('Acompte attendu (%)', 'Expected deposit (%)') },
  ];
}

// Résumé en langage courant des conditions d'annulation, de no-show et d'acompte.
function policySummary(c: PlanConditions, tr: (fr: string, en: string) => string): string {
  const n = (v: number, fr: string, en: string) => tr(`${v} ${fr}${v > 1 ? 's' : ''}`, `${v} ${en}${v > 1 ? 's' : ''}`);
  const cancel =
    c.cancel_fee_nights === 0
      ? tr('Annulation gratuite à tout moment', 'Free cancellation at any time')
      : c.cancel_free_days === 0
        ? tr(`Annulation gratuite jusqu’au jour de l’arrivée, puis ${n(c.cancel_fee_nights, 'nuit', 'night')} facturée${c.cancel_fee_nights > 1 ? 's' : ''}`, `Free cancellation until the arrival day, then ${n(c.cancel_fee_nights, 'night', 'night')} charged`)
        : tr(
            `Annulation gratuite jusqu’à ${n(c.cancel_free_days, 'jour', 'day')} avant l’arrivée, puis ${n(c.cancel_fee_nights, 'nuit', 'night')} facturée${c.cancel_fee_nights > 1 ? 's' : ''}`,
            `Free cancellation up to ${n(c.cancel_free_days, 'day', 'day')} before arrival, then ${n(c.cancel_fee_nights, 'night', 'night')} charged`,
          );
  const noShow =
    c.no_show_fee_nights === 0
      ? tr('no-show sans frais', 'no charge for a no-show')
      : tr(`no-show : ${n(c.no_show_fee_nights, 'nuit', 'night')} facturée${c.no_show_fee_nights > 1 ? 's' : ''}`, `no-show: ${n(c.no_show_fee_nights, 'night', 'night')} charged`);
  const deposit =
    c.deposit_percent === 0
      ? tr('aucun acompte demandé', 'no deposit required')
      : tr(`acompte de ${c.deposit_percent} % à la réservation`, `${c.deposit_percent}% deposit at booking`);
  return `${cancel} ; ${noShow} ; ${deposit}.`;
}

function PlanConditionsForm({ plan, onSave }: { plan: PlanRow; onSave: (fields: Partial<PlanConditions>) => void }) {
  const { tr } = useI18n();
  const c: PlanConditions = {
    cancel_free_days: plan.cancel_free_days ?? DEFAULT_CONDITIONS.cancel_free_days,
    cancel_fee_nights: plan.cancel_fee_nights ?? DEFAULT_CONDITIONS.cancel_fee_nights,
    no_show_fee_nights: plan.no_show_fee_nights ?? DEFAULT_CONDITIONS.no_show_fee_nights,
    deposit_percent: plan.deposit_percent ?? DEFAULT_CONDITIONS.deposit_percent,
  };
  return (
    <div className="mt-5 pt-4 border-t border-slate-100">
      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">{tr('Conditions', 'Terms')}</p>
      <div className="grid md:grid-cols-4 gap-3">
        {conditionFields(tr).map((f) => (
          <Field key={f.key} label={f.label}>
            <Input
              type="number"
              min={0}
              max={CONDITION_LIMITS[f.key]}
              defaultValue={c[f.key]}
              onBlur={(e) => {
                const v = clampCondition(f.key, Number(e.target.value));
                e.target.value = String(v);
                if (v !== c[f.key]) onSave({ [f.key]: v });
              }}
            />
          </Field>
        ))}
      </div>
      <p className="text-xs text-slate-600 mt-3">{policySummary(c, tr)}</p>
    </div>
  );
}

function PlanModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (name: string, code: string, minStay: number, breakfast: boolean, conditions: PlanConditions) => Promise<void> }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const { tr } = useI18n();
  const [minStay, setMinStay] = useState(1);
  const [breakfast, setBreakfast] = useState(false);
  const [conditions, setConditions] = useState<PlanConditions>(DEFAULT_CONDITIONS);
  const { busy, error, run: act } = useAction();
  return (
    <Modal title={tr('Nouveau plan tarifaire', 'New rate plan')} subtitle={tr('Ex. Non remboursable, Entreprise, Demi-pension, Long séjour.', 'E.g. Non-refundable, Corporate, Half board, Long stay.')} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await act(async () => { await onSubmit(name, code, minStay, breakfast, conditions); return true; });
          if (ok) onClose();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr('Nom', 'Name')}><Input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Code"><Input required minLength={2} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 12))} /></Field>
          <Field label={tr('Durée minimale (nuits)', 'Minimum stay (nights)')}><Input type="number" min={1} max={60} value={minStay} onChange={(e) => setMinStay(Number(e.target.value))} /></Field>
        </div>
        <Checkbox label={tr('Petit-déjeuner inclus', 'Breakfast included')} checked={breakfast} onChange={(e) => setBreakfast(e.target.checked)} />
        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pt-2">{tr('Conditions (facultatif)', 'Terms (optional)')}</p>
        <div className="grid grid-cols-2 gap-3">
          {conditionFields(tr).map((f) => (
            <Field key={f.key} label={f.label}>
              <Input type="number" min={0} max={CONDITION_LIMITS[f.key]} value={conditions[f.key]} onChange={(e) => setConditions({ ...conditions, [f.key]: clampCondition(f.key, Number(e.target.value)) })} />
            </Field>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">{policySummary(conditions, tr)}</p>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{tr('Fermer', 'Close')}</Button>
          <Button type="submit" busy={busy}>{tr('Créer', 'Create')}</Button>
        </div>
      </form>
    </Modal>
  );
}

interface RateValues {
  typeIds: string[];
  from: string;
  to: string;
  price: number;
  closed: boolean;
  minStay: number;
}

function RateModal({ roomTypes, onClose, onSubmit }: { roomTypes: RoomTypeRow[]; onClose: () => void; onSubmit: (v: RateValues) => Promise<void> }) {
  const { tr } = useI18n();
  const [v, setV] = useState<RateValues>({ typeIds: roomTypes.map((t) => t.id), from: '', to: '', price: roomTypes[0]?.base_rate ?? 0, closed: false, minStay: 0 });
  const { busy, error, run: act } = useAction();
  return (
    <Modal title={tr('Prix sur une période', 'Price for a period')} subtitle={tr('Haute saison, événement, fermeture… S’applique aux types cochés.', 'High season, event, closure… Applies to the checked room types.')} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await act(async () => { await onSubmit(v); return true; });
          if (ok) onClose();
        }}
      >
        <div className="flex flex-wrap gap-3">
          {roomTypes.map((t) => (
            <Checkbox
              key={t.id}
              label={t.name}
              checked={v.typeIds.includes(t.id)}
              onChange={(e) => setV({ ...v, typeIds: e.target.checked ? [...v.typeIds, t.id] : v.typeIds.filter((x) => x !== t.id) })}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr('Du', 'From')}><Input type="date" required value={v.from} onChange={(e) => setV({ ...v, from: e.target.value })} /></Field>
          <Field label={tr('Au (inclus)', 'To (inclusive)')}><Input type="date" required min={v.from} value={v.to} onChange={(e) => setV({ ...v, to: e.target.value })} /></Field>
          <Field label={tr('Prix par nuit (FCFA)', 'Price per night (FCFA)')}><Input type="number" min={0} disabled={v.closed} value={v.price} onChange={(e) => setV({ ...v, price: Math.trunc(Number(e.target.value)) })} /></Field>
          <Field label={tr('Durée minimale (0 = aucune)', 'Minimum stay (0 = none)')}><Input type="number" min={0} max={60} value={v.minStay} onChange={(e) => setV({ ...v, minStay: Math.trunc(Number(e.target.value)) })} /></Field>
        </div>
        <Checkbox label={tr('Fermer à la vente sur cette période', 'Close to sale for this period')} checked={v.closed} onChange={(e) => setV({ ...v, closed: e.target.checked })} />
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{tr('Fermer', 'Close')}</Button>
          <Button type="submit" busy={busy} disabled={!v.typeIds.length}>{tr('Enregistrer', 'Save')}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Notifications et sécurité ──────────────────────────────────────────────

function Security({ property, aal2, onChanged }: { property: Property; aal2: boolean; onChanged: () => Promise<void> | void }) {
  const { tr } = useI18n();
  const { busy, error, run: act } = useAction();
  const toggle = (fields: Partial<Property>) =>
    act(async () => {
      await updateProperty(property.id, fields);
      await onChanged();
    });
  return (
    <div className="space-y-4">
      <Card title={tr('Messages automatiques aux clients', 'Automatic guest messages')}>
        <p className="text-xs text-slate-500 mb-3">{tr('Confirmation de réservation, annulation et rappel la veille de l’arrivée. Les clés des prestataires (Resend, Twilio) se règlent dans Supabase.', 'Booking confirmation, cancellation and a reminder the day before arrival. Provider keys (Resend, Twilio) are configured in Supabase.')}</p>
        <div className="flex flex-wrap gap-6">
          <Checkbox label={tr('E-mail', 'Email')} checked={property.notify_email} disabled={busy} onChange={(e) => toggle({ notify_email: e.target.checked })} />
          <Checkbox label="SMS" checked={property.notify_sms} disabled={busy} onChange={(e) => toggle({ notify_sms: e.target.checked })} />
          <Checkbox label="WhatsApp" checked={property.notify_whatsapp} disabled={busy} onChange={(e) => toggle({ notify_whatsapp: e.target.checked })} />
        </div>
      </Card>
      <Card title={tr('Double authentification obligatoire', 'Mandatory two-factor authentication')}>
        <p className="text-xs text-slate-500 mb-3">
          {tr(
            'Une fois activée, les rôles propriétaire, directeur et comptabilité n’ont plus accès aux données de cet établissement sans code de double authentification. Activez d’abord la vôtre dans « Mon compte ».',
            'Once enabled, the owner, general manager and accounting roles can no longer access this property’s data without a two-factor authentication code. Enable yours first in “My account”.',
          )}
        </p>
        {property.require_mfa ? (
          <div className="flex items-center gap-3">
            <Badge tone="green"><Lock className="w-3 h-3" /> {tr('Exigée', 'Required')}</Badge>
            <Button variant="secondary" busy={busy} onClick={() => confirm(tr('Ne plus exiger la double authentification ?', 'Stop requiring two-factor authentication?')) && toggle({ require_mfa: false })}>{tr('Désactiver', 'Disable')}</Button>
          </div>
        ) : (
          <Button icon={Lock} busy={busy} disabled={!aal2} title={aal2 ? undefined : tr('Connectez-vous avec votre code de double authentification', 'Sign in with your two-factor authentication code')} onClick={() => toggle({ require_mfa: true })}>
            {tr('Exiger la double authentification', 'Require two-factor authentication')}
          </Button>
        )}
      </Card>
      <Card title={tr('Conservation des données clients', 'Guest data retention')}>
        <Field label={tr('Durée de conservation après le dernier séjour (mois)', 'Retention period after the last stay (months)')} hint={tr('Au-delà, anonymisez les fiches depuis l’écran Clients. Faites valider la durée par votre conseil (loi 2008-12, CDP).', 'After that, anonymise records from the Guests screen. Have the period approved by your legal adviser (Senegalese data protection law 2008-12, CDP).')}>
          <Input
            type="number"
            min={6}
            max={120}
            defaultValue={property.guest_retention_months}
            className="w-32"
            onBlur={(e) => Number(e.target.value) !== property.guest_retention_months && toggle({ guest_retention_months: Number(e.target.value) })}
          />
        </Field>
        <div className="mt-4 space-y-1">
          <Checkbox
            label={tr('Anonymiser automatiquement les clients au-delà de cette durée', 'Automatically anonymise guests beyond this period')}
            checked={property.auto_anonymize ?? false}
            disabled={busy}
            onChange={(e) =>
              (!e.target.checked || confirm(tr('Activer l’anonymisation automatique ? Elle est irréversible pour les fiches concernées.', 'Enable automatic anonymisation? It cannot be undone for the affected records.'))) &&
              toggle({ auto_anonymize: e.target.checked })
            }
          />
          <p className="text-[11px] text-amber-700">
            {tr(
              'Chaque nuit, les fiches sans séjour depuis cette durée sont anonymisées de façon irréversible. N’activez qu’après validation de la durée par votre conseil.',
              'Every night, records with no stay within this period are irreversibly anonymised. Enable only once your legal adviser has approved the period.',
            )}
          </p>
        </div>
      </Card>
      <ErrorNote message={error} />
    </div>
  );
}
