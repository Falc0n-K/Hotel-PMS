import React, { useCallback, useState } from 'react';
import {
  UserCheck, LogOut, Ban, UserX, Pencil, Wallet, Link2, FileText, Printer, Plus, Undo2, Copy, Star,
} from 'lucide-react';
import type { Room } from '../../types';
import type { Property } from '../../lib/auth';
import type { AppRole } from '../../lib/roles';
import { canManageReservations } from '../../lib/roles';
import {
  CHARGE_LABELS, PAYMENT_METHOD_LABELS, SOURCE_LABELS, STATUS_LABELS, balanceOf,
  run, type ChargeCategory, type PaymentMethod, type PmsActions, type RatePlanRow, type ReservationRow,
} from '../../lib/pmsData';
import { supabase } from '../../lib/supabase';
import { useQuery } from '../../lib/query';
import { formatDate, formatMoney, nightsBetween } from '../../lib/dates';
import {
  Badge, Button, Card, Checkbox, ErrorNote, Field, Input, Loading, Modal, Select, Textarea, useAction, type Tone,
} from '../ui';
import ReservationForm from './ReservationForm';
import InvoicePrint, { type InvoiceDoc } from './InvoicePrint';
import { useI18n } from '../../lib/i18n';

export const STATUS_TONES: Record<ReservationRow['status'], Tone> = {
  option: 'amber',
  confirmed: 'blue',
  checked_in: 'orange',
  checked_out: 'slate',
  cancelled: 'red',
  no_show: 'red',
};

interface GuestFull {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  id_document_type: string | null;
  id_document_number: string | null;
  id_document_expiry: string | null;
  birth_date: string | null;
  birth_place: string | null;
  address: string | null;
  profession: string | null;
  country_of_residence: string | null;
  coming_from: string | null;
  going_to: string | null;
  vip: boolean;
  marketing_consent: boolean;
  notes: string | null;
}

interface Details {
  guest: GuestFull | null;
  charges: { id: string; category: ChargeCategory; description: string; quantity: number; unit_price: number; amount: number; created_at: string }[];
  payments: { id: string; amount: number; method: PaymentMethod; reference: string | null; created_at: string }[];
  invoices: (InvoiceDoc & { credit_notes: { display_number: string; issued_at: string; reason: string }[] })[];
  links: { id: string; provider: string; amount: number; status: string; checkout_url: string | null; created_at: string }[];
}

interface Props {
  reservation: ReservationRow;
  rooms: Room[];
  ratePlans: RatePlanRow[];
  property: Property;
  role: AppRole;
  today: string;
  actions: PmsActions;
  onClose: () => void;
}

export default function ReservationDrawer({ reservation: r, rooms, ratePlans, property, role, today, actions, onClose }: Props) {
  const { tr } = useI18n();
  const canWrite = canManageReservations(role);
  const canFinance = ['owner', 'general_manager', 'accountant'].includes(role);
  const room = rooms.find((x) => x.id === r.room_id);
  const { busy, error, run: act } = useAction();
  const [editing, setEditing] = useState(false);
  const [modal, setModal] = useState<null | 'charge' | 'payment' | 'link' | 'guest'>(null);
  const [printing, setPrinting] = useState<InvoiceDoc | null>(null);

  const details = useQuery<Details>(async () => {
    const [guest, charges, payments, invoices, links] = await Promise.all([
      run(supabase.from('guests').select('*').eq('id', r.guest_id).maybeSingle()),
      run(supabase.from('folio_charges').select('id, category, description, quantity, unit_price, amount, created_at').eq('reservation_id', r.id).order('created_at')),
      run(supabase.from('payments').select('id, amount, method, reference, created_at').eq('reservation_id', r.id).order('created_at')),
      run(supabase.from('invoices').select('id, display_number, issued_at, subtotal, vat_amount, tourist_tax, total, lines, credit_notes(display_number, issued_at, reason)').eq('reservation_id', r.id).order('issued_at')),
      run(supabase.from('payment_links').select('id, provider, amount, status, checkout_url, created_at').eq('reservation_id', r.id).order('created_at', { ascending: false })),
    ]);
    return {
      guest: guest as GuestFull | null,
      charges: (charges ?? []) as Details['charges'],
      payments: (payments ?? []) as Details['payments'],
      invoices: (invoices ?? []) as Details['invoices'],
      links: (links ?? []) as Details['links'],
    };
  }, [r.id, r.guest_id, r.total_amount, r.payments.length, r.folio_charges.length, r.invoices.length]);

  const balance = balanceOf(r);
  const nights = nightsBetween(r.check_in, r.check_out);
  const breakfastAmount = r.total_amount - (r.room_amount ?? r.total_amount);
  const activeInvoice = details.data?.invoices.find((i) => i.credit_notes.length === 0);

  const doAction = (fn: () => Promise<unknown>) => act(async () => {
    await fn();
    await details.reload();
  });

  const print = useCallback((inv: Details['invoices'][number]) => {
    setPrinting({ ...inv, credit_note: inv.credit_notes[0] ?? null });
  }, []);

  return (
    <Modal
      wide
      title={tr(`Réservation ${r.code}`, `Reservation ${r.code}`)}
      subtitle={tr(
        `${r.guest?.full_name ?? 'Client'} · chambre ${room?.number ?? '?'} · ${formatDate(r.check_in)} → ${formatDate(r.check_out)} (${nights} nuit${nights > 1 ? 's' : ''})`,
        `${r.guest?.full_name ?? 'Guest'} · room ${room?.number ?? '?'} · ${formatDate(r.check_in)} → ${formatDate(r.check_out)} (${nights} night${nights > 1 ? 's' : ''})`,
      )}
      onClose={onClose}
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge tone={STATUS_TONES[r.status]}>{STATUS_LABELS[r.status]}</Badge>
        <Badge>{SOURCE_LABELS[r.source]}</Badge>
        {r.guest?.vip && <Badge tone="violet"><Star className="w-3 h-3" /> VIP</Badge>}
        <span className={`ml-auto text-sm font-black font-mono ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
          {tr('Solde :', 'Balance:')} {formatMoney(balance)}
        </span>
      </div>

      {canWrite && (
        <div className="flex flex-wrap gap-2 mb-4">
          {(r.status === 'confirmed' || r.status === 'option') && r.check_in <= today && (
            <Button variant="success" icon={UserCheck} busy={busy} onClick={() => doAction(() => actions.checkIn(r.id))}>Check-in</Button>
          )}
          {r.status === 'checked_in' && (
            <Button icon={LogOut} busy={busy} onClick={() => doAction(() => actions.checkOut(r.id))}>Check-out</Button>
          )}
          {['option', 'confirmed', 'checked_in'].includes(r.status) && (
            <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>{tr('Modifier / déloger', 'Edit / move room')}</Button>
          )}
          {['confirmed', 'checked_in', 'checked_out'].includes(r.status) && (
            <Button variant="secondary" icon={Plus} onClick={() => setModal('charge')}>{tr('Prestation', 'Extra charge')}</Button>
          )}
          {r.status !== 'cancelled' && r.status !== 'no_show' && (balance > 0 || canFinance) && (
            <Button variant="secondary" icon={Wallet} onClick={() => setModal('payment')}>{tr('Encaisser', 'Take payment')}</Button>
          )}
          {balance > 0 && ['option', 'confirmed', 'checked_in', 'checked_out'].includes(r.status) && (
            <Button variant="secondary" icon={Link2} onClick={() => setModal('link')}>{tr('Lien de paiement', 'Payment link')}</Button>
          )}
          {!activeInvoice && ['checked_in', 'checked_out', 'confirmed'].includes(r.status) && (
            <Button variant="secondary" icon={FileText} busy={busy} onClick={() => doAction(() => actions.issueInvoice(r.id))}>{tr('Émettre la facture', 'Issue invoice')}</Button>
          )}
          {(r.status === 'confirmed' || r.status === 'option') && r.check_in < today && (
            <Button variant="danger" icon={UserX} busy={busy} onClick={() => confirm(tr('Déclarer ce client non présenté ?', 'Mark this guest as a no-show?')) && doAction(() => actions.markNoShow(r.id))}>No-show</Button>
          )}
          {(r.status === 'confirmed' || r.status === 'option') && (
            <Button
              variant="danger"
              icon={Ban}
              busy={busy}
              onClick={() => {
                const reason = prompt(tr('Motif de l’annulation :', 'Cancellation reason:'));
                if (reason !== null) doAction(() => actions.cancel(r.id, reason));
              }}
            >
              {tr('Annuler', 'Cancel')}
            </Button>
          )}
        </div>
      )}

      <ErrorNote message={error} />

      {details.loading && !details.data ? (
        <Loading />
      ) : details.error ? (
        <ErrorNote message={details.error} />
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mt-2">
          <Card title={tr('Client', 'Guest')} actions={canWrite && details.data?.guest ? <Button variant="ghost" icon={Pencil} onClick={() => setModal('guest')}>{tr('Fiche de police', 'Police registration form')}</Button> : undefined}>
            {details.data?.guest ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <Info label={tr('Nom', 'Name')} value={details.data.guest.full_name} />
                <Info label={tr('Téléphone', 'Phone')} value={details.data.guest.phone} />
                <Info label={tr('E-mail', 'Email')} value={details.data.guest.email} />
                <Info label={tr('Nationalité', 'Nationality')} value={details.data.guest.nationality} />
                <Info label={tr('Pièce', 'ID document')} value={[details.data.guest.id_document_type, details.data.guest.id_document_number].filter(Boolean).join(' ') || null} />
                <Info label={tr('Provenance / destination', 'Coming from / going to')} value={[details.data.guest.coming_from, details.data.guest.going_to].filter(Boolean).join(' → ') || null} />
              </dl>
            ) : (
              <p className="text-xs text-slate-400">{tr('Fiche client non accessible pour votre rôle.', 'Guest record not available for your role.')}</p>
            )}
            {r.notes && <p className="mt-3 text-[11px] text-slate-600 whitespace-pre-line bg-slate-50 rounded-lg p-2">{r.notes}</p>}
          </Card>

          <Card title="Folio">
            <ul className="text-xs divide-y divide-slate-100">
              <Line label={tr(`Hébergement · ${nights} nuit${nights > 1 ? 's' : ''}`, `Accommodation · ${nights} night${nights > 1 ? 's' : ''}`)} amount={r.room_amount ?? r.total_amount} />
              {breakfastAmount > 0 && <Line label={tr('Petit-déjeuner', 'Breakfast')} amount={breakfastAmount} />}
              {details.data?.charges.map((c) => (
                <Line key={c.id} label={`${CHARGE_LABELS[c.category]} · ${c.description}${Number(c.quantity) !== 1 ? ` × ${c.quantity}` : ''}`} amount={c.amount} />
              ))}
              {details.data?.payments.map((p) => (
                <Line key={p.id} label={`${tr('Paiement', 'Payment')} ${PAYMENT_METHOD_LABELS[p.method]}${p.reference ? ` (${p.reference})` : ''} · ${formatDate(p.created_at.slice(0, 10))}`} amount={-p.amount} tone="green" />
              ))}
            </ul>
            <div className="flex justify-between pt-3 mt-2 border-t border-slate-200 text-sm font-black">
              <span>{tr('Solde', 'Balance')}</span>
              <span className={balance > 0 ? 'text-red-600' : 'text-emerald-600'}>{formatMoney(balance)}</span>
            </div>
          </Card>

          <Card title={tr('Factures et avoirs', 'Invoices and credit notes')}>
            {details.data?.invoices.length ? (
              <ul className="text-xs space-y-2">
                {details.data.invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between gap-2">
                    <span>
                      <span className="font-mono font-bold">{inv.display_number}</span> · {formatMoney(inv.total)}
                      {inv.credit_notes[0] && <Badge tone="red">{tr('Avoir', 'Credit note')} {inv.credit_notes[0].display_number}</Badge>}
                    </span>
                    <span className="flex gap-1">
                      <Button variant="ghost" icon={Printer} onClick={() => print(inv)}>{tr('Imprimer', 'Print')}</Button>
                      {canFinance && !inv.credit_notes[0] && (
                        <Button
                          variant="ghost"
                          icon={Undo2}
                          onClick={() => {
                            const reason = prompt(tr('Motif de l’avoir (annule la facture) :', 'Credit note reason (cancels the invoice):'));
                            if (reason) doAction(() => actions.issueCreditNote(inv.id, reason));
                          }}
                        >
                          {tr('Avoir', 'Credit note')}
                        </Button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">{tr('Aucune facture émise.', 'No invoice issued.')}</p>
            )}
          </Card>

          <Card title={tr('Liens de paiement', 'Payment links')}>
            {details.data?.links.length ? (
              <ul className="text-xs space-y-2">
                {details.data.links.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2">
                    <span>
                      {l.provider === 'stripe' ? tr('Carte (Stripe)', 'Card (Stripe)') : 'Mobile money (PayDunya)'} · {formatMoney(l.amount)}{' '}
                      <Badge tone={l.status === 'paid' ? 'green' : l.status === 'failed' ? 'red' : 'amber'}>{l.status}</Badge>
                    </span>
                    {l.checkout_url && l.status === 'open' && (
                      <Button variant="ghost" icon={Copy} onClick={() => navigator.clipboard.writeText(l.checkout_url!)}>{tr('Copier', 'Copy')}</Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">{tr('Aucun lien envoyé.', 'No link sent.')}</p>
            )}
          </Card>
        </div>
      )}

      {editing && (
        <ReservationForm
          rooms={rooms}
          ratePlans={ratePlans}
          today={today}
          breakfastPrice={property.breakfast_price}
          propertyId={property.id}
          actions={actions}
          existing={r}
          onClose={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      )}
      {modal === 'charge' && <ChargeModal onClose={() => setModal(null)} canDiscount={canFinance} onSubmit={(c, d, q, u) => actions.addCharge(r.id, c, d, q, u)} />}
      {modal === 'payment' && (
        <PaymentModal
          balance={balance}
          canRefund={canFinance}
          onClose={() => setModal(null)}
          onSubmit={(amount, method, ref) => actions.recordPayment(r.id, amount, method, ref)}
        />
      )}
      {modal === 'link' && <LinkModal balance={balance} onClose={() => setModal(null)} onSubmit={(amount, provider) => actions.createPaymentLink(r.id, amount, provider)} />}
      {modal === 'guest' && details.data?.guest && (
        <GuestModal guest={details.data.guest} onClose={() => setModal(null)} onSaved={() => { setModal(null); details.reload(); }} />
      )}
      {printing && (
        <InvoicePrint invoice={printing} property={property} guest={details.data?.guest ?? null} reservationCode={r.code} onDone={() => setPrinting(null)} />
      )}
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <>
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-semibold text-slate-800 truncate">{value || '—'}</dd>
    </>
  );
}

function Line({ label, amount, tone }: { label: string; amount: number; tone?: 'green' }) {
  return (
    <li className="flex justify-between gap-3 py-1.5">
      <span className="text-slate-600">{label}</span>
      <span className={`font-mono font-bold ${tone === 'green' ? 'text-emerald-600' : 'text-slate-800'}`}>{formatMoney(amount)}</span>
    </li>
  );
}

function ChargeModal({ onClose, onSubmit, canDiscount }: { onClose: () => void; canDiscount: boolean; onSubmit: (c: ChargeCategory, d: string, q: number, u: number) => Promise<unknown> }) {
  const { tr } = useI18n();
  const [category, setCategory] = useState<ChargeCategory>('restaurant');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const { busy, error, run: act } = useAction();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await act(() => onSubmit(category, description, quantity, unitPrice));
    if (ok !== undefined) onClose();
  };
  return (
    <Modal title={tr('Ajouter une prestation', 'Add an extra charge')} subtitle={canDiscount ? tr('Un prix négatif enregistre un geste commercial.', 'A negative price records a goodwill discount.') : undefined} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr('Catégorie', 'Category')}>
            <Select value={category} onChange={(e) => setCategory(e.target.value as ChargeCategory)}>
              {(Object.keys(CHARGE_LABELS) as ChargeCategory[]).filter((c) => c !== 'room').map((c) => (
                <option key={c} value={c}>{CHARGE_LABELS[c]}</option>
              ))}
            </Select>
          </Field>
          <Field label={tr('Description', 'Description')}>
            <Input required minLength={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={tr('Dîner, navette aéroport…', 'Dinner, airport shuttle…')} />
          </Field>
          <Field label={tr('Quantité', 'Quantity')}>
            <Input type="number" step="0.5" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </Field>
          <Field label={tr('Prix unitaire TTC (FCFA)', 'Unit price incl. tax (FCFA)')}>
            <Input type="number" step="1" min={canDiscount ? undefined : 0} value={unitPrice} onChange={(e) => setUnitPrice(Math.trunc(Number(e.target.value)))} />
          </Field>
        </div>
        <p className="text-xs text-slate-600">{tr('Montant :', 'Amount:')} <strong>{formatMoney(Math.round(quantity * unitPrice))}</strong></p>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{tr('Fermer', 'Close')}</Button>
          <Button type="submit" busy={busy} disabled={quantity === 0 || unitPrice === 0}>{tr('Ajouter au folio', 'Add to folio')}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function PaymentModal({ balance, canRefund, onClose, onSubmit }: { balance: number; canRefund: boolean; onClose: () => void; onSubmit: (amount: number, method: PaymentMethod, ref: string) => Promise<unknown> }) {
  const { tr } = useI18n();
  const [amount, setAmount] = useState(Math.max(balance, 0));
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const { busy, error, run: act } = useAction();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await act(() => onSubmit(amount, method, reference));
    if (ok !== undefined) onClose();
  };
  return (
    <Modal title={tr('Encaissement', 'Payment')} subtitle={tr(`Solde dû : ${formatMoney(balance)}`, `Balance due: ${formatMoney(balance)}`)} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label={tr('Montant (FCFA)', 'Amount (FCFA)')} hint={canRefund ? tr('Un montant négatif enregistre un remboursement.', 'A negative amount records a refund.') : undefined}>
          <Input type="number" step={1} min={canRefund ? undefined : 1} value={amount} onChange={(e) => setAmount(Math.trunc(Number(e.target.value)))} required />
        </Field>
        <Field label={tr('Moyen de paiement', 'Payment method')} hint={method === 'cash' ? tr('Les espèces exigent une caisse ouverte (Caisse & Finance).', 'Cash requires an open cash register (Cashier & finance).') : undefined}>
          <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
            ))}
          </Select>
        </Field>
        <Field label={tr('Référence (n° de transaction, reçu…)', 'Reference (transaction no., receipt…)')}>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
        <p className="text-[10px] text-slate-400">{tr('Un paiement enregistré ne se modifie plus ; une erreur se corrige par un remboursement.', 'A recorded payment can no longer be edited; correct a mistake with a refund.')}</p>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{tr('Fermer', 'Close')}</Button>
          <Button type="submit" busy={busy} disabled={amount === 0}>{tr('Enregistrer', 'Save')}</Button>
        </div>
      </form>
    </Modal>
  );
}

function LinkModal({ balance, onClose, onSubmit }: { balance: number; onClose: () => void; onSubmit: (amount: number, provider: 'stripe' | 'paydunya') => Promise<string> }) {
  const { tr } = useI18n();
  const [amount, setAmount] = useState(balance);
  const [provider, setProvider] = useState<'stripe' | 'paydunya'>('paydunya');
  const [url, setUrl] = useState<string | null>(null);
  const { busy, error, run: act } = useAction();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const link = await act(() => onSubmit(amount, provider));
    if (link) setUrl(link);
  };
  return (
    <Modal title={tr('Lien de paiement en ligne', 'Online payment link')} subtitle={tr('À envoyer au client par WhatsApp, SMS ou e-mail. Le paiement est enregistré automatiquement à réception.', 'Send it to the guest by WhatsApp, SMS or email. The payment is recorded automatically once received.')} onClose={onClose}>
      {url ? (
        <div className="space-y-3">
          <Input readOnly value={url} onFocus={(e) => e.target.select()} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" icon={Copy} onClick={() => navigator.clipboard.writeText(url)}>{tr('Copier', 'Copy')}</Button>
            <Button onClick={onClose}>{tr('Terminé', 'Done')}</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Field label={tr('Montant (FCFA)', 'Amount (FCFA)')}>
            <Input type="number" min={1} max={balance} value={amount} onChange={(e) => setAmount(Math.trunc(Number(e.target.value)))} />
          </Field>
          <Field label={tr('Moyen', 'Method')}>
            <Select value={provider} onChange={(e) => setProvider(e.target.value as 'stripe' | 'paydunya')}>
              <option value="paydunya">Wave / Orange Money / Free Money (PayDunya)</option>
              <option value="stripe">{tr('Carte bancaire internationale (Stripe)', 'International bank card (Stripe)')}</option>
            </Select>
          </Field>
          <ErrorNote message={error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>{tr('Fermer', 'Close')}</Button>
            <Button type="submit" busy={busy}>{tr('Créer le lien', 'Create link')}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// Fiche de police : informations exigées à l'enregistrement d'un voyageur.
export function GuestModal({ guest, onClose, onSaved }: { guest: GuestFull; onClose: () => void; onSaved: () => void }) {
  const { tr } = useI18n();
  const [g, setG] = useState(guest);
  const { busy, error, run: act } = useAction();
  const set = <K extends keyof GuestFull>(k: K, v: GuestFull[K]) => setG((prev) => ({ ...prev, [k]: v }));
  const text = (k: keyof GuestFull) => ({
    value: (g[k] as string | null) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, (e.target.value || null) as never),
  });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const editable: (keyof GuestFull)[] = [
      'full_name', 'email', 'phone', 'nationality', 'id_document_type', 'id_document_number', 'id_document_expiry',
      'birth_date', 'birth_place', 'address', 'profession', 'country_of_residence', 'coming_from', 'going_to',
      'vip', 'marketing_consent', 'notes',
    ];
    const fields = Object.fromEntries(editable.map((k) => [k, g[k]]));
    const ok = await act(() => run(supabase.from('guests').update(fields).eq('id', g.id).select('id').single()));
    if (ok) onSaved();
  };
  return (
    <Modal wide title={tr('Fiche client et fiche de police', 'Guest record and police registration form')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label={tr('Nom complet', 'Full name')}><Input required minLength={2} {...text('full_name')} /></Field>
          <Field label={tr('Téléphone', 'Phone')}><Input {...text('phone')} /></Field>
          <Field label={tr('E-mail', 'Email')}><Input type="email" {...text('email')} /></Field>
          <Field label={tr('Date de naissance', 'Date of birth')}><Input type="date" {...text('birth_date')} /></Field>
          <Field label={tr('Lieu de naissance', 'Place of birth')}><Input {...text('birth_place')} /></Field>
          <Field label={tr('Nationalité', 'Nationality')}><Input {...text('nationality')} /></Field>
          <Field label={tr('Profession', 'Occupation')}><Input {...text('profession')} /></Field>
          <Field label={tr('Pays de résidence', 'Country of residence')}><Input {...text('country_of_residence')} /></Field>
          <Field label={tr('Adresse', 'Address')}><Input {...text('address')} /></Field>
          <Field label={tr('Type de pièce', 'ID document type')}>
            <Select value={g.id_document_type ?? ''} onChange={(e) => set('id_document_type', e.target.value || null)}>
              <option value="">—</option>
              <option value="CNI">{tr('Carte d’identité', 'Identity card')}</option>
              <option value="Passeport">{tr('Passeport', 'Passport')}</option>
              <option value="Carte CEDEAO">{tr('Carte CEDEAO', 'ECOWAS card')}</option>
              <option value="Permis">{tr('Permis de conduire', 'Driving licence')}</option>
            </Select>
          </Field>
          <Field label={tr('Numéro de pièce', 'ID document number')}><Input {...text('id_document_number')} /></Field>
          <Field label={tr('Expiration de la pièce', 'ID document expiry')}><Input type="date" {...text('id_document_expiry')} /></Field>
          <Field label={tr('Venant de', 'Coming from')}><Input {...text('coming_from')} /></Field>
          <Field label={tr('Se rendant à', 'Going to')}><Input {...text('going_to')} /></Field>
        </div>
        <Field label={tr('Notes internes', 'Internal notes')}>
          <Textarea rows={2} value={g.notes ?? ''} onChange={(e) => set('notes', e.target.value || null)} />
        </Field>
        <div className="flex flex-wrap gap-4">
          <Checkbox label={tr('Client VIP', 'VIP guest')} checked={g.vip} onChange={(e) => set('vip', e.target.checked)} />
          <Checkbox label={tr('Accepte les communications commerciales', 'Accepts marketing communications')} checked={g.marketing_consent} onChange={(e) => set('marketing_consent', e.target.checked)} />
        </div>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{tr('Fermer', 'Close')}</Button>
          <Button type="submit" busy={busy}>{tr('Enregistrer', 'Save')}</Button>
        </div>
      </form>
    </Modal>
  );
}

export type { GuestFull };
