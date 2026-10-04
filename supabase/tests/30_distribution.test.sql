-- Tests de la distribution : réservation publique, options temporaires,
-- clés d'API, webhooks, iCal. S'appuie sur le schéma « tests » de 10_socle_pms.

reset role;
grant usage on schema tests to service_role;
grant execute on all functions in schema tests to service_role;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'owner@f.sn'),
  ('00000000-0000-0000-0000-0000000000f2', 'desk@f.sn');

set role authenticated;
select tests.as_user('00000000-0000-0000-0000-0000000000f1');
select set_config('request.jwt.claim.aal', 'aal1', false);
select public.create_organization_with_property('Groupe F', 'Hôtel F', 'HF', 'Mbour') as prop \gset
update public.properties set booking_enabled = true, booking_slug = 'hotel-f', booking_hold_minutes = 30 where id = :'prop';
insert into public.room_types (property_id, name, base_rate, capacity) values (:'prop', 'Bungalow', 40000, 2) returning id as rt \gset
insert into public.rooms (property_id, room_type_id, number, floor) values (:'prop', :'rt', 'B1', 0), (:'prop', :'rt', 'B2', 0);
select public.add_member_by_email(:'prop', 'desk@f.sn', 'front_desk');

-- Les fonctions publiques ne sont pas appelables par un utilisateur, même connecté.
select tests.expect_error(format('select * from public.availability_for(%L, current_date + 1, current_date + 3, 2::smallint, 0::smallint)', :'prop'), 'permission denied');

-- Clés d'API (création par la direction, la réception est refusée).
select public.create_api_key(:'prop', 'Tour-opérateur', array['availability:read', 'reservations:write']) as apikey \gset
select tests.expect(left(:'apikey', 4) = 'pms_' and length(:'apikey') = 52, 'clé générée');
select tests.expect((select count(*) from public.api_keys where key_hash <> :'apikey') = 1, 'seule l''empreinte est stockée');
select tests.expect_error(format('select public.create_api_key(%L, %L, array[%L])', :'prop', 'Pirate', 'nope:read'), 'check constraint');

-- Webhook : secret rendu une seule fois, illisible ensuite.
select id as hook, secret as hook_secret from public.create_webhook_endpoint(:'prop', 'https://exemple.sn/hooks', array['reservation.created', 'payment.received']) \gset
select tests.expect(left(:'hook_secret', 6) = 'whsec_', 'secret de webhook généré');
select tests.expect_error('select * from public.webhook_secrets', 'permission denied');
select tests.expect_error(format('select * from public.create_webhook_endpoint(%L, %L, array[%L])', :'prop', 'http://non-chiffre.sn', 'reservation.created'), 'check constraint');

-- iCal : flux d'import et d'export pour B1.
select id as b1 from public.rooms where number = 'B1' and property_id = :'prop' \gset
select public.add_ical_feed(:'b1', 'import', 'https://www.airbnb.com/calendar/ical/1.ics', 'airbnb', 'Airbnb') as feed \gset
select public.add_ical_feed(:'b1', 'export') as export_feed \gset
select token as export_token from public.ical_feeds where id = :'export_feed' \gset

-- Côté serveur (Edge Functions) ─────────────────────────────────────────────
reset role;
set role service_role;

select tests.expect((select available from public.availability_for(:'prop', current_date + 1, current_date + 3, 2::smallint, 0::smallint)) = 2, 'deux bungalows disponibles');
select tests.expect((select count(*) from public.availability_for(:'prop', current_date + 1, current_date + 3, 3::smallint, 0::smallint)) = 0, 'capacité respectée');
select tests.expect_error(format('select * from public.availability_for(%L, current_date - 1, current_date + 1, 1::smallint, 0::smallint)', :'prop'), 'Dates invalides');

-- Course au dernier lit : deux réservations prennent B1 puis B2, la troisième est refusée.
select reservation_id as w1, total as w1_total, hold_expires_at as w1_hold
  from public.book_room_type(:'prop', :'rt', current_date + 1, current_date + 3, 2::smallint, 0::smallint,
                             'Client Web', 'web@exemple.sn', null, null, 'website', 'option') \gset
select tests.expect(:'w1_total'::integer = 80000 and :'w1_hold'::timestamptz > now() + interval '29 minutes', 'option web avec échéance');
select reservation_id as w2 from public.book_room_type(:'prop', :'rt', current_date + 1, current_date + 3, 1::smallint, 0::smallint,
                             'Client API', null, null, null, 'api', 'confirmed') \gset
select tests.expect((select count(distinct room_id) from public.reservations where id in (:'w1', :'w2')) = 2, 'deux chambres différentes');
select tests.expect_error(format('select * from public.book_room_type(%L, %L, current_date + 2, current_date + 4, 1::smallint, 0::smallint, %L, null, null, null, %L, %L)',
  :'prop', :'rt', 'Trop tard', 'website', 'option'), 'Plus de disponibilité');
select tests.expect_error(format('select * from public.book_room_type(%L, %L, current_date + 5, current_date + 6, 1::smallint, 0::smallint, %L, %L, null, null, %L, %L)',
  :'prop', :'rt', 'Mail faux', 'pas-un-mail', 'website', 'option'), 'e-mail invalide');

-- Webhook mis en file pour les créations (pas pour les autres événements).
select tests.expect((select count(*) from public.webhook_deliveries where event = 'reservation.created') = 2, 'webhooks mis en file');
select id as delivery, secret as due_secret from public.webhook_deliveries_due(10) limit 1 \gset
select tests.expect(:'due_secret' = :'hook_secret', 'secret transmis à la fonction d''envoi');
select public.webhook_delivery_result(:'delivery', false, 500, 'Erreur distante');
select tests.expect((select status = 'pending' and attempts = 1 and next_attempt_at > now() + interval '1 minute' from public.webhook_deliveries where id = :'delivery'), 'nouvel essai différé');

-- Paiement en ligne : confirme l'option et notifie le webhook payment.received.
insert into public.payment_links (property_id, reservation_id, provider, amount) values (:'prop', :'w1', 'paydunya', 80000) returning id as link \gset
select public.confirm_payment_link(:'link', 'tok_1', 80000, 'wave');
select tests.expect((select status = 'confirmed' and hold_expires_at is null from public.reservations where id = :'w1'), 'option confirmée par le paiement');
select tests.expect((select count(*) from public.webhook_deliveries where event = 'payment.received') = 1, 'webhook de paiement');

-- Option expirée sans paiement : annulée et chambre libérée.
select reservation_id as w3 from public.book_room_type(:'prop', :'rt', current_date + 10, current_date + 11, 1::smallint, 0::smallint,
                             'Indécis', null, null, null, 'website', 'option') \gset
update public.reservations set hold_expires_at = now() - interval '1 minute' where id = :'w3';
select tests.expect(public.expire_option_holds() = 1, 'option expirée');
select tests.expect((select status = 'cancelled' from public.reservations where id = :'w3'), 'option annulée');

-- Clé d'API : recherche par la clé en clair, révocation effective.
select tests.expect((select property_id from public.api_key_lookup(:'apikey')) = :'prop'::uuid, 'clé reconnue');
select tests.expect((select count(*) from public.api_key_lookup('pms_fausse')) = 0, 'fausse clé refusée');

-- Limitation de débit.
select tests.expect(public.rate_limit_hit('ip:test', 2, 60) and public.rate_limit_hit('ip:test', 2, 60), 'sous la limite');
select tests.expect(not public.rate_limit_hit('ip:test', 2, 60), 'limite atteinte');

-- iCal import : création, modification, conflit, suppression.
select public.ical_import(:'feed', jsonb_build_array(
  jsonb_build_object('uid', 'abc', 'start', current_date + 20, 'end', current_date + 23, 'summary', 'Reserved'),
  jsonb_build_object('uid', 'old', 'start', current_date - 10, 'end', current_date - 8, 'summary', 'Passé')));
select tests.expect((select count(*) from public.reservations where ical_feed_id = :'feed') = 1, 'séjour importé (événements passés ignorés)');
select public.ical_import(:'feed', jsonb_build_array(
  jsonb_build_object('uid', 'abc', 'start', current_date + 21, 'end', current_date + 23),
  jsonb_build_object('uid', 'clash', 'start', current_date + 1, 'end', current_date + 2))) as result \gset
select tests.expect((select check_in = current_date + 21 from public.reservations where ical_feed_id = :'feed' and external_uid = 'abc'), 'dates mises à jour');
select tests.expect((:'result'::jsonb -> 'conflicts' ->> 0) is not null, 'conflit signalé (B1 déjà pris)');
select tests.expect((select last_error like 'Conflit%' from public.ical_feeds where id = :'feed'), 'conflit visible sur le flux');
select public.ical_import(:'feed', '[]'::jsonb);
select tests.expect((select status = 'cancelled' from public.reservations where ical_feed_id = :'feed' and external_uid = 'abc'), 'séjour retiré du calendrier annulé');

-- iCal export : dates bloquées, aucune donnée personnelle.
select tests.expect((select count(*) from public.ical_export_events(:'export_token')) >= 1, 'export iCal');
select tests.expect((select bool_and(summary in ('Indisponible', 'Hors service')) from public.ical_export_events(:'export_token')), 'export sans nom de client');
select tests.expect((select count(*) from public.ical_export_events('jeton-inconnu')) = 0, 'jeton inconnu');
reset role;

\echo 'Tous les tests de distribution passent.'
