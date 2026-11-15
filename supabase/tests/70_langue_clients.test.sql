-- Langue du client transmise aux messages, lien de confidentialité contrôlé.

reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000cc01', 'owner@l.sn');
set role authenticated;
select set_config('request.jwt.claim.aal', 'aal1', false);
select tests.as_user('00000000-0000-0000-0000-00000000cc01');
select public.create_organization_with_property('Groupe L', 'Hôtel L', 'HL', 'Kaolack') as prop \gset
update public.properties set notify_email = true where id = :'prop';
insert into public.room_types (property_id, name, base_rate, capacity) values (:'prop', 'Simple', 20000, 2) returning id as rt \gset
insert into public.rooms (property_id, room_type_id, number, floor) values (:'prop', :'rt', 'L1', 0) returning id as room \gset

-- Client anglophone : la confirmation porte language = en.
insert into public.guests (property_id, full_name, email, language) values (:'prop', 'John Smith', 'john@example.com', 'en') returning id as guest \gset
select public.book_stay(:'prop', :'room', current_date + 1, current_date + 2, p_guest_id => :'guest') as resa \gset
reset role;
select tests.expect((select payload ->> 'language' = 'en' from public.notification_outbox where reservation_id = :'resa' limit 1), 'message en anglais pour un client anglophone');
set role authenticated;
select tests.as_user('00000000-0000-0000-0000-00000000cc01');
select tests.expect_error(format('insert into public.guests (property_id, full_name, language) values (%L, %L, %L)', :'prop', 'Hans', 'de'), 'check constraint');

-- Lien de confidentialité : HTTPS uniquement.
update public.properties set privacy_url = 'https://hotel-l.sn/confidentialite' where id = :'prop';
select tests.expect_error(format('update public.properties set privacy_url = %L where id = %L', 'http://hotel-l.sn', :'prop'), 'check constraint');
reset role;

\echo 'Tests langue des clients : OK'
