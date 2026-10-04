import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, errorMessage } from './supabase';
import { addDays, todayIn } from './dates';
import type { Property } from './auth';
import type { Room, RoomStatus } from '../types';

export type HousekeepingStatus = 'clean' | 'dirty' | 'inspected' | 'out_of_order';
export type ReservationStatus = 'option' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
export type PaymentMethod = 'cash' | 'card' | 'wave' | 'orange_money' | 'bank_transfer' | 'other';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  card: 'Carte (TPE)',
  wave: 'Wave',
  orange_money: 'Orange Money',
  bank_transfer: 'Virement',
  other: 'Autre',
};

export interface RoomTypeRow {
  id: string;
  name: string;
  base_rate: number;
  capacity: number;
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
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  breakfast: boolean;
  nightly_rate: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  guest: { full_name: string; email: string | null; phone: string | null } | null;
  payments: { amount: number }[];
  invoices: { display_number: string }[];
}

export interface HousekeepingTaskRow {
  id: string;
  room_id: string;
  status: 'todo' | 'in_progress' | 'done' | 'inspected';
  priority: 'low' | 'medium' | 'high';
  notes: string | null;
  created_at: string;
}

export interface PaymentRow {
  amount: number;
  created_at: string;
  method: PaymentMethod;
}

export const paidAmount = (r: ReservationRow) => r.payments.reduce((s, p) => s + p.amount, 0);

const ACTIVE: ReservationStatus[] = ['option', 'confirmed', 'checked_in'];

// Le statut affiché d'une chambre se déduit des réservations et du statut
// ménage : une seule source de vérité, plus d'écran qui contredit l'autre.
export function deriveRooms(rooms: RoomRow[], reservations: ReservationRow[], today: string): Room[] {
  return rooms.map((room) => {
    const mine = reservations.filter((r) => r.room_id === room.id && ACTIVE.includes(r.status));
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

async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(errorMessage(error));
  return data as T;
}

async function run<T>(query: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(errorMessage(error));
  return data;
}

export interface NewReservation {
  roomId: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  adults: number;
  children: number;
  breakfast: boolean;
  notes?: string;
}

export function usePropertyData(property: Property | null, withFinance: boolean) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomRows, setRoomRows] = useState<RoomRow[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeRow[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [tasks, setTasks] = useState<HousekeepingTaskRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const today = property ? todayIn(property.timezone) : new Date().toISOString().slice(0, 10);

  const reload = useCallback(async () => {
    if (!property) return;
    setError(null);
    try {
      const since = addDays(today, -90);
      const [rooms, types, res, hk, pays] = await Promise.all([
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
            .from('reservations')
            .select(
              'id, code, status, room_id, check_in, check_out, adults, children, breakfast, nightly_rate, total_amount, notes, created_at, guest:guests(full_name, email, phone), payments(amount), invoices(display_number)',
            )
            .eq('property_id', property.id)
            .gte('check_out', since)
            .order('check_in', { ascending: false })
            .limit(1000),
        ),
        run(
          supabase
            .from('housekeeping_tasks')
            .select('id, room_id, status, priority, notes, created_at')
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
      setReservations(res as unknown as ReservationRow[]);
      setTasks(hk as HousekeepingTaskRow[]);
      setPayments(pays as PaymentRow[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [property, today, withFinance]);

  useEffect(() => {
    setLoading(true);
    reload();
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(reload, 60_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }, [reload]);

  const rooms = useMemo(() => deriveRooms(roomRows, reservations, today), [roomRows, reservations, today]);

  // Chaque action passe par le serveur puis recharge : l'écran affiche
  // toujours ce que la base a accepté, jamais une supposition locale.
  const act = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
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
          rpc<string>('create_reservation', {
            p_property: property!.id,
            p_room: r.roomId,
            p_check_in: r.checkIn,
            p_check_out: r.checkOut,
            p_guest_name: r.guestName,
            p_guest_email: r.guestEmail || null,
            p_guest_phone: r.guestPhone || null,
            p_adults: r.adults,
            p_children: r.children,
            p_breakfast: r.breakfast,
            p_notes: r.notes || null,
          }),
        ),
      checkIn: (id: string) => act(() => rpc('check_in_reservation', { p_reservation: id })),
      checkOut: (id: string) => act(() => rpc('check_out_reservation', { p_reservation: id })),
      cancel: (id: string, reason?: string) =>
        act(() => rpc('cancel_reservation', { p_reservation: id, p_reason: reason ?? null })),
      markNoShow: (id: string) => act(() => rpc('mark_no_show', { p_reservation: id })),
      recordPayment: (id: string, amount: number, method: PaymentMethod, reference?: string) =>
        act(() =>
          rpc('record_payment', { p_reservation: id, p_amount: amount, p_method: method, p_reference: reference || null }),
        ),
      issueInvoice: (id: string) => act(() => rpc<string>('issue_invoice', { p_reservation: id })),
      setHousekeeping: (roomId: string, status: HousekeepingStatus, reason?: string) =>
        act(() => rpc('set_room_housekeeping_status', { p_room: roomId, p_status: status, p_reason: reason ?? null })),
      completeTask: (task: HousekeepingTaskRow) =>
        act(async () => {
          await run(
            supabase
              .from('housekeeping_tasks')
              .update({ status: 'done', completed_at: new Date().toISOString() })
              .eq('id', task.id)
              .select('id'),
          );
          await rpc('set_room_housekeeping_status', { p_room: task.room_id, p_status: 'clean' });
        }),
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
      // Le tarif est porté par le type de chambre : le modifier s'applique à
      // toutes les chambres de ce type (plans tarifaires : phase 2).
      updateRoomTypeRate: (roomTypeId: string, rate: number) =>
        act(() =>
          run(supabase.from('room_types').update({ base_rate: rate }).eq('id', roomTypeId).select('id')),
        ),
      deleteRoom: (roomId: string) =>
        act(() =>
          run(supabase.from('rooms').update({ deleted_at: new Date().toISOString() }).eq('id', roomId).select('id')),
        ),
    }),
    [act, property, roomTypes],
  );

  return { loading, error, today, rooms, roomTypes, reservations, tasks, payments, reload, actions };
}

export type PropertyData = ReturnType<typeof usePropertyData>;
