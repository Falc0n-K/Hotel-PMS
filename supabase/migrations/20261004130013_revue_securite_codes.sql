-- ============================================================================
-- Revue de sécurité interne et tests de charge (voir docs/securite.md).
-- ============================================================================

-- 1. Cloisonnement des fonctions de calcul ───────────────────────────────────
-- price_stay, room_is_blocked et reservation_balance répondaient pour n'importe
-- quel identifiant, y compris d'un autre établissement (les identifiants de
-- types de chambre sont publics via le moteur de réservation). Les versions
-- d'origine deviennent internes ; les fonctions publiques vérifient l'appelant.
-- Sans utilisateur (service_role : moteur public, API, tâches planifiées), le
-- contrôle est fait en amont par la fonction appelante.

alter function public.price_stay(uuid, uuid, date, date) rename to price_stay_unchecked;
alter function public.room_is_blocked(uuid, date, date) rename to room_is_blocked_unchecked;
alter function public.reservation_balance(uuid) rename to reservation_balance_unchecked;
revoke execute on function
  public.price_stay_unchecked(uuid, uuid, date, date),
  public.room_is_blocked_unchecked(uuid, date, date),
  public.reservation_balance_unchecked(uuid)
from public, anon, authenticated;

create or replace function public.price_stay(p_room_type uuid, p_rate_plan uuid, p_check_in date, p_check_out date)
returns integer language plpgsql stable security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not exists (
    select 1 from public.room_types t where t.id = p_room_type and public.is_property_member(t.property_id)) then
    raise exception 'Type de chambre introuvable' using errcode = 'P0002';
  end if;
  return public.price_stay_unchecked(p_room_type, p_rate_plan, p_check_in, p_check_out);
end;
$$;

create or replace function public.room_is_blocked(p_room uuid, p_check_in date, p_check_out date)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not exists (
    select 1 from public.rooms r where r.id = p_room and public.is_property_member(r.property_id)) then
    raise exception 'Chambre introuvable' using errcode = 'P0002';
  end if;
  return public.room_is_blocked_unchecked(p_room, p_check_in, p_check_out);
end;
$$;

create or replace function public.reservation_balance(p_reservation uuid)
returns integer language plpgsql stable security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not exists (
    select 1 from public.reservations r where r.id = p_reservation and public.is_property_member(r.property_id)) then
    raise exception 'Réservation introuvable' using errcode = 'P0002';
  end if;
  return public.reservation_balance_unchecked(p_reservation);
end;
$$;

revoke execute on function
  public.price_stay(uuid, uuid, date, date),
  public.room_is_blocked(uuid, date, date),
  public.reservation_balance(uuid)
from public, anon;
grant execute on function
  public.price_stay(uuid, uuid, date, date),
  public.room_is_blocked(uuid, date, date),
  public.reservation_balance(uuid)
to authenticated, service_role;

-- 2. Équipe : un directeur ne peut pas rétrograder le propriétaire ───────────
-- add_member_by_email met à jour le rôle d'un membre existant (on conflict) :
-- le contrôle « rôle demandé <> owner » ne protégeait pas le rôle actuel.

create or replace function public.add_member_by_email(
  p_property uuid, p_email text, p_role public.app_role
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
  v_id uuid;
  v_is_owner boolean := public.has_property_role(p_property, array['owner']::public.app_role[]);
begin
  if not (v_is_owner or (public.has_property_role(p_property, array['general_manager']::public.app_role[]) and p_role <> 'owner')) then
    raise exception 'Droits insuffisants pour gérer l''équipe' using errcode = '42501';
  end if;

  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'Aucun compte avec cet e-mail. La personne doit d''abord créer son compte.' using errcode = 'P0002';
  end if;
  if not v_is_owner and exists (
    select 1 from public.memberships where user_id = v_user and property_id = p_property and role = 'owner') then
    raise exception 'Seul un propriétaire peut modifier le rôle d''un propriétaire' using errcode = '42501';
  end if;
  if v_user = (select auth.uid()) and not v_is_owner then
    raise exception 'Vous ne pouvez pas modifier votre propre rôle' using errcode = '42501';
  end if;

  insert into public.memberships (user_id, property_id, role)
    values (v_user, p_property, p_role)
    on conflict (user_id, property_id) do update set role = excluded.role
    returning id into v_id;
  return v_id;
end;
$$;

-- 3. Références de réservation sans collision ────────────────────────────────
-- Les références (R/W/I + date + 5 caractères aléatoires) entraient en
-- collision sous charge (≈ 1 % à 3 000 réservations le même jour) : la
-- réservation échouait sur la contrainte d'unicité. On retire au sort tant
-- que la référence existe déjà dans l'établissement.

create or replace function public.ensure_unique_reservation_code()
returns trigger language plpgsql set search_path = ''
as $$
begin
  while exists (select 1 from public.reservations where property_id = new.property_id and code = new.code) loop
    new.code := left(new.code, 8) || upper(substr(md5(gen_random_uuid()::text), 1, 5));
  end loop;
  return new;
end;
$$;
revoke execute on function public.ensure_unique_reservation_code() from public, anon, authenticated;

create trigger reservations_unique_code before insert on public.reservations
  for each row execute function public.ensure_unique_reservation_code();
