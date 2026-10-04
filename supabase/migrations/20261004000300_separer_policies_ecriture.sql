-- Une policy « for all » chevauche la policy de lecture (avis de performance
-- multiple_permissive_policies) : on sépare les écritures. Même périmètre de
-- droits qu'avant, seule l'évaluation change.
drop policy room_types_write on public.room_types;
create policy room_types_insert on public.room_types for insert to authenticated
  with check (public.has_property_role(property_id, array['owner','general_manager']::public.app_role[]));
create policy room_types_update on public.room_types for update to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager']::public.app_role[]))
  with check (public.has_property_role(property_id, array['owner','general_manager']::public.app_role[]));
create policy room_types_delete on public.room_types for delete to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager']::public.app_role[]));

drop policy rooms_write on public.rooms;
create policy rooms_insert on public.rooms for insert to authenticated
  with check (public.has_property_role(property_id, array['owner','general_manager']::public.app_role[]));
create policy rooms_update on public.rooms for update to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager']::public.app_role[]))
  with check (public.has_property_role(property_id, array['owner','general_manager']::public.app_role[]));
create policy rooms_delete on public.rooms for delete to authenticated
  using (public.has_property_role(property_id, array['owner','general_manager']::public.app_role[]));
