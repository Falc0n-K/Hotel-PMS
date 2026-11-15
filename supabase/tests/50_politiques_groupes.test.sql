-- Conditions d'annulation et de no-show, verrouillage optimiste, groupes,
-- import, purge automatique.

reset role;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000aa01', 'owner@g.sn'),
  ('00000000-0000-0000-0000-00000000aa02', 'desk@g.sn');

set role authenticated;
select tests.as_user('00000000-0000-0000-0000-00000000aa01');
select set_config('request.jwt.claim.aal', 'aal1', false);
select public.create_organization_with_property('Groupe G', 'Hôtel G', 'HG', 'Saint-Louis') as prop \gset
select public.add_member_by_email(:'prop', 'desk@g.sn', 'front_desk');
insert into public.room_types (property_id, name, base_rate, capacity) values (:'prop', 'Double', 20000, 2) returning id as rt \gset
insert into public.rooms (property_id, room_type_id, number, floor)
  select :'prop', :'rt', 'G' || n, 1 from generate_series(1, 6) n;
select id as g1 from public.rooms where property_id = :'prop' and number = 'G1' \gset
-- Plan par défaut : annulation gratuite jusqu'à 3 jours avant, 2 nuits sinon, no-show 1 nuit, acompte 30 %.
update public.rate_plans set cancel_free_days = 3, cancel_fee_nights = 2, no_show_fee_nights = 1, deposit_percent = 30
 where property_id = :'prop' and is_default;

-- Annulation gratuite (loin de l'arrivée).
select public.book_stay(:'prop', :'g1', current_date + 10, current_date + 13, 'Client loin') as far \gset
select tests.expect(public.cancel_reservation(:'far', 'Changement de programme') = 0, 'annulation gratuite');
select tests.expect(public.reservation_balance(:'far') = 0, 'solde nul après annulation gratuite');

-- Annulation tardive : 2 nuits facturées, puis facture des seuls frais.
select public.book_stay(:'prop', :'g1', current_date + 1, current_date + 4, 'Client tardif') as late \gset
select tests.expect(public.penalty_amount(:'late', 'cancellation') = 40000, 'pénalité calculée');
select tests.expect(public.cancel_reservation(:'late') = 40000, 'annulation tardive facturée');
select tests.expect(public.reservation_balance(:'late') = 40000, 'solde = frais seulement');
select public.issue_invoice(:'late') as inv \gset
select tests.expect((select total = 40000 and tourist_tax = 0 and jsonb_array_length(lines) = 1 from public.invoices where id = :'inv'),
  'facture des frais sans hébergement ni taxe de séjour');

-- Une option n'est jamais pénalisée ; la réception ne peut pas exonérer.
select public.book_stay(:'prop', :'g1', current_date + 1, current_date + 2, 'Option', p_status => 'option') as opt \gset
select tests.expect(public.cancel_reservation(:'opt') = 0, 'option annulée sans frais');
select tests.as_user('00000000-0000-0000-0000-00000000aa02');
select public.book_stay(:'prop', :'g1', current_date + 1, current_date + 2, 'Client X') as x \gset
select tests.expect_error(format('select public.cancel_reservation(%L, null, true)', :'x'), 'Exonération');
select tests.as_user('00000000-0000-0000-0000-00000000aa01');
select tests.expect(public.cancel_reservation(:'x', 'Geste', true) = 0, 'direction : frais exonérés');

-- No-show : 1 nuit.
select public.book_stay(:'prop', :'g1', current_date, current_date + 2, 'Absent') as ns \gset
select tests.expect(public.mark_no_show(:'ns') = 20000, 'no-show facturé une nuit');
select tests.expect(public.reservation_balance(:'ns') = 20000, 'solde no-show');

-- Verrouillage optimiste.
select public.book_stay(:'prop', :'g1', current_date + 20, current_date + 22, 'Client verrou') as lk \gset
select updated_at as seen from public.reservations where id = :'lk' \gset
select public.update_reservation(:'lk', :'g1', current_date + 20, current_date + 23, 2::smallint, 0::smallint, false, 'Prolongé', p_expected_updated_at => :'seen');
select tests.expect_error(format('select public.update_reservation(%L, %L, current_date + 20, current_date + 21, 2::smallint, 0::smallint, false, null, p_expected_updated_at => %L)',
  :'lk', :'g1', :'seen'), 'modifiée entre-temps');

-- Groupe : 4 chambres en option, tout ou rien.
select public.book_group(:'prop', 'Séminaire Sonatel', current_date + 30, current_date + 32,
  jsonb_build_array(jsonb_build_object('room_type_id', :'rt', 'count', 4)), 'Awa Diop', 'awa@exemple.sn') as grp \gset
select tests.expect((select count(distinct room_id) from public.reservations where group_id = :'grp' and status = 'option') = 4, 'quatre chambres en option');
select tests.expect((select count(distinct guest_id) from public.reservations where group_id = :'grp') = 4, 'une fiche client par chambre');
select tests.expect_error(format('select public.book_group(%L, %L, current_date + 30, current_date + 31, %L::jsonb)',
  :'prop', 'Trop gros', jsonb_build_array(jsonb_build_object('room_type_id', :'rt', 'count', 3))::text), 'Pas assez de chambres');
select tests.expect((select count(*) from public.reservation_groups where property_id = :'prop') = 1, 'groupe refusé non créé (tout ou rien)');
select tests.expect(public.confirm_group(:'grp') = 4, 'groupe confirmé');
select tests.expect(public.cancel_group(:'grp', 'Séminaire reporté') = 0, 'groupe annulé sans frais (loin de l''arrivée)');
select tests.as_user('00000000-0000-0000-0000-00000000aa02');
select tests.expect_error(format('select public.book_group(%L, %L, current_date + 40, current_date + 41, %L::jsonb)',
  :'prop', 'Réception', jsonb_build_array(jsonb_build_object('room_type_id', :'rt', 'count', 1))::text), 'Groupes réservés');

-- Import : montant conservé, pas de message envoyé, chevauchement refusé.
select tests.as_user('00000000-0000-0000-0000-00000000aa01');
update public.properties set notify_email = true where id = :'prop';
select public.import_reservation(:'prop', 'G2', 'Client repris', current_date + 50, current_date + 53, 99000, 'repris@exemple.sn') as imp \gset
select tests.expect((select total_amount = 99000 and code like 'M%' from public.reservations where id = :'imp'), 'montant d''origine conservé');
select tests.expect((select count(*) from public.notification_outbox where reservation_id = :'imp') = 0, 'aucun message pour un import');
select tests.expect_error(format('select public.import_reservation(%L, %L, %L, current_date + 51, current_date + 52, 1000)', :'prop', 'G2', 'Doublon'), 'déjà occupée');
select tests.expect_error(format('select public.import_reservation(%L, %L, %L, current_date + 51, current_date + 52, 1000)', :'prop', 'Z9', 'Inconnu'), 'inconnue');

-- Purge automatique : seulement si activée et au-delà de la durée.
reset role;
insert into public.guests (property_id, full_name, email, created_at) values (:'prop', 'Très ancien', 'vieux@exemple.sn', now() - interval '5 years');
select tests.expect(public.purge_expired_guests() = 0, 'purge inactive par défaut');
update public.properties set auto_anonymize = true, guest_retention_months = 36 where id = :'prop';
select tests.expect(public.purge_expired_guests() = 1, 'client ancien anonymisé');
select tests.expect((select full_name = 'Client anonymisé' and email is null from public.guests where property_id = :'prop' and created_at < now() - interval '4 years'), 'données effacées');
set role authenticated;
select tests.expect_error('select public.purge_expired_guests()', 'permission denied');
reset role;

\echo 'Tests des politiques, groupes et import : OK'
