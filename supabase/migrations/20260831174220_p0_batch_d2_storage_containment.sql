begin;

drop policy if exists "Authenticated can delete church logos" on storage.objects;
drop policy if exists "Authenticated can update church logos" on storage.objects;
drop policy if exists "Authenticated can upload church logos" on storage.objects;

drop policy if exists church_logos_tenant_insert on storage.objects;
create policy church_logos_tenant_insert on storage.objects for insert to authenticated
with check (bucket_id='church-logos' and private.actor_has_tenant((storage.foldername(name))[1]));
drop policy if exists church_logos_tenant_update on storage.objects;
create policy church_logos_tenant_update on storage.objects for update to authenticated
using (bucket_id='church-logos' and private.actor_has_tenant((storage.foldername(name))[1]))
with check (bucket_id='church-logos' and private.actor_has_tenant((storage.foldername(name))[1]));
drop policy if exists church_logos_tenant_delete on storage.objects;
create policy church_logos_tenant_delete on storage.objects for delete to authenticated
using (bucket_id='church-logos' and private.actor_has_tenant((storage.foldername(name))[1]));

drop policy if exists auth_delete_church_assets on storage.objects;
drop policy if exists auth_update_church_assets on storage.objects;
drop policy if exists auth_upload_church_assets on storage.objects;
drop policy if exists church_assets_tenant_insert on storage.objects;
create policy church_assets_tenant_insert on storage.objects for insert to authenticated
with check (bucket_id='church-assets' and private.actor_has_tenant((storage.foldername(name))[1]));
drop policy if exists church_assets_tenant_update on storage.objects;
create policy church_assets_tenant_update on storage.objects for update to authenticated
using (bucket_id='church-assets' and private.actor_has_tenant((storage.foldername(name))[1]))
with check (bucket_id='church-assets' and private.actor_has_tenant((storage.foldername(name))[1]));
drop policy if exists church_assets_tenant_delete on storage.objects;
create policy church_assets_tenant_delete on storage.objects for delete to authenticated
using (bucket_id='church-assets' and private.actor_has_tenant((storage.foldername(name))[1]));

drop policy if exists "Authenticated can delete digital files" on storage.objects;
drop policy if exists "Authenticated can read digital files" on storage.objects;
drop policy if exists "Authenticated can update digital files" on storage.objects;
drop policy if exists "Authenticated can upload digital files" on storage.objects;
drop policy if exists "Authenticated can delete store covers" on storage.objects;
drop policy if exists "Authenticated can update store covers" on storage.objects;
drop policy if exists "Authenticated can upload store covers" on storage.objects;
drop policy if exists "Authenticated can delete store gallery" on storage.objects;
drop policy if exists "Authenticated can update store gallery" on storage.objects;
drop policy if exists "Authenticated can upload store gallery" on storage.objects;
drop policy if exists "Authenticated users can delete outreach photos" on storage.objects;
drop policy if exists "Authenticated users can update outreach photos" on storage.objects;
drop policy if exists "Authenticated users can upload outreach photos" on storage.objects;
drop policy if exists "Authenticated users can view outreach photos" on storage.objects;

drop policy if exists store_covers_tenant_insert on storage.objects;
create policy store_covers_tenant_insert on storage.objects for insert to authenticated
with check (bucket_id='store-covers' and private.actor_has_tenant((storage.foldername(name))[1]));
drop policy if exists store_covers_tenant_update on storage.objects;
create policy store_covers_tenant_update on storage.objects for update to authenticated
using (bucket_id='store-covers' and private.actor_has_tenant((storage.foldername(name))[1]))
with check (bucket_id='store-covers' and private.actor_has_tenant((storage.foldername(name))[1]));
drop policy if exists store_covers_tenant_delete on storage.objects;
create policy store_covers_tenant_delete on storage.objects for delete to authenticated
using (bucket_id='store-covers' and private.actor_has_tenant((storage.foldername(name))[1]));

drop policy if exists store_gallery_tenant_insert on storage.objects;
create policy store_gallery_tenant_insert on storage.objects for insert to authenticated
with check (bucket_id='store-gallery' and private.actor_has_tenant((storage.foldername(name))[1]));
drop policy if exists store_gallery_tenant_update on storage.objects;
create policy store_gallery_tenant_update on storage.objects for update to authenticated
using (bucket_id='store-gallery' and private.actor_has_tenant((storage.foldername(name))[1]))
with check (bucket_id='store-gallery' and private.actor_has_tenant((storage.foldername(name))[1]));
drop policy if exists store_gallery_tenant_delete on storage.objects;
create policy store_gallery_tenant_delete on storage.objects for delete to authenticated
using (bucket_id='store-gallery' and private.actor_has_tenant((storage.foldername(name))[1]));

drop policy if exists outreach_photos_tenant_select on storage.objects;
create policy outreach_photos_tenant_select on storage.objects for select to authenticated
using (bucket_id='outreach-photos' and private.actor_has_tenant((storage.foldername(name))[1]));
drop policy if exists outreach_photos_tenant_insert on storage.objects;
create policy outreach_photos_tenant_insert on storage.objects for insert to authenticated
with check (bucket_id='outreach-photos' and private.actor_has_tenant((storage.foldername(name))[1]));
drop policy if exists outreach_photos_tenant_update on storage.objects;
create policy outreach_photos_tenant_update on storage.objects for update to authenticated
using (bucket_id='outreach-photos' and private.actor_has_tenant((storage.foldername(name))[1]))
with check (bucket_id='outreach-photos' and private.actor_has_tenant((storage.foldername(name))[1]));
drop policy if exists outreach_photos_tenant_delete on storage.objects;
create policy outreach_photos_tenant_delete on storage.objects for delete to authenticated
using (bucket_id='outreach-photos' and private.actor_has_tenant((storage.foldername(name))[1]));

drop policy if exists store_digital_files_tenant_insert on storage.objects;
create policy store_digital_files_tenant_insert on storage.objects for insert to authenticated
with check (bucket_id='store-digital-files' and private.can_manage_people((storage.foldername(name))[1]));
drop policy if exists store_digital_files_tenant_update on storage.objects;
create policy store_digital_files_tenant_update on storage.objects for update to authenticated
using (bucket_id='store-digital-files' and private.can_manage_people((storage.foldername(name))[1]))
with check (bucket_id='store-digital-files' and private.can_manage_people((storage.foldername(name))[1]));
drop policy if exists store_digital_files_tenant_delete on storage.objects;
create policy store_digital_files_tenant_delete on storage.objects for delete to authenticated
using (bucket_id='store-digital-files' and private.can_manage_people((storage.foldername(name))[1]));

commit;;
