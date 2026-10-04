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

interface Props {
  property: Property;
  roomTypes: RoomTypeRow[];
  ratePlans: RatePlanRow[];
  rooms: Room[];
  aal2: boolean;
  onChanged: () => Promise<void> | void;
}

type Tab = 'property' | 'types' | 'rates' | 'distribution' | 'security';

const Distribution = lazy(() => import('./Distribution'));

export default function Settings({ property, roomTypes, ratePlans, rooms, aal2, onChanged }: Props) {
  const [tab, setTab] = useState<Tab>('property');
  return (
    <div className="fade-in-up">
      <PageHeader title="Paramètres & Tarifs" subtitle={`Configuration de ${property.name}. Chaque modification est journalisée.`} />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'property', label: 'Établissement' },
          { id: 'types', label: 'Types de chambre' },
          { id: 'rates', label: 'Tarifs' },
          { id: 'distribution', label: 'Distribution' },
          { id: 'security', label: 'Notifications et sécurité' },
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
    </div>
  );
}

async function updateProperty(id: string, fields: Partial<Property>) {
  await run(supabase.from('properties').update(fields).eq('id', id).select('id').single());
}

// ── Établissement ──────────────────────────────────────────────────────────

function PropertyForm({ property, onChanged }: { property: Property; onChanged: () => Promise<void> | void }) {
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
      <Card title="Identité et mentions légales (imprimées sur les factures)">
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Nom commercial"><Input required minLength={2} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
          <Field label="Raison sociale"><Input {...text('legal_name')} /></Field>
          <Field label="Code (factures)" hint="Non modifiable : sert à la numérotation"><Input value={p.code} disabled /></Field>
          <Field label="Adresse"><Input {...text('address')} /></Field>
          <Field label="Ville"><Input {...text('city')} /></Field>
          <Field label="Téléphone"><Input {...text('phone')} /></Field>
          <Field label="E-mail"><Input type="email" {...text('email')} /></Field>
          <Field label="NINEA"><Input {...text('ninea')} /></Field>
          <Field label="RCCM"><Input {...text('rccm')} /></Field>
        </div>
      </Card>
      <Card title="Exploitation">
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Heure d’arrivée"><Input type="time" value={p.check_in_time.slice(0, 5)} onChange={(e) => setP({ ...p, check_in_time: e.target.value })} /></Field>
          <Field label="Heure de départ"><Input type="time" value={p.check_out_time.slice(0, 5)} onChange={(e) => setP({ ...p, check_out_time: e.target.value })} /></Field>
          <Field label="Fuseau horaire">
            <Select value={p.timezone} onChange={(e) => setP({ ...p, timezone: e.target.value })}>
              {['Africa/Dakar', 'Africa/Abidjan', 'Africa/Bamako', 'Africa/Conakry', 'Africa/Lome', 'Africa/Douala', 'Europe/Paris'].map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </Select>
          </Field>
          <Field label="TVA (%)" hint="18 % au Sénégal, 10 % pour l’hébergement agréé selon le régime">
            <Input type="number" min={0} max={100} step={0.5} value={p.vat_rate_bp / 100} onChange={(e) => setP({ ...p, vat_rate_bp: Math.round(Number(e.target.value) * 100) })} />
          </Field>
          <Field label="Taxe de séjour (FCFA / adulte / nuit)" hint="Selon la délibération de la commune">
            <Input type="number" min={0} value={p.tourist_tax_per_night} onChange={(e) => setP({ ...p, tourist_tax_per_night: Math.max(0, Math.trunc(Number(e.target.value))) })} />
          </Field>
          <Field label="Petit-déjeuner (FCFA / pers. / nuit)">
            <Input type="number" min={0} value={p.breakfast_price} onChange={(e) => setP({ ...p, breakfast_price: Math.max(0, Math.trunc(Number(e.target.value))) })} />
          </Field>
        </div>
      </Card>
      <ErrorNote message={error} />
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-xs font-semibold text-emerald-600">Enregistré</span>}
        <Button type="submit" icon={Save} busy={busy}>Enregistrer</Button>
      </div>
    </form>
  );
}

// ── Types de chambre ───────────────────────────────────────────────────────

function RoomTypes({ property, roomTypes, onChanged }: { property: Property; roomTypes: RoomTypeRow[]; onChanged: () => Promise<void> | void }) {
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
      <Card title="Types de chambre" actions={<span className="text-[11px] text-slate-400">Le tarif de base s’applique quand aucun prix de période n’est défini.</span>}>
        {rows.length === 0 ? (
          <Empty>Aucun type de chambre.</Empty>
        ) : (
          <Table head={['Nom', 'Tarif de base (FCFA / nuit)', 'Capacité', '']}>
            {rows.map((t, i) => (
              <tr key={t.id}>
                <td className="p-2"><Input value={t.name} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></td>
                <td className="p-2"><Input type="number" min={0} value={t.base_rate} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, base_rate: Math.trunc(Number(e.target.value)) } : x)))} /></td>
                <td className="p-2"><Input type="number" min={1} max={20} value={t.capacity} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, capacity: Math.trunc(Number(e.target.value)) } : x)))} /></td>
                <td className="p-2 text-right"><Button variant="secondary" icon={Save} busy={busy} onClick={() => save(t)}>Enregistrer</Button></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Card title="Ajouter un type">
        <form onSubmit={add} className="grid md:grid-cols-4 gap-3 items-end">
          <Field label="Nom"><Input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Suite Océan" /></Field>
          <Field label="Tarif de base"><Input type="number" min={0} value={rate} onChange={(e) => setRate(Math.trunc(Number(e.target.value)))} /></Field>
          <Field label="Capacité"><Input type="number" min={1} max={20} value={capacity} onChange={(e) => setCapacity(Math.trunc(Number(e.target.value)))} /></Field>
          <Button type="submit" icon={Plus} busy={busy}>Ajouter</Button>
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
  const [planId, setPlanId] = useState(ratePlans.find((p) => p.is_default)?.id ?? ratePlans[0]?.id ?? '');
  const [newPlan, setNewPlan] = useState(false);
  const [newRate, setNewRate] = useState(false);
  const { busy, error, run: act } = useAction();
  const plan = ratePlans.find((p) => p.id === planId);

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

  const updatePlan = (fields: Partial<RatePlanRow>) =>
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
        title="Plans tarifaires"
        actions={<Button variant="secondary" icon={Plus} onClick={() => setNewPlan(true)}>Nouveau plan</Button>}
      >
        <div className="flex flex-wrap gap-2 mb-4">
          {ratePlans.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlanId(p.id)}
              className={`text-xs font-bold px-3 py-2 rounded-xl border cursor-pointer ${p.id === planId ? 'bg-orange-600 text-white border-orange-600' : 'bg-white border-slate-200 text-slate-700'}`}
            >
              {p.name} {p.is_default && '★'} {!p.active && '(inactif)'}
            </button>
          ))}
        </div>
        {plan && (
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Durée minimale (nuits)">
              <Input type="number" min={1} max={60} defaultValue={plan.min_stay} onBlur={(e) => Number(e.target.value) !== plan.min_stay && updatePlan({ min_stay: Number(e.target.value) })} className="w-28" />
            </Field>
            <Checkbox label="Petit-déjeuner inclus" checked={plan.breakfast_included} onChange={(e) => updatePlan({ breakfast_included: e.target.checked })} />
            <Checkbox label="Actif" checked={plan.active} disabled={plan.is_default} onChange={(e) => updatePlan({ active: e.target.checked })} />
            {!plan.is_default && <Button variant="secondary" busy={busy} onClick={() => updatePlan({ is_default: true, active: true })}>Définir par défaut</Button>}
          </div>
        )}
      </Card>

      <Card
        title={`Prix par période${plan ? ` · ${plan.name}` : ''}`}
        actions={plan && roomTypes.length > 0 ? <Button icon={Plus} onClick={() => setNewRate(true)}>Ajouter une période</Button> : undefined}
      >
        <p className="text-[11px] text-slate-500 mb-3">
          Pour chaque nuit, le prix de la période la plus récente s’applique ; à défaut, le tarif de base du type de chambre.
          Une période « fermée » bloque la vente ; la durée minimale s’applique aux arrivées dans la période.
        </p>
        {rates.loading && !rates.data ? (
          <Loading />
        ) : !rates.data?.length ? (
          <Empty>Aucun prix de période : le tarif de base s’applique.</Empty>
        ) : (
          <Table head={['Type', 'Du', 'Au (inclus)', 'Prix / nuit', 'Restriction', '']}>
            {rates.data.map((r) => (
              <tr key={r.id}>
                <td className="p-3 font-semibold">{typeName.get(r.room_type_id) ?? '—'}</td>
                <td className="p-3">{formatDate(r.start_date)}</td>
                <td className="p-3">{formatDate(r.end_date)}</td>
                <td className="p-3 font-mono">{r.price !== null ? formatMoney(r.price) : '—'}</td>
                <td className="p-3">
                  {r.closed && <Badge tone="red">Fermé à la vente</Badge>}
                  {r.min_stay && <Badge tone="amber">{r.min_stay} nuits min.</Badge>}
                </td>
                <td className="p-3 text-right">
                  <Button
                    variant="ghost"
                    icon={Trash2}
                    aria-label="Supprimer"
                    busy={busy}
                    onClick={() => confirm('Supprimer cette période ?') && act(async () => { await run(supabase.from('rates').delete().eq('id', r.id).select('id')); await rates.reload(); })}
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
          onSubmit={async (name, code, minStay, breakfast) => {
            const created = (await run(
              supabase.from('rate_plans').insert({ property_id: property.id, name, code, min_stay: minStay, breakfast_included: breakfast }).select('id').single(),
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

function PlanModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (name: string, code: string, minStay: number, breakfast: boolean) => Promise<void> }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [minStay, setMinStay] = useState(1);
  const [breakfast, setBreakfast] = useState(false);
  const { busy, error, run: act } = useAction();
  return (
    <Modal title="Nouveau plan tarifaire" subtitle="Ex. Non remboursable, Entreprise, Demi-pension, Long séjour." onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await act(async () => { await onSubmit(name, code, minStay, breakfast); return true; });
          if (ok) onClose();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nom"><Input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Code"><Input required minLength={2} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 12))} /></Field>
          <Field label="Durée minimale (nuits)"><Input type="number" min={1} max={60} value={minStay} onChange={(e) => setMinStay(Number(e.target.value))} /></Field>
        </div>
        <Checkbox label="Petit-déjeuner inclus" checked={breakfast} onChange={(e) => setBreakfast(e.target.checked)} />
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Fermer</Button>
          <Button type="submit" busy={busy}>Créer</Button>
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
  const [v, setV] = useState<RateValues>({ typeIds: roomTypes.map((t) => t.id), from: '', to: '', price: roomTypes[0]?.base_rate ?? 0, closed: false, minStay: 0 });
  const { busy, error, run: act } = useAction();
  return (
    <Modal title="Prix sur une période" subtitle="Haute saison, événement, fermeture… S’applique aux types cochés." onClose={onClose}>
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
          <Field label="Du"><Input type="date" required value={v.from} onChange={(e) => setV({ ...v, from: e.target.value })} /></Field>
          <Field label="Au (inclus)"><Input type="date" required min={v.from} value={v.to} onChange={(e) => setV({ ...v, to: e.target.value })} /></Field>
          <Field label="Prix par nuit (FCFA)"><Input type="number" min={0} disabled={v.closed} value={v.price} onChange={(e) => setV({ ...v, price: Math.trunc(Number(e.target.value)) })} /></Field>
          <Field label="Durée minimale (0 = aucune)"><Input type="number" min={0} max={60} value={v.minStay} onChange={(e) => setV({ ...v, minStay: Math.trunc(Number(e.target.value)) })} /></Field>
        </div>
        <Checkbox label="Fermer à la vente sur cette période" checked={v.closed} onChange={(e) => setV({ ...v, closed: e.target.checked })} />
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Fermer</Button>
          <Button type="submit" busy={busy} disabled={!v.typeIds.length}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Notifications et sécurité ──────────────────────────────────────────────

function Security({ property, aal2, onChanged }: { property: Property; aal2: boolean; onChanged: () => Promise<void> | void }) {
  const { busy, error, run: act } = useAction();
  const toggle = (fields: Partial<Property>) =>
    act(async () => {
      await updateProperty(property.id, fields);
      await onChanged();
    });
  return (
    <div className="space-y-4">
      <Card title="Messages automatiques aux clients">
        <p className="text-xs text-slate-500 mb-3">Confirmation de réservation, annulation et rappel la veille de l’arrivée. Les clés des prestataires (Resend, Twilio) se règlent dans Supabase.</p>
        <div className="flex flex-wrap gap-6">
          <Checkbox label="E-mail" checked={property.notify_email} disabled={busy} onChange={(e) => toggle({ notify_email: e.target.checked })} />
          <Checkbox label="SMS" checked={property.notify_sms} disabled={busy} onChange={(e) => toggle({ notify_sms: e.target.checked })} />
          <Checkbox label="WhatsApp" checked={property.notify_whatsapp} disabled={busy} onChange={(e) => toggle({ notify_whatsapp: e.target.checked })} />
        </div>
      </Card>
      <Card title="Double authentification obligatoire">
        <p className="text-xs text-slate-500 mb-3">
          Une fois activée, les rôles propriétaire, directeur et comptabilité n’ont plus accès aux données de cet établissement
          sans code de double authentification. Activez d’abord la vôtre dans « Mon compte ».
        </p>
        {property.require_mfa ? (
          <div className="flex items-center gap-3">
            <Badge tone="green"><Lock className="w-3 h-3" /> Exigée</Badge>
            <Button variant="secondary" busy={busy} onClick={() => confirm('Ne plus exiger la double authentification ?') && toggle({ require_mfa: false })}>Désactiver</Button>
          </div>
        ) : (
          <Button icon={Lock} busy={busy} disabled={!aal2} title={aal2 ? undefined : 'Connectez-vous avec votre code de double authentification'} onClick={() => toggle({ require_mfa: true })}>
            Exiger la double authentification
          </Button>
        )}
      </Card>
      <Card title="Conservation des données clients">
        <Field label="Durée de conservation après le dernier séjour (mois)" hint="Au-delà, anonymisez les fiches depuis l’écran Clients. Faites valider la durée par votre conseil (loi 2008-12, CDP).">
          <Input
            type="number"
            min={6}
            max={120}
            defaultValue={property.guest_retention_months}
            className="w-32"
            onBlur={(e) => Number(e.target.value) !== property.guest_retention_months && toggle({ guest_retention_months: Number(e.target.value) })}
          />
        </Field>
      </Card>
      <ErrorNote message={error} />
    </div>
  );
}
