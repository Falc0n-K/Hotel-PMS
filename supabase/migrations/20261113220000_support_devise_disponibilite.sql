-- ============================================================================
-- Accès support temporaire (lecture seule, sur autorisation de l'hôtel),
-- devise par établissement (devises sans décimales), disponibilités en une
-- seule requête.
-- ============================================================================

-- ── Accès du support ─────────────────────────────────────────────────────────
-- L'éditeur n'accède aux données d'un établissement qu'à la demande de celui-ci
-- (accord de sous-traitance, article 4) : le propriétaire ou le directeur ouvre
-- un accès limité dans le temps, le support lit sans pouvoir rien modifier, et
-- chaque ouverture comme chaque consultation est tracée dans le journal d'audit.

create table public.platform_admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from authenticated, anon;
-- Ajout d'un membre du support : uniquement par le service_role (SQL Editor).

create table public.support_access_grants (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  granted_by  uuid not null references auth.users(id),
  reason      text not null check (length(trim(reason)) between 5 and 300),
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  check (expires_at > created_at and expires_at <= created_at + interval '7 days')
);
create index support_access_grants_property_idx on public.support_access_grants(property_id, expires_at desc);
create index support_access_grants_granted_by_idx on public.support_access_grants(granted_by);
alter table public.support_access_grants enable row level security;
create trigger audit_support_access_grants after insert or update or delete on public.support_access_grants
  for each row execute function public.write_audit_log();

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;

create or replace function public.support_access_active(p_property uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_platform_admin() and exists (
    select 1 from public.support_access_grants g
     where g.property_id = p_property and g.revoked_at is null and g.expires_at > now());
$$;

-- Ancienne définition de l'appartenance : le personnel de l'hôtel seulement.
-- Sert aux rares écritures ouvertes à tout le personnel (signalement de panne).
create or replace function public.is_property_staff(p_property uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    join public.properties p on p.id = m.property_id
    where m.property_id = p_property
      and m.user_id = (select auth.uid())
      and (not p.require_mfa
           or m.role not in ('owner', 'general_manager', 'accountant')
           or public.session_is_aal2())
  );
$$;

-- Lecture : le personnel, ou le support pendant un accès autorisé. Toutes les
-- écritures passent par has_property_role(), que le support n'a jamais.
create or replace function public.is_property_member(p_property uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_property_staff(p_property) or public.support_access_active(p_property);
$$;

-- Les deux écritures qui reposaient sur is_property_member passent au personnel.
drop policy maintenance_insert on public.maintenance_orders;
create policy maintenance_insert on public.maintenance_orders for insert to authenticated
  with check (public.is_property_staff(property_id) and reported_by = (select auth.uid()));
drop policy housekeeping_update on public.housekeeping_tasks;
create policy housekeeping_update on public.housekeeping_tasks for update to authenticated
  using (
    public.has_property_role(property_id, array['owner','general_manager','housekeeping_manager']::public.app_role[])
    or (assigned_to = (select auth.uid()) and public.has_property_role(property_id, array['housekeeper']::public.app_role[]))
  )
  with check (public.is_property_staff(property_id));

create or replace function public.report_maintenance(
  p_property uuid, p_room uuid, p_title text, p_description text default null,
  p_priority public.priority_level default 'medium', p_blocks_from date default null, p_blocks_to date default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if not public.is_property_staff(p_property) then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;
  if p_room is not null and not exists (select 1 from public.rooms where id = p_room and property_id = p_property) then
    raise exception 'Chambre introuvable' using errcode = 'P0002';
  end if;
  if p_blocks_from is not null then
    if p_room is null then raise exception 'Un blocage concerne une chambre' using errcode = '22023'; end if;
    if not public.has_property_role(p_property, array['owner','general_manager','housekeeping_manager','maintenance']::public.app_role[]) then
      raise exception 'Mise hors service réservée à la direction, la gouvernante et la maintenance' using errcode = '42501';
    end if;
    if exists (select 1 from public.reservations where room_id = p_room and status in ('option','confirmed','checked_in')
               and stay && daterange(p_blocks_from, p_blocks_to, '[)')) then
      raise exception 'Des réservations existent sur cette période : délogez-les d''abord' using errcode = 'P0001';
    end if;
  end if;

  insert into public.maintenance_orders (property_id, room_id, title, description, priority, reported_by, blocks_from, blocks_to)
    values (p_property, p_room, trim(p_title), nullif(trim(p_description), ''), p_priority, (select auth.uid()), p_blocks_from, p_blocks_to)
    returning id into v_id;

  if p_blocks_from is not null and p_blocks_from <= current_date then
    update public.rooms set housekeeping_status = 'out_of_order', out_of_order_reason = trim(p_title) where id = p_room;
  end if;
  return v_id;
end;
$$;


create policy support_access_grants_select on public.support_access_grants for select to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager']::public.app_role[])
         or (public.is_platform_admin() and revoked_at is null and expires_at > now()));

create or replace function public.grant_support_access(p_property uuid, p_hours integer, p_reason text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if not public.has_property_role(p_property, array['owner','general_manager']::public.app_role[]) then
    raise exception 'Réservé au propriétaire et à la direction' using errcode = '42501';
  end if;
  if p_hours not between 1 and 168 then
    raise exception 'Durée d''accès : 1 à 168 heures' using errcode = '22023';
  end if;
  insert into public.support_access_grants (property_id, granted_by, reason, expires_at)
    values (p_property, (select auth.uid()), trim(p_reason), now() + make_interval(hours => p_hours))
    returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.revoke_support_access(p_grant uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_property uuid;
begin
  select property_id into v_property from public.support_access_grants where id = p_grant;
  if v_property is null or not public.has_property_role(v_property, array['owner','general_manager']::public.app_role[]) then
    raise exception 'Réservé au propriétaire et à la direction' using errcode = '42501';
  end if;
  update public.support_access_grants set revoked_at = now() where id = p_grant and revoked_at is null;
end;
$$;

-- Établissements ouverts au support connecté, et trace de chaque consultation.
create or replace function public.support_properties()
returns table (property_id uuid, expires_at timestamptz, reason text)
language sql stable security definer set search_path = ''
as $$
  select g.property_id, max(g.expires_at), (array_agg(g.reason order by g.created_at desc))[1]
    from public.support_access_grants g
   where public.is_platform_admin() and g.revoked_at is null and g.expires_at > now()
   group by g.property_id;
$$;

create or replace function public.log_support_view(p_property uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.support_access_active(p_property) then
    raise exception 'Aucun accès support en cours pour cet établissement' using errcode = '42501';
  end if;
  insert into public.audit_log (property_id, actor_id, action, table_name, new_data)
    values (p_property, (select auth.uid()), 'support_view', 'properties', jsonb_build_object('at', now()));
end;
$$;

-- ── Devise par établissement ─────────────────────────────────────────────────
-- Les montants sont des entiers : seules les devises sans décimales sont
-- possibles (zone franc CFA, franc guinéen, etc.). Pas de changement de devise
-- une fois un encaissement ou une facture enregistrés.

alter table public.properties
  add constraint properties_currency_zero_decimal
  check (currency in ('XOF', 'XAF', 'GNF', 'KMF', 'RWF', 'BIF', 'DJF', 'MGA'));

create or replace function public.guard_currency_change()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.currency is distinct from old.currency and (
       exists (select 1 from public.payments where property_id = new.id)
       or exists (select 1 from public.invoices where property_id = new.id)) then
    raise exception 'Devise verrouillée : des encaissements ou des factures existent déjà' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_currency_change() from public, anon, authenticated;
create trigger properties_guard_currency before update of currency on public.properties
  for each row execute function public.guard_currency_change();

-- Webhooks : la devise de l'établissement au lieu de XOF figé.
create or replace function public.on_payment_webhook()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.webhook_endpoints where property_id = new.property_id and active) then
    perform public.enqueue_webhook(new.property_id, 'payment.received', jsonb_build_object(
      'payment_id', new.id, 'reservation_code', (select code from public.reservations where id = new.reservation_id),
      'amount', new.amount, 'currency', (select currency from public.properties where id = new.property_id),
      'method', new.method));
  end if;
  return new;
end;
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
    'total_amount', new.total_amount, 'currency', (select currency from public.properties where id = new.property_id), 'source', new.source,
    'guest_name', (select full_name from public.guests where id = new.guest_id)));
  return new;
end;
$$;

-- Messages aux clients : montant dans la devise de l'établissement.
create or replace function public.enqueue_reservation_notifications(p_reservation uuid, p_template text)
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  v_count integer := 0;
  v_payload jsonb;
begin
  select res.id, res.property_id, res.code, res.check_in, res.check_out, res.total_amount,
         g.full_name, g.email, g.phone, p.name as property_name, p.notify_email, p.notify_sms, p.notify_whatsapp,
         p.check_in_time, p.phone as property_phone, p.currency, rm.number as room_number
    into r
  from public.reservations res
  join public.guests g on g.id = res.guest_id
  join public.properties p on p.id = res.property_id
  join public.rooms rm on rm.id = res.room_id
  where res.id = p_reservation;
  if r is null then return 0; end if;

  v_payload := jsonb_build_object(
    'guest_name', r.full_name, 'property_name', r.property_name, 'code', r.code,
    'check_in', to_char(r.check_in, 'DD/MM/YYYY'), 'check_out', to_char(r.check_out, 'DD/MM/YYYY'),
    'check_in_time', to_char(r.check_in_time, 'HH24:MI'), 'total', r.total_amount,
    'room_number', r.room_number, 'property_phone', r.property_phone, 'currency', r.currency);

  if r.notify_email and r.email is not null then
    insert into public.notification_outbox (property_id, reservation_id, channel, recipient, template, payload)
      values (r.property_id, r.id, 'email', r.email, p_template, v_payload);
    v_count := v_count + 1;
  end if;
  if r.notify_sms and r.phone is not null then
    insert into public.notification_outbox (property_id, reservation_id, channel, recipient, template, payload)
      values (r.property_id, r.id, 'sms', r.phone, p_template, v_payload);
    v_count := v_count + 1;
  end if;
  if r.notify_whatsapp and r.phone is not null then
    insert into public.notification_outbox (property_id, reservation_id, channel, recipient, template, payload)
      values (r.property_id, r.id, 'whatsapp', r.phone, p_template, v_payload);
    v_count := v_count + 1;
  end if;
  return v_count;
end;
$$;


-- ── Disponibilités en une seule requête ──────────────────────────────────────
-- Les chambres libres de tous les types sont comptées d'un coup (au lieu d'une
-- requête et d'un appel de fonction par chambre) ; seul le prix reste calculé
-- par type disponible.

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
    with busy as (
      select x.room_id from public.reservations x
       where x.property_id = p_property and x.status in ('option', 'confirmed', 'checked_in')
         and x.check_in < p_check_out and x.check_out > p_check_in
    ), blocked as (
      select m.room_id from public.maintenance_orders m
       where m.property_id = p_property and m.status <> 'resolved' and m.blocks_from is not null
         and daterange(m.blocks_from, m.blocks_to, '[)') && daterange(p_check_in, p_check_out, '[)')
    ), free as (
      select r.room_type_id, count(*)::integer as n
        from public.rooms r
       where r.property_id = p_property and r.deleted_at is null
         and not (r.housekeeping_status = 'out_of_order' and p_check_in <= v_today)
         and r.id not in (select room_id from busy)
         and r.id not in (select room_id from blocked where room_id is not null)
       group by r.room_type_id
    )
    select rt.id, rt.name, rt.capacity, f.n
      from public.room_types rt join free f on f.room_type_id = rt.id
     where rt.property_id = p_property and rt.deleted_at is null and rt.capacity >= p_adults + p_children
     order by rt.base_rate
  loop
    begin
      v_total := public.price_stay(t.id, v_plan, p_check_in, p_check_out);
    exception when others then
      continue;   -- fermé à la vente ou durée minimale non respectée
    end;
    room_type_id := t.id;
    name := t.name;
    capacity := t.capacity;
    available := t.n;
    total := v_total;
    nightly_avg := round(v_total::numeric / (p_check_out - p_check_in));
    breakfast_included := coalesce(v_breakfast, false);
    return next;
  end loop;
end;
$$;

-- ── Droits ──────────────────────────────────────────────────────────────────

revoke execute on all functions in schema public from public, anon;
revoke execute on function
  public.availability_for(uuid, date, date, smallint, smallint),
  public.guard_currency_change()
from authenticated;
grant execute on function public.availability_for(uuid, date, date, smallint, smallint) to service_role;
grant execute on function
  public.is_platform_admin(),
  public.support_access_active(uuid),
  public.is_property_staff(uuid),
  public.grant_support_access(uuid, integer, text),
  public.revoke_support_access(uuid),
  public.support_properties(),
  public.log_support_view(uuid)
to authenticated;
