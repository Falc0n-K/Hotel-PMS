-- Supprime le compte et l'établissement de test créés lors de la recette
-- de bout en bout du 04/10/2026 (e2e-test@hotel-pms.invalid, « Hôtel Test E2E »).
-- À exécuter une fois dans Supabase → SQL Editor. Les déclencheurs sont
-- suspendus le temps de la transaction car les pièces comptables (folio)
-- sont normalement indélébiles.
begin;
set local session_replication_role = replica;
create temp table e2e_props on commit drop as
  select property_id as id from public.memberships where user_id = 'e2e00000-0000-4000-8000-000000000001';
create temp table e2e_orgs on commit drop as
  select organization_id as id from public.properties where id in (select id from e2e_props);
delete from public.notification_outbox where property_id in (select id from e2e_props);
delete from public.payment_links where property_id in (select id from e2e_props);
delete from public.folio_charges where property_id in (select id from e2e_props);
delete from public.payments where property_id in (select id from e2e_props);
delete from public.credit_notes where property_id in (select id from e2e_props);
delete from public.invoices where property_id in (select id from e2e_props);
delete from public.housekeeping_tasks where property_id in (select id from e2e_props);
delete from public.maintenance_orders where property_id in (select id from e2e_props);
delete from public.night_audits where property_id in (select id from e2e_props);
delete from public.cash_sessions where property_id in (select id from e2e_props);
delete from public.reservations where property_id in (select id from e2e_props);
delete from public.guests where property_id in (select id from e2e_props);
delete from public.rates where property_id in (select id from e2e_props);
delete from public.rate_plans where property_id in (select id from e2e_props);
delete from public.rooms where property_id in (select id from e2e_props);
delete from public.room_types where property_id in (select id from e2e_props);
delete from public.invoice_sequences where property_id in (select id from e2e_props);
delete from public.credit_note_sequences where property_id in (select id from e2e_props);
delete from public.audit_log where property_id in (select id from e2e_props) or actor_id = 'e2e00000-0000-4000-8000-000000000001';
delete from public.memberships where user_id = 'e2e00000-0000-4000-8000-000000000001';
delete from public.properties where id in (select id from e2e_props);
delete from public.organizations where id in (select id from e2e_orgs);
delete from public.profiles where id = 'e2e00000-0000-4000-8000-000000000001';
delete from auth.identities where user_id = 'e2e00000-0000-4000-8000-000000000001';
delete from auth.users where id = 'e2e00000-0000-4000-8000-000000000001';
commit;
