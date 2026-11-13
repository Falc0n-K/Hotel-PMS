// API publique pour partenaires (tour-opérateurs, agences, sites tiers).
// Authentification : en-tête « Authorization: Bearer pms_… » (clé créée dans
// Paramètres → Distribution). Documentation : docs/api.md.
import { serviceClient } from '../_shared/supabase.ts';

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

const RESERVATION_FIELDS = 'code, status, check_in, check_out, adults, children, total_amount, source, created_at, room:rooms(number, room_type:room_types(id, name)), guest:guests(full_name)';

// deno-lint-ignore no-explicit-any
const present = (r: any) => ({
  code: r.code, status: r.status, check_in: r.check_in, check_out: r.check_out, adults: r.adults, children: r.children,
  total_amount: r.total_amount, currency: 'XOF', source: r.source, created_at: r.created_at,
  room: r.room?.number ?? null, room_type: r.room?.room_type ?? null, guest_name: r.guest?.full_name ?? null,
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  const key = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!key.startsWith('pms_')) return reply({ error: 'Clé d’API manquante' }, 401);

  const db = serviceClient();
  const { data: found } = await db.rpc('api_key_lookup', { p_key: key });
  const auth = (found as { key_id: string; property_id: string; scopes: string[] }[] | null)?.[0];
  if (!auth) return reply({ error: 'Clé d’API invalide ou révoquée' }, 401);
  if (!(await db.rpc('rate_limit_hit', { p_key: `api:${auth.key_id}`, p_limit: 120, p_window_seconds: 60 })).data) {
    return reply({ error: 'Limite de 120 requêtes par minute atteinte' }, 429);
  }
  const can = (scope: string) => auth.scopes.includes(scope);

  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*\/api/, '').replace(/\/+$/, '') || '/';
  const q = url.searchParams;

  if (req.method === 'GET' && path === '/v1/availability') {
    if (!can('availability:read')) return reply({ error: 'Portée availability:read requise' }, 403);
    if (!isDate(q.get('check_in')) || !isDate(q.get('check_out'))) return reply({ error: 'check_in et check_out (AAAA-MM-JJ) requis' }, 400);
    const { data, error } = await db.rpc('availability_for', {
      p_property: auth.property_id, p_check_in: q.get('check_in'), p_check_out: q.get('check_out'),
      p_adults: Number(q.get('adults') ?? 2), p_children: Number(q.get('children') ?? 0),
    });
    if (error) return reply({ error: error.message }, 400);
    return reply({ currency: 'XOF', room_types: data });
  }

  if (req.method === 'GET' && path === '/v1/reservations') {
    if (!can('reservations:read')) return reply({ error: 'Portée reservations:read requise' }, 403);
    let query = db.from('reservations').select(RESERVATION_FIELDS).eq('property_id', auth.property_id).order('check_in').limit(500);
    if (isDate(q.get('from'))) query = query.gte('check_in', q.get('from')!);
    if (isDate(q.get('to'))) query = query.lte('check_in', q.get('to')!);
    if (q.get('status')) query = query.eq('status', q.get('status')!);
    const { data, error } = await query;
    if (error) return reply({ error: error.message }, 400);
    return reply({ reservations: (data ?? []).map(present) });
  }

  const one = path.match(/^\/v1\/reservations\/([A-Z0-9-]{6,20})$/);
  if (req.method === 'GET' && one) {
    if (!can('reservations:read')) return reply({ error: 'Portée reservations:read requise' }, 403);
    const { data } = await db.from('reservations').select(RESERVATION_FIELDS).eq('property_id', auth.property_id).eq('code', one[1]).maybeSingle();
    return data ? reply(present(data)) : reply({ error: 'Réservation introuvable' }, 404);
  }

  if (req.method === 'POST' && path === '/v1/reservations') {
    if (!can('reservations:write')) return reply({ error: 'Portée reservations:write requise' }, 403);
    // deno-lint-ignore no-explicit-any
    const b: any = await req.json().catch(() => null);
    if (!b || !isDate(b.check_in) || !isDate(b.check_out) || typeof b.room_type_id !== 'string' || typeof b.guest?.name !== 'string') {
      return reply({ error: 'room_type_id, check_in, check_out et guest.name requis' }, 400);
    }
    const { data, error } = await db.rpc('book_room_type', {
      p_property: auth.property_id, p_room_type: b.room_type_id, p_check_in: b.check_in, p_check_out: b.check_out,
      p_adults: Number.isInteger(b.adults) ? b.adults : 2, p_children: Number.isInteger(b.children) ? b.children : 0,
      p_guest_name: b.guest.name.slice(0, 120), p_guest_email: b.guest.email ?? null, p_guest_phone: b.guest.phone ?? null,
      p_notes: typeof b.notes === 'string' ? `[API] ${b.notes.slice(0, 480)}` : '[API]', p_source: 'api', p_status: 'confirmed',
    });
    if (error) return reply({ error: error.message }, 409);
    const created = (data as { code: string; total: number }[])[0];
    return reply({ code: created.code, status: 'confirmed', total_amount: created.total, currency: 'XOF' }, 201);
  }

  return reply({ error: 'Route inconnue' }, 404);
});
