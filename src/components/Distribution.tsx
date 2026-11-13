import React, { useState } from 'react';
import { Copy, Globe, Plus, Save, Trash2, CalendarSync, ExternalLink } from 'lucide-react';
import type { Property } from '../lib/auth';
import type { Room } from '../types';
import { rpc, run, SOURCE_LABELS, type BookingSource } from '../lib/pmsData';
import { supabase } from '../lib/supabase';
import { useQuery } from '../lib/query';
import { formatDate } from '../lib/dates';
import { Badge, Button, Card, Checkbox, Empty, ErrorNote, Field, Input, Loading, Modal, Select, Table, Textarea, useAction } from './ui';
import { tr, useI18n } from '../lib/i18n';

// Paramètres → Distribution : réservation en ligne, clés d'API, webhooks et
// calendriers iCal. Réservé à la direction (la RLS refuse les autres rôles).

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1`;

const SCOPES = [
  { id: 'availability:read', get label() { return tr('Lire les disponibilités', 'Read availability'); } },
  { id: 'reservations:read', get label() { return tr('Lire les réservations', 'Read reservations'); } },
  { id: 'reservations:write', get label() { return tr('Créer des réservations', 'Create reservations'); } },
];

const EVENTS = [
  { id: '*', get label() { return tr('Tous les événements', 'All events'); } },
  { id: 'reservation.created', get label() { return tr('Réservation créée', 'Reservation created'); } },
  { id: 'reservation.confirmed', get label() { return tr('Option confirmée', 'Hold confirmed'); } },
  { id: 'reservation.updated', get label() { return tr('Réservation modifiée', 'Reservation updated'); } },
  { id: 'reservation.cancelled', get label() { return tr('Réservation annulée', 'Reservation cancelled'); } },
  { id: 'reservation.checked_in', get label() { return tr('Arrivée', 'Check-in'); } },
  { id: 'reservation.checked_out', get label() { return tr('Départ', 'Check-out'); } },
  { id: 'reservation.no_show', get label() { return tr('No-show', 'No-show'); } },
  { id: 'payment.received', get label() { return tr('Paiement reçu', 'Payment received'); } },
];

const ICAL_SOURCES: BookingSource[] = ['airbnb', 'booking_com', 'expedia', 'other'];

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    window.prompt(tr('Copiez :', 'Copy:'), text);
  }
}

export default function Distribution({ property, rooms, onChanged }: { property: Property; rooms: Room[]; onChanged: () => Promise<void> | void }) {
  return (
    <div className="space-y-4">
      <OnlineBooking property={property} onChanged={onChanged} />
      <ApiKeys property={property} />
      <Webhooks property={property} />
      <IcalFeeds property={property} rooms={rooms} />
    </div>
  );
}

// ── Réservation en ligne ───────────────────────────────────────────────────

function OnlineBooking({ property, onChanged }: { property: Property; onChanged: () => Promise<void> | void }) {
  const [p, setP] = useState({
    booking_enabled: property.booking_enabled,
    booking_slug: property.booking_slug ?? property.code.toLowerCase(),
    booking_hold_minutes: property.booking_hold_minutes,
    booking_provider: property.booking_provider,
    public_description: property.public_description ?? '',
  });
  const { tr } = useI18n();
  const [saved, setSaved] = useState(false);
  const { busy, error, run: act } = useAction();
  const publicUrl = `${window.location.origin}/reserver/${p.booking_slug}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    const ok = await act(async () => {
      await run(
        supabase
          .from('properties')
          .update({ ...p, booking_slug: p.booking_slug || null, public_description: p.public_description.trim() || null })
          .eq('id', property.id)
          .select('id')
          .single(),
      );
      await onChanged();
      return true;
    });
    if (ok) setSaved(true);
  };

  return (
    <Card title={tr('Réservation en ligne', 'Online booking')} actions={<Globe className="w-4 h-4 text-orange-600" />}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-xs text-slate-500">
          {tr(
            'Une page publique où vos clients choisissent leurs dates et paient en ligne. La chambre est bloquée en option le temps du paiement, puis confirmée automatiquement ; sans paiement, l’option est annulée à l’échéance.',
            'A public page where your guests choose their dates and pay online. The room is held while the payment is made, then confirmed automatically; without payment, the hold is cancelled when it expires.',
          )}
        </p>
        <Checkbox label={tr('Ouvrir la réservation en ligne', 'Enable online booking')} checked={p.booking_enabled} onChange={(e) => setP({ ...p, booking_enabled: e.target.checked })} />
        <div className="grid md:grid-cols-3 gap-3">
          <Field label={tr('Adresse de la page', 'Page address')} hint={tr('Lettres minuscules, chiffres et tirets', 'Lowercase letters, digits and hyphens')}>
            <Input
              required
              pattern="[a-z0-9-]{3,40}"
              value={p.booking_slug}
              onChange={(e) => setP({ ...p, booking_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) })}
            />
          </Field>
          <Field label={tr('Délai pour payer (minutes)', 'Time to pay (minutes)')} hint={tr('Entre 10 et 1440', 'Between 10 and 1440')}>
            <Input type="number" min={10} max={1440} value={p.booking_hold_minutes} onChange={(e) => setP({ ...p, booking_hold_minutes: Math.trunc(Number(e.target.value)) })} />
          </Field>
          <Field label={tr('Paiement', 'Payment')}>
            <Select value={p.booking_provider} onChange={(e) => setP({ ...p, booking_provider: e.target.value as Property['booking_provider'] })}>
              <option value="paydunya">{tr('PayDunya (Wave, Orange Money, carte)', 'PayDunya (Wave, Orange Money, card)')}</option>
              <option value="stripe">{tr('Stripe (carte internationale)', 'Stripe (international card)')}</option>
            </Select>
          </Field>
        </div>
        <Field label={tr('Présentation affichée aux clients', 'Description shown to guests')}>
          <Textarea rows={3} maxLength={1000} value={p.public_description} onChange={(e) => setP({ ...p, public_description: e.target.value })} />
        </Field>
        {property.booking_enabled && property.booking_slug && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono bg-slate-50 border border-slate-100 rounded-lg px-2 py-1">{publicUrl}</span>
            <Button type="button" variant="ghost" icon={Copy} onClick={() => copy(publicUrl)}>{tr('Copier', 'Copy')}</Button>
            <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-orange-600">
              <ExternalLink className="w-3.5 h-3.5" /> {tr('Ouvrir', 'Open')}
            </a>
          </div>
        )}
        <ErrorNote message={error} />
        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-xs font-semibold text-emerald-600">{tr('Enregistré', 'Saved')}</span>}
          <Button type="submit" icon={Save} busy={busy}>{tr('Enregistrer', 'Save')}</Button>
        </div>
      </form>
    </Card>
  );
}

// ── Clés d'API ─────────────────────────────────────────────────────────────

interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

function ApiKeys({ property }: { property: Property }) {
  const { tr } = useI18n();
  const keys = useQuery(
    async () =>
      (await run(
        supabase.from('api_keys').select('id, name, prefix, scopes, created_at, last_used_at, revoked_at').eq('property_id', property.id).order('created_at', { ascending: false }),
      )) as ApiKeyRow[],
    [property.id],
  );
  const [creating, setCreating] = useState(false);
  const [shown, setShown] = useState<string | null>(null);
  const { busy, error, run: act } = useAction();

  return (
    <Card
      title={tr('Clés d’API (partenaires)', 'API keys (partners)')}
      actions={<Button variant="secondary" icon={Plus} onClick={() => setCreating(true)}>{tr('Nouvelle clé', 'New key')}</Button>}
    >
      <p className="text-xs text-slate-500 mb-3">
        {tr(
          'Pour un tour-opérateur, une agence ou un site tiers : disponibilités et réservations en direct. Documentation à transmettre :',
          'For a tour operator, an agency or a third-party website: live availability and reservations. Documentation to share:',
        )}{' '}
        <span className="font-mono">docs/api.md</span>{tr(', base ', ', base URL ')}<span className="font-mono">{FUNCTIONS_URL}/api/v1</span>.
      </p>
      {keys.loading && !keys.data ? (
        <Loading />
      ) : !keys.data?.length ? (
        <Empty>{tr('Aucune clé.', 'No keys.')}</Empty>
      ) : (
        <Table head={[tr('Nom', 'Name'), tr('Clé', 'Key'), tr('Droits', 'Scopes'), tr('Dernière utilisation', 'Last used'), '']}>
          {keys.data.map((k) => (
            <tr key={k.id} className={k.revoked_at ? 'opacity-50' : ''}>
              <td className="p-3 font-semibold">{k.name}</td>
              <td className="p-3 font-mono">{k.prefix}…</td>
              <td className="p-3">
                <div className="flex flex-wrap gap-1">{k.scopes.map((s) => <Badge key={s}>{s}</Badge>)}</div>
              </td>
              <td className="p-3">{k.last_used_at ? formatDate(k.last_used_at.slice(0, 10)) : tr('Jamais', 'Never')}</td>
              <td className="p-3 text-right">
                {k.revoked_at ? (
                  <Badge tone="red">{tr('Révoquée', 'Revoked')}</Badge>
                ) : (
                  <Button
                    variant="danger"
                    busy={busy}
                    onClick={() => confirm(tr(`Révoquer la clé « ${k.name} » ? Le partenaire perdra l’accès immédiatement.`, `Revoke the key "${k.name}"? The partner will lose access immediately.`)) && act(async () => { await rpc('revoke_api_key', { p_key: k.id }); await keys.reload(); })}
                  >
                    {tr('Révoquer', 'Revoke')}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
      <ErrorNote message={error ?? keys.error} />
      {creating && (
        <ApiKeyModal
          onClose={() => setCreating(false)}
          onSubmit={async (name, scopes) => {
            const key = await rpc<string>('create_api_key', { p_property: property.id, p_name: name, p_scopes: scopes });
            setShown(key);
            await keys.reload();
          }}
        />
      )}
      {shown && <SecretModal title={tr('Clé d’API créée', 'API key created')} secret={shown} onClose={() => setShown(null)} />}
    </Card>
  );
}

function ApiKeyModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (name: string, scopes: string[]) => Promise<void> }) {
  const { tr } = useI18n();
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['availability:read']);
  const { busy, error, run: act } = useAction();
  return (
    <Modal title={tr('Nouvelle clé d’API', 'New API key')} subtitle={tr('Donnez le minimum de droits nécessaires au partenaire.', 'Grant the partner only the scopes they need.')} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await act(async () => { await onSubmit(name, scopes); return true; });
          if (ok) onClose();
        }}
      >
        <Field label={tr('Partenaire', 'Partner')}><Input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('Tour-opérateur Teranga Voyages', 'Teranga Voyages tour operator')} /></Field>
        <div className="space-y-2">
          {SCOPES.map((s) => (
            <Checkbox
              key={s.id}
              label={`${s.label} (${s.id})`}
              checked={scopes.includes(s.id)}
              onChange={(e) => setScopes(e.target.checked ? [...scopes, s.id] : scopes.filter((x) => x !== s.id))}
            />
          ))}
        </div>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{tr('Fermer', 'Close')}</Button>
          <Button type="submit" busy={busy} disabled={!scopes.length}>{tr('Créer', 'Create')}</Button>
        </div>
      </form>
    </Modal>
  );
}

function SecretModal({ title, secret, onClose }: { title: string; secret: string; onClose: () => void }) {
  const { tr } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <Modal title={title} subtitle={tr('Elle ne sera plus jamais affichée : copiez-la maintenant et transmettez-la par un canal sûr.', 'It will never be shown again: copy it now and share it through a secure channel.')} onClose={onClose}>
      <div className="space-y-3">
        <p className="font-mono text-xs break-all bg-slate-50 border border-slate-200 rounded-xl p-3 select-all">{secret}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" icon={Copy} onClick={async () => { await copy(secret); setCopied(true); }}>{copied ? tr('Copiée', 'Copied') : tr('Copier', 'Copy')}</Button>
          <Button onClick={onClose}>{tr('J’ai copié', 'I have copied it')}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Webhooks ───────────────────────────────────────────────────────────────

interface EndpointRow {
  id: string;
  url: string;
  events: string[];
  description: string | null;
  active: boolean;
}

interface DeliveryRow {
  id: string;
  endpoint_id: string;
  event: string;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  last_status: number | null;
  last_error: string | null;
  created_at: string;
}

const DELIVERY_TONES = { pending: 'amber', delivered: 'green', failed: 'red' } as const;
const DELIVERY_LABELS = {
  get pending() { return tr('En attente', 'Pending'); },
  get delivered() { return tr('Livré', 'Delivered'); },
  get failed() { return tr('Échec', 'Failed'); },
};

function Webhooks({ property }: { property: Property }) {
  const { tr } = useI18n();
  const data = useQuery(async () => {
    const [endpoints, deliveries] = await Promise.all([
      run(supabase.from('webhook_endpoints').select('id, url, events, description, active').eq('property_id', property.id).order('created_at')),
      run(
        supabase
          .from('webhook_deliveries')
          .select('id, endpoint_id, event, status, attempts, last_status, last_error, created_at')
          .eq('property_id', property.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ),
    ]);
    return { endpoints: endpoints as EndpointRow[], deliveries: deliveries as DeliveryRow[] };
  }, [property.id]);
  const [creating, setCreating] = useState(false);
  const [shown, setShown] = useState<string | null>(null);
  const { busy, error, run: act } = useAction();
  const urlOf = new Map((data.data?.endpoints ?? []).map((e) => [e.id, e.url]));

  return (
    <Card
      title="Webhooks"
      actions={<Button variant="secondary" icon={Plus} onClick={() => setCreating(true)}>{tr('Nouveau webhook', 'New webhook')}</Button>}
    >
      <p className="text-xs text-slate-500 mb-3">
        {tr(
          'Prévenez un autre logiciel (site, comptabilité, CRM) à chaque réservation ou paiement. Messages signés (en-tête',
          'Notify other software (website, accounting, CRM) on every reservation or payment. Signed messages (header',
        )}{' '}
        <span className="font-mono">X-PMS-Signature</span>
        {tr('), renvoyés automatiquement en cas d’échec.', '), automatically retried on failure.')}
      </p>
      {data.loading && !data.data ? (
        <Loading />
      ) : !data.data?.endpoints.length ? (
        <Empty>{tr('Aucun webhook.', 'No webhooks.')}</Empty>
      ) : (
        <Table head={[tr('Adresse', 'URL'), tr('Événements', 'Events'), tr('Actif', 'Active'), '']}>
          {data.data.endpoints.map((w) => (
            <tr key={w.id}>
              <td className="p-3">
                <span className="font-mono break-all">{w.url}</span>
                {w.description && <span className="block text-[10px] text-slate-400">{w.description}</span>}
              </td>
              <td className="p-3"><div className="flex flex-wrap gap-1">{w.events.map((e) => <Badge key={e}>{e}</Badge>)}</div></td>
              <td className="p-3">
                <Checkbox
                  label=""
                  aria-label={tr('Actif', 'Active')}
                  checked={w.active}
                  disabled={busy}
                  onChange={(e) => act(async () => { await run(supabase.from('webhook_endpoints').update({ active: e.target.checked }).eq('id', w.id).select('id')); await data.reload(); })}
                />
              </td>
              <td className="p-3 text-right">
                <Button
                  variant="ghost"
                  icon={Trash2}
                  aria-label={tr('Supprimer', 'Delete')}
                  busy={busy}
                  onClick={() => confirm(tr('Supprimer ce webhook et son historique ?', 'Delete this webhook and its history?')) && act(async () => { await run(supabase.from('webhook_endpoints').delete().eq('id', w.id).select('id')); await data.reload(); })}
                />
              </td>
            </tr>
          ))}
        </Table>
      )}

      {!!data.data?.deliveries.length && (
        <div className="mt-4">
          <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">{tr('Derniers envois', 'Recent deliveries')}</h4>
          <Table head={[tr('Date', 'Date'), tr('Événement', 'Event'), tr('Destination', 'Destination'), tr('Statut', 'Status'), tr('Essais', 'Attempts'), tr('Dernière réponse', 'Last response')]}>
            {data.data.deliveries.map((d) => (
              <tr key={d.id}>
                <td className="p-3 whitespace-nowrap">{new Date(d.created_at).toLocaleString(tr('fr-FR', 'en-GB'))}</td>
                <td className="p-3 font-mono">{d.event}</td>
                <td className="p-3 font-mono truncate max-w-[16rem]">{urlOf.get(d.endpoint_id) ?? '—'}</td>
                <td className="p-3"><Badge tone={DELIVERY_TONES[d.status]}>{DELIVERY_LABELS[d.status]}</Badge></td>
                <td className="p-3 font-mono">{d.attempts}</td>
                <td className="p-3 text-[11px] text-slate-500">{d.last_error ?? (d.last_status ? `HTTP ${d.last_status}` : '—')}</td>
              </tr>
            ))}
          </Table>
        </div>
      )}
      <ErrorNote message={error ?? data.error} />
      {creating && (
        <WebhookModal
          onClose={() => setCreating(false)}
          onSubmit={async (url, events, description) => {
            const rows = await rpc<{ id: string; secret: string }[]>('create_webhook_endpoint', {
              p_property: property.id, p_url: url, p_events: events, p_description: description || null,
            });
            setShown(rows[0].secret);
            await data.reload();
          }}
        />
      )}
      {shown && <SecretModal title={tr('Secret de signature', 'Signing secret')} secret={shown} onClose={() => setShown(null)} />}
    </Card>
  );
}

function WebhookModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (url: string, events: string[], description: string) => Promise<void> }) {
  const { tr } = useI18n();
  const [url, setUrl] = useState('https://');
  const [events, setEvents] = useState<string[]>(['reservation.created', 'reservation.cancelled']);
  const [description, setDescription] = useState('');
  const { busy, error, run: act } = useAction();
  return (
    <Modal title={tr('Nouveau webhook', 'New webhook')} subtitle={tr('Adresse HTTPS publique qui recevra les événements.', 'Public HTTPS URL that will receive the events.')} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await act(async () => { await onSubmit(url.trim(), events, description.trim()); return true; });
          if (ok) onClose();
        }}
      >
        <Field label="URL"><Input type="url" required pattern="https://.+" value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
        <Field label="Description"><Input maxLength={120} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={tr('Site internet, comptabilité…', 'Website, accounting…')} /></Field>
        <div className="grid grid-cols-2 gap-2">
          {EVENTS.map((ev) => (
            <Checkbox
              key={ev.id}
              label={ev.label}
              checked={events.includes(ev.id)}
              onChange={(e) => setEvents(e.target.checked ? [...events, ev.id] : events.filter((x) => x !== ev.id))}
            />
          ))}
        </div>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{tr('Fermer', 'Close')}</Button>
          <Button type="submit" busy={busy} disabled={!events.length}>{tr('Créer', 'Create')}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Calendriers iCal ───────────────────────────────────────────────────────

interface FeedRow {
  id: string;
  room_id: string;
  direction: 'export' | 'import';
  url: string | null;
  token: string | null;
  source: BookingSource;
  label: string | null;
  active: boolean;
  last_synced_at: string | null;
  last_error: string | null;
}

function IcalFeeds({ property, rooms }: { property: Property; rooms: Room[] }) {
  const { tr } = useI18n();
  const feeds = useQuery(
    async () =>
      (await run(
        supabase
          .from('ical_feeds')
          .select('id, room_id, direction, url, token, source, label, active, last_synced_at, last_error')
          .eq('property_id', property.id)
          .order('created_at'),
      )) as FeedRow[],
    [property.id],
  );
  const [importing, setImporting] = useState(false);
  const { busy, error, run: act } = useAction();
  const sorted = [...rooms].sort((a, b) => a.number.localeCompare(b.number, 'fr', { numeric: true }));
  const roomNumber = new Map(rooms.map((r) => [r.id, r.number]));
  const exportOf = new Map((feeds.data ?? []).filter((f) => f.direction === 'export').map((f) => [f.room_id, f]));
  const imports = (feeds.data ?? []).filter((f) => f.direction === 'import');
  const icalUrl = (token: string) => `${FUNCTIONS_URL}/ical?token=${token}`;

  return (
    <Card title={tr('Calendriers iCal (Airbnb, Booking.com…)', 'iCal calendars (Airbnb, Booking.com…)')} actions={<CalendarSync className="w-4 h-4 text-orange-600" />}>
      <p className="text-xs text-slate-500 mb-3">
        {tr('Synchronisation simple avec les plateformes sans channel manager.', 'Simple sync with platforms, no channel manager needed.')}{' '}
        <strong>Export</strong>
        {tr(
          ' : collez l’adresse de la chambre dans la plateforme pour y bloquer les dates prises ici (sans nom de client).',
          ': paste the room’s URL into the platform to block the dates booked here (without guest names).',
        )}{' '}
        <strong>Import</strong>
        {tr(
          ' : collez l’adresse iCal fournie par la plateforme ; ses séjours deviennent des réservations, mises à jour toutes les 30 minutes.',
          ': paste the iCal URL provided by the platform; its stays become reservations, updated every 30 minutes.',
        )}
      </p>
      {feeds.loading && !feeds.data ? (
        <Loading />
      ) : (
        <>
          <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">{tr('Export par chambre', 'Export per room')}</h4>
          {sorted.length === 0 ? (
            <Empty>{tr('Ajoutez d’abord des chambres.', 'Add rooms first.')}</Empty>
          ) : (
            <Table head={[tr('Chambre', 'Room'), tr('Adresse à coller dans la plateforme', 'URL to paste into the platform'), '']}>
              {sorted.map((r) => {
                const f = exportOf.get(r.id);
                return (
                  <tr key={r.id}>
                    <td className="p-3 font-mono font-bold">{r.number}</td>
                    <td className="p-3 font-mono text-[11px] break-all">{f?.token ? icalUrl(f.token) : <span className="text-slate-400 font-sans">{tr('Non créée', 'Not created')}</span>}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {f?.token ? (
                        <Button variant="ghost" icon={Copy} onClick={() => copy(icalUrl(f.token!))}>{tr('Copier', 'Copy')}</Button>
                      ) : (
                        <Button
                          variant="secondary"
                          icon={Plus}
                          busy={busy}
                          onClick={() => act(async () => { await rpc('add_ical_feed', { p_room: r.id, p_direction: 'export' }); await feeds.reload(); })}
                        >
                          {tr('Créer', 'Create')}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}

          <div className="flex items-center justify-between mt-5 mb-2">
            <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{tr('Import depuis les plateformes', 'Import from platforms')}</h4>
            <Button variant="secondary" icon={Plus} disabled={!rooms.length} onClick={() => setImporting(true)}>{tr('Ajouter un calendrier', 'Add a calendar')}</Button>
          </div>
          {imports.length === 0 ? (
            <Empty>{tr('Aucun calendrier importé.', 'No imported calendars.')}</Empty>
          ) : (
            <Table head={[tr('Chambre', 'Room'), tr('Plateforme', 'Platform'), tr('Dernière synchro', 'Last sync'), tr('État', 'Status'), '']}>
              {imports.map((f) => (
                <tr key={f.id}>
                  <td className="p-3 font-mono font-bold">{roomNumber.get(f.room_id) ?? '?'}</td>
                  <td className="p-3">
                    {f.label ?? SOURCE_LABELS[f.source]}
                    <span className="block text-[10px] text-slate-400 font-mono truncate max-w-[18rem]">{f.url}</span>
                  </td>
                  <td className="p-3 whitespace-nowrap">{f.last_synced_at ? new Date(f.last_synced_at).toLocaleString(tr('fr-FR', 'en-GB')) : tr('En attente', 'Pending')}</td>
                  <td className="p-3">
                    {!f.active ? <Badge>{tr('Suspendu', 'Paused')}</Badge> : f.last_error ? <Badge tone="red">{f.last_error}</Badge> : <Badge tone="green">OK</Badge>}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      busy={busy}
                      onClick={() => act(async () => { await run(supabase.from('ical_feeds').update({ active: !f.active }).eq('id', f.id).select('id')); await feeds.reload(); })}
                    >
                      {f.active ? tr('Suspendre', 'Pause') : tr('Reprendre', 'Resume')}
                    </Button>
                    <Button
                      variant="ghost"
                      icon={Trash2}
                      aria-label={tr('Supprimer', 'Delete')}
                      busy={busy}
                      onClick={() => confirm(tr('Supprimer ce calendrier ? Les séjours déjà importés restent dans le planning.', 'Delete this calendar? Stays already imported remain in the room rack.')) && act(async () => { await run(supabase.from('ical_feeds').delete().eq('id', f.id).select('id')); await feeds.reload(); })}
                    />
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </>
      )}
      <ErrorNote message={error ?? feeds.error} />
      {importing && (
        <IcalImportModal
          rooms={sorted}
          onClose={() => setImporting(false)}
          onSubmit={async (roomId, url, source, label) => {
            await rpc('add_ical_feed', { p_room: roomId, p_direction: 'import', p_url: url, p_source: source, p_label: label });
            await feeds.reload();
          }}
        />
      )}
    </Card>
  );
}

function IcalImportModal({
  rooms, onClose, onSubmit,
}: { rooms: Room[]; onClose: () => void; onSubmit: (roomId: string, url: string, source: BookingSource, label: string) => Promise<void> }) {
  const { tr } = useI18n();
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? '');
  const [url, setUrl] = useState('');
  const [source, setSource] = useState<BookingSource>('airbnb');
  const [label, setLabel] = useState('');
  const { busy, error, run: act } = useAction();
  return (
    <Modal title={tr('Importer un calendrier', 'Import a calendar')} subtitle={tr('Airbnb : Calendrier → Disponibilités → Exporter le calendrier. Booking.com : Tarifs et disponibilités → Synchroniser les calendriers.', 'Airbnb: Calendar → Availability → Export calendar. Booking.com: Rates & availability → Sync calendars.')} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await act(async () => { await onSubmit(roomId, url.trim(), source, label.trim()); return true; });
          if (ok) onClose();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr('Chambre', 'Room')}>
            <Select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.number} · {r.category}</option>)}
            </Select>
          </Field>
          <Field label={tr('Plateforme', 'Platform')}>
            <Select value={source} onChange={(e) => setSource(e.target.value as BookingSource)}>
              {ICAL_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
            </Select>
          </Field>
        </div>
        <Field label={tr('Adresse iCal (https://…ics)', 'iCal URL (https://…ics)')}><Input type="url" required pattern="https://.+" value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
        <Field label={tr('Libellé (facultatif)', 'Label (optional)')}><Input maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={tr('Airbnb – annonce Bungalow', 'Airbnb – Bungalow listing')} /></Field>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{tr('Fermer', 'Close')}</Button>
          <Button type="submit" busy={busy}>{tr('Ajouter', 'Add')}</Button>
        </div>
      </form>
    </Modal>
  );
}

