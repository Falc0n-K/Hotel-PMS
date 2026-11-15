import React, { useMemo, useState } from 'react';
import { CheckCheck, Ban } from 'lucide-react';
import type { Room } from '../../types';
import {
  SOURCE_LABELS, STATUS_LABELS, balanceOf, canWaiveFees,
  type BookingSource, type PmsActions, type RatePlanRow, type ReservationGroupRow, type ReservationRow,
} from '../../lib/pmsData';
import { addDays, formatDate, formatMoney, nightsBetween } from '../../lib/dates';
import { useQuery } from '../../lib/query';
import { Badge, Button, Checkbox, ErrorNote, Field, Input, Modal, Select, Table, Textarea, useAction } from '../ui';
import { STATUS_TONES } from './ReservationDrawer';
import { useI18n } from '../../lib/i18n';
import type { AppRole } from '../../lib/roles';

interface TypeLine {
  id: string;
  name: string;
  capacity: number;
  rooms: number;
}

// Création d'un groupe : plusieurs chambres par type, réservées en une fois
// (tout ou rien) par book_group. La liste nominative se complète ensuite
// chambre par chambre, depuis la fiche client de chaque réservation.
export default function GroupModal({ rooms, ratePlans, today, actions, onClose, onSaved }: {
  rooms: Room[];
  ratePlans: RatePlanRow[];
  today: string;
  actions: PmsActions;
  onClose: () => void;
  onSaved: (groupId: string) => void;
}) {
  const { tr } = useI18n();
  const types = useMemo(() => {
    const map = new Map<string, TypeLine>();
    for (const r of rooms) {
      if (!r.roomTypeId) continue;
      const t = map.get(r.roomTypeId) ?? { id: r.roomTypeId, name: r.category, capacity: r.capacity ?? 2, rooms: 0 };
      t.rooms += 1;
      map.set(r.roomTypeId, t);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [rooms]);

  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(addDays(today, 1));
  const [ratePlanId, setRatePlanId] = useState(ratePlans.find((p) => p.is_default)?.id ?? '');
  const [status, setStatus] = useState<'option' | 'confirmed'>('option');
  const [source, setSource] = useState<BookingSource>('direct');
  const [notes, setNotes] = useState('');
  const [counts, setCounts] = useState<Record<string, { count: number; adults: number }>>({});
  const { busy, error, setError, run } = useAction();

  const line = (t: TypeLine) => counts[t.id] ?? { count: 0, adults: Math.min(2, t.capacity) };
  const setLine = (t: TypeLine, patch: Partial<{ count: number; adults: number }>) =>
    setCounts((prev) => ({ ...prev, [t.id]: { ...line(t), ...patch } }));
  const selected = types.map((t) => ({ t, ...line(t) })).filter((x) => x.count > 0);
  const totalRooms = selected.reduce((s, x) => s + x.count, 0);
  const nights = nightsBetween(checkIn, checkOut);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (nights <= 0) return setError(tr('La date de départ doit être postérieure à l’arrivée.', 'The departure date must be after the arrival date.'));
    if (totalRooms === 0) return setError(tr('Indiquez au moins une chambre.', 'Enter at least one room.'));
    const id = await run(() =>
      actions.bookGroup({
        name: name.trim(),
        checkIn,
        checkOut,
        rooms: selected.map((x) => ({ roomTypeId: x.t.id, count: x.count, adults: x.adults })),
        contactName,
        contactEmail,
        contactPhone,
        status,
        ratePlanId: ratePlanId || null,
        source,
        notes,
      }),
    );
    if (id) onSaved(id);
  };

  return (
    <Modal
      wide
      title={tr('Nouveau groupe', 'New group')}
      subtitle={tr('Séminaire, circuit, mariage : toutes les chambres sont réservées en une fois, ou aucune.', 'Seminar, tour, wedding: all rooms are booked at once, or none.')}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={tr('Nom du groupe', 'Group name')}>
            <Input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('Ex. Séminaire Sonatel', 'E.g. Sonatel seminar')} />
          </Field>
          <Field label={tr('Contact', 'Contact')}>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </Field>
          <Field label={tr('E-mail du contact', 'Contact email')}>
            <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </Field>
          <Field label={tr('Téléphone du contact', 'Contact phone')}>
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+221 77…" />
          </Field>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Field label={tr('Arrivée', 'Arrival')}>
            <Input type="date" value={checkIn} min={addDays(today, -1)} onChange={(e) => setCheckIn(e.target.value)} required />
          </Field>
          <Field label={tr('Départ', 'Departure')}>
            <Input type="date" value={checkOut} min={addDays(checkIn, 1)} onChange={(e) => setCheckOut(e.target.value)} required />
          </Field>
          <Field label={tr('Plan tarifaire', 'Rate plan')}>
            <Select value={ratePlanId} onChange={(e) => setRatePlanId(e.target.value)}>
              <option value="">{tr('Tarif de base', 'Base rate')}</option>
              {ratePlans.filter((p) => p.active).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label={tr('Statut', 'Status')}>
            <Select value={status} onChange={(e) => setStatus(e.target.value as 'option' | 'confirmed')}>
              <option value="option">{STATUS_LABELS.option}</option>
              <option value="confirmed">{STATUS_LABELS.confirmed}</option>
            </Select>
          </Field>
          <Field label={tr('Provenance', 'Source')}>
            <Select value={source} onChange={(e) => setSource(e.target.value as BookingSource)}>
              {(Object.keys(SOURCE_LABELS) as BookingSource[]).filter((s) => s !== 'website' && s !== 'api').map((s) => (
                <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Table head={[tr('Type de chambre', 'Room type'), tr('Chambres', 'Rooms'), tr('Adultes / chambre', 'Adults / room')]}>
          {types.map((t) => (
            <tr key={t.id}>
              <td className="p-3 font-bold text-slate-800">
                {t.name}
                <span className="block text-[10px] text-slate-400">{tr(`${t.rooms} chambre(s) au total`, `${t.rooms} room(s) in total`)}</span>
              </td>
              <td className="p-3 w-32">
                <Input type="number" min={0} max={Math.min(200, t.rooms)} value={line(t).count} onChange={(e) => setLine(t, { count: Math.max(0, Math.trunc(Number(e.target.value))) })} aria-label={tr(`Chambres ${t.name}`, `${t.name} rooms`)} />
              </td>
              <td className="p-3 w-32">
                <Input type="number" min={1} max={t.capacity} value={line(t).adults} onChange={(e) => setLine(t, { adults: Math.max(1, Math.trunc(Number(e.target.value))) })} aria-label={tr(`Adultes ${t.name}`, `${t.name} adults`)} />
              </td>
            </tr>
          ))}
        </Table>

        <Field label={tr('Notes', 'Notes')}>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <p className="text-xs text-slate-600">
          {tr(`${totalRooms} chambre(s) · ${Math.max(nights, 0)} nuit(s). Les prix sont calculés par le serveur.`, `${totalRooms} room(s) · ${Math.max(nights, 0)} night(s). Prices are computed by the server.`)}
        </p>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{tr('Fermer', 'Close')}</Button>
          <Button type="submit" busy={busy} disabled={totalRooms === 0}>{tr('Réserver le groupe', 'Book the group')}</Button>
        </div>
      </form>
    </Modal>
  );
}

// Fiche d'un groupe : liste des chambres (rooming list) et actions groupées.
export function GroupPanel({ group, reservations, roomNumber, role, actions, onOpenReservation, onClose }: {
  group: ReservationGroupRow;
  reservations: ReservationRow[];
  roomNumber: Map<string, string>;
  role: AppRole;
  actions: PmsActions;
  onOpenReservation: (id: string) => void;
  onClose: () => void;
}) {
  const { tr } = useI18n();
  const manager = canWaiveFees(role);
  const { busy, error, run } = useAction();
  const [notice, setNotice] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [waive, setWaive] = useState(false);

  const members = useMemo(
    () => [...reservations].sort((a, b) => (roomNumber.get(a.room_id) ?? '').localeCompare(roomNumber.get(b.room_id) ?? '', 'fr', { numeric: true })),
    [reservations, roomNumber],
  );
  const options = members.filter((r) => r.status === 'option');
  const cancellable = members.filter((r) => r.status === 'option' || r.status === 'confirmed');
  const confirmedIds = cancellable.filter((r) => r.status === 'confirmed').map((r) => r.id);

  // Estimation des frais (seules les chambres confirmées sont facturées).
  const fees = useQuery<number>(
    async () => {
      if (!cancelling || confirmedIds.length === 0) return 0;
      const amounts = await Promise.all(confirmedIds.map((id) => actions.penalty(id, 'cancellation')));
      return amounts.reduce((s, x) => s + (x ?? 0), 0);
    },
    [cancelling, confirmedIds.join(',')],
  );

  const confirmAll = async () => {
    const n = await run(() => actions.confirmGroup(group.id));
    if (n !== undefined) setNotice(tr(`${n} chambre(s) confirmée(s).`, `${n} room(s) confirmed.`));
  };
  const cancelAll = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = await run(() => actions.cancelGroup(group.id, reason, waive));
    if (total !== undefined) {
      setCancelling(false);
      setNotice(
        (total ?? 0) > 0
          ? tr(`Groupe annulé. Frais facturés : ${formatMoney(total ?? 0)}.`, `Group cancelled. Fees charged: ${formatMoney(total ?? 0)}.`)
          : tr('Groupe annulé, aucuns frais facturés.', 'Group cancelled, no fee charged.'),
      );
    }
  };

  const contact = [group.contact_name, group.contact_phone, group.contact_email].filter(Boolean).join(' · ');

  return (
    <Modal wide title={tr(`Groupe ${group.name}`, `Group ${group.name}`)} subtitle={contact || undefined} onClose={onClose}>
      {manager && (
        <div className="flex flex-wrap gap-2 mb-4">
          {options.length > 0 && (
            <Button variant="success" icon={CheckCheck} busy={busy} onClick={confirmAll}>{tr('Confirmer tout', 'Confirm all')}</Button>
          )}
          {cancellable.length > 0 && !cancelling && (
            <Button variant="danger" icon={Ban} onClick={() => setCancelling(true)}>{tr('Annuler tout', 'Cancel all')}</Button>
          )}
        </div>
      )}

      {cancelling && (
        <form onSubmit={cancelAll} className="mb-4 space-y-3 bg-red-50 border border-red-100 rounded-xl p-3">
          <p className="text-xs text-slate-700">
            {tr(`${cancellable.length} chambre(s) à annuler. Frais estimés : `, `${cancellable.length} room(s) to cancel. Estimated fees: `)}
            <strong className="font-mono">{fees.loading ? '…' : formatMoney(waive ? 0 : fees.data ?? 0)}</strong>
          </p>
          <ErrorNote message={fees.error} />
          <Field label={tr('Motif de l’annulation', 'Cancellation reason')}>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Checkbox label={tr('Exonérer les frais', 'Waive the fees')} checked={waive} onChange={(e) => setWaive(e.target.checked)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCancelling(false)}>{tr('Fermer', 'Close')}</Button>
            <Button type="submit" variant="danger" busy={busy}>{tr('Confirmer l’annulation du groupe', 'Confirm group cancellation')}</Button>
          </div>
        </form>
      )}

      {notice && <p className="mb-4 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg p-2">{notice}</p>}
      <ErrorNote message={error} />

      <p className="text-[11px] text-slate-500 mb-2">
        {tr('Liste nominative : ouvrez une chambre puis sa fiche client pour saisir le nom de l’occupant.', 'Rooming list: open a room, then its guest record, to enter the occupant’s name.')}
      </p>
      <Table head={[tr('Chambre', 'Room'), tr('Référence', 'Reference'), tr('Occupant', 'Occupant'), tr('Séjour', 'Stay'), tr('Statut', 'Status'), tr('Solde', 'Balance')]}>
        {members.map((r) => {
          const balance = balanceOf(r);
          return (
            <tr key={r.id} onClick={() => onOpenReservation(r.id)} className="hover:bg-slate-50 cursor-pointer">
              <td className="p-3 font-mono font-bold">{roomNumber.get(r.room_id) ?? '?'}</td>
              <td className="p-3 font-mono">{r.code}</td>
              <td className="p-3">{r.guest?.full_name ?? '—'}</td>
              <td className="p-3 whitespace-nowrap">{formatDate(r.check_in)} → {formatDate(r.check_out)}</td>
              <td className="p-3"><Badge tone={STATUS_TONES[r.status]}>{STATUS_LABELS[r.status]}</Badge></td>
              <td className={`p-3 font-mono text-right font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatMoney(balance)}</td>
            </tr>
          );
        })}
      </Table>
      {members.length === 0 && <p className="text-xs text-slate-400 mt-2">{tr('Aucune chambre chargée pour ce groupe.', 'No room loaded for this group.')}</p>}
    </Modal>
  );
}
