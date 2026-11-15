-- Accès support temporaire (lecture seule, tracé) et devise par établissement.

reset role;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000bb01', 'owner@h.sn'),
  ('00000000-0000-0000-0000-00000000bb02', 'support@editeur.sn'),
  ('00000000-0000-0000-0000-00000000bb03', 'curieux@x.sn');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-00000000bb02');

set role authenticated;
select set_config('request.jwt.claim.aal', 'aal1', false);
select tests.as_user('00000000-0000-0000-0000-00000000bb01');
select public.create_organization_with_property('Groupe H', 'Hôtel H', 'HH', 'Ziguinchor') as prop \gset
insert into public.room_types (property_id, name, base_rate, capacity) values (:'prop', 'Case', 25000, 2) returning id as rt \gset
insert into public.rooms (property_id, room_type_id, number, floor) values (:'prop', :'rt', 'H1', 0) returning id as room \gset
select public.book_stay(:'prop', :'room', current_date + 1, current_date + 2, 'Client H') as resa \gset

-- Sans autorisation, le support ne voit rien.
select tests.as_user('00000000-0000-0000-0000-00000000bb02');
select tests.expect((select count(*) from public.reservations where property_id = :'prop') = 0, 'support : rien sans autorisation');
select tests.expect_error(format('select public.log_support_view(%L)', :'prop'), 'Aucun accès support');
select tests.expect_error('select * from public.platform_admins', 'permission denied');

-- Le propriétaire ouvre un accès de 4 heures.
select tests.as_user('00000000-0000-0000-0000-00000000bb01');
select public.grant_support_access(:'prop', 4, 'Facture mal imprimée, ticket 42') as grant_id \gset
select tests.expect_error(format('select public.grant_support_access(%L, 500, %L)', :'prop', 'Trop long'), '1 à 168');

-- Le support lit, mais n'écrit pas.
select tests.as_user('00000000-0000-0000-0000-00000000bb02');
select tests.expect((select count(*) from public.reservations where property_id = :'prop') = 1, 'support : lecture autorisée');
select tests.expect((select count(*) from public.support_properties()) = 1, 'établissement listé pour le support');
select public.log_support_view(:'prop');
select tests.expect_error(format('select public.cancel_reservation(%L)', :'resa'), 'Droits insuffisants');
select tests.expect_error(format('select public.report_maintenance(%L, %L, %L)', :'prop', :'room', 'Test support'), 'Droits insuffisants');
select tests.expect_error(format('insert into public.maintenance_orders (property_id, title, reported_by) values (%L, %L, %L)',
  :'prop', 'Panne', '00000000-0000-0000-0000-00000000bb02'), 'row-level security');
update public.properties set name = 'Piraté' where id = :'prop';
select tests.expect((select name = 'Hôtel H' from public.properties where id = :'prop'), 'support : aucune modification possible');

-- Un compte ordinaire n'en profite pas.
select tests.as_user('00000000-0000-0000-0000-00000000bb03');
select tests.expect((select count(*) from public.reservations where property_id = :'prop') = 0, 'autre compte : rien');

-- Révocation immédiate, consultation tracée.
select tests.as_user('00000000-0000-0000-0000-00000000bb01');
select public.revoke_support_access(:'grant_id');
select tests.expect((select count(*) from public.audit_log where property_id = :'prop' and action = 'support_view') = 1, 'consultation du support tracée');
select tests.as_user('00000000-0000-0000-0000-00000000bb02');
select tests.expect((select count(*) from public.reservations where property_id = :'prop') = 0, 'accès révoqué');

-- Devise : sans décimales seulement, verrouillée après le premier encaissement.
select tests.as_user('00000000-0000-0000-0000-00000000bb01');
select tests.expect_error(format('update public.properties set currency = %L where id = %L', 'EUR', :'prop'), 'check constraint');
update public.properties set currency = 'XAF' where id = :'prop';
select tests.expect((select currency = 'XAF' from public.properties where id = :'prop'), 'devise modifiable avant tout encaissement');
select public.record_payment(:'resa', 10000, 'wave');
select tests.expect_error(format('update public.properties set currency = %L where id = %L', 'XOF', :'prop'), 'Devise verrouillée');
reset role;

\echo 'Tests accès support et devise : OK'
