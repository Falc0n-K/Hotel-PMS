import React, { useState } from 'react';
import { Copy, Globe, Plus, Save, Trash2, CalendarSync, ExternalLink } from 'lucide-react';
import type { Property } from '../lib/auth';
import type { Room } from '../types';
import { rpc, run, SOURCE_LABELS, type BookingSource } from '../lib/pmsData';
import { supabase } from '../lib/supabase';
import { useQuery } from '../lib/query';
import { formatDate } from '../lib/dates';
import { Badge, Button, Card, Checkbox, Empty, ErrorNote, Field, Input, Loading, Modal, Select, Table, Textarea, useAction } from './ui';

// Paramètres → Distribution : réservation en ligne, clés d'API, webhooks et
// calendriers iCal. Réservé à la direction (la RLS refuse les autres rôles).

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1`;

const SCOPES = [
  { id: 'availability:read', label: 'Lire les disponibilités' },
  { id: 'reservations:read', label: 'Lire les réservations' },
  { id: 'reservations:write', label: 'Créer des réservations' },
];

const EVENTS = [
  { id: '*', label: 'Tous les événements' },
  { id: 'reservation.created', label: 'Réservation créée' },
  { id: 'reservation.confirmed', label: 'Option confirmée' },
  { id: 'reservation.updated', label: 'Réservation modifiée' },
  { id: 'reservation.cancelled', label: 'Réservation annulée' },
  { id: 'reservation.checked_in', label: 'Arrivée' },
  { id: 'reservation.checked_out', label: 'Départ' },
  { id: 'reservation.no_show', label: 'No-show' },
  { id: 'payment.received', label: 'Paiement reçu' },
];

const ICAL_SOURCES: BookingSource[] = ['airbnb', 'booking_com', 'expedia', 'other'];

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    window.prompt('Copiez :', text);
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
    <Card title="Réservation en ligne" actions={<Globe className="w-4 h-4 text-orange-600" />}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-xs text-slate-500">
          Une page publique où vos clients choisissent leurs dates et paient en ligne. La chambre est bloquée en option le temps
          du paiement, puis confirmée automatiquement ; sans paiement, l’option est annulée à l’échéance.
        </p>
        <Checkbox label="Ouvrir la réservation en ligne" checked={p.booking_enabled} onChange={(e) => setP({ ...p, booking_enabled: e.target.checked })} />
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Adresse de la page" hint="Lettres minuscules, chiffres et tirets">
            <Input
              required
              pattern="[a-z0-9-]{3,40}"
              value={p.booking_slug}
              onChange={(e) => setP({ ...p, booking_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) })}
            />
          </Field>
          <Field label="Délai pour payer (minutes)" hint="Entre 10 et 1440">
            <Input type="number" min={10} max={1440} value={p.booking_hold_minutes} onChange={(e) => setP({ ...p, booking_hold_minutes: Math.trunc(Number(e.target.value)) })} />
          </Field>
          <Field label="Paiement">
            <Select value={p.booking_provider} onChange={(e) => setP({ ...p, booking_provider: e.target.value as Property['booking_provider'] })}>
              <option value="paydunya">PayDunya (Wave, Orange Money, carte)</option>
              <option value="stripe">Stripe (carte internationale)</option>
            </Select>
          </Field>
        </div>
        <Field label="Présentation affichée aux clients">
          <Textarea rows={3} maxLength={1000} value={p.public_description} onChange={(e) => setP({ ...p, public_description: e.target.value })} />
        </Field>
        {property.booking_enabled && property.booking_slug && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono bg-slate-50 border border-slate-100 rounded-lg px-2 py-1">{publicUrl}</span>
            <Button type="button" variant="ghost" icon={Copy} onClick={() => copy(publicUrl)}>Copier</Button>
            <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-orange-600">
              <ExternalLink className="w-3.5 h-3.5" /> Ouvrir
            </a>
          </div>
        )}
        <ErrorNote message={error} />
        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-xs font-semibold text-emerald-600">Enregistré</span>}
          <Button type="submit" icon={Save} busy={busy}>Enregistrer</Button>
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
      title="Clés d’API (partenaires)"
      actions={<Button variant="secondary" icon={Plus} onClick={() => setCreating(true)}>Nouvelle clé</Button>}
    >
      <p className="text-xs text-slate-500 mb-3">
        Pour un tour-opérateur, une agence ou un site tiers : disponibilités et réservations en direct.
        Documentation à transmettre : <span className="font-mono">docs/api.md</span>, base <span className="font-mono">{FUNCTIONS_URL}/api/v1</span>.
      </p>
      {keys.loading && !keys.data ? (
        <Loading />
      ) : !keys.data?.length ? (
        <Empty>Aucune clé.</Empty>
      ) : (
        <Table head={['Nom', 'Clé', 'Droits', 'Dernière utilisation', '']}>
          {keys.data.map((k) => (
            <tr key={k.id} className={k.revoked_at ? 'opacity-50' : ''}>
              <td className="p-3 font-semibold">{k.name}</td>
              <td className="p-3 font-mono">{k.prefix}…</td>
              <td className="p-3">
                <div className="flex flex-wrap gap-1">{k.scopes.map((s) => <Badge key={s}>{s}</Badge>)}</div>
              </td>
              <td className="p-3">{k.last_used_at ? formatDate(k.last_used_at.slice(0, 10)) : 'Jamais'}</td>
              <td className="p-3 text-right">
                {k.revoked_at ? (
                  <Badge tone="red">Révoquée</Badge>
                ) : (
                  <Button
                    variant="danger"
                    busy={busy}
                    onClick={() => confirm(`Révoquer la clé « ${k.name} » ? Le partenaire perdra l’accès immédiatement.`) && act(async () => { await rpc('revoke_api_key', { p_key: k.id }); await keys.reload(); })}
                  >
                    Révoquer
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
      {shown && <SecretModal title="Clé d’API créée" secret={shown} onClose={() => setShown(null)} />}
    </Card>
  );
}

function ApiKeyModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (name: string, scopes: string[]) => Promise<void> }) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['availability:read']);
  const { busy, error, run: act } = useAction();
  return (
    <Modal title="Nouvelle clé d’API" subtitle="Donnez le minimum de droits nécessaires au partenaire." onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await act(async () => { await onSubmit(name, scopes); return true; });
          if (ok) onClose();
        }}
      >
        <Field label="Partenaire"><Input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Tour-opérateur Teranga Voyages" /></Field>
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
          <Button type="button" variant="secondary" onClick={onClose}>Fermer</Button>
          <Button type="submit" busy={busy} disabled={!scopes.length}>Créer</Button>
        </div>
      </form>
    </Modal>
  );
}

function SecretModal({ title, secret, onClose }: { title: string; secret: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Modal title={title} subtitle="Elle ne sera plus jamais affichée : copiez-la maintenant et transmettez-la par un canal sûr." onClose={onClose}>
      <div className="space-y-3">
        <p className="font-mono text-xs break-all bg-slate-50 border border-slate-200 rounded-xl p-3 select-all">{secret}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" icon={Copy} onClick={async () => { await copy(secret); setCopied(true); }}>{copied ? 'Copiée' : 'Copier'}</Button>
          <Button onClick={onClose}>J’ai copié</Button>
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
const DELIVERY_LABELS = { pending: 'En attente', delivered: 'Livré', failed: 'Échec' } as const;

function Webhooks({ property }: { property: Property }) {
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
      actions={<Button variant="secondary" icon={Plus} onClick={() => setCreating(true)}>Nouveau webhook</Button>}
    >
      <p className="text-xs text-slate-500 mb-3">
        Prévenez un autre logiciel (site, comptabilité, CRM) à chaque réservation ou paiement. Messages signés
        (en-tête <span className="font-mono">X-PMS-Signature</span>), renvoyés automatiquement en cas d’échec.
      </p>
      {data.loading && !data.data ? (
        <Loading />
      ) : !data.data?.endpoints.length ? (
        <Empty>Aucun webhook.</Empty>
      ) : (
        <Table head={['Adresse', 'Événements', 'Actif', '']}>
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
                  aria-label="Actif"
                  checked={w.active}
                  disabled={busy}
                  onChange={(e) => act(async () => { await run(supabase.from('webhook_endpoints').update({ active: e.target.checked }).eq('id', w.id).select('id')); await data.reload(); })}
                />
              </td>
              <td className="p-3 text-right">
                <Button
                  variant="ghost"
                  icon={Trash2}
                  aria-label="Supprimer"
                  busy={busy}
                  onClick={() => confirm('Supprimer ce webhook et son historique ?') && act(async () => { await run(supabase.from('webhook_endpoints').delete().eq('id', w.id).select('id')); await data.reload(); })}
                />
              </td>
            </tr>
          ))}
        </Table>
      )}

      {!!data.data?.deliveries.length && (
        <div className="mt-4">
          <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Derniers envois</h4>
          <Table head={['Date', 'Événement', 'Destination', 'Statut', 'Essais', 'Dernière réponse']}>
            {data.data.deliveries.map((d) => (
              <tr key={d.id}>
                <td className="p-3 whitespace-nowrap">{new Date(d.created_at).toLocaleString('fr-FR')}</td>
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
      {shown && <SecretModal title="Secret de signature" secret={shown} onClose={() => setShown(null)} />}
    </Card>
  );
}

function WebhookModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (url: string, events: string[], description: string) => Promise<void> }) {
  const [url, setUrl] = useState('https://');
  const [events, setEvents] = useState<string[]>(['reservation.created', 'reservation.cancelled']);
  const [description, setDescription] = useState('');
  const { busy, error, run: act } = useAction();
  return (
    <Modal title="Nouveau webhook" subtitle="Adresse HTTPS publique qui recevra les événements." onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await act(async () => { await onSubmit(url.trim(), events, description.trim()); return true; });
          if (ok) onClose();
        }}
      >
        <Field label="URL"><Input type="url" required pattern="https://.+" value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
        <Field label="Description"><Input maxLength={120} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Site internet, comptabilité…" /></Field>
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
          <Button type="button" variant="secondary" onClick={onClose}>Fermer</Button>
          <Button type="submit" busy={busy} disabled={!events.length}>Créer</Button>
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
    <Card title="Calendriers iCal (Airbnb, Booking.com…)" actions={<CalendarSync className="w-4 h-4 text-orange-600" />}>
      <p className="text-xs text-slate-500 mb-3">
        Synchronisation simple avec les plateformes sans channel manager. <strong>Export</strong> : collez l’adresse de la chambre
        dans la plateforme pour y bloquer les dates prises ici (sans nom de client). <strong>Import</strong> : collez l’adresse
        iCal fournie par la plateforme ; ses séjours deviennent des réservations, mises à jour toutes les 30 minutes.
      </p>
      {feeds.loading && !feeds.data ? (
        <Loading />
      ) : (
        <>
          <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Export par chambre</h4>
          {sorted.length === 0 ? (
            <Empty>Ajoutez d’abord des chambres.</Empty>
          ) : (
            <Table head={['Chambre', 'Adresse à coller dans la plateforme', '']}>
              {sorted.map((r) => {
                const f = exportOf.get(r.id);
                return (
                  <tr key={r.id}>
                    <td className="p-3 font-mono font-bold">{r.number}</td>
                    <td className="p-3 font-mono text-[11px] break-all">{f?.token ? icalUrl(f.token) : <span className="text-slate-400 font-sans">Non créée</span>}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {f?.token ? (
                        <Button variant="ghost" icon={Copy} onClick={() => copy(icalUrl(f.token!))}>Copier</Button>
                      ) : (
                        <Button
                          variant="secondary"
                          icon={Plus}
                          busy={busy}
                          onClick={() => act(async () => { await rpc('add_ical_feed', { p_room: r.id, p_direction: 'export' }); await feeds.reload(); })}
                        >
                          Créer
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}

          <div className="flex items-center justify-between mt-5 mb-2">
            <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Import depuis les plateformes</h4>
            <Button variant="secondary" icon={Plus} disabled={!rooms.length} onClick={() => setImporting(true)}>Ajouter un calendrier</Button>
          </div>
          {imports.length === 0 ? (
            <Empty>Aucun calendrier importé.</Empty>
          ) : (
            <Table head={['Chambre', 'Plateforme', 'Dernière synchro', 'État', '']}>
              {imports.map((f) => (
                <tr key={f.id}>
                  <td className="p-3 font-mono font-bold">{roomNumber.get(f.room_id) ?? '?'}</td>
                  <td className="p-3">
                    {f.label ?? SOURCE_LABELS[f.source]}
                    <span className="block text-[10px] text-slate-400 font-mono truncate max-w-[18rem]">{f.url}</span>
                  </td>
                  <td className="p-3 whitespace-nowrap">{f.last_synced_at ? new Date(f.last_synced_at).toLocaleString('fr-FR') : 'En attente'}</td>
                  <td className="p-3">
                    {!f.active ? <Badge>Suspendu</Badge> : f.last_error ? <Badge tone="red">{f.last_error}</Badge> : <Badge tone="green">OK</Badge>}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      busy={busy}
                      onClick={() => act(async () => { await run(supabase.from('ical_feeds').update({ active: !f.active }).eq('id', f.id).select('id')); await feeds.reload(); })}
                    >
                      {f.active ? 'Suspendre' : 'Reprendre'}
                    </Button>
                    <Button
                      variant="ghost"
                      icon={Trash2}
                      aria-label="Supprimer"
                      busy={busy}
                      onClick={() => confirm('Supprimer ce calendrier ? Les séjours déjà importés restent dans le planning.') && act(async () => { await run(supabase.from('ical_feeds').delete().eq('id', f.id).select('id')); await feeds.reload(); })}
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
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? '');
  const [url, setUrl] = useState('');
  const [source, setSource] = useState<BookingSource>('airbnb');
  const [label, setLabel] = useState('');
  const { busy, error, run: act } = useAction();
  return (
    <Modal title="Importer un calendrier" subtitle="Airbnb : Calendrier → Disponibilités → Exporter le calendrier. Booking.com : Tarifs et disponibilités → Synchroniser les calendriers." onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await act(async () => { await onSubmit(roomId, url.trim(), source, label.trim()); return true; });
          if (ok) onClose();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Chambre">
            <Select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.number} · {r.category}</option>)}
            </Select>
          </Field>
          <Field label="Plateforme">
            <Select value={source} onChange={(e) => setSource(e.target.value as BookingSource)}>
              {ICAL_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Adresse iCal (https://…ics)"><Input type="url" required pattern="https://.+" value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
        <Field label="Libellé (facultatif)"><Input maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Airbnb – annonce Bungalow" /></Field>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Fermer</Button>
          <Button type="submit" busy={busy}>Ajouter</Button>
        </div>
      </form>
    </Modal>
  );
}

