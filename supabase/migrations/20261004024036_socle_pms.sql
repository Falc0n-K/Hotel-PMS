-- ============================================================================
-- Socle PMS : organisations, établissements, rôles, chambres, réservations,
-- paiements, factures, ménage, maintenance, journal d'audit.
--
-- Principes (voir l'audit du 04/10/2026, sections 5, 7 et 8) :
--   * Chaque table métier porte property_id ; l'isolation entre hôtels est
--     assurée par la RLS, jamais par l'interface.
--   * Les rôles sont persistés par (utilisateur, établissement).
--   * Montants en entiers, dans l'unité de la devise (FCFA n'a pas de centimes).
--   * Une chambre ne peut pas porter deux séjours actifs qui se chevauchent
--     (contrainte d'exclusion), donc pas de surbooking par construction.
--   * Les transitions de séjour (check-in, check-out, annulation, no-show)
--     passent par des fonctions qui vérifient le rôle et l'état de départ.
--   * Numérotation des factures continue, sans trou, par établissement.
-- ============================================================================

create extension if not exists btree_gist with schema extensions;

-- ── Types ───────────────────────────────────────────────────────────────────

create type public.app_role as enum (
  'owner',                 -- propriétaire
  'general_manager',       -- directeur général
  'reservation_manager',   -- responsable réservations
  'front_desk',            -- réception
  'housekeeping_manager',  -- gouvernante
  'housekeeper',           -- femme / valet de chambre
  'maintenance',           -- technicien
  'accountant',            -- comptabilité / finance
  'auditor'                -- lecture seule, y compris le journal
);

create type public.housekeeping_status as enum ('clean', 'dirty', 'inspected', 'out_of_order');
create type public.reservation_status as enum ('option', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show');
create type public.payment_method as enum ('cash', 'card', 'wave', 'orange_money', 'bank_transfer', 'other');
create type public.task_status as enum ('todo', 'in_progress', 'done', 'inspected');
create type public.maintenance_status as enum ('open', 'in_progress', 'resolved');
create type public.priority_level as enum ('low', 'medium', 'high');

-- ── Tables ──────────────────────────────────────────────────────────────────

create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 2 and 120),
  created_at  timestamptz not null default now()
);

create table public.properties (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null references public.organizations(id) on delete restrict,
  name                    text not null check (length(trim(name)) between 2 and 120),
  code                    text not null check (code ~ '^[A-Z0-9]{2,6}$'),
  city                    text,
  currency                char(3) not null default 'XOF',
  timezone                text not null default 'Africa/Dakar',
  vat_rate_bp             integer not null default 1800 check (vat_rate_bp between 0 and 10000), -- 18 % = 1800 points de base
  tourist_tax_per_night   integer not null default 0 check (tourist_tax_per_night >= 0),           -- par personne et par nuit
  breakfast_price         integer not null default 8500 check (breakfast_price >= 0),               -- par personne et par nuit
  created_at              timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  created_at  timestamptz not null default now()
);

create table public.memberships (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  property_id  uuid not null references public.properties(id) on delete cascade,
  role         public.app_role not null,
  created_at   timestamptz not null default now(),
  unique (user_id, property_id)
);
create index memberships_property_idx on public.memberships(property_id);

create table public.room_types (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references public.properties(id) on delete cascade,
  name         text not null check (length(trim(name)) between 2 and 80),
  base_rate    integer not null check (base_rate >= 0),
  capacity     smallint not null default 2 check (capacity between 1 and 20),
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  unique (property_id, name)
);

create table public.rooms (
  id                    uuid primary key default gen_random_uuid(),
  property_id           uuid not null references public.properties(id) on delete cascade,
  room_type_id          uuid not null references public.room_types(id) on delete restrict,
  number                text not null check (number ~ '^[A-Za-z0-9-]{1,10}$'),
  floor                 smallint not null default 0,
  housekeeping_status   public.housekeeping_status not null default 'clean',
  out_of_order_reason   text,
  created_at            timestamptz not null default now(),
  deleted_at            timestamptz
);
create unique index rooms_number_unique on public.rooms(property_id, number) where deleted_at is null;
create index rooms_type_idx on public.rooms(room_type_id);

create table public.guests (
  id                    uuid primary key default gen_random_uuid(),
  property_id           uuid not null references public.properties(id) on delete cascade,
  full_name             text not null check (length(trim(full_name)) between 2 and 120),
  email                 text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone                 text check (phone is null or length(phone) <= 30),
  nationality           text,
  id_document_type      text,
  id_document_number    text,
  notes                 text,
  created_at            timestamptz not null default now(),
  deleted_at            timestamptz
);
create index guests_property_name_idx on public.guests(property_id, lower(full_name));

create table public.reservations (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references public.properties(id) on delete cascade,
  code          text not null,
  guest_id      uuid not null references public.guests(id) on delete restrict,
  room_id       uuid not null references public.rooms(id) on delete restrict,
  check_in      date not null,
  check_out     date not null,
  stay          daterange generated always as (daterange(check_in, check_out, '[)')) stored,
  adults        smallint not null default 1 check (adults between 1 and 20),
  children      smallint not null default 0 check (children between 0 and 20),
  status        public.reservation_status not null default 'confirmed',
  breakfast     boolean not null default false,
  nightly_rate  integer not null check (nightly_rate >= 0),
  total_amount  integer not null check (total_amount >= 0),
  notes         text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  checked_in_at   timestamptz,
  checked_out_at  timestamptz,
  unique (property_id, code),
  check (check_out > check_in),
  -- Anti-surbooking : une chambre, un seul séjour actif par nuit.
  constraint reservations_no_overlap exclude using gist (
    room_id with =,
    stay with &&
  ) where (status in ('option', 'confirmed', 'checked_in'))
);
create index reservations_property_dates_idx on public.reservations(property_id, check_in, check_out);
create index reservations_guest_idx on public.reservations(guest_id);

create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid not null references public.properties(id) on delete cascade,
  reservation_id  uuid references public.reservations(id) on delete restrict,
  amount          integer not null check (amount <> 0), -- négatif = remboursement
  method          public.payment_method not null,
  reference       text,
  received_by     uuid references auth.users(id),
  created_at      timestamptz not null default now()
);
create index payments_property_created_idx on public.payments(property_id, created_at);
create index payments_reservation_idx on public.payments(reservation_id);

create table public.invoice_sequences (
  property_id  uuid primary key references public.properties(id) on delete cascade,
  next_number  integer not null default 1
);

create table public.invoices (
  id               uuid primary key default gen_random_uuid(),
  property_id      uuid not null references public.properties(id) on delete cascade,
  reservation_id   uuid not null references public.reservations(id) on delete restrict,
  number           integer not null,
  display_number   text not null,
  issued_at        timestamptz not null default now(),
  subtotal         integer not null,   -- hors taxes
  vat_amount       integer not null,
  tourist_tax      integer not null,
  total            integer not null,
  issued_by        uuid references auth.users(id),
  unique (property_id, number)
);
create index invoices_reservation_idx on public.invoices(reservation_id);

create table public.housekeeping_tasks (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references public.properties(id) on delete cascade,
  room_id       uuid not null references public.rooms(id) on delete cascade,
  assigned_to   uuid references auth.users(id),
  status        public.task_status not null default 'todo',
  priority      public.priority_level not null default 'medium',
  notes         text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index housekeeping_tasks_property_status_idx on public.housekeeping_tasks(property_id, status);
create index housekeeping_tasks_room_idx on public.housekeeping_tasks(room_id);

create table public.maintenance_orders (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references public.properties(id) on delete cascade,
  room_id       uuid references public.rooms(id) on delete set null,
  title         text not null check (length(trim(title)) between 3 and 160),
  description   text,
  priority      public.priority_level not null default 'medium',
  status        public.maintenance_status not null default 'open',
  reported_by   uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);
create index maintenance_orders_property_status_idx on public.maintenance_orders(property_id, status);
create index maintenance_orders_room_idx on public.maintenance_orders(room_id);

create table public.audit_log (
  id           bigint generated always as identity primary key,
  property_id  uuid,  -- pas de clé étrangère : le journal survit à la suppression
  actor_id     uuid,
  action       text not null,
  table_name   text not null,
  record_id    uuid,
  old_data     jsonb,
  new_data     jsonb,
  created_at   timestamptz not null default now()
);
create index audit_log_property_created_idx on public.audit_log(property_id, created_at desc);

-- ── Fonctions d'autorisation ────────────────────────────────────────────────

create or replace function public.has_property_role(p_property uuid, p_roles public.app_role[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.property_id = p_property
      and m.user_id = (select auth.uid())
      and m.role = any (p_roles)
  );
$$;

create or replace function public.is_property_member(p_property uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.property_id = p_property and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_organization_member(p_org uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    join public.properties p on p.id = m.property_id
    where p.organization_id = p_org and m.user_id = (select auth.uid())
  );
$$;

-- ── Profils créés à l'inscription ───────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── updated_at ──────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger reservations_touch before update on public.reservations
  for each row execute function public.touch_updated_at();

-- ── Journal d'audit (écrit par trigger, jamais par le client) ───────────────

create or replace function public.write_audit_log()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
begin
  insert into public.audit_log (property_id, actor_id, action, table_name, record_id, old_data, new_data)
  values (
    case when tg_table_name = 'properties' then (v_row->>'id')::uuid else (v_row->>'property_id')::uuid end,
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    (v_row->>'id')::uuid,
    v_old,
    v_new
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_reservations after insert or update or delete on public.reservations
  for each row execute function public.write_audit_log();
create trigger audit_payments after insert or update or delete on public.payments
  for each row execute function public.write_audit_log();
create trigger audit_invoices after insert or update or delete on public.invoices
  for each row execute function public.write_audit_log();
create trigger audit_rooms after insert or update or delete on public.rooms
  for each row execute function public.write_audit_log();
create trigger audit_room_types after insert or update or delete on public.room_types
  for each row execute function public.write_audit_log();
create trigger audit_memberships after insert or update or delete on public.memberships
  for each row execute function public.write_audit_log();
create trigger audit_properties after insert or update or delete on public.properties
  for each row execute function public.write_audit_log();

-- Paiements et factures sont des pièces comptables : ni modifiées ni supprimées.
-- Une erreur se corrige par un paiement négatif (remboursement) ou, plus tard,
-- par un avoir.
create or replace function public.forbid_change()
returns trigger language plpgsql set search_path = ''
as $$
begin
  raise exception 'Les pièces comptables ne se modifient pas (%).', tg_table_name
    using errcode = 'P0001';
end;
$$;

create trigger payments_immutable before update or delete on public.payments
  for each row execute function public.forbid_change();
create trigger invoices_immutable before update or delete on public.invoices
  for each row execute function public.forbid_change();

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.organizations       enable row level security;
alter table public.properties          enable row level security;
alter table public.profiles            enable row level security;
alter table public.memberships         enable row level security;
alter table public.room_types          enable row level security;
alter table public.rooms               enable row level security;
alter table public.guests              enable row level security;
alter table public.reservations        enable row level security;
alter table public.payments            enable row level security;
alter table public.invoice_sequences   enable row level security;
alter table public.invoices            enable row level security;
alter table public.housekeeping_tasks  enable row level security;
alter table public.maintenance_orders  enable row level security;
alter table public.audit_log           enable row level security;

-- Organisations et établissements : visibles des membres, modifiables par la direction.
create policy organizations_select on public.organizations for select to authenticated
  using (public.is_organization_member(id));

create policy properties_select on public.properties for select to authenticated
  using (public.is_property_member(id));
create policy properties_update on public.properties for update to authenticated
  using (public.has_property_role(id, array['owner','general_manager']::public.app_role[]))
  with check (public.has_property_role(id, array['owner','general_manager']::public.app_role[]));

-- Profils : chacun le sien, plus les collègues d'un même établissement.
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.memberships mine
      join public.memberships theirs on theirs.property_id = mine.property_id
      where mine.user_id = (select auth.uid()) and theirs.user_id = profiles.id
    )
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Rôles : lecture par les membres, gestion par propriétaire / directeur.
-- Un directeur ne peut ni créer ni modifier un propriétaire.
create policy memberships_select on public.memberships for select to authenticated
  using (user_id = (select auth.uid()) or public.is_property_member(property_id));
create policy memberships_insert on public.memberships for insert to authenticated
  with check (
    public.has_property_role(property_id, array['owner']::public.app_role[])
    or (public.has_property_role(property_id, array['general_manager']::public.app_role[]) and role <> 'owner')
  );
create policy memberships_update on public.memberships for update to authenticated
  using (
    public.has_property_role(property_id, array['owner']::public.app_role[])
    or (public.has_property_role(property_id, array['general_manager']::public.app_role[]) and role <> 'owner')
  )
  with check (
    public.has_property_role(property_id, array['owner']::public.app_role[])
    or (public.has_property_role(property_id, array['general_manager']::public.app_role[]) and role <> 'owner')
  );
create policy memberships_delete on public.memberships for delete to authenticated
  using (
    user_id <> (select auth.uid()) and (
      public.has_property_role(property_id, array['owner']::public.app_role[])
      or (public.has_property_role(property_id, array['general_manager']::public.app_role[]) and role <> 'owner')
    )
  );

-- Types de chambre et tarifs : lecture par tous les membres, écriture direction.
create policy room_types_select on public.room_types for select to authenticated
  using (public.is_property_member(property_id));
create policy room_types_write on public.room_types for all to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager']::public.app_role[]))
  with check (public.has_property_role(property_id, array['owner','general_manager']::public.app_role[]));

-- Chambres : lecture par tous ; création/suppression direction ; le statut
-- ménage passe par set_room_housekeeping_status().
create policy rooms_select on public.rooms for select to authenticated
  using (public.is_property_member(property_id));
create policy rooms_write on public.rooms for all to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager']::public.app_role[]))
  with check (public.has_property_role(property_id, array['owner','general_manager']::public.app_role[]));

-- Clients (données personnelles) : pas de lecture pour le ménage ni la maintenance.
create policy guests_select on public.guests for select to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager','reservation_manager','front_desk','accountant','auditor']::public.app_role[]));
create policy guests_insert on public.guests for insert to authenticated
  with check (public.has_property_role(property_id, array['owner','general_manager','reservation_manager','front_desk']::public.app_role[]));
create policy guests_update on public.guests for update to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager','reservation_manager','front_desk']::public.app_role[]))
  with check (public.has_property_role(property_id, array['owner','general_manager','reservation_manager','front_desk']::public.app_role[]));

-- Réservations : lecture large (le ménage a besoin des arrivées/départs) ;
-- écriture uniquement via les fonctions ci-dessous.
create policy reservations_select on public.reservations for select to authenticated
  using (public.is_property_member(property_id));

-- Paiements : lecture finance / direction / réception ; encaissement via record_payment().
create policy payments_select on public.payments for select to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager','reservation_manager','front_desk','accountant','auditor']::public.app_role[]));

create policy invoices_select on public.invoices for select to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager','reservation_manager','front_desk','accountant','auditor']::public.app_role[]));

-- invoice_sequences : aucune policy, accès uniquement via issue_invoice().

create policy housekeeping_select on public.housekeeping_tasks for select to authenticated
  using (public.is_property_member(property_id));
create policy housekeeping_insert on public.housekeeping_tasks for insert to authenticated
  with check (public.has_property_role(property_id, array['owner','general_manager','front_desk','housekeeping_manager']::public.app_role[]));
create policy housekeeping_update on public.housekeeping_tasks for update to authenticated
  using (
    public.has_property_role(property_id, array['owner','general_manager','housekeeping_manager']::public.app_role[])
    or (assigned_to = (select auth.uid()) and public.has_property_role(property_id, array['housekeeper']::public.app_role[]))
  )
  with check (public.is_property_member(property_id));

create policy maintenance_select on public.maintenance_orders for select to authenticated
  using (public.is_property_member(property_id));
create policy maintenance_insert on public.maintenance_orders for insert to authenticated
  with check (public.is_property_member(property_id) and reported_by = (select auth.uid()));
create policy maintenance_update on public.maintenance_orders for update to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager','maintenance','housekeeping_manager']::public.app_role[]))
  with check (public.has_property_role(property_id, array['owner','general_manager','maintenance','housekeeping_manager']::public.app_role[]));

create policy audit_log_select on public.audit_log for select to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager','auditor']::public.app_role[]));

-- ── Fonctions métier ────────────────────────────────────────────────────────

-- Onboarding : un utilisateur connecté crée son organisation et son premier
-- établissement, dont il devient propriétaire.
create or replace function public.create_organization_with_property(
  p_org_name text, p_property_name text, p_property_code text, p_city text default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid;
  v_prop uuid;
begin
  if v_uid is null then
    raise exception 'Authentification requise' using errcode = '42501';
  end if;

  insert into public.organizations (name) values (trim(p_org_name)) returning id into v_org;
  insert into public.properties (organization_id, name, code, city)
    values (v_org, trim(p_property_name), upper(trim(p_property_code)), nullif(trim(p_city), ''))
    returning id into v_prop;
  insert into public.memberships (user_id, property_id, role) values (v_uid, v_prop, 'owner');
  insert into public.invoice_sequences (property_id) values (v_prop);
  return v_prop;
end;
$$;

-- Ajout d'un établissement dans une organisation existante (propriétaire d'au
-- moins un établissement de l'organisation).
create or replace function public.add_property(
  p_org uuid, p_name text, p_code text, p_city text default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_prop uuid;
begin
  if not exists (
    select 1 from public.memberships m join public.properties p on p.id = m.property_id
    where p.organization_id = p_org and m.user_id = v_uid and m.role = 'owner'
  ) then
    raise exception 'Réservé au propriétaire' using errcode = '42501';
  end if;

  insert into public.properties (organization_id, name, code, city)
    values (p_org, trim(p_name), upper(trim(p_code)), nullif(trim(p_city), ''))
    returning id into v_prop;
  insert into public.memberships (user_id, property_id, role) values (v_uid, v_prop, 'owner');
  insert into public.invoice_sequences (property_id) values (v_prop);
  return v_prop;
end;
$$;

-- Rattacher un collaborateur déjà inscrit à un établissement.
create or replace function public.add_member_by_email(
  p_property uuid, p_email text, p_role public.app_role
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
  v_id uuid;
begin
  if not (
    public.has_property_role(p_property, array['owner']::public.app_role[])
    or (public.has_property_role(p_property, array['general_manager']::public.app_role[]) and p_role <> 'owner')
  ) then
    raise exception 'Droits insuffisants pour gérer l''équipe' using errcode = '42501';
  end if;

  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'Aucun compte avec cet e-mail. La personne doit d''abord créer son compte.' using errcode = 'P0002';
  end if;

  insert into public.memberships (user_id, property_id, role)
    values (v_user, p_property, p_role)
    on conflict (user_id, property_id) do update set role = excluded.role
    returning id into v_id;
  return v_id;
end;
$$;

-- Création d'une réservation : le prix est calculé côté serveur à partir du
-- type de chambre ; la disponibilité est garantie par la contrainte d'exclusion.
create or replace function public.create_reservation(
  p_property uuid,
  p_room uuid,
  p_check_in date,
  p_check_out date,
  p_guest_name text,
  p_guest_email text default null,
  p_guest_phone text default null,
  p_adults smallint default 1,
  p_children smallint default 0,
  p_breakfast boolean default false,
  p_notes text default null,
  p_status public.reservation_status default 'confirmed'
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_rate integer;
  v_breakfast_price integer;
  v_nights integer;
  v_guest uuid;
  v_code text;
  v_id uuid;
begin
  if not public.has_property_role(p_property, array['owner','general_manager','reservation_manager','front_desk']::public.app_role[]) then
    raise exception 'Droits insuffisants pour créer une réservation' using errcode = '42501';
  end if;
  if p_status not in ('option', 'confirmed') then
    raise exception 'Statut initial invalide' using errcode = '22023';
  end if;
  if p_check_out <= p_check_in then
    raise exception 'La date de départ doit être postérieure à l''arrivée' using errcode = '22023';
  end if;

  select rt.base_rate, p.breakfast_price
    into v_rate, v_breakfast_price
  from public.rooms r
  join public.room_types rt on rt.id = r.room_type_id
  join public.properties p on p.id = r.property_id
  where r.id = p_room and r.property_id = p_property and r.deleted_at is null;

  if v_rate is null then
    raise exception 'Chambre introuvable dans cet établissement' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.rooms where id = p_room and housekeeping_status = 'out_of_order') then
    raise exception 'Chambre hors service' using errcode = 'P0001';
  end if;

  v_nights := p_check_out - p_check_in;

  insert into public.guests (property_id, full_name, email, phone)
    values (p_property, trim(p_guest_name), nullif(trim(p_guest_email), ''), nullif(trim(p_guest_phone), ''))
    returning id into v_guest;

  v_code := 'R' || to_char(now(), 'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 5));

  begin
    insert into public.reservations (
      property_id, code, guest_id, room_id, check_in, check_out, adults, children,
      status, breakfast, nightly_rate, total_amount, notes, created_by
    ) values (
      p_property, v_code, v_guest, p_room, p_check_in, p_check_out, p_adults, p_children,
      p_status, p_breakfast, v_rate,
      v_rate * v_nights + case when p_breakfast then v_breakfast_price * (p_adults + p_children) * v_nights else 0 end,
      nullif(trim(p_notes), ''), (select auth.uid())
    ) returning id into v_id;
  exception when exclusion_violation then
    raise exception 'Chambre déjà réservée sur tout ou partie de ces dates' using errcode = '23P01';
  end;

  return v_id;
end;
$$;

-- Transitions de séjour.
create or replace function public.check_in_reservation(p_reservation uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare r record;
begin
  select * into r from public.reservations where id = p_reservation for update;
  if r is null then raise exception 'Réservation introuvable' using errcode = 'P0002'; end if;
  if not public.has_property_role(r.property_id, array['owner','general_manager','reservation_manager','front_desk']::public.app_role[]) then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;
  if r.status not in ('option', 'confirmed') then
    raise exception 'Seule une réservation confirmée peut être enregistrée (statut actuel : %)', r.status using errcode = 'P0001';
  end if;
  if r.check_in > current_date then
    raise exception 'Arrivée prévue le %, check-in impossible avant cette date', r.check_in using errcode = 'P0001';
  end if;
  if exists (select 1 from public.rooms where id = r.room_id and housekeeping_status = 'out_of_order') then
    raise exception 'Chambre hors service' using errcode = 'P0001';
  end if;

  update public.reservations
    set status = 'checked_in', checked_in_at = now()
    where id = p_reservation;
end;
$$;

create or replace function public.check_out_reservation(p_reservation uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  v_paid integer;
begin
  select * into r from public.reservations where id = p_reservation for update;
  if r is null then raise exception 'Réservation introuvable' using errcode = 'P0002'; end if;
  if not public.has_property_role(r.property_id, array['owner','general_manager','reservation_manager','front_desk']::public.app_role[]) then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;
  if r.status <> 'checked_in' then
    raise exception 'Le client n''est pas en séjour (statut : %)', r.status using errcode = 'P0001';
  end if;

  select coalesce(sum(amount), 0) into v_paid from public.payments where reservation_id = p_reservation;
  if v_paid < r.total_amount then
    raise exception 'Solde restant dû : % FCFA. Encaisser avant le départ.', r.total_amount - v_paid using errcode = 'P0001';
  end if;

  update public.reservations
    set status = 'checked_out', checked_out_at = now()
    where id = p_reservation;

  update public.rooms set housekeeping_status = 'dirty'
    where id = r.room_id and housekeeping_status <> 'out_of_order';

  insert into public.housekeeping_tasks (property_id, room_id, priority, notes)
    values (r.property_id, r.room_id, 'high', 'Départ ' || r.code);
end;
$$;

create or replace function public.cancel_reservation(p_reservation uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare r record;
begin
  select * into r from public.reservations where id = p_reservation for update;
  if r is null then raise exception 'Réservation introuvable' using errcode = 'P0002'; end if;
  if not public.has_property_role(r.property_id, array['owner','general_manager','reservation_manager','front_desk']::public.app_role[]) then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;
  if r.status not in ('option', 'confirmed') then
    raise exception 'Impossible d''annuler une réservation au statut %', r.status using errcode = 'P0001';
  end if;

  update public.reservations
    set status = 'cancelled',
        notes = concat_ws(E'\n', notes, 'Annulation : ' || nullif(trim(p_reason), ''))
    where id = p_reservation;
end;
$$;

create or replace function public.mark_no_show(p_reservation uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare r record;
begin
  select * into r from public.reservations where id = p_reservation for update;
  if r is null then raise exception 'Réservation introuvable' using errcode = 'P0002'; end if;
  if not public.has_property_role(r.property_id, array['owner','general_manager','reservation_manager','front_desk']::public.app_role[]) then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;
  if r.status not in ('option', 'confirmed') or r.check_in > current_date then
    raise exception 'No-show possible uniquement pour une arrivée confirmée et échue' using errcode = 'P0001';
  end if;
  update public.reservations set status = 'no_show' where id = p_reservation;
end;
$$;

-- Encaissement. Remboursement (montant négatif) réservé à la direction et à la finance.
create or replace function public.record_payment(
  p_reservation uuid, p_amount integer, p_method public.payment_method, p_reference text default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_property uuid;
  v_id uuid;
begin
  select property_id into v_property from public.reservations where id = p_reservation;
  if v_property is null then raise exception 'Réservation introuvable' using errcode = 'P0002'; end if;

  if p_amount > 0 and not public.has_property_role(v_property, array['owner','general_manager','reservation_manager','front_desk','accountant']::public.app_role[]) then
    raise exception 'Droits insuffisants pour encaisser' using errcode = '42501';
  end if;
  if p_amount < 0 and not public.has_property_role(v_property, array['owner','general_manager','accountant']::public.app_role[]) then
    raise exception 'Remboursement réservé à la direction et à la finance' using errcode = '42501';
  end if;
  if p_amount = 0 then raise exception 'Montant nul' using errcode = '22023'; end if;

  insert into public.payments (property_id, reservation_id, amount, method, reference, received_by)
    values (v_property, p_reservation, p_amount, p_method, nullif(trim(p_reference), ''), (select auth.uid()))
    returning id into v_id;
  return v_id;
end;
$$;

-- Émission de facture : numéro continu par établissement (verrou sur la
-- séquence, donc pas de trou même en concurrence). Le prix réservé est TTC
-- hors taxe de séjour ; la TVA est extraite du TTC.
create or replace function public.issue_invoice(p_reservation uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  p record;
  v_number integer;
  v_tax integer;
  v_vat integer;
  v_id uuid;
begin
  select * into r from public.reservations where id = p_reservation;
  if r is null then raise exception 'Réservation introuvable' using errcode = 'P0002'; end if;
  if not public.has_property_role(r.property_id, array['owner','general_manager','reservation_manager','front_desk','accountant']::public.app_role[]) then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;
  if r.status in ('cancelled', 'option') then
    raise exception 'Pas de facture pour une réservation %', r.status using errcode = 'P0001';
  end if;
  if exists (select 1 from public.invoices where reservation_id = p_reservation) then
    raise exception 'Facture déjà émise pour cette réservation' using errcode = 'P0001';
  end if;

  select * into p from public.properties where id = r.property_id;

  update public.invoice_sequences
    set next_number = next_number + 1
    where property_id = r.property_id
    returning next_number - 1 into v_number;
  if v_number is null then
    insert into public.invoice_sequences (property_id, next_number) values (r.property_id, 2);
    v_number := 1;
  end if;

  v_tax := p.tourist_tax_per_night * (r.adults + r.children) * (r.check_out - r.check_in);
  v_vat := round(r.total_amount::numeric * p.vat_rate_bp / (10000 + p.vat_rate_bp));

  insert into public.invoices (
    property_id, reservation_id, number, display_number,
    subtotal, vat_amount, tourist_tax, total, issued_by
  ) values (
    r.property_id, p_reservation, v_number,
    p.code || '-' || to_char(now(), 'YYYY') || '-' || lpad(v_number::text, 6, '0'),
    r.total_amount - v_vat, v_vat, v_tax, r.total_amount + v_tax, (select auth.uid())
  ) returning id into v_id;
  return v_id;
end;
$$;

-- Statut ménage d'une chambre. Mise hors service : direction, gouvernante, maintenance.
create or replace function public.set_room_housekeeping_status(
  p_room uuid, p_status public.housekeeping_status, p_reason text default null
) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_property uuid;
begin
  select property_id into v_property from public.rooms where id = p_room and deleted_at is null;
  if v_property is null then raise exception 'Chambre introuvable' using errcode = 'P0002'; end if;

  if p_status = 'out_of_order' or exists (select 1 from public.rooms where id = p_room and housekeeping_status = 'out_of_order') then
    if not public.has_property_role(v_property, array['owner','general_manager','housekeeping_manager','maintenance']::public.app_role[]) then
      raise exception 'Mise hors service réservée à la direction, la gouvernante et la maintenance' using errcode = '42501';
    end if;
  elsif not public.has_property_role(v_property, array['owner','general_manager','front_desk','housekeeping_manager','housekeeper']::public.app_role[]) then
    raise exception 'Droits insuffisants' using errcode = '42501';
  end if;

  update public.rooms
    set housekeeping_status = p_status,
        out_of_order_reason = case when p_status = 'out_of_order' then nullif(trim(p_reason), '') end
    where id = p_room;
end;
$$;

-- ── Droits d'exécution ──────────────────────────────────────────────────────

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.has_property_role(uuid, public.app_role[]),
  public.is_property_member(uuid),
  public.is_organization_member(uuid),
  public.create_organization_with_property(text, text, text, text),
  public.add_property(uuid, text, text, text),
  public.add_member_by_email(uuid, text, public.app_role),
  public.create_reservation(uuid, uuid, date, date, text, text, text, smallint, smallint, boolean, text, public.reservation_status),
  public.check_in_reservation(uuid),
  public.check_out_reservation(uuid),
  public.cancel_reservation(uuid, text),
  public.mark_no_show(uuid),
  public.record_payment(uuid, integer, public.payment_method, text),
  public.issue_invoice(uuid),
  public.set_room_housekeeping_status(uuid, public.housekeeping_status, text)
to authenticated;

-- Aucun accès anonyme aux tables.
revoke all on all tables in schema public from anon;
