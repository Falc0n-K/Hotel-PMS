import { test as base, expect, type BrowserContext, type Page, type Route } from '@playwright/test';

// Simulation de l'API Supabase pour les tests navigateur : authentification
// (/auth/v1), PostgREST (/rest/v1, tables et RPC) et Edge Functions
// (/functions/v1). Les données vivent dans un petit magasin en mémoire, propre
// à chaque test ; les appels RPC sont enregistrés pour les assertions.

export const SUPABASE_URL = 'https://mock.supabase.co';
// supabase-js : `sb-${premier libellé de l'hôte}-auth-token`.
export const STORAGE_KEY = 'sb-mock-auth-token';

// Date figée des tests (horloge du navigateur) : midi à Dakar (UTC+0).
export const TODAY = '2026-11-14';
export const NOW = new Date(`${TODAY}T12:00:00Z`);

export const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const USER = { id: 'user-owner-1', email: 'proprietaire@teranga.test', fullName: 'Aminata Owner' };
export const PROPERTY_ID = 'prop-1';
export const PROPERTY_NAME = 'Hôtel Teranga Test';

type Row = Record<string, unknown>;
export type Store = Record<string, Row[]>;
export interface RpcCall {
  fn: string;
  args: Record<string, unknown>;
}
type RpcHandler = (args: Record<string, unknown>, store: Store) => unknown;

// ── Données initiales ─────────────────────────────────────────────────────

function seed(role: string): Store {
  const ts = `${addDays(TODAY, -3)}T09:00:00Z`;
  const property: Row = {
    id: PROPERTY_ID,
    organization_id: 'org-1',
    name: PROPERTY_NAME,
    code: 'TER',
    city: 'Dakar',
    currency: 'XOF',
    timezone: 'Africa/Dakar',
    vat_rate_bp: 1800,
    tourist_tax_per_night: 1000,
    breakfast_price: 5000,
    legal_name: 'Teranga SARL',
    address: 'Corniche Ouest',
    phone: '+221 33 000 00 00',
    email: 'contact@teranga.test',
    ninea: null,
    rccm: null,
    check_in_time: '14:00:00',
    check_out_time: '12:00:00',
    require_mfa: false,
    notify_email: false,
    notify_sms: false,
    notify_whatsapp: false,
    guest_retention_months: 36,
    booking_enabled: true,
    booking_slug: 'demo',
    booking_hold_minutes: 30,
    booking_provider: 'paydunya',
    public_description: null,
    auto_anonymize: false,
  };
  const reservation = (r: Row): Row => ({
    adults: 2,
    children: 0,
    breakfast: false,
    room_amount: r.total_amount,
    notes: null,
    source: 'direct',
    rate_plan_id: 'rp-1',
    group_id: null,
    property_id: PROPERTY_ID,
    created_at: ts,
    updated_at: ts,
    ...r,
  });
  return {
    properties: [property],
    profiles: [{ id: USER.id, full_name: USER.fullName, email: USER.email }],
    memberships: [{ user_id: USER.id, property_id: PROPERTY_ID, role }],
    room_types: [
      { id: 'rt-std', property_id: PROPERTY_ID, name: 'Standard', base_rate: 40000, capacity: 2, deleted_at: null },
      { id: 'rt-suite', property_id: PROPERTY_ID, name: 'Suite Océan', base_rate: 90000, capacity: 3, deleted_at: null },
    ],
    rooms: [
      { id: 'room-101', property_id: PROPERTY_ID, number: '101', floor: 1, housekeeping_status: 'clean', out_of_order_reason: null, room_type_id: 'rt-std', deleted_at: null },
      { id: 'room-102', property_id: PROPERTY_ID, number: '102', floor: 1, housekeeping_status: 'clean', out_of_order_reason: null, room_type_id: 'rt-std', deleted_at: null },
      { id: 'room-201', property_id: PROPERTY_ID, number: '201', floor: 2, housekeeping_status: 'clean', out_of_order_reason: null, room_type_id: 'rt-suite', deleted_at: null },
    ],
    rate_plans: [
      {
        id: 'rp-1', property_id: PROPERTY_ID, name: 'Tarif public', code: 'BAR', is_default: true, min_stay: 1, breakfast_included: false,
        active: true, deposit_percent: 0, cancel_free_days: 2, cancel_fee_nights: 1, no_show_fee_nights: 1,
      },
    ],
    guests: [
      { id: 'g-1', property_id: PROPERTY_ID, full_name: 'Awa Ndiaye', email: 'awa@example.com', phone: '+221 77 111 11 11', vip: false, anonymized_at: null },
      { id: 'g-2', property_id: PROPERTY_ID, full_name: 'Moussa Sarr', email: 'moussa@example.com', phone: '+221 77 222 22 22', vip: false, anonymized_at: null },
      { id: 'g-3', property_id: PROPERTY_ID, full_name: 'Fatou Fall', email: null, phone: '+221 77 333 33 33', vip: true, anonymized_at: null },
    ],
    reservations: [
      // Arrivée du jour, à faire entrer.
      reservation({ id: 'res-1', code: 'R-1001', status: 'confirmed', room_id: 'room-101', guest_id: 'g-1', check_in: TODAY, check_out: addDays(TODAY, 2), nightly_rate: 40000, total_amount: 80000 }),
      // Réservation future, annulable.
      reservation({ id: 'res-2', code: 'R-1002', status: 'confirmed', room_id: 'room-102', guest_id: 'g-2', check_in: addDays(TODAY, 5), check_out: addDays(TODAY, 7), nightly_rate: 40000, total_amount: 80000 }),
      // En séjour avec un acompte versé.
      reservation({ id: 'res-3', code: 'R-1003', status: 'checked_in', room_id: 'room-201', guest_id: 'g-3', check_in: addDays(TODAY, -1), check_out: addDays(TODAY, 1), nightly_rate: 90000, total_amount: 180000 }),
    ],
    payments: [
      { id: 'pay-1', property_id: PROPERTY_ID, reservation_id: 'res-3', amount: 50000, method: 'card', reference: null, created_at: `${addDays(TODAY, -1)}T15:00:00Z` },
    ],
    folio_charges: [],
    invoices: [],
    credit_notes: [],
    payment_links: [],
    housekeeping_tasks: [],
    maintenance_orders: [],
    reservation_groups: [],
    audit_log: [],
    cash_sessions: [],
  };
}

// ── Relations embarquées (select=...,guest:guests(...)) ──────────────────
// Plutôt que d'interpréter le paramètre select, chaque table renvoie ses
// lignes avec toutes les relations que l'application lit.

function expand(table: string, row: Row, store: Store): Row {
  const by = (t: string, key: string, value: unknown) => (store[t] ?? []).filter((x) => x[key] === value);
  switch (table) {
    case 'memberships':
      return { ...row, property: store.properties.find((p) => p.id === row.property_id) ?? null };
    case 'rooms':
      return { ...row, room_type: store.room_types.find((t) => t.id === row.room_type_id) ?? null };
    case 'reservations':
      return {
        ...row,
        guest: store.guests.find((g) => g.id === row.guest_id) ?? null,
        payments: by('payments', 'reservation_id', row.id).map((p) => ({ amount: p.amount })),
        folio_charges: by('folio_charges', 'reservation_id', row.id).map((c) => ({ amount: c.amount })),
        invoices: by('invoices', 'reservation_id', row.id).map((i) => ({ id: i.id, display_number: i.display_number })),
      };
    case 'invoices':
      return { ...row, credit_notes: by('credit_notes', 'invoice_id', row.id) };
    default:
      return row;
  }
}

// ── Filtres PostgREST simples (col=op.valeur) ────────────────────────────

const RESERVED_PARAMS = new Set(['select', 'order', 'limit', 'offset', 'or', 'and', 'on_conflict', 'columns']);

function parseValue(raw: string): unknown {
  if (raw === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return raw;
}

function compare(a: unknown, b: unknown): number {
  const na = Number(a);
  const nb = Number(b);
  if (typeof a === 'number' && !Number.isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b));
}

function matches(row: Row, params: URLSearchParams): boolean {
  for (const [col, expr] of params.entries()) {
    if (RESERVED_PARAMS.has(col) || col.includes('.')) continue;
    const dot = expr.indexOf('.');
    if (dot < 0) continue;
    let op = expr.slice(0, dot);
    let raw = expr.slice(dot + 1);
    let negate = false;
    if (op === 'not') {
      negate = true;
      const d2 = raw.indexOf('.');
      op = raw.slice(0, d2);
      raw = raw.slice(d2 + 1);
    }
    const value = row[col];
    // Colonne absente de la ligne simulée : filtre ignoré (sauf is.null, vrai).
    if (value === undefined && op !== 'is') continue;
    let ok: boolean;
    switch (op) {
      case 'eq': ok = String(value) === raw; break;
      case 'neq': ok = String(value) !== raw; break;
      case 'gt': ok = compare(value, raw) > 0; break;
      case 'gte': ok = compare(value, raw) >= 0; break;
      case 'lt': ok = compare(value, raw) < 0; break;
      case 'lte': ok = compare(value, raw) <= 0; break;
      case 'is': ok = (value ?? null) === parseValue(raw); break;
      case 'in': {
        const list = raw.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, ''));
        ok = list.includes(String(value));
        break;
      }
      case 'like':
      case 'ilike': {
        const re = new RegExp(`^${raw.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/[%*]/g, '.*')}$`, op === 'ilike' ? 'i' : '');
        ok = re.test(String(value ?? ''));
        break;
      }
      default: ok = true;
    }
    if (negate) ok = !ok;
    if (!ok) return false;
  }
  return true;
}

let counter = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++counter}`;

// ── RPC par défaut ───────────────────────────────────────────────────────

function nightsBetween(a: string, b: string) {
  return Math.max(0, Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000));
}

function defaultRpcs(): Record<string, RpcHandler> {
  const findReservation = (store: Store, id: unknown) => {
    const r = store.reservations.find((x) => x.id === id);
    if (!r) throw new Error(`Réservation ${String(id)} introuvable`);
    return r;
  };
  const touch = (r: Row) => {
    r.updated_at = new Date().toISOString();
  };
  return {
    support_properties: () => [],
    log_support_view: () => null,
    log_export: () => null,
    price_stay: (a, store) => {
      const type = store.room_types.find((t) => t.id === a.p_room_type);
      return Number(type?.base_rate ?? 0) * nightsBetween(String(a.p_check_in), String(a.p_check_out));
    },
    book_stay: (a, store) => {
      let guestId = a.p_guest_id as string | null;
      if (!guestId) {
        guestId = newId('g');
        store.guests.push({
          id: guestId, property_id: a.p_property, full_name: a.p_guest_name, email: a.p_guest_email, phone: a.p_guest_phone, vip: false, anonymized_at: null,
        });
      }
      const room = store.rooms.find((r) => r.id === a.p_room);
      const type = store.room_types.find((t) => t.id === room?.room_type_id);
      const nights = nightsBetween(String(a.p_check_in), String(a.p_check_out));
      const rate = Number(type?.base_rate ?? 0);
      const id = newId('res');
      const now = new Date().toISOString();
      store.reservations.push({
        id,
        code: `R-${2000 + store.reservations.length}`,
        status: a.p_status ?? 'confirmed',
        property_id: a.p_property,
        room_id: a.p_room,
        guest_id: guestId,
        check_in: a.p_check_in,
        check_out: a.p_check_out,
        adults: a.p_adults,
        children: a.p_children,
        breakfast: a.p_breakfast,
        nightly_rate: rate,
        room_amount: rate * nights,
        total_amount: rate * nights,
        notes: a.p_notes,
        source: a.p_source ?? 'direct',
        rate_plan_id: a.p_rate_plan,
        group_id: null,
        created_at: now,
        updated_at: now,
      });
      return id;
    },
    check_in_reservation: (a, store) => {
      const r = findReservation(store, a.p_reservation);
      r.status = 'checked_in';
      touch(r);
      return null;
    },
    check_out_reservation: (a, store) => {
      const r = findReservation(store, a.p_reservation);
      r.status = 'checked_out';
      touch(r);
      return null;
    },
    record_payment: (a, store) => {
      const r = findReservation(store, a.p_reservation);
      const id = newId('pay');
      store.payments.push({
        id, property_id: r.property_id, reservation_id: r.id, amount: a.p_amount, method: a.p_method, reference: a.p_reference, created_at: new Date().toISOString(),
      });
      touch(r);
      return id;
    },
    penalty_amount: () => 20000,
    cancel_reservation: (a, store) => {
      const r = findReservation(store, a.p_reservation);
      const fee = a.p_waive_fee ? 0 : r.status === 'confirmed' ? 20000 : 0;
      r.status = 'cancelled';
      if (fee > 0) {
        store.folio_charges.push({
          id: newId('fc'), reservation_id: r.id, category: 'cancellation_fee', description: 'Frais d’annulation', quantity: 1, unit_price: fee, amount: fee, created_at: new Date().toISOString(),
        });
      }
      touch(r);
      return fee;
    },
    mark_no_show: (a, store) => {
      const r = findReservation(store, a.p_reservation);
      r.status = 'no_show';
      touch(r);
      return a.p_waive_fee ? 0 : 20000;
    },
    import_reservation: (a, store) => {
      const room = store.rooms.find((r) => r.number === a.p_room_number);
      if (!room) throw new Error(`Chambre ${String(a.p_room_number)} inconnue`);
      const guestId = newId('g');
      store.guests.push({ id: guestId, property_id: a.p_property, full_name: a.p_guest_name, email: a.p_guest_email, phone: a.p_guest_phone, vip: false, anonymized_at: null });
      const id = newId('res');
      const now = new Date().toISOString();
      store.reservations.push({
        id, code: `IMP-${store.reservations.length}`, status: a.p_status, property_id: a.p_property, room_id: room.id, guest_id: guestId,
        check_in: a.p_check_in, check_out: a.p_check_out, adults: a.p_adults, children: a.p_children, breakfast: false,
        nightly_rate: 0, room_amount: a.p_total, total_amount: a.p_total, notes: a.p_notes, source: a.p_source, rate_plan_id: null, group_id: null,
        created_at: now, updated_at: now,
      });
      return id;
    },
  };
}

// ── Jeton de session factice ─────────────────────────────────────────────

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const FAR_FUTURE = 4_102_444_800; // 2100-01-01

export function fakeSession() {
  const payload = {
    sub: USER.id,
    email: USER.email,
    role: 'authenticated',
    aud: 'authenticated',
    aal: 'aal1',
    amr: [{ method: 'password', timestamp: Math.floor(NOW.getTime() / 1000) }],
    session_id: 'session-test-1',
    iat: Math.floor(NOW.getTime() / 1000),
    exp: FAR_FUTURE,
  };
  const user = {
    id: USER.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: USER.email,
    email_confirmed_at: '2026-01-01T00:00:00Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: USER.fullName },
    identities: [],
    factors: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
  return {
    access_token: `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.c2lnbmF0dXJlLWZhY3RpY2U`,
    refresh_token: 'refresh-token-test',
    token_type: 'bearer',
    expires_in: FAR_FUTURE - Math.floor(NOW.getTime() / 1000),
    expires_at: FAR_FUTURE,
    user,
  };
}

// ── Mise en place des routes ─────────────────────────────────────────────

function corsHeaders(route: Route): Record<string, string> {
  const requested = route.request().headers()['access-control-request-headers'];
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS,HEAD',
    'access-control-allow-headers': requested || 'authorization,apikey,content-type,x-client-info,prefer,accept,accept-profile,content-profile,range,x-supabase-api-version,x-region',
    'access-control-expose-headers': 'content-range,x-supabase-api-version',
  };
}

export class MockSupabase {
  readonly store: Store;
  readonly calls: RpcCall[] = [];
  readonly functionCalls: { name: string; body: Record<string, unknown> }[] = [];
  readonly unknown: string[] = [];
  private rpcs = defaultRpcs();
  private functions: Record<string, (body: Record<string, unknown>) => { status?: number; json: unknown }> = {};

  constructor(role = 'owner') {
    this.store = seed(role);
  }

  // Remplace (ou ajoute) le traitement d'une RPC.
  onRpc(fn: string, handler: RpcHandler) {
    this.rpcs[fn] = handler;
  }

  // Réponse d'une Edge Function (/functions/v1/<name>).
  onFunction(name: string, handler: (body: Record<string, unknown>) => { status?: number; json: unknown }) {
    this.functions[name] = handler;
  }

  rpcCalls(fn: string) {
    return this.calls.filter((c) => c.fn === fn).map((c) => c.args);
  }

  async install(context: BrowserContext, { signedIn }: { signedIn: boolean }) {
    // Tout le reste de l'internet (logo, polices…) : coupé, pour des tests déterministes.
    await context.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (route) => route.abort('blockedbyclient'));
    await context.route(`${SUPABASE_URL}/**`, (route) => this.handle(route));

    if (signedIn) {
      const session = fakeSession();
      await context.addInitScript(
        ([key, value]) => {
          try {
            window.localStorage.setItem(key, value);
          } catch {
            /* about:blank */
          }
        },
        [STORAGE_KEY, JSON.stringify(session)] as const,
      );
    }
  }

  private async handle(route: Route) {
    const request = route.request();
    const cors = corsHeaders(route);
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const url = new URL(request.url());
    const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
      route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8', ...extra }, body: body === undefined ? '' : JSON.stringify(body) });

    try {
      if (url.pathname.startsWith('/auth/v1/')) return this.handleAuth(url, request.method(), json, route);
      if (url.pathname.startsWith('/functions/v1/')) {
        const name = url.pathname.slice('/functions/v1/'.length);
        const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
        this.functionCalls.push({ name, body });
        const handler = this.functions[name];
        if (!handler) {
          this.unknown.push(`${request.method()} ${url.pathname}`);
          return json(404, { error: `Fonction ${name} non simulée` });
        }
        const out = handler(body);
        return json(out.status ?? 200, out.json);
      }
      if (url.pathname.startsWith('/rest/v1/rpc/')) {
        const fn = url.pathname.slice('/rest/v1/rpc/'.length);
        const args = (request.postDataJSON() ?? {}) as Record<string, unknown>;
        this.calls.push({ fn, args });
        const handler = this.rpcs[fn];
        if (!handler) {
          this.unknown.push(`RPC ${fn}`);
          return json(200, null);
        }
        try {
          return json(200, handler(args, this.store) ?? null);
        } catch (e) {
          return json(400, { code: 'P0001', message: (e as Error).message, details: null, hint: null });
        }
      }
      if (url.pathname.startsWith('/rest/v1/')) return this.handleTable(url, request.method(), request.headers(), request.postDataJSON.bind(request), json);
      this.unknown.push(`${request.method()} ${url.pathname}`);
      return json(200, []);
    } catch (e) {
      return json(500, { message: (e as Error).message });
    }
  }

  private handleAuth(url: URL, method: string, json: (s: number, b: unknown) => Promise<void>, route: Route) {
    const session = fakeSession();
    const path = url.pathname.slice('/auth/v1'.length);
    if (path === '/user') return json(200, session.user);
    if (path === '/token') return json(200, session);
    if (path === '/logout') return route.fulfill({ status: 204, headers: corsHeaders(route) });
    if (path.startsWith('/factors')) return json(200, { id: 'factor-1', type: 'totp', totp: { qr_code: '', secret: 'SECRET', uri: '' } });
    this.unknown.push(`AUTH ${method} ${path}`);
    return json(200, {});
  }

  private handleTable(
    url: URL,
    method: string,
    headers: Record<string, string>,
    body: () => unknown,
    json: (s: number, b: unknown, extra?: Record<string, string>) => Promise<void>,
  ) {
    const table = url.pathname.slice('/rest/v1/'.length);
    const single = (headers.accept ?? '').includes('vnd.pgrst.object');
    if (!(table in this.store)) {
      this.unknown.push(`${method} /rest/v1/${table}`);
      this.store[table] = [];
    }
    const rows = this.store[table];
    const respond = (result: Row[]) => {
      const out = result.map((r) => expand(table, r, this.store));
      if (single) {
        if (out.length !== 1) return json(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `${out.length} rows`, hint: null });
        return json(200, out[0]);
      }
      return json(200, out, { 'content-range': out.length ? `0-${out.length - 1}/${out.length}` : '*/0' });
    };

    switch (method) {
      case 'GET':
      case 'HEAD': {
        let result = rows.filter((r) => matches(r, url.searchParams));
        const limit = Number(url.searchParams.get('limit'));
        if (limit > 0) result = result.slice(0, limit);
        return respond(result);
      }
      case 'POST': {
        const payload = body();
        const items = (Array.isArray(payload) ? payload : [payload]) as Row[];
        const created = items.map((item) => ({ id: newId(table), created_at: new Date().toISOString(), ...item }));
        rows.push(...created);
        return respond(created);
      }
      case 'PATCH': {
        const patch = body() as Row;
        const hit = rows.filter((r) => matches(r, url.searchParams));
        hit.forEach((r) => Object.assign(r, patch));
        return respond(hit);
      }
      case 'DELETE': {
        const hit = rows.filter((r) => matches(r, url.searchParams));
        this.store[table] = rows.filter((r) => !hit.includes(r));
        return respond(hit);
      }
      default:
        return json(405, { message: `Méthode ${method} non simulée` });
    }
  }
}

// ── Fixture Playwright ───────────────────────────────────────────────────

interface Fixtures {
  pms: MockSupabase;
  pageErrors: string[];
}
interface Options {
  signedIn: boolean;
  role: string;
}

export const test = base.extend<Fixtures & Options>({
  signedIn: [true, { option: true }],
  role: ['owner', { option: true }],
  pms: async ({ context, signedIn, role }, use) => {
    const pms = new MockSupabase(role);
    await pms.install(context, { signedIn });
    await use(pms);
    if (pms.unknown.length) console.log(`[mockSupabase] routes non simulées : ${[...new Set(pms.unknown)].join(', ')}`);
  },
  page: async ({ page, pms }, use) => {
    void pms; // les routes doivent être posées avant toute navigation
    await page.clock.setFixedTime(NOW);
    await use(page);
  },
  pageErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await use(errors);
  },
});

export { expect };

// Ouvre l'application connectée et attend la fin du chargement des données.
export async function openApp(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible();
}

// Clic sur une entrée du menu latéral.
export async function goTo(page: Page, label: string) {
  await page.getByRole('navigation', { name: /Navigation principale|Main navigation/ }).getByRole('button', { name: label, exact: true }).click();
}
