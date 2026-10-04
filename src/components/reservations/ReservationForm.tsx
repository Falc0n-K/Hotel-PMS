import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Room } from '../../types';
import {
  SOURCE_LABELS, type BookingSource, type PmsActions, type RatePlanRow, type ReservationRow,
} from '../../lib/pmsData';
import { addDays, formatMoney, nightsBetween } from '../../lib/dates';
import { supabase } from '../../lib/supabase';
import { Button, Checkbox, ErrorNote, Field, Input, Modal, Select, Textarea, useAction } from '../ui';
import { useI18n } from '../../lib/i18n';

interface Props {
  rooms: Room[];
  ratePlans: RatePlanRow[];
  today: string;
  breakfastPrice: number;
  propertyId: string;
  actions: PmsActions;
  existing?: ReservationRow;              // modification
  initial?: { roomId?: string; checkIn?: string };
  onClose: () => void;
  onSaved: (id?: string) => void;
}

interface GuestHit {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

// Création et modification d'un séjour. Le prix affiché est demandé au
// serveur (price_stay) : c'est lui qui fait foi, saisons et fermetures comprises.
export default function ReservationForm({
  rooms, ratePlans, today, breakfastPrice, propertyId, actions, existing, initial, onClose, onSaved,
}: Props) {
  const { tr } = useI18n();
  const inHouse = existing?.status === 'checked_in';
  const [roomId, setRoomId] = useState(existing?.room_id ?? initial?.roomId ?? rooms.find((r) => r.status === 'available')?.id ?? rooms[0]?.id ?? '');
  const [checkIn, setCheckIn] = useState(existing?.check_in ?? initial?.checkIn ?? today);
  const [checkOut, setCheckOut] = useState(existing?.check_out ?? addDays(initial?.checkIn ?? today, 1));
  const [adults, setAdults] = useState(existing?.adults ?? 2);
  const [children, setChildren] = useState(existing?.children ?? 0);
  const [breakfast, setBreakfast] = useState(existing?.breakfast ?? false);
  const [ratePlanId, setRatePlanId] = useState(existing?.rate_plan_id ?? ratePlans.find((p) => p.is_default)?.id ?? '');
  const [source, setSource] = useState<BookingSource>(existing?.source ?? 'direct');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [status, setStatus] = useState<'confirmed' | 'option'>('confirmed');

  const [guestQuery, setGuestQuery] = useState('');
  const [guestHits, setGuestHits] = useState<GuestHit[]>([]);
  const [guest, setGuest] = useState<GuestHit | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  const [quote, setQuote] = useState<number | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const { busy, error, setError, run } = useAction();

  const room = rooms.find((r) => r.id === roomId);
  const plan = ratePlans.find((p) => p.id === ratePlanId);
  const nights = nightsBetween(checkIn, checkOut);

  // Recherche d'un client existant (évite les doublons de fiches).
  useEffect(() => {
    if (existing || guestQuery.trim().length < 2) {
      setGuestHits([]);
      return;
    }
    const q = guestQuery.trim().replace(/[%,()]/g, ' ');
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('guests')
        .select('id, full_name, email, phone')
        .eq('property_id', propertyId)
        .is('anonymized_at', null)
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(6);
      setGuestHits(data ?? []);
    }, 250);
    return () => clearTimeout(timer);
  }, [guestQuery, propertyId, existing]);

  useEffect(() => {
    if (!room?.roomTypeId || nights <= 0) {
      setQuote(null);
      return;
    }
    let live = true;
    setQuoteError(null);
    actions
      .quote(room.roomTypeId, ratePlanId || null, checkIn, checkOut)
      .then((v) => live && setQuote(v))
      .catch((e: Error) => {
        if (live) {
          setQuote(null);
          setQuoteError(e.message);
        }
      });
    return () => {
      live = false;
    };
  }, [room?.roomTypeId, ratePlanId, checkIn, checkOut, nights, actions]);

  const breakfastCost = breakfast && !plan?.breakfast_included ? breakfastPrice * (adults + children) * Math.max(nights, 0) : 0;
  const total = quote !== null ? quote + breakfastCost : null;
  const overCapacity = room?.capacity !== undefined && adults + children > room.capacity;

  const roomOptions = useMemo(
    () => [...rooms].sort((a, b) => a.number.localeCompare(b.number, 'fr', { numeric: true })),
    [rooms],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (nights <= 0) return setError(tr('La date de départ doit être postérieure à l’arrivée.', 'The departure date must be after the arrival date.'));
    if (!existing && !guest && guestName.trim().length < 2) return setError(tr('Indiquez le client.', 'Enter the guest.'));
    const stay = { roomId, checkIn, checkOut, adults, children, breakfast, notes, ratePlanId: ratePlanId || null, source };
    const id = await run(async () => {
      if (existing) {
        await actions.updateReservation(existing.id, stay);
        return existing.id;
      }
      return actions.createReservation({
        ...stay,
        status,
        guestId: guest?.id,
        guestName,
        guestEmail,
        guestPhone,
      });
    });
    if (id) onSaved(id);
  };

  return (
    <Modal
      title={existing ? tr(`Modifier la réservation ${existing.code}`, `Edit reservation ${existing.code}`) : tr('Nouvelle réservation', 'New reservation')}
      subtitle={inHouse ? tr('Client en séjour : l’arrivée est figée, le changement de chambre envoie l’ancienne au ménage.', 'Guest in house: the arrival date is locked, and a room change sends the old room to housekeeping.') : undefined}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {!existing && (
          <div className="space-y-2">
            {guest ? (
              <div className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl p-3">
                <div>
                  <p className="text-xs font-bold text-slate-800">{guest.full_name}</p>
                  <p className="text-[10px] text-slate-500">{[guest.email, guest.phone].filter(Boolean).join(' · ')}</p>
                </div>
                <Button type="button" variant="ghost" onClick={() => setGuest(null)}>{tr('Changer', 'Change')}</Button>
              </div>
            ) : (
              <>
                <Field label={tr('Client existant', 'Existing guest')}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input className="pl-8" placeholder={tr('Rechercher par nom, e-mail ou téléphone', 'Search by name, email or phone')} value={guestQuery} onChange={(e) => setGuestQuery(e.target.value)} />
                  </div>
                </Field>
                {guestHits.length > 0 && (
                  <ul className="border border-slate-100 rounded-xl divide-y divide-slate-100">
                    {guestHits.map((g) => (
                      <li key={g.id}>
                        <button type="button" onClick={() => setGuest(g)} className="w-full text-left p-2.5 hover:bg-slate-50 cursor-pointer">
                          <span className="text-xs font-bold text-slate-800">{g.full_name}</span>
                          <span className="text-[10px] text-slate-400 ml-2">{[g.email, g.phone].filter(Boolean).join(' · ')}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[10px] text-slate-400">{tr('Ou nouveau client :', 'Or new guest:')}</p>
                <Field label={tr('Nom complet', 'Full name')}>
                  <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder={tr('Ex. Fatou Diome', 'E.g. Fatou Diome')} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={tr('E-mail', 'Email')}>
                    <Input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
                  </Field>
                  <Field label={tr('Téléphone', 'Phone')}>
                    <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+221 77…" />
                  </Field>
                </div>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Field label={tr('Chambre', 'Room')} className="col-span-3 sm:col-span-1">
            <Select value={roomId} onChange={(e) => setRoomId(e.target.value)} required>
              {roomOptions.map((r) => (
                <option key={r.id} value={r.id} disabled={r.status === 'maintenance' && r.id !== existing?.room_id}>
                  {r.number} · {r.category}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={tr('Arrivée', 'Arrival')}>
            <Input type="date" value={checkIn} min={existing ? undefined : addDays(today, -1)} disabled={inHouse} onChange={(e) => setCheckIn(e.target.value)} required />
          </Field>
          <Field label={tr('Départ', 'Departure')}>
            <Input type="date" value={checkOut} min={addDays(checkIn, 1)} onChange={(e) => setCheckOut(e.target.value)} required />
          </Field>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label={tr('Adultes', 'Adults')}>
            <Input type="number" min={1} max={20} value={adults} onChange={(e) => setAdults(Math.max(1, Number(e.target.value)))} />
          </Field>
          <Field label={tr('Enfants', 'Children')}>
            <Input type="number" min={0} max={20} value={children} onChange={(e) => setChildren(Math.max(0, Number(e.target.value)))} />
          </Field>
          <Field label={tr('Plan tarifaire', 'Rate plan')}>
            <Select value={ratePlanId} onChange={(e) => setRatePlanId(e.target.value)}>
              <option value="">{tr('Tarif de base', 'Base rate')}</option>
              {ratePlans.filter((p) => p.active || p.id === ratePlanId).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label={tr('Provenance', 'Source')}>
            <Select value={source} onChange={(e) => setSource(e.target.value as BookingSource)}>
              {(Object.keys(SOURCE_LABELS) as BookingSource[]).filter((s) => s === source || (s !== 'website' && s !== 'api')).map((s) => (
                <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Checkbox
            label={plan?.breakfast_included ? tr('Petit-déjeuner inclus dans le plan', 'Breakfast included in the plan') : tr(`Petit-déjeuner (+${breakfastPrice.toLocaleString('fr-FR')} F / pers. / nuit)`, `Breakfast (+${breakfastPrice.toLocaleString('fr-FR')} F / person / night)`)}
            checked={breakfast || !!plan?.breakfast_included}
            disabled={!!plan?.breakfast_included}
            onChange={(e) => setBreakfast(e.target.checked)}
          />
          {!existing && (
            <Checkbox label={tr('Option (non garantie)', 'Provisional booking (not guaranteed)')} checked={status === 'option'} onChange={(e) => setStatus(e.target.checked ? 'option' : 'confirmed')} />
          )}
        </div>

        <Field label={tr('Notes', 'Notes')}>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tr('Navette, lit bébé, allergie…', 'Shuttle, baby cot, allergy…')} />
        </Field>

        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center justify-between">
          <div className="text-[11px] text-slate-600">
            {nights > 0 ? tr(`${nights} nuit${nights > 1 ? 's' : ''}`, `${nights} night${nights > 1 ? 's' : ''}`) : tr('Dates invalides', 'Invalid dates')}
            {room && tr(` · chambre ${room.number}`, ` · room ${room.number}`)}
            {overCapacity && <span className="block text-red-600 font-bold">{tr(`Capacité dépassée (${room?.capacity} pers. max)`, `Capacity exceeded (${room?.capacity} guests max)`)}</span>}
            {quoteError && <span className="block text-red-600 font-bold">{quoteError}</span>}
          </div>
          <div className="text-right">
            <p className="text-[9px] text-slate-500 uppercase font-bold">{tr('Total séjour', 'Stay total')}</p>
            <p className="text-lg font-black text-orange-900 font-mono">{total !== null ? formatMoney(total) : '—'}</p>
          </div>
        </div>

        <ErrorNote message={error} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{tr('Fermer', 'Close')}</Button>
          <Button type="submit" busy={busy} disabled={overCapacity || !!quoteError}>
            {existing ? tr('Enregistrer les modifications', 'Save changes') : tr('Enregistrer la réservation', 'Save reservation')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
