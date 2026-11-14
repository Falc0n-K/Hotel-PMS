-- Revue de sécurité : cloisonnement des fonctions de calcul, gestion de
-- l'équipe, unicité des références de réservation.

reset role;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000ee01', 'owner@s.sn'),
  ('00000000-0000-0000-0000-00000000ee02', 'dg@s.sn'),
  ('00000000-0000-0000-0000-00000000ee03', 'intrus@xs.sn');

set role authenticated;
select tests.as_user('00000000-0000-0000-0000-00000000ee01');
select set_config('request.jwt.claim.aal', 'aal1', false);
select public.create_organization_with_property('Groupe E', 'Hôtel E', 'HE', 'Thiès') as prop \gset
insert into public.room_types (property_id, name, base_rate, capacity) values (:'prop', 'Standard', 30000, 2) returning id as rt \gset
insert into public.rooms (property_id, room_type_id, number, floor) values (:'prop', :'rt', 'E1', 1) returning id as room \gset
select public.book_stay(:'prop', :'room', current_date + 1, current_date + 3, 'Client E') as resa \gset
select public.add_member_by_email(:'prop', 'dg@s.sn', 'general_manager');
select tests.expect(public.price_stay(:'rt', null, current_date + 1, current_date + 3) = 60000, 'prix pour un membre');
select tests.expect(public.reservation_balance(:'resa') = 60000, 'solde pour un membre');

-- Un compte d'un autre établissement ne lit ni prix, ni blocage, ni solde.
select tests.as_user('00000000-0000-0000-0000-00000000ee03');
select tests.expect_error(format('select public.price_stay(%L, null, current_date + 1, current_date + 3)', :'rt'), 'introuvable');
select tests.expect_error(format('select public.room_is_blocked(%L, current_date, current_date + 1)', :'room'), 'introuvable');
select tests.expect_error(format('select public.reservation_balance(%L)', :'resa'), 'introuvable');
select tests.expect_error(format('select public.price_stay_unchecked(%L, null, current_date + 1, current_date + 3)', :'rt'), 'permission denied');

-- Le directeur ne rétrograde pas le propriétaire et ne se promeut pas.
select tests.as_user('00000000-0000-0000-0000-00000000ee02');
select tests.expect_error(format('select public.add_member_by_email(%L, %L, %L)', :'prop', 'owner@s.sn', 'housekeeper'), 'propriétaire');
select tests.expect_error(format('select public.add_member_by_email(%L, %L, %L)', :'prop', 'dg@s.sn', 'accountant'), 'propre rôle');
select tests.expect_error(format('select public.add_member_by_email(%L, %L, %L)', :'prop', 'intrus@xs.sn', 'owner'), 'Droits insuffisants');
select tests.expect((select role = 'owner' from public.memberships where user_id = '00000000-0000-0000-0000-00000000ee01' and property_id = :'prop'), 'propriétaire intact');

-- Référence déjà prise : une nouvelle est tirée au lieu d'échouer.
reset role;
select code as taken from public.reservations where id = :'resa' \gset
insert into public.reservations (property_id, code, guest_id, room_id, check_in, check_out, nightly_rate, total_amount)
  select :'prop', :'taken', guest_id, room_id, current_date + 10, current_date + 11, 30000, 30000 from public.reservations where id = :'resa'
  returning code as fresh \gset
select tests.expect(:'fresh' <> :'taken' and left(:'fresh', 8) = left(:'taken', 8), 'référence renouvelée en cas de collision');

\echo 'Tests de la revue de sécurité : OK'
