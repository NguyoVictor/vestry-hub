begin;
drop policy if exists "volunteer_hours_staff_manage" on public.volunteer_hours;
drop policy if exists "volunteer_hours_staff_insert" on public.volunteer_hours;
drop policy if exists "volunteer_hours_staff_update" on public.volunteer_hours;
drop policy if exists "volunteer_hours_staff_delete" on public.volunteer_hours;
create policy "volunteer_hours_staff_insert" on public.volunteer_hours for insert to authenticated with check (private.can_manage_events(tenant_id));
create policy "volunteer_hours_staff_update" on public.volunteer_hours for update to authenticated using (private.can_manage_events(tenant_id)) with check (private.can_manage_events(tenant_id));
create policy "volunteer_hours_staff_delete" on public.volunteer_hours for delete to authenticated using (private.can_manage_events(tenant_id));
commit;