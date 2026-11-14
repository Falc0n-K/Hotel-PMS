-- ============================================================================
-- Langue du client (messages en français ou en anglais) et lien vers la
-- politique de confidentialité de l'établissement (page de réservation).
-- ============================================================================

alter table public.guests
  add column language text not null default 'fr' check (language in ('fr', 'en'));
comment on column public.guests.language is 'Langue des messages envoyés au client';

alter table public.properties
  add column privacy_url text check (privacy_url is null or privacy_url ~ '^https://[^\s]+$');
comment on column public.properties.privacy_url is 'Politique de confidentialité, liée depuis la page de réservation';

-- Les messages partent dans la langue du client.
create or replace function public.enqueue_reservation_notifications(p_reservation uuid, p_template text)
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  v_count integer := 0;
  v_payload jsonb;
begin
  select res.id, res.property_id, res.code, res.check_in, res.check_out, res.total_amount,
         g.full_name, g.email, g.phone, g.language, p.name as property_name, p.notify_email, p.notify_sms, p.notify_whatsapp,
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
    'room_number', r.room_number, 'property_phone', r.property_phone, 'currency', r.currency, 'language', r.language);

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


revoke execute on all functions in schema public from public, anon;
