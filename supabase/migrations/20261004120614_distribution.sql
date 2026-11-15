-- ============================================================================
-- Distribution : moteur de réservation public, API publique (clés, limitation
-- de débit), webhooks signés, synchronisation iCal (export et import).
--
-- Toutes les fonctions de ce fichier appelées depuis Internet sont réservées
-- au rôle service_role : elles ne sont exécutées que par les Edge Functions,
-- qui authentifient l'appelant (captcha, clé API, jeton iCal) avant d'appeler.
-- ============================================================================

-- ── Établissement : réservation en ligne ────────────────────────────────────

alter table public.properties
  add column booking_enabled       boolean not null default false,
  add column booking_slug          text unique check (booking_slug ~ '^[a-z0-9-]{3,40}$'),
  add column booking_hold_minutes  smallint not null default 30 check (booking_hold_minutes between 10 and 1440),
  add column booking_provider      public.payment_provider not null default 'paydunya',
  add column public_description    text;

-- ── Réservations : option temporaire et identifiant externe ─────────────────

alter table public.reservations
  add column hold_expires_at  timestamptz,
  add column external_uid     text,
  add column ical_feed_id     uuid;

-- ── Disponibilité et réservation sans session utilisateur ───────────────────

create or replace function public.availability_for(
  p_property uuid, p_check_in date, p_check_out date, p_adults smallint, p_children smallint
) returns table (
  room_type_id uuid, name text, capacity smallint, available integer, total integer, nightly_avg integer, breakfast_included boolean
)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  t record;
  v_plan uuid;
  v_breakfast boolean := false;
  v_today date;
  v_free integer;
  v_total integer;
begin
  select (now() at time zone timezone)::date into v_today from public.properties where id = p_property;
  if v_today is null then raise exception 'Établissement introuvable' using errcode = 'P0002'; end if;
  if p_check_in < v_today or p_check_out <= p_check_in or p_check_out - p_check_in > 30 or p_check_in > v_today + 365 then
    raise exception 'Dates invalides (séjour de 1 à 30 nuits, dans les 12 mois)' using errcode = '22023';
  end if;
  if p_adults < 1 or p_children < 0 or p_adults + p_children > 20 then
    raise exception 'Nombre de personnes invalide' using errcode = '22023';
  end if;

  select id, rp.breakfast_included into v_plan, v_breakfast
    from public.rate_plans rp where property_id = p_property and is_default and active;

  for t in
    select rt.id, rt.name, rt.capacity from public.room_types rt
    where rt.property_id = p_property and rt.deleted_at is null and rt.capacity >= p_adults + p_children
    order by rt.base_rate
  loop
    select count(*) into v_free
    from public.rooms r
    where r.room_type_id = t.id and r.deleted_at is null
      and not (r.housekeeping_status = 'out_of_order' and p_check_in <= v_today)
      and not public.room_is_blocked(r.id, p_check_in, p_check_out)
      and not exists (
        select 1 from public.reservations x
        where x.room_id = r.id and x.status in ('option', 'confirmed', 'checked_in')
          and x.stay && daterange(p_check_in, p_check_out, '[)'));
    continue when v_free = 0;
    begin
      v_total := public.price_stay(t.id, v_plan, p_check_in, p_check_out);
    exception when others then
      continue;   -- fermé à la vente ou durée minimale non respectée
    end;
    room_type_id := t.id;
    name := t.name;
    capacity := t.capacity;
    available := v_free;
    total := v_total;
    nightly_avg := round(v_total::numeric / (p_check_out - p_check_in));
    breakfast_included := coalesce(v_breakfast, false);
    return next;
  end loop;
end;
$$;

-- Réservation pour un type de chambre : la première chambre libre est prise ;
-- en cas de course avec une autre réservation, on passe à la suivante.
create or replace function public.book_room_type(
  p_property    uuid,
  p_room_type   uuid,
  p_check_in    date,
  p_check_out   date,
  p_adults      smallint,
  p_children    smallint,
  p_guest_name  text,
  p_guest_email text,
  p_guest_phone text,
  p_notes       text,
  p_source      public.booking_source,
  p_status      public.reservation_status
) returns table (reservation_id uuid, code text, total integer, hold_expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  p record;
  v_plan uuid;
  v_breakfast boolean := false;
  v_total integer;
  v_guest uuid;
  v_hold timestamptz;
  v_code text;
  v_id uuid;
  r record;
begin
  select * into p from public.properties where id = p_property;
  if p is null then raise exception 'Établissement introuvable' using errcode = 'P0002'; end if;
  if p_status not in ('option', 'confirmed') then raise exception 'Statut invalide' using errcode = '22023'; end if;
  if coalesce(length(trim(p_guest_name)), 0) < 2 then raise exception 'Nom du client requis' using errcode = '22023'; end if;
  if p_guest_email is not null and p_guest_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Adresse e-mail invalide' using errcode = '22023';
  end if;
  if not exists (select 1 from public.availability_for(p_property, p_check_in, p_check_out, p_adults, p_children) a where a.room_type_id = p_room_type) then
    raise exception 'Plus de disponibilité pour ce type de chambre à ces dates' using errcode = 'P0001';
  end if;

  select id, rp.breakfast_included into v_plan, v_breakfast
    from public.rate_plans rp where property_id = p_property and is_default and active;
  v_total := public.price_stay(p_room_type, v_plan, p_check_in, p_check_out);
  v_hold := case when p_status = 'option' then now() + make_interval(mins => p.booking_hold_minutes) end;

  insert into public.guests (property_id, full_name, email, phone)
    values (p_property, trim(p_guest_name), nullif(trim(p_guest_email), ''), nullif(trim(p_guest_phone), ''))
    returning id into v_guest;

  for r in
    select rm.id from public.rooms rm
    where rm.room_type_id = p_room_type and rm.deleted_at is null
      and not public.room_is_blocked(rm.id, p_check_in, p_check_out)
    order by rm.number
  loop
    v_code := 'W' || to_char(now(), 'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 5));
    begin
      insert into public.reservations (
        property_id, code, guest_id, room_id, check_in, check_out, adults, children, status, breakfast,
        nightly_rate, room_amount, total_amount, notes, source, rate_plan_id, hold_expires_at
      ) values (
        p_property, v_code, v_guest, r.id, p_check_in, p_check_out, p_adults, p_children, p_status, coalesce(v_breakfast, false),
        round(v_total::numeric / (p_check_out - p_check_in)), v_total, v_total, nullif(trim(p_notes), ''), p_source, v_plan, v_hold
      ) returning id into v_id;
      reservation_id := v_id;
      code := v_code;
      total := v_total;
      hold_expires_at := v_hold;
      return next;
      return;
    exception when exclusion_violation then
      continue;
    end;
  end loop;
  raise exception 'Plus de disponibilité pour ce type de chambre à ces dates' using errcode = 'P0001';
end;
$$;

-- Les options non payées à l'échéance sont annulées (tâche planifiée).
create or replace function public.expire_option_holds()
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_count integer;
begin
  with expired as (
    update public.reservations r
       set status = 'cancelled', cancelled_at = now(),
           notes = concat_ws(E'\n', r.notes, 'Option expirée sans paiement')
     where r.status = 'option' and r.hold_expires_at is not null and r.hold_expires_at < now()
       and not exists (select 1 from public.payments pay where pay.reservation_id = r.id)
    returning r.id
  ), links as (
    update public.payment_links l set status = 'expired'
     where l.reservation_id in (select id from expired) and l.status in ('pending', 'open')
    returning 1
  )
  select count(*) into v_count from expired;
  return v_count;
end;
$$;

-- Un paiement en ligne reçu confirme l'option.
create or replace function public.confirm_payment_link(
  p_link uuid, p_provider_ref text, p_amount integer, p_method public.payment_method
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  l record;
  v_payment uuid;
begin
  select * into l from public.payment_links where id = p_link for update;
  if l is null then raise exception 'Lien introuvable' using errcode = 'P0002'; end if;
  if l.status = 'paid' then return l.payment_id; end if;
  if p_amount <> l.amount then
    update public.payment_links set status = 'failed', last_error = 'Montant reçu ' || p_amount || ' différent du montant attendu' where id = p_link;
    raise exception 'Montant incohérent' using errcode = 'P0001';
  end if;
  insert into public.payments (property_id, reservation_id, amount, method, reference)
    values (l.property_id, l.reservation_id, p_amount, p_method, l.provider || ':' || p_provider_ref)
    returning id into v_payment;
  update public.payment_links
    set status = 'paid', provider_ref = coalesce(provider_ref, p_provider_ref), payment_id = v_payment, completed_at = now()
    where id = p_link;
  update public.reservations set status = 'confirmed', hold_expires_at = null
    where id = l.reservation_id and status = 'option';
  return v_payment;
end;
$$;

-- ── Limitation de débit (Edge Functions publiques) ──────────────────────────

create table public.rate_limit_hits (
  key           text not null,
  window_start  timestamptz not null,
  hits          integer not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limit_hits enable row level security;

create or replace function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limit_hits (key, window_start, hits) values (p_key, v_window, 1)
    on conflict (key, window_start) do update set hits = public.rate_limit_hits.hits + 1
    returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;

-- ── Clés d'API ──────────────────────────────────────────────────────────────

create table public.api_keys (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references public.properties(id) on delete cascade,
  name          text not null check (length(trim(name)) between 2 and 80),
  prefix        text not null,
  key_hash      text not null unique,
  scopes        text[] not null check (scopes <@ array['availability:read', 'reservations:read', 'reservations:write']::text[] and cardinality(scopes) > 0),
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);
create index api_keys_property_idx on public.api_keys(property_id);
create index api_keys_created_by_idx on public.api_keys(created_by);
alter table public.api_keys enable row level security;
create policy api_keys_select on public.api_keys for select to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager']::public.app_role[]));
create trigger audit_api_keys after insert or update or delete on public.api_keys
  for each row execute function public.write_audit_log();

-- La clé n'est affichée qu'une fois ; seule son empreinte SHA-256 est conservée.
create or replace function public.create_api_key(p_property uuid, p_name text, p_scopes text[])
returns text language plpgsql security definer set search_path = ''
as $$
declare v_key text;
begin
  if not public.has_property_role(p_property, array['owner','general_manager']::public.app_role[]) then
    raise exception 'Réservé à la direction' using errcode = '42501';
  end if;
  v_key := 'pms_' || encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.api_keys (property_id, name, prefix, key_hash, scopes, created_by)
    values (p_property, trim(p_name), left(v_key, 12), encode(extensions.digest(v_key, 'sha256'), 'hex'), p_scopes, (select auth.uid()));
  return v_key;
end;
$$;

create or replace function public.revoke_api_key(p_key uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_property uuid;
begin
  select property_id into v_property from public.api_keys where id = p_key;
  if v_property is null or not public.has_property_role(v_property, array['owner','general_manager']::public.app_role[]) then
    raise exception 'Réservé à la direction' using errcode = '42501';
  end if;
  update public.api_keys set revoked_at = now() where id = p_key and revoked_at is null;
end;
$$;

create or replace function public.api_key_lookup(p_key text)
returns table (key_id uuid, property_id uuid, scopes text[])
language sql security definer set search_path = ''
as $$
  update public.api_keys k set last_used_at = now()
   where k.key_hash = encode(extensions.digest(p_key, 'sha256'), 'hex') and k.revoked_at is null
  returning k.id, k.property_id, k.scopes;
$$;

-- ── Webhooks ────────────────────────────────────────────────────────────────

create table public.webhook_endpoints (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references public.properties(id) on delete cascade,
  url          text not null check (url ~ '^https://[^\s/$.?#].[^\s]*$'),
  events       text[] not null check (cardinality(events) > 0),
  description  text,
  active       boolean not null default true,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);
create index webhook_endpoints_property_idx on public.webhook_endpoints(property_id);
create index webhook_endpoints_created_by_idx on public.webhook_endpoints(created_by);
alter table public.webhook_endpoints enable row level security;
create policy webhook_endpoints_select on public.webhook_endpoints for select to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager']::public.app_role[]));
create policy webhook_endpoints_update on public.webhook_endpoints for update to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager']::public.app_role[]))
  with check (public.has_property_role(property_id, array['owner','general_manager']::public.app_role[]));
create policy webhook_endpoints_delete on public.webhook_endpoints for delete to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager']::public.app_role[]));
create trigger audit_webhook_endpoints after insert or update or delete on public.webhook_endpoints
  for each row execute function public.write_audit_log();

-- Secrets de signature : aucune policy, lisibles par le seul service_role.
create table public.webhook_secrets (
  endpoint_id  uuid primary key references public.webhook_endpoints(id) on delete cascade,
  secret       text not null
);
alter table public.webhook_secrets enable row level security;

create table public.webhook_deliveries (
  id               uuid primary key default gen_random_uuid(),
  endpoint_id      uuid not null references public.webhook_endpoints(id) on delete cascade,
  property_id      uuid not null references public.properties(id) on delete cascade,
  event            text not null,
  payload          jsonb not null,
  status           text not null default 'pending' check (status in ('pending', 'delivered', 'failed')),
  attempts         smallint not null default 0,
  last_status      integer,
  last_error       text,
  next_attempt_at  timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  delivered_at     timestamptz
);
create index webhook_deliveries_due_idx on public.webhook_deliveries(next_attempt_at) where status = 'pending';
create index webhook_deliveries_endpoint_idx on public.webhook_deliveries(endpoint_id, created_at desc);
create index webhook_deliveries_property_idx on public.webhook_deliveries(property_id);
alter table public.webhook_deliveries enable row level security;
create policy webhook_deliveries_select on public.webhook_deliveries for select to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager']::public.app_role[]));

create or replace function public.create_webhook_endpoint(p_property uuid, p_url text, p_events text[], p_description text default null)
returns table (id uuid, secret text)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  v_id uuid;
  v_secret text := 'whsec_' || encode(extensions.gen_random_bytes(24), 'hex');
begin
  if not public.has_property_role(p_property, array['owner','general_manager']::public.app_role[]) then
    raise exception 'Réservé à la direction' using errcode = '42501';
  end if;
  if not (p_events <@ array['*', 'reservation.created', 'reservation.confirmed', 'reservation.updated', 'reservation.cancelled',
                            'reservation.checked_in', 'reservation.checked_out', 'reservation.no_show', 'payment.received']::text[]) then
    raise exception 'Événement inconnu' using errcode = '22023';
  end if;
  insert into public.webhook_endpoints (property_id, url, events, description, created_by)
    values (p_property, trim(p_url), p_events, nullif(trim(p_description), ''), (select auth.uid()))
    returning webhook_endpoints.id into v_id;
  insert into public.webhook_secrets (endpoint_id, secret) values (v_id, v_secret);
  id := v_id;
  secret := v_secret;
  return next;
end;
$$;

create or replace function public.enqueue_webhook(p_property uuid, p_event text, p_payload jsonb)
returns void language sql security definer set search_path = ''
as $$
  insert into public.webhook_deliveries (endpoint_id, property_id, event, payload)
  select e.id, p_property, p_event,
         jsonb_build_object('id', gen_random_uuid(), 'event', p_event, 'created_at', now(), 'data', p_payload)
  from public.webhook_endpoints e
  where e.property_id = p_property and e.active and (p_event = any (e.events) or '*' = any (e.events));
$$;

create or replace function public.on_reservation_webhook()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_event text;
  v_room text;
begin
  if tg_op = 'INSERT' then
    v_event := 'reservation.created';
  elsif new.status is distinct from old.status then
    v_event := case new.status
      when 'confirmed' then 'reservation.confirmed'
      when 'cancelled' then 'reservation.cancelled'
      when 'checked_in' then 'reservation.checked_in'
      when 'checked_out' then 'reservation.checked_out'
      when 'no_show' then 'reservation.no_show'
      else 'reservation.updated' end;
  elsif (new.check_in, new.check_out, new.room_id, new.total_amount, new.adults, new.children)
        is distinct from (old.check_in, old.check_out, old.room_id, old.total_amount, old.adults, old.children) then
    v_event := 'reservation.updated';
  else
    return new;
  end if;
  if not exists (select 1 from public.webhook_endpoints where property_id = new.property_id and active) then
    return new;
  end if;
  select number into v_room from public.rooms where id = new.room_id;
  perform public.enqueue_webhook(new.property_id, v_event, jsonb_build_object(
    'reservation_id', new.id, 'code', new.code, 'status', new.status, 'room', v_room,
    'check_in', new.check_in, 'check_out', new.check_out, 'adults', new.adults, 'children', new.children,
    'total_amount', new.total_amount, 'currency', 'XOF', 'source', new.source,
    'guest_name', (select full_name from public.guests where id = new.guest_id)));
  return new;
end;
$$;
create trigger reservations_webhook after insert or update on public.reservations
  for each row execute function public.on_reservation_webhook();

create or replace function public.on_payment_webhook()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.webhook_endpoints where property_id = new.property_id and active) then
    perform public.enqueue_webhook(new.property_id, 'payment.received', jsonb_build_object(
      'payment_id', new.id, 'reservation_code', (select code from public.reservations where id = new.reservation_id),
      'amount', new.amount, 'currency', 'XOF', 'method', new.method));
  end if;
  return new;
end;
$$;
create trigger payments_webhook after insert on public.payments
  for each row execute function public.on_payment_webhook();

-- File d'envoi lue par l'Edge Function deliver-webhooks.
create or replace function public.webhook_deliveries_due(p_limit integer default 50)
returns table (id uuid, url text, secret text, payload jsonb, attempts smallint)
language sql security definer set search_path = ''
as $$
  select d.id, e.url, s.secret, d.payload, d.attempts
  from public.webhook_deliveries d
  join public.webhook_endpoints e on e.id = d.endpoint_id and e.active
  join public.webhook_secrets s on s.endpoint_id = e.id
  where d.status = 'pending' and d.next_attempt_at <= now()
  order by d.next_attempt_at
  limit p_limit
  for update of d skip locked;
$$;

-- Nouvel essai à 2, 4, 8… minutes ; abandon après 8 tentatives.
create or replace function public.webhook_delivery_result(p_id uuid, p_ok boolean, p_status integer, p_error text)
returns void language sql security definer set search_path = ''
as $$
  update public.webhook_deliveries set
    attempts = attempts + 1,
    last_status = p_status,
    last_error = case when p_ok then null else left(p_error, 500) end,
    status = case when p_ok then 'delivered' when attempts + 1 >= 8 then 'failed' else 'pending' end,
    delivered_at = case when p_ok then now() end,
    next_attempt_at = now() + make_interval(mins => power(2, attempts + 1)::integer)
  where id = p_id;
$$;

-- ── iCal : export (chambre → plateformes) et import (plateformes → PMS) ─────

create table public.ical_feeds (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid not null references public.properties(id) on delete cascade,
  room_id         uuid not null references public.rooms(id) on delete cascade,
  direction       text not null check (direction in ('export', 'import')),
  url             text check (url is null or url ~ '^https://'),
  token           text unique,
  source          public.booking_source not null default 'other',
  label           text,
  active          boolean not null default true,
  last_synced_at  timestamptz,
  last_error      text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  check ((direction = 'export' and token is not null) or (direction = 'import' and url is not null))
);
create index ical_feeds_property_idx on public.ical_feeds(property_id);
create index ical_feeds_room_idx on public.ical_feeds(room_id);
create index ical_feeds_created_by_idx on public.ical_feeds(created_by);
alter table public.ical_feeds enable row level security;
create policy ical_feeds_select on public.ical_feeds for select to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager','reservation_manager']::public.app_role[]));
create policy ical_feeds_update on public.ical_feeds for update to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager','reservation_manager']::public.app_role[]))
  with check (public.has_property_role(property_id, array['owner','general_manager','reservation_manager']::public.app_role[]));
create policy ical_feeds_delete on public.ical_feeds for delete to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager']::public.app_role[]));
create trigger audit_ical_feeds after insert or update or delete on public.ical_feeds
  for each row execute function public.write_audit_log();

alter table public.reservations
  add constraint reservations_ical_feed_fk foreign key (ical_feed_id) references public.ical_feeds(id) on delete set null;
create unique index reservations_external_uid on public.reservations(ical_feed_id, external_uid) where external_uid is not null;

create or replace function public.add_ical_feed(
  p_room uuid, p_direction text, p_url text default null, p_source public.booking_source default 'other', p_label text default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_property uuid;
  v_id uuid;
begin
  select property_id into v_property from public.rooms where id = p_room and deleted_at is null;
  if v_property is null then raise exception 'Chambre introuvable' using errcode = 'P0002'; end if;
  if not public.has_property_role(v_property, array['owner','general_manager','reservation_manager']::public.app_role[]) then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;
  insert into public.ical_feeds (property_id, room_id, direction, url, token, source, label, created_by)
    values (v_property, p_room, p_direction,
            case when p_direction = 'import' then trim(p_url) end,
            case when p_direction = 'export' then encode(extensions.gen_random_bytes(24), 'hex') end,
            p_source, nullif(trim(p_label), ''), (select auth.uid()))
    returning id into v_id;
  return v_id;
end;
$$;

-- Événements publiés pour une chambre (sans donnée personnelle).
create or replace function public.ical_export_events(p_token text)
returns table (uid text, starts date, ends date, summary text)
language sql stable security definer set search_path = ''
as $$
  with f as (select room_id from public.ical_feeds where token = p_token and direction = 'export' and active)
  select r.id::text || '@hotel-pms', r.check_in, r.check_out, 'Indisponible'
  from public.reservations r, f
  where r.room_id = f.room_id and r.status in ('option', 'confirmed', 'checked_in') and r.check_out >= current_date
  union all
  select m.id::text || '@hotel-pms-maintenance', m.blocks_from, m.blocks_to, 'Hors service'
  from public.maintenance_orders m, f
  where m.room_id = f.room_id and m.status <> 'resolved' and m.blocks_from is not null and m.blocks_to >= current_date;
$$;

-- Import d'un calendrier distant : crée, met à jour ou annule les séjours
-- correspondants. Un conflit (chambre déjà prise) est signalé, jamais forcé.
create or replace function public.ical_import(p_feed uuid, p_events jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  f record;
  e jsonb;
  v_uid text;
  v_start date;
  v_end date;
  v_existing record;
  v_guest uuid;
  v_created integer := 0;
  v_updated integer := 0;
  v_cancelled integer := 0;
  v_conflicts text[] := '{}';
  v_uids text[] := '{}';
begin
  select * into f from public.ical_feeds where id = p_feed and direction = 'import' and active;
  if f is null then raise exception 'Flux introuvable' using errcode = 'P0002'; end if;

  for e in select * from jsonb_array_elements(p_events) loop
    v_uid := e->>'uid';
    v_start := (e->>'start')::date;
    v_end := (e->>'end')::date;
    continue when v_uid is null or v_start is null or v_end is null or v_end <= v_start or v_end < current_date;
    v_uids := v_uids || v_uid;

    select * into v_existing from public.reservations where ical_feed_id = p_feed and external_uid = v_uid;
    begin
      if v_existing.id is null then
        insert into public.guests (property_id, full_name, notes)
          values (f.property_id, 'Réservation ' || coalesce(f.label, f.source::text), left(e->>'summary', 200))
          returning id into v_guest;
        insert into public.reservations (property_id, code, guest_id, room_id, check_in, check_out, status,
                                         nightly_rate, room_amount, total_amount, source, notes, external_uid, ical_feed_id)
          values (f.property_id, 'I' || to_char(now(), 'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 5)),
                  v_guest, f.room_id, v_start, v_end, 'confirmed', 0, 0, 0, f.source,
                  'Importé depuis ' || coalesce(f.label, f.source::text) || ' (montant encaissé par la plateforme)', v_uid, p_feed);
        v_created := v_created + 1;
      elsif v_existing.status in ('option', 'confirmed') and (v_existing.check_in, v_existing.check_out) is distinct from (v_start, v_end) then
        update public.reservations set check_in = v_start, check_out = v_end where id = v_existing.id;
        v_updated := v_updated + 1;
      end if;
    exception when exclusion_violation then
      v_conflicts := v_conflicts || (to_char(v_start, 'DD/MM') || '→' || to_char(v_end, 'DD/MM'));
    end;
  end loop;

  with gone as (
    update public.reservations set status = 'cancelled', cancelled_at = now(),
           notes = concat_ws(E'\n', notes, 'Supprimée du calendrier ' || coalesce(f.label, f.source::text))
     where ical_feed_id = p_feed and status in ('option', 'confirmed') and check_in >= current_date
       and not (external_uid = any (v_uids))
    returning 1
  ) select count(*) into v_cancelled from gone;

  update public.ical_feeds set last_synced_at = now(),
    last_error = case when cardinality(v_conflicts) > 0
                      then 'Conflit : chambre déjà occupée pour ' || array_to_string(v_conflicts, ', ') end
   where id = p_feed;

  return jsonb_build_object('created', v_created, 'updated', v_updated, 'cancelled', v_cancelled, 'conflicts', to_jsonb(v_conflicts));
end;
$$;

create or replace function public.ical_feed_error(p_feed uuid, p_error text)
returns void language sql security definer set search_path = ''
as $$ update public.ical_feeds set last_error = left(p_error, 500), last_synced_at = now() where id = p_feed; $$;

-- ── Droits ──────────────────────────────────────────────────────────────────

revoke execute on all functions in schema public from public, anon;
revoke execute on function
  public.availability_for(uuid, date, date, smallint, smallint),
  public.book_room_type(uuid, uuid, date, date, smallint, smallint, text, text, text, text, public.booking_source, public.reservation_status),
  public.expire_option_holds(),
  public.rate_limit_hit(text, integer, integer),
  public.api_key_lookup(text),
  public.enqueue_webhook(uuid, text, jsonb),
  public.on_reservation_webhook(),
  public.on_payment_webhook(),
  public.webhook_deliveries_due(integer),
  public.webhook_delivery_result(uuid, boolean, integer, text),
  public.ical_export_events(text),
  public.ical_import(uuid, jsonb),
  public.ical_feed_error(uuid, text)
from authenticated;

grant execute on function
  public.create_api_key(uuid, text, text[]),
  public.revoke_api_key(uuid),
  public.create_webhook_endpoint(uuid, text, text[], text),
  public.add_ical_feed(uuid, text, text, public.booking_source, text)
to authenticated;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function
      public.availability_for(uuid, date, date, smallint, smallint),
      public.book_room_type(uuid, uuid, date, date, smallint, smallint, text, text, text, text, public.booking_source, public.reservation_status),
      public.expire_option_holds(),
      public.rate_limit_hit(text, integer, integer),
      public.api_key_lookup(text),
      public.webhook_deliveries_due(integer),
      public.webhook_delivery_result(uuid, boolean, integer, text),
      public.ical_export_events(text),
      public.ical_import(uuid, jsonb),
      public.ical_feed_error(uuid, text),
      public.confirm_payment_link(uuid, text, integer, public.payment_method)
    to service_role;
  end if;
end $$;

revoke all on all tables in schema public from anon;
-- Tables internes : aucun accès direct, même en lecture, hors service_role.
revoke all on public.webhook_secrets, public.rate_limit_hits, public.invoice_sequences, public.credit_note_sequences
  from authenticated;

-- ── Tâches planifiées ───────────────────────────────────────────────────────

do $outer$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('pms-expire-holds', '*/5 * * * *', 'select public.expire_option_holds()');
    perform cron.schedule('pms-rate-limit-cleanup', '17 3 * * *', $c$delete from public.rate_limit_hits where window_start < now() - interval '1 day'$c$);
    perform cron.schedule('pms-deliver-webhooks', '*/2 * * * *', $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/deliver-webhooks',
        headers := jsonb_build_object('Content-Type', 'application/json',
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
        body := '{}'::jsonb)
      where exists (select 1 from public.webhook_deliveries where status = 'pending' and next_attempt_at <= now())
        and exists (select 1 from vault.decrypted_secrets where name = 'project_url')
    $job$);
    perform cron.schedule('pms-ical-sync', '*/30 * * * *', $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/ical-sync',
        headers := jsonb_build_object('Content-Type', 'application/json',
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
        body := '{}'::jsonb)
      where exists (select 1 from public.ical_feeds where direction = 'import' and active)
        and exists (select 1 from vault.decrypted_secrets where name = 'project_url')
    $job$);
  end if;
end
$outer$;
