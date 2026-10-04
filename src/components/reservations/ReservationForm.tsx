import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Room } from '../../types';
import {
  SOURCE_LABELS, type BookingSource, type PmsActions, type RatePlanRow, type ReservationRow,
} from '../../lib/pmsData';
import { addDays, formatMoney, nightsBetween } from '../../lib/dates';
import { supabase } from '../../lib/supabase';
import { Button, Checkbox, ErrorNote, Field, Input, Modal, Select, Textarea, useAction } from '../ui';

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
    if (nights <= 0) return setError('La date de départ doit être postérieure à l’arrivée.');
    if (!existing && !guest && guestName.trim().length < 2) return setError('Indiquez le client.');
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
      title={existing ? `Modifier la réservation ${existing.code}` : 'Nouvelle réservation'}
      subtitle={inHouse ? 'Client en séjour : l’arrivée est figée, le changement de chambre envoie l’ancienne au ménage.' : undefined}
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
                <Button type="button" variant="ghost" onClick={() => setGuest(null)}>Changer</Button>
              </div>
            ) : (
              <>
                <Field label="Client existant">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input className="pl-8" placeholder="Rechercher par nom, e-mail ou téléphone" value={guestQuery} onChange={(e) => setGuestQuery(e.target.value)} />
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
                <p className="text-[10px] text-slate-400">Ou nouveau client :</p>
                <Field label="Nom complet">
                  <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Ex. Fatou Diome" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="E-mail">
                    <Input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
                  </Field>
                  <Field label="Téléphone">
                    <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+221 77…" />
                  </Field>
                </div>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Field label="Chambre" className="col-span-3 sm:col-span-1">
            <Select value={roomId} onChange={(e) => setRoomId(e.target.value)} required>
              {roomOptions.map((r) => (
                <option key={r.id} value={r.id} disabled={r.status === 'maintenance' && r.id !== existing?.room_id}>
                  {r.number} · {r.category}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Arrivée">
            <Input type="date" value={checkIn} min={existing ? undefined : addDays(today, -1)} disabled={inHouse} onChange={(e) => setCheckIn(e.target.value)} required />
          </Field>
          <Field label="Départ">
            <Input type="date" value={checkOut} min={addDays(checkIn, 1)} onChange={(e) => setCheckOut(e.target.value)} required />
          </Field>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Adultes">
            <Input type="number" min={1} max={20} value={adults} onChange={(e) => setAdults(Math.max(1, Number(e.target.value)))} />
          </Field>
          <Field label="Enfants">
            <Input type="number" min={0} max={20} value={children} onChange={(e) => setChildren(Math.max(0, Number(e.target.value)))} />
          </Field>
          <Field label="Plan tarifaire">
            <Select value={ratePlanId} onChange={(e) => setRatePlanId(e.target.value)}>
              <option value="">Tarif de base</option>
              {ratePlans.filter((p) => p.active || p.id === ratePlanId).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Provenance">
            <Select value={source} onChange={(e) => setSource(e.target.value as BookingSource)}>
              {(Object.keys(SOURCE_LABELS) as BookingSource[]).map((s) => (
                <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Checkbox
            label={plan?.breakfast_included ? 'Petit-déjeuner inclus dans le plan' : `Petit-déjeuner (+${breakfastPrice.toLocaleString('fr-FR')} F / pers. / nuit)`}
            checked={breakfast || !!plan?.breakfast_included}
            disabled={!!plan?.breakfast_included}
            onChange={(e) => setBreakfast(e.target.checked)}
          />
          {!existing && (
            <Checkbox label="Option (non garantie)" checked={status === 'option'} onChange={(e) => setStatus(e.target.checked ? 'option' : 'confirmed')} />
          )}
        </div>

        <Field label="Notes">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Navette, lit bébé, allergie…" />
        </Field>

        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center justify-between">
          <div className="text-[11px] text-slate-600">
            {nights > 0 ? `${nights} nuit${nights > 1 ? 's' : ''}` : 'Dates invalides'}
            {room && ` · chambre ${room.number}`}
            {overCapacity && <span className="block text-red-600 font-bold">Capacité dépassée ({room?.capacity} pers. max)</span>}
            {quoteError && <span className="block text-red-600 font-bold">{quoteError}</span>}
          </div>
          <div className="text-right">
            <p className="text-[9px] text-slate-500 uppercase font-bold">Total séjour</p>
            <p className="text-lg font-black text-orange-900 font-mono">{total !== null ? formatMoney(total) : '—'}</p>
          </div>
        </div>

        <ErrorNote message={error} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Fermer</Button>
          <Button type="submit" busy={busy} disabled={overCapacity || !!quoteError}>
            {existing ? 'Enregistrer les modifications' : 'Enregistrer la réservation'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
