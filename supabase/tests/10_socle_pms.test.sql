-- Tests du socle : isolation entre établissements, rôles, anti-surbooking,
-- solde au départ, facturation. Chaque échec lève une exception (psql
-- ON_ERROR_STOP=1 fait alors échouer la CI).

create schema tests;

create function tests.as_user(p uuid) returns void language sql
  as $$ select set_config('request.jwt.claim.sub', p::text, false) $$;

-- Attend une erreur dont le message contient p_pattern.
create function tests.expect_error(p_sql text, p_pattern text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'ÉCHEC : aucune erreur pour « % »', p_sql;
exception when others then
  if sqlerrm like 'ÉCHEC%' then raise; end if;
  if position(lower(p_pattern) in lower(sqlerrm)) = 0 then
    raise exception 'ÉCHEC : erreur inattendue pour « % » : %', p_sql, sqlerrm;
  end if;
end $$;

create function tests.expect(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'ÉCHEC : %', p_label; end if;
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'owner@a.sn'),
  ('00000000-0000-0000-0000-00000000000b', 'owner@b.sn'),
  ('00000000-0000-0000-0000-00000000000c', 'desk@a.sn'),
  ('00000000-0000-0000-0000-00000000000d', 'menage@a.sn');

select tests.expect((select count(*) from public.profiles) = 4, 'profil créé à l''inscription');

grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;
set role authenticated;

-- Propriétaire A : onboarding, catalogue, équipe.
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select public.create_organization_with_property('Groupe A', 'Royal Saly', 'RS', 'Saly') as prop_a \gset
insert into public.room_types (property_id, name, base_rate) values (:'prop_a', 'Standard', 75000) returning id as rt \gset
insert into public.rooms (property_id, room_type_id, number, floor) values (:'prop_a', :'rt', '101', 1) returning id as room \gset
select public.add_member_by_email(:'prop_a', 'desk@a.sn', 'front_desk');
select public.add_member_by_email(:'prop_a', 'menage@a.sn', 'housekeeper');

-- Propriétaire B : ne voit rien de A, ne peut rien y écrire.
select tests.as_user('00000000-0000-0000-0000-00000000000b');
select public.create_organization_with_property('Groupe B', 'Autre Hôtel', 'AH', null);
select tests.expect((select count(*) from public.rooms) = 0, 'B ne voit pas les chambres de A');
select tests.expect((select count(*) from public.properties) = 1, 'B ne voit que son établissement');
select tests.expect_error(format('select public.create_reservation(%L, %L, current_date, current_date + 2, %L)', :'prop_a', :'room', 'Intrus'), 'Droits insuffisants');
select tests.expect_error(format('select public.add_member_by_email(%L, %L, %L)', :'prop_a', 'owner@b.sn', 'owner'), 'Droits insuffisants');

-- Réception A.
select tests.as_user('00000000-0000-0000-0000-00000000000c');
select public.create_reservation(:'prop_a', :'room', current_date, current_date + 2, 'Awa Ndiaye', 'awa@exemple.sn', null, 2::smallint, 0::smallint, true) as res \gset
select tests.expect((select total_amount from public.reservations where id = :'res') = 75000 * 2 + 8500 * 2 * 2, 'prix calculé côté serveur');
select tests.expect_error(format('select public.create_reservation(%L, %L, current_date + 1, current_date + 3, %L)', :'prop_a', :'room', 'Surbooking'), 'déjà réservée');
select public.create_reservation(:'prop_a', :'room', current_date + 2, current_date + 4, 'Enchaînement');
select tests.expect_error(format('insert into public.room_types (property_id, name, base_rate) values (%L, %L, 1)', :'prop_a', 'Pirate'), 'row-level security');
update public.rooms set floor = 9;
select tests.expect((select count(*) from public.rooms where floor = 9) = 0, 'la réception ne modifie pas les chambres');

select public.check_in_reservation(:'res');
select tests.expect_error(format('select public.check_out_reservation(%L)', :'res'), 'Solde restant dû');
select public.record_payment(:'res', 184000, 'wave', 'TX1');
select tests.expect_error(format('select public.record_payment(%L, -1000, %L)', :'res', 'cash'), 'Remboursement réservé');
select public.check_out_reservation(:'res');
select tests.expect((select housekeeping_status = 'dirty' from public.rooms where id = :'room'), 'chambre sale après départ');
select tests.expect((select count(*) from public.housekeeping_tasks) = 1, 'tâche de ménage créée au départ');

select public.issue_invoice(:'res');
select tests.expect((select display_number from public.invoices) = 'RS-' || to_char(now(), 'YYYY') || '-000001', 'numéro de facture continu');
select tests.expect((select subtotal + vat_amount = 184000 and vat_amount = 28068 from public.invoices), 'TVA 18 % extraite du TTC');
select tests.expect_error(format('select public.issue_invoice(%L)', :'res'), 'déjà émise');
delete from public.payments;
select tests.expect((select count(*) from public.payments) = 1, 'un paiement ne se supprime pas');

-- Ménage A : pas de données personnelles ni financières.
select tests.as_user('00000000-0000-0000-0000-00000000000d');
select tests.expect((select count(*) from public.guests) = 0, 'le ménage ne voit pas les clients');
select tests.expect((select count(*) from public.payments) = 0, 'le ménage ne voit pas les paiements');
select tests.expect((select count(*) from public.audit_log) = 0, 'le ménage ne voit pas le journal');
select public.set_room_housekeeping_status(:'room', 'clean');
select tests.expect_error(format('select public.set_room_housekeeping_status(%L, %L, %L)', :'room', 'out_of_order', 'fuite'), 'Mise hors service réservée');

-- Journal : visible par le propriétaire.
select tests.as_user('00000000-0000-0000-0000-00000000000a');
select tests.expect((select count(*) from public.audit_log where table_name = 'reservations') >= 3, 'journal des réservations');

-- Anonyme : aucun accès.
reset role;
set role anon;
select tests.expect_error('select count(*) from public.rooms', 'permission denied');
reset role;

\echo 'Tous les tests du socle passent.'
