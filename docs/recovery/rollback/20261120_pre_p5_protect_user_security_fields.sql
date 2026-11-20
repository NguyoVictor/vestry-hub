-- Rollback snapshot (trigger code only, NOT data) of the live staging function before migration 20261120150000, captured read-only 2026-11-20.
CREATE OR REPLACE FUNCTION private.protect_user_security_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
begin
  if (select auth.uid()) is null or private.is_platform_super_admin() then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.is_super_admin is distinct from old.is_super_admin
     or new.email is distinct from old.email
     or new.email_verified is distinct from old.email_verified
     or new.phone_verified is distinct from old.phone_verified
     or new.mfa_enabled is distinct from old.mfa_enabled
     or new.invitation_sent is distinct from old.invitation_sent
     or new.last_login_at is distinct from old.last_login_at then
    raise exception 'Security-sensitive user fields may only be changed by an authorized server action.' using errcode = '42501';
  end if;
  return new;
end;
$function$
;
