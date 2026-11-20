-- Recovery Phase 5 — manual testing report Findings 14, 19 and 26 (and the
-- same defect class on other tables).
--
-- Root cause (verified read-only on staging xwbajophstetbnnemsyq, 2026-11-20):
-- 44 public tables have ROW LEVEL SECURITY enabled but ZERO policies, so every
-- browser read/write is denied for everyone — admins included:
--   Finding 14  asset_release_requests  ("You do not have permission…")
--   Finding 19  store_categories        (Resource Store categories)
--   Finding 26  giving_categories       ("new row violates row-level security policy")
-- Their original migrations DID create (overly broad) tenant policies; those
-- policies were removed outside the migration history. This restores reviewed
-- tenant-scoped policies for the 26 in-scope tables the browser uses, and deliberately
-- leaves the server-only / unused tables locked (see list at the end).
--
-- Policy model (consistent with the frontend isReadOnly(<key>) gates):
--   read  'staff'  : active staff of the row's church (or platform super admin)
--   read  'tenant' : staff OR portal member of the row's church (actor_has_tenant)
--   write <key>    : private.can_write_permission(church, <key>) — church admins
--                    always; other staff unless set read_only for <key>
--   write 'perm'   : private.can_manage_permissions(church) — church admins only
--   write 'staff'  : any active staff of the church, INSERT only (append-only logs)
-- Rows can never be written into another church: every WITH CHECK is on the
-- row's own church column. Idempotent; no data modified.
-- Rollback: DROP POLICY <table>_p5_*  (returns the table to deny-all).

DO $p5$
DECLARE
  r record;
  staff_read text;
  tenant_read text;
  write_expr text;
  c text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      -- table,                       church col, read,     write,                ops
      ('asset_release_requests',      'tenant_id', 'staff',  'reports_analytics',  'iud'),  -- F14 (AssetManagement gate)
      ('giving_categories',           'tenant_id', 'tenant', 'church_settings',    'iud'),  -- F26 (GivingSettings gate)
      ('store_categories',            'tenant_id', 'tenant', 'church_settings',    'iud'),  -- F19
      ('store_bundles',               'tenant_id', 'tenant', 'church_settings',    'iud'),
      ('store_coupons',               'tenant_id', 'staff',  'church_settings',    'iud'),
      ('store_orders',                'tenant_id', 'staff',  'financial_records',  'iud'),
      ('discipleship_resources',      'tenant_id', 'tenant', 'groups_ministries',  'iud'),
      ('resource_categories',         'tenant_id', 'tenant', 'groups_ministries',  'iud'),
      ('email_branding',              'tenant_id', 'staff',  'communication_tools','iud'),
      ('whatsapp_groups',             'tenant_id', 'tenant', 'communication_tools','iud'),
      ('whatsapp_contacts',           'tenant_id', 'tenant', 'communication_tools','iud'),
      ('saved_reports',               'tenant_id', 'staff',  'reports_analytics',  'iud'),
      ('staff_payroll',               'tenant_id', 'staff',  'financial_records',  'iud'),
      ('staff_absences',              'tenant_id', 'staff',  'church_settings',    'iud'),
      ('staff_leave_balances',        'tenant_id', 'staff',  'church_settings',    'iud'),
      ('staff_leave_requests',        'tenant_id', 'staff',  'church_settings',    'iud'),
      ('staff_positions',             'org_id',    'staff',  'church_settings',    'iud'),
      ('staff_tasks',                 'org_id',    'staff',  'church_settings',    'iud'),
      ('tax_settings',                'tenant_id', 'staff',  'church_settings',    'iud'),
      ('tax_deductible_types',        'tenant_id', 'staff',  'church_settings',    'iud'),
      ('tax_statements',              'tenant_id', 'staff',  'church_settings',    'iud'),
      ('feature_permissions',         'tenant_id', 'staff',  'perm',               'iud'),
      ('member_permission_overrides', 'tenant_id', 'staff',  'perm',               'iud'),
      ('user_role_overrides',         'tenant_id', 'staff',  'perm',               'iud'),
      ('legal_signatures',            'tenant_id', 'staff',  'staff',              'i'),
      ('activity_log',                'tenant_id', 'staff',  'staff',              'i')
    ) AS v(tbl, col, rd, wr, ops)
  LOOP
    c := format('(%I)::text', r.col);
    staff_read  := format('(private.is_platform_super_admin() OR %s = (private.get_staff_tenant_id())::text)', c);
    tenant_read := format('private.actor_has_tenant(%s)', c);
    write_expr := CASE r.wr
      WHEN 'perm'  THEN format('private.can_manage_permissions(%s)', c)
      WHEN 'staff' THEN staff_read
      ELSE format('private.can_write_permission(%s, %L)', c, r.wr)
    END;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tbl || '_p5_read', r.tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)',
                   r.tbl || '_p5_read', r.tbl, CASE r.rd WHEN 'tenant' THEN tenant_read ELSE staff_read END);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tbl || '_p5_insert', r.tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',
                   r.tbl || '_p5_insert', r.tbl, write_expr);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tbl || '_p5_update', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.tbl || '_p5_delete', r.tbl);
    IF position('u' in r.ops) > 0 THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
                     r.tbl || '_p5_update', r.tbl, write_expr, write_expr);
    END IF;
    IF position('d' in r.ops) > 0 THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (%s)',
                     r.tbl || '_p5_delete', r.tbl, write_expr);
    END IF;
  END LOOP;
END
$p5$;

-- Deliberately LEFT LOCKED (RLS on, no policies → service_role / SECURITY
-- DEFINER only): automation_settings (platform-wide, no church column),
-- canva_oauth_state, canva_tokens, collection_resources, device_tokens,
-- integration_settings, member_login_challenges, member_sessions, order_items,
-- payroll_run_lines, payroll_runs, resource_assignments, resource_collections,
-- sermon_views (media deferred), staff_invitations, tenant_payment_credentials,
-- users_backup, webhook_events.
