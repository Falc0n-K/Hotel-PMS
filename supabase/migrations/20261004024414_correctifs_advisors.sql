-- Suites des avis Supabase après le socle.

-- Les fonctions de trigger ne doivent pas être appelables par /rest/v1/rpc.
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.write_audit_log() from authenticated;
revoke execute on function public.touch_updated_at() from authenticated;
revoke execute on function public.forbid_change() from authenticated;

-- Index des clés étrangères vers auth.users.
create index if not exists housekeeping_tasks_assigned_idx on public.housekeeping_tasks(assigned_to);
create index if not exists invoices_issued_by_idx on public.invoices(issued_by);
create index if not exists maintenance_orders_reported_by_idx on public.maintenance_orders(reported_by);
create index if not exists payments_received_by_idx on public.payments(received_by);
create index if not exists reservations_created_by_idx on public.reservations(created_by);
