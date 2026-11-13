import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, errorMessage } from './supabase';
import { addDays, todayIn } from './dates';
import { bilingual, tr } from './i18n';
import type { Property } from './auth';
import type { Room, RoomStatus } from '../types';

export type HousekeepingStatus = 'clean' | 'dirty' | 'inspected' | 'out_of_order';
export type ReservationStatus = 'option' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
export type PaymentMethod = 'cash' | 'card' | 'wave' | 'orange_money' | 'bank_transfer' | 'other';
export type BookingSource =
  | 'direct' | 'phone' | 'walk_in' | 'email' | 'booking_com' | 'expedia' | 'airbnb' | 'tour_operator' | 'corporate' | 'other'
  | 'website' | 'api';
export type ChargeCategory =
  | 'room' | 'breakfast' | 'restaurant' | 'bar' | 'minibar' | 'laundry' | 'transport' | 'spa' | 'tourist_tax' | 'other'
  | 'cancellation_fee' | 'no_show_fee';

// Catégories posées par le serveur uniquement (pénalités), jamais saisies à la main.
export const SYSTEM_CHARGE_CATEGORIES: ChargeCategory[] = ['room', 'cancellation_fee', 'no_show_fee'];

export const PAYMENT_METHOD_LABELS = bilingual<PaymentMethod>({
  cash: ['Espèces', 'Cash'],
  card: ['Carte (TPE)', 'Card (terminal)'],
  wave: ['Wave', 'Wave'],
  orange_money: ['Orange Money', 'Orange Money'],
  bank_transfer: ['Virement', 'Bank transfer'],
  other: ['Autre', 'Other'],
});

export const SOURCE_LABELS = bilingual<BookingSource>({
  direct: ['Direct', 'Direct'],
  phone: ['Téléphone', 'Phone'],
  walk_in: ['Sans réservation', 'Walk-in'],
  email: ['E-mail', 'Email'],
  booking_com: ['Booking.com', 'Booking.com'],
  expedia: ['Expedia', 'Expedia'],
  airbnb: ['Airbnb', 'Airbnb'],
  tour_operator: ['Tour-opérateur', 'Tour operator'],
  corporate: ['Entreprise', 'Corporate'],
  other: ['Autre', 'Other'],
  website: ['Site (en ligne)', 'Website (online)'],
  api: ['API partenaire', 'Partner API'],
});

export const CHARGE_LABELS = bilingual<ChargeCategory>({
  room: ['Hébergement', 'Accommodation'],
  breakfast: ['Petit-déjeuner', 'Breakfast'],
  restaurant: ['Restaurant', 'Restaurant'],
  bar: ['Bar', 'Bar'],
  minibar: ['Minibar', 'Minibar'],
  laundry: ['Blanchisserie', 'Laundry'],
  transport: ['Transport', 'Transport'],
  spa: ['Spa', 'Spa'],
  tourist_tax: ['Taxe de séjour', 'Tourist tax'],
  other: ['Autre', 'Other'],
  cancellation_fee: ['Frais d’annulation', 'Cancellation fee'],
  no_show_fee: ['Frais de no-show', 'No-show fee'],
});

export const STATUS_LABELS = bilingual<ReservationStatus>({
  option: ['Option', 'Option'],
  confirmed: ['Confirmée', 'Confirmed'],
  checked_in: ['En séjour', 'In house'],
  checked_out: ['Partie', 'Checked out'],
  cancelled: ['Annulée', 'Cancelled'],
  no_show: ['No-show', 'No-show'],
});

export interface RoomTypeRow {
  id: string;
  name: string;
  base_rate: number;
  capacity: number;
}

export interface RatePlanRow {
  id: string;
  name: string;
  code: string;
  is_default: boolean;
  min_stay: number;
  breakfast_included: boolean;
  active: boolean;
  deposit_percent: number;
  cancel_free_days: number;
  cancel_fee_nights: number;
  no_show_fee_nights: number;
}

export interface ReservationGroupRow {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_at: string;
}

interface RoomRow {
  id: string;
  number: string;
  floor: number;
  housekeeping_status: HousekeepingStatus;
  out_of_order_reason: string | null;
  room_type: RoomTypeRow | null;
}

export interface ReservationRow {
  id: string;
  code: string;
  status: ReservationStatus;
  room_id: string;
  guest_id: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  breakfast: boolean;
  nightly_rate: number;
  room_amount: number | null;
  total_amount: number;
  notes: string | null;
  source: BookingSource;
  rate_plan_id: string | null;
  group_id: string | null;
  created_at: string;
  updated_at: string;
  guest: { full_name: string; email: string | null; phone: string | null; vip: boolean } | null;
  payments: { amount: number }[];
  folio_charges: { amount: number }[];
  invoices: { id: string; display_number: string }[];
}

export interface HousekeepingTaskRow {
  id: string;
  room_id: string;
  status: 'todo' | 'in_progress' | 'done' | 'inspected';
  priority: 'low' | 'medium' | 'high';
  notes: string | null;
  created_at: string;
  assigned_to: string | null;
}

export interface PaymentRow {
  amount: number;
  created_at: string;
  method: PaymentMethod;
}

export const paidAmount = (r: ReservationRow) => r.payments.reduce((s, p) => s + p.amount, 0);
export const chargesAmount = (r: ReservationRow) => r.folio_charges.reduce((s, c) => s + c.amount, 0);
// Solde = séjour + prestations - paiements. Une réservation annulée ou non
// présentée ne doit plus l'hébergement : seules les prestations restent dues,
// dont les frais d'annulation ou de no-show (cf. reservation_balance_unchecked)
// (et un éventuel acompte apparaît en négatif, à rembourser ou conserver).
export const balanceOf = (r: ReservationRow) =>
  (['cancelled', 'no_show'].includes(r.status) ? 0 : r.total_amount) + chargesAmount(r) - paidAmount(r);

// Plan applicable à une réservation : le sien, sinon le plan par défaut (comme penalty_amount).
export const planOf = (r: ReservationRow, plans: RatePlanRow[]) =>
  plans.find((p) => p.id === r.rate_plan_id) ?? plans.find((p) => p.is_default) ?? null;

// Acompte attendu d'une option ou réservation confirmée dont le plan en exige un.
export function depositOf(r: ReservationRow, plans: RatePlanRow[]) {
  if (r.status !== 'option' && r.status !== 'confirmed') return null;
  const percent = planOf(r, plans)?.deposit_percent ?? 0;
  if (percent <= 0) return null;
  const amount = Math.round((r.total_amount * percent) / 100);
  return { percent, amount, paid: paidAmount(r) >= amount };
}

// Conditions d'annulation du plan, en une ligne.
export function cancellationTerms(plan: RatePlanRow | null): string | null {
  if (!plan || plan.cancel_free_days === undefined) return null;
  const noShow = tr(
    `no-show : ${plan.no_show_fee_nights} nuit(s) facturée(s).`,
    `no-show: ${plan.no_show_fee_nights} night(s) charged.`,
  );
  if (plan.cancel_fee_nights <= 0) return tr(`Annulation gratuite ; ${noShow}`, `Free cancellation; ${noShow}`);
  return tr(
    `Annulation gratuite jusqu’à ${plan.cancel_free_days} jour(s) avant l’arrivée, puis ${plan.cancel_fee_nights} nuit(s) facturée(s) ; ${noShow}`,
    `Free cancellation up to ${plan.cancel_free_days} day(s) before arrival, then ${plan.cancel_fee_nights} night(s) charged; ${noShow}`,
  );
}

// Rôles autorisés à exonérer les frais et à gérer les groupes (cf. SQL).
export const canWaiveFees = (role: string) => ['owner', 'general_manager', 'reservation_manager'].includes(role);
export const canManageGroups = canWaiveFees;

export const ACTIVE_STATUSES: ReservationStatus[] = ['option', 'confirmed', 'checked_in'];

// Le statut affiché d'une chambre se déduit des réservations et du statut
// ménage : une seule source de vérité, plus d'écran qui contredit l'autre.
export function deriveRooms(rooms: RoomRow[], reservations: ReservationRow[], today: string): Room[] {
  return rooms.map((room) => {
    const mine = reservations.filter((r) => r.room_id === room.id && ACTIVE_STATUSES.includes(r.status));
    const inHouse = mine.find((r) => r.status === 'checked_in');
    const arriving = mine
      .filter((r) => r.status !== 'checked_in' && r.check_in <= today && r.check_out > today)
      .sort((a, b) => a.check_in.localeCompare(b.check_in))[0];
    const current = inHouse ?? arriving;

    let status: RoomStatus;
    if (room.housekeeping_status === 'out_of_order') status = 'maintenance';
    else if (inHouse) status = 'occupied';
    else if (arriving) status = 'reserved';
    else if (room.housekeeping_status === 'dirty') status = 'not-ready';
    else status = 'available';

    return {
      id: room.id,
      number: room.number,
      floor: room.floor,
      category: room.room_type?.name ?? '—',
      roomTypeId: room.room_type?.id,
      capacity: room.room_type?.capacity,
      housekeeping: room.housekeeping_status,
      status,
      nightlyRate: room.room_type?.base_rate ?? 0,
      guestName: current?.guest?.full_name ?? (current ? 'Client' : undefined),
      phone: current?.guest?.phone ?? undefined,
      checkInDate: current?.check_in,
      checkOutDate: current?.check_out,
      occupants: current ? current.adults + current.children : undefined,
      reservationId: current?.id,
      maintenanceNote: room.out_of_order_reason ?? undefined,
    };
  });
}

export async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(errorMessage(error));
  return data as T;
}

export async function run<T>(query: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(errorMessage(error));
  return data;
}

export interface StayInput {
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  breakfast: boolean;
  notes?: string;
  ratePlanId?: string | null;
  source?: BookingSource;
}

export interface NewReservation extends StayInput {
  guestId?: string | null;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  status?: 'option' | 'confirmed';
}

export interface NewGroup {
  name: string;
  checkIn: string;
  checkOut: string;
  rooms: { roomTypeId: string; count: number; adults: number }[];
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: 'option' | 'confirmed';
  ratePlanId?: string | null;
  source?: BookingSource;
  notes?: string;
}

export const fetchGroups = (propertyId: string) =>
  run(
    supabase
      .from('reservation_groups')
      .select('id, name, contact_name, contact_email, contact_phone, notes, created_at')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false }),
  ) as Promise<ReservationGroupRow[]>;

const RESERVATION_COLUMNS =
  'id, code, status, room_id, guest_id, check_in, check_out, adults, children, breakfast, nightly_rate, room_amount, total_amount, notes, source, rate_plan_id, group_id, created_at, updated_at, ' +
  'guest:guests(full_name, email, phone, vip), payments(amount), folio_charges(amount), invoices(id, display_number)';

const SNAPSHOT_KEY = (propertyId: string) => `pms.snapshot.${propertyId}`;

export function clearSnapshots() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('pms.snapshot.'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* stockage indisponible */
  }
}

export function usePropertyData(property: Property | null, withFinance: boolean) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [roomRows, setRoomRows] = useState<RoomRow[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeRow[]>([]);
  const [ratePlans, setRatePlans] = useState<RatePlanRow[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [tasks, setTasks] = useState<HousekeepingTaskRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const today = property ? todayIn(property.timezone) : new Date().toISOString().slice(0, 10);

  const reload = useCallback(async () => {
    if (!property) return;
    setError(null);
    try {
      const since = addDays(today, -90);
      const [rooms, types, plans, res, hk, pays] = await Promise.all([
        run(
          supabase
            .from('rooms')
            .select('id, number, floor, housekeeping_status, out_of_order_reason, room_type:room_types(id, name, base_rate, capacity)')
            .eq('property_id', property.id)
            .is('deleted_at', null)
            .order('number'),
        ),
        run(
          supabase
            .from('room_types')
            .select('id, name, base_rate, capacity')
            .eq('property_id', property.id)
            .is('deleted_at', null)
            .order('base_rate'),
        ),
        run(
          supabase
            .from('rate_plans')
            .select('id, name, code, is_default, min_stay, breakfast_included, active, deposit_percent, cancel_free_days, cancel_fee_nights, no_show_fee_nights')
            .eq('property_id', property.id)
            .order('is_default', { ascending: false })
            .order('name'),
        ),
        run(
          supabase
            .from('reservations')
            .select(RESERVATION_COLUMNS)
            .eq('property_id', property.id)
            .gte('check_out', since)
            .order('check_in', { ascending: false })
            .limit(2000),
        ),
        run(
          supabase
            .from('housekeeping_tasks')
            .select('id, room_id, status, priority, notes, created_at, assigned_to')
            .eq('property_id', property.id)
            .in('status', ['todo', 'in_progress'])
            .order('created_at'),
        ),
        withFinance
          ? run(
              supabase
                .from('payments')
                .select('amount, created_at, method')
                .eq('property_id', property.id)
                .gte('created_at', `${addDays(today, -186)}T00:00:00Z`),
            )
          : Promise.resolve([] as PaymentRow[]),
      ]);
      setRoomRows(rooms as unknown as RoomRow[]);
      setRoomTypes(types as RoomTypeRow[]);
      setRatePlans(plans as RatePlanRow[]);
      setReservations(res as unknown as ReservationRow[]);
      setTasks(hk as HousekeepingTaskRow[]);
      setPayments(pays as PaymentRow[]);
      setOffline(false);
      // Copie de secours en lecture seule pour une coupure réseau
      // (effacée à la déconnexion).
      try {
        localStorage.setItem(
          SNAPSHOT_KEY(property.id),
          JSON.stringify({ at: new Date().toISOString(), rooms, types, plans, res, hk }),
        );
      } catch {
        /* quota ou navigation privée */
      }
    } catch (e) {
      const message = (e as Error).message;
      if (!navigator.onLine || message.startsWith(tr('Serveur injoignable', 'Server unreachable'))) {
        try {
          const raw = localStorage.getItem(SNAPSHOT_KEY(property.id));
          if (raw) {
            const snap = JSON.parse(raw);
            setRoomRows(snap.rooms);
            setRoomTypes(snap.types);
            setRatePlans(snap.plans ?? []);
            setReservations(snap.res);
            setTasks(snap.hk);
            setOffline(true);
            return;
          }
        } catch {
          /* copie illisible */
        }
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [property, today, withFinance]);

  useEffect(() => {
    setLoading(true);
    reload();
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    const timer = window.setInterval(reload, 60_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
      window.clearInterval(timer);
    };
  }, [reload]);

  const rooms = useMemo(() => deriveRooms(roomRows, reservations, today), [roomRows, reservations, today]);

  // Chaque action passe par le serveur puis recharge : l'écran affiche
  // toujours ce que la base a accepté, jamais une supposition locale.
  const act = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      if (!navigator.onLine) throw new Error(tr('Hors ligne : action impossible tant que la connexion n’est pas revenue.', 'Offline: action unavailable until the connection is back.'));
      const result = await fn();
      await reload();
      return result;
    },
    [reload],
  );

  const actions = useMemo(
    () => ({
      createReservation: (r: NewReservation) =>
        act(() =>
          rpc<string>('book_stay', {
            p_property: property!.id,
            p_room: r.roomId,
            p_check_in: r.checkIn,
            p_check_out: r.checkOut,
            p_guest_name: r.guestName || null,
            p_guest_email: r.guestEmail || null,
            p_guest_phone: r.guestPhone || null,
            p_adults: r.adults,
            p_children: r.children,
            p_breakfast: r.breakfast,
            p_notes: r.notes || null,
            p_status: r.status ?? 'confirmed',
            p_rate_plan: r.ratePlanId || null,
            p_source: r.source ?? 'direct',
            p_guest_id: r.guestId || null,
          }),
        ),
      // expectedUpdatedAt : verrouillage optimiste, le serveur refuse (40001) si
      // la réservation a changé depuis son affichage ; on recharge alors l'écran.
      updateReservation: (id: string, s: StayInput, expectedUpdatedAt?: string | null) =>
        act(async () => {
          const { error } = await supabase.rpc('update_reservation', {
            p_reservation: id,
            p_room: s.roomId,
            p_check_in: s.checkIn,
            p_check_out: s.checkOut,
            p_adults: s.adults,
            p_children: s.children,
            p_breakfast: s.breakfast,
            p_notes: s.notes || null,
            p_rate_plan: s.ratePlanId || null,
            p_source: s.source ?? null,
            p_expected_updated_at: expectedUpdatedAt ?? null,
          });
          if (!error) return;
          if ((error as { code?: string }).code === '40001') {
            await reload();
            throw new Error(tr(
              'Réservation modifiée entre-temps par un collègue : les valeurs à jour ont été rechargées, vérifiez-les puis enregistrez à nouveau.',
              'Reservation changed meanwhile by a colleague: the latest values have been reloaded, check them and save again.',
            ));
          }
          throw new Error(errorMessage(error));
        }),
      quote: (roomTypeId: string, ratePlanId: string | null, checkIn: string, checkOut: string) =>
        rpc<number>('price_stay', {
          p_room_type: roomTypeId,
          p_rate_plan: ratePlanId,
          p_check_in: checkIn,
          p_check_out: checkOut,
        }),
      checkIn: (id: string) => act(() => rpc('check_in_reservation', { p_reservation: id })),
      checkOut: (id: string) => act(() => rpc('check_out_reservation', { p_reservation: id })),
      // Renvoient les frais facturés (0 si option, délai gratuit ou exonération).
      cancel: (id: string, reason?: string, waiveFee = false) =>
        act(() => rpc<number>('cancel_reservation', { p_reservation: id, p_reason: reason ?? null, p_waive_fee: waiveFee })),
      markNoShow: (id: string, waiveFee = false) =>
        act(() => rpc<number>('mark_no_show', { p_reservation: id, p_waive_fee: waiveFee })),
      penalty: (id: string, kind: 'cancellation' | 'no_show') =>
        rpc<number>('penalty_amount', { p_reservation: id, p_kind: kind }),
      bookGroup: (g: NewGroup) =>
        act(() =>
          rpc<string>('book_group', {
            p_property: property!.id,
            p_name: g.name,
            p_check_in: g.checkIn,
            p_check_out: g.checkOut,
            p_rooms: g.rooms.map((x) => ({ room_type_id: x.roomTypeId, count: x.count, adults: x.adults })),
            p_contact_name: g.contactName || null,
            p_contact_email: g.contactEmail || null,
            p_contact_phone: g.contactPhone || null,
            p_status: g.status,
            p_rate_plan: g.ratePlanId || null,
            p_source: g.source ?? 'direct',
            p_notes: g.notes || null,
          }),
        ),
      confirmGroup: (groupId: string) => act(() => rpc<number>('confirm_group', { p_group: groupId })),
      cancelGroup: (groupId: string, reason?: string, waiveFee = false) =>
        act(() => rpc<number>('cancel_group', { p_group: groupId, p_reason: reason || null, p_waive_fee: waiveFee })),
      recordPayment: (id: string, amount: number, method: PaymentMethod, reference?: string) =>
        act(() =>
          rpc('record_payment', { p_reservation: id, p_amount: amount, p_method: method, p_reference: reference || null }),
        ),
      addCharge: (id: string, category: ChargeCategory, description: string, quantity: number, unitPrice: number) =>
        act(() =>
          rpc('add_folio_charge', {
            p_reservation: id,
            p_category: category,
            p_description: description,
            p_quantity: quantity,
            p_unit_price: unitPrice,
          }),
        ),
      issueInvoice: (id: string) => act(() => rpc<string>('issue_invoice', { p_reservation: id })),
      issueCreditNote: (invoiceId: string, reason: string) =>
        act(() => rpc<string>('issue_credit_note', { p_invoice: invoiceId, p_reason: reason })),
      createPaymentLink: async (id: string, amount: number, provider: 'stripe' | 'paydunya') => {
        const { data, error } = await supabase.functions.invoke<{ url: string; error?: string }>('create-payment-link', {
          body: { reservation_id: id, amount, provider },
        });
        if (error) {
          // Le corps de l'erreur contient le message métier renvoyé par la fonction.
          const ctx = (error as { context?: Response }).context;
          const detail = ctx ? await ctx.json().catch(() => null) : null;
          throw new Error(detail?.error ?? errorMessage(error));
        }
        await reload();
        return data!.url;
      },
      setHousekeeping: (roomId: string, status: HousekeepingStatus, reason?: string) =>
        act(() => rpc('set_room_housekeeping_status', { p_room: roomId, p_status: status, p_reason: reason ?? null })),
      setTaskStatus: (taskId: string, status: HousekeepingTaskRow['status']) =>
        act(() => rpc('set_housekeeping_task_status', { p_task: taskId, p_status: status })),
      completeTask: (task: HousekeepingTaskRow) =>
        act(() => rpc('set_housekeeping_task_status', { p_task: task.id, p_status: 'done' })),
      addRoom: (number: string, floor: number, categoryName: string, rate: number) =>
        act(async () => {
          let type = roomTypes.find((t) => t.name.toLowerCase() === categoryName.trim().toLowerCase());
          if (!type) {
            type = await run(
              supabase
                .from('room_types')
                .insert({ property_id: property!.id, name: categoryName.trim(), base_rate: rate })
                .select('id, name, base_rate, capacity')
                .single(),
            );
          }
          await run(
            supabase
              .from('rooms')
              .insert({ property_id: property!.id, room_type_id: type!.id, number: number.trim(), floor })
              .select('id'),
          );
        }),
      // Le tarif de base est porté par le type de chambre ; les prix par
      // période se gèrent dans Paramètres → Tarifs.
      updateRoomTypeRate: (roomTypeId: string, rate: number) =>
        act(() =>
          run(supabase.from('room_types').update({ base_rate: rate }).eq('id', roomTypeId).select('id')),
        ),
      deleteRoom: (roomId: string) =>
        act(() =>
          run(supabase.from('rooms').update({ deleted_at: new Date().toISOString() }).eq('id', roomId).select('id')),
        ),
    }),
    [act, property, roomTypes, reload],
  );

  return {
    loading, error, offline, today, rooms, roomTypes, ratePlans, reservations, tasks, payments, reload, actions,
  };
}

export type PropertyData = ReturnType<typeof usePropertyData>;
export type PmsActions = PropertyData['actions'];
