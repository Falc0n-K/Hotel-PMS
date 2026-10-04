-- Jeu de données volumineux pour les tests de charge (jamais en production) :
-- 1 établissement, 10 types, 500 chambres, ~10 000 réservations sur deux ans,
-- plus un type « Course » de 3 chambres réservé aux tests de concurrence.

create schema load;
create table load.errors (at timestamptz default clock_timestamp(), test text, message text);
grant usage on schema load to service_role, authenticated;
grant insert, select on load.errors to service_role, authenticated;

insert into auth.users (id, email) values ('10ad0000-0000-4000-8000-000000000001', 'owner@load.sn');
select set_config('request.jwt.claim.sub', '10ad0000-0000-4000-8000-000000000001', false);
set role authenticated;
select public.create_organization_with_property('Groupe Charge', 'Hôtel Charge', 'HCH', 'Dakar') as prop \gset
reset role;

update public.properties set booking_enabled = true, booking_slug = 'hotel-charge' where id = :'prop';
create table load.ctx as select :'prop'::uuid as property_id;
grant select on load.ctx to service_role, authenticated;

insert into public.room_types (property_id, name, base_rate, capacity)
select :'prop', 'Type ' || t, 30000 + t * 5000, 2 + (t % 3) from generate_series(1, 10) t;
insert into public.room_types (property_id, name, base_rate, capacity) values (:'prop', 'Course', 50000, 2);

insert into public.rooms (property_id, room_type_id, number, floor)
select :'prop', rt.id, (100 * ((n - 1) / 50 + 1) + (n - 1) % 50 + 1)::text, (n - 1) / 50 + 1
  from generate_series(1, 500) n
  join public.room_types rt on rt.property_id = :'prop' and rt.name = 'Type ' || ((n - 1) / 50 + 1);
insert into public.rooms (property_id, room_type_id, number, floor)
select :'prop', id, 'C' || n, 0 from public.room_types, generate_series(1, 3) n where name = 'Course' and property_id = :'prop';

-- 20 séjours par chambre, consécutifs avec un trou, d'il y a un an à dans un an.
insert into public.guests (id, property_id, full_name, email, phone)
select gen_random_uuid(), :'prop', 'Client ' || g, 'client' || g || '@exemple.sn', '+22177' || lpad(g::text, 7, '0')
  from generate_series(1, 10000) g;

with g as (
  select id, row_number() over (order by id) as n from public.guests where property_id = :'prop'
), r as (
  select r.id, r.room_type_id, row_number() over (order by r.number) as n
    from public.rooms r join public.room_types t on t.id = r.room_type_id
   where r.property_id = :'prop' and t.name <> 'Course'
), stays as (
  select r.id as room_id, s,
         current_date - 365 + (s - 1) * 36 + (r.n % 7)::int as check_in,
         2 + ((r.n + s) % 5)::int as nights,
         (r.n - 1) * 20 + s as k
    from r, generate_series(1, 20) s
)
insert into public.reservations (property_id, code, guest_id, room_id, check_in, check_out, adults, status, nightly_rate, total_amount, source)
select :'prop', 'S' || lpad(k::text, 6, '0'), g.id, st.room_id, st.check_in, st.check_in + st.nights, 2,
       case when st.check_in + st.nights <= current_date then 'checked_out'
            when st.check_in <= current_date then 'checked_in'
            else 'confirmed' end::public.reservation_status,
       45000, 45000 * st.nights,
       (array['direct','booking_com','phone','website','airbnb'])[1 + (k % 5)]::public.booking_source
  from stays st join g on g.n = st.k;

analyze;

-- Enveloppes qui transforment une erreur métier en résultat compté.
create function load.try_book_type(p_test text, p_type uuid, p_in date, p_out date) returns boolean
language plpgsql as $$
begin
  perform public.book_room_type((select property_id from load.ctx), p_type, p_in, p_out, 2::smallint, 0::smallint,
                                'Client concurrent', null, null, null, 'website', 'option');
  return true;
exception when others then
  insert into load.errors (test, message) values (p_test, sqlerrm);
  return false;
end $$;

create function load.try_book_room(p_test text, p_room uuid, p_in date, p_out date) returns boolean
language plpgsql as $$
begin
  perform public.book_stay((select property_id from load.ctx), p_room, p_in, p_out, 'Client réception');
  return true;
exception when others then
  insert into load.errors (test, message) values (p_test, sqlerrm);
  return false;
end $$;

grant execute on all functions in schema load to service_role, authenticated;

select (select count(*) from public.rooms where property_id = :'prop') as chambres,
       (select count(*) from public.reservations where property_id = :'prop') as reservations;
