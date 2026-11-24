-- Finance read-blocking (follow-up to T5/T16, user request 2026-11-24).
-- A custom role with Financial Records = "No access" now also blocks READING
-- finance data through the API (before: writes and pages were blocked, reads
-- were not). Church admins / platform admin / staff whose finance level is not
-- "none" keep reading exactly as before.
--  * private.can_read_permission(church, area): NULL-safe; staff of the church
--    only; admin roles always; otherwise effective level <> 'none'.
--  * The 12 staff read policies of finance tables keep their existing
--    condition (copied verbatim from the live policy) AND the read check.
--  * giving_records, funds, pledges, pledge_campaigns, pledge_commitments had
--    catch-all FOR ALL policies letting ANY staff member read AND write them.
--    Replaced by: read = finance read check; write = can_write_permission
--    (financial_records). Members' own-gift read policy is unchanged; server
--    functions (service role) are unaffected.
-- payment_events already requires finance write access to read.
-- Rollback: restore the previous policy texts (see 20261120230000 /
-- 20261123140000) and drop private.can_read_permission.

CREATE OR REPLACE FUNCTION private.can_read_permission(p_tenant_id text, p_permission_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
  SELECT coalesce(private.is_platform_super_admin(), false)
      OR EXISTS (
        SELECT 1 FROM public.users u
         WHERE u.id = (SELECT auth.uid())::text
           AND u.tenant_id = p_tenant_id
           AND u.status = 'active'
           AND lower(coalesce(u.role, '')) NOT IN ('member', 'guest', '')
           AND (lower(u.role) IN ('super_admin', 'church_admin')
                OR private.effective_permission_level(u.id, p_tenant_id, p_permission_key) <> 'none'));
$fn$;
REVOKE ALL ON FUNCTION private.can_read_permission(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_read_permission(text, text) TO authenticated, service_role;

DROP POLICY IF EXISTS accounts_payable_p9_read ON public.accounts_payable;
CREATE POLICY accounts_payable_p9_read ON public.accounts_payable FOR SELECT TO authenticated
  USING (((private.is_platform_super_admin() OR ((tenant_id)::text = (private.get_staff_tenant_id())::text))) AND private.can_read_permission((tenant_id)::text, 'financial_records'));

DROP POLICY IF EXISTS budget_audit_log_p10_read ON public.budget_audit_log;
CREATE POLICY budget_audit_log_p10_read ON public.budget_audit_log FOR SELECT TO authenticated
  USING (((private.is_platform_super_admin() OR ((tenant_id)::text = (private.get_staff_tenant_id())::text))) AND private.can_read_permission((tenant_id)::text, 'financial_records'));

DROP POLICY IF EXISTS budget_categories_p10_read ON public.budget_categories;
CREATE POLICY budget_categories_p10_read ON public.budget_categories FOR SELECT TO authenticated
  USING (((private.is_platform_super_admin() OR (( SELECT (b.tenant_id)::text AS tenant_id
   FROM budgets b
  WHERE ((b.id)::text = (budget_categories.budget_id)::text)) = (private.get_staff_tenant_id())::text))) AND private.can_read_permission((SELECT (b.tenant_id)::text FROM public.budgets b WHERE (b.id)::text = (budget_categories.budget_id)::text), 'financial_records'));

DROP POLICY IF EXISTS budget_expenditures_p10_read ON public.budget_expenditures;
CREATE POLICY budget_expenditures_p10_read ON public.budget_expenditures FOR SELECT TO authenticated
  USING (((private.is_platform_super_admin() OR ((tenant_id)::text = (private.get_staff_tenant_id())::text))) AND private.can_read_permission((tenant_id)::text, 'financial_records'));

DROP POLICY IF EXISTS budgets_p10_read ON public.budgets;
CREATE POLICY budgets_p10_read ON public.budgets FOR SELECT TO authenticated
  USING (((private.is_platform_super_admin() OR ((tenant_id)::text = (private.get_staff_tenant_id())::text))) AND private.can_read_permission((tenant_id)::text, 'financial_records'));

DROP POLICY IF EXISTS chart_of_accounts_p9_read ON public.chart_of_accounts;
CREATE POLICY chart_of_accounts_p9_read ON public.chart_of_accounts FOR SELECT TO authenticated
  USING (((private.is_platform_super_admin() OR ((tenant_id)::text = (private.get_staff_tenant_id())::text))) AND private.can_read_permission((tenant_id)::text, 'financial_records'));

DROP POLICY IF EXISTS expenses_p9_read ON public.expenses;
CREATE POLICY expenses_p9_read ON public.expenses FOR SELECT TO authenticated
  USING (((private.is_platform_super_admin() OR ((tenant_id)::text = (private.get_staff_tenant_id())::text))) AND private.can_read_permission((tenant_id)::text, 'financial_records'));

DROP POLICY IF EXISTS ledger_entries_p9_read ON public.ledger_entries;
CREATE POLICY ledger_entries_p9_read ON public.ledger_entries FOR SELECT TO authenticated
  USING (((private.is_platform_super_admin() OR ((tenant_id)::text = (private.get_staff_tenant_id())::text))) AND private.can_read_permission((tenant_id)::text, 'financial_records'));

DROP POLICY IF EXISTS payouts_p9_read ON public.payouts;
CREATE POLICY payouts_p9_read ON public.payouts FOR SELECT TO authenticated
  USING (((private.is_platform_super_admin() OR ((tenant_id)::text = (private.get_staff_tenant_id())::text))) AND private.can_read_permission((tenant_id)::text, 'financial_records'));

DROP POLICY IF EXISTS payroll_staff_p10_read ON public.payroll_staff;
CREATE POLICY payroll_staff_p10_read ON public.payroll_staff FOR SELECT TO authenticated
  USING (((private.is_platform_super_admin() OR ((tenant_id)::text = (private.get_staff_tenant_id())::text))) AND private.can_read_permission((tenant_id)::text, 'financial_records'));

DROP POLICY IF EXISTS staff_payroll_p5_read ON public.staff_payroll;
CREATE POLICY staff_payroll_p5_read ON public.staff_payroll FOR SELECT TO authenticated
  USING (((private.is_platform_super_admin() OR (tenant_id = (private.get_staff_tenant_id())::text))) AND private.can_read_permission((tenant_id)::text, 'financial_records'));

DROP POLICY IF EXISTS store_orders_p5_read ON public.store_orders;
CREATE POLICY store_orders_p5_read ON public.store_orders FOR SELECT TO authenticated
  USING (((private.is_platform_super_admin() OR ((tenant_id)::text = (private.get_staff_tenant_id())::text))) AND private.can_read_permission((tenant_id)::text, 'financial_records'));

DROP POLICY IF EXISTS giving_records_tenant_rls ON public.giving_records;
DROP POLICY IF EXISTS giving_records_fin_read ON public.giving_records;
DROP POLICY IF EXISTS giving_records_fin_insert ON public.giving_records;
DROP POLICY IF EXISTS giving_records_fin_update ON public.giving_records;
DROP POLICY IF EXISTS giving_records_fin_delete ON public.giving_records;
CREATE POLICY giving_records_fin_read ON public.giving_records FOR SELECT TO authenticated
  USING (private.can_read_permission((tenant_id)::text, 'financial_records'));
CREATE POLICY giving_records_fin_insert ON public.giving_records FOR INSERT TO authenticated
  WITH CHECK (private.can_write_permission((tenant_id)::text, 'financial_records'));
CREATE POLICY giving_records_fin_update ON public.giving_records FOR UPDATE TO authenticated
  USING (private.can_write_permission((tenant_id)::text, 'financial_records'))
  WITH CHECK (private.can_write_permission((tenant_id)::text, 'financial_records'));
CREATE POLICY giving_records_fin_delete ON public.giving_records FOR DELETE TO authenticated
  USING (private.can_write_permission((tenant_id)::text, 'financial_records'));

DROP POLICY IF EXISTS funds_tenant_rls ON public.funds;
DROP POLICY IF EXISTS funds_fin_read ON public.funds;
DROP POLICY IF EXISTS funds_fin_insert ON public.funds;
DROP POLICY IF EXISTS funds_fin_update ON public.funds;
DROP POLICY IF EXISTS funds_fin_delete ON public.funds;
CREATE POLICY funds_fin_read ON public.funds FOR SELECT TO authenticated
  USING (private.can_read_permission((tenant_id)::text, 'financial_records'));
CREATE POLICY funds_fin_insert ON public.funds FOR INSERT TO authenticated
  WITH CHECK (private.can_write_permission((tenant_id)::text, 'financial_records'));
CREATE POLICY funds_fin_update ON public.funds FOR UPDATE TO authenticated
  USING (private.can_write_permission((tenant_id)::text, 'financial_records'))
  WITH CHECK (private.can_write_permission((tenant_id)::text, 'financial_records'));
CREATE POLICY funds_fin_delete ON public.funds FOR DELETE TO authenticated
  USING (private.can_write_permission((tenant_id)::text, 'financial_records'));

DROP POLICY IF EXISTS pledges_tenant_rls ON public.pledges;
DROP POLICY IF EXISTS pledges_fin_read ON public.pledges;
DROP POLICY IF EXISTS pledges_fin_insert ON public.pledges;
DROP POLICY IF EXISTS pledges_fin_update ON public.pledges;
DROP POLICY IF EXISTS pledges_fin_delete ON public.pledges;
CREATE POLICY pledges_fin_read ON public.pledges FOR SELECT TO authenticated
  USING (private.can_read_permission((tenant_id)::text, 'financial_records'));
CREATE POLICY pledges_fin_insert ON public.pledges FOR INSERT TO authenticated
  WITH CHECK (private.can_write_permission((tenant_id)::text, 'financial_records'));
CREATE POLICY pledges_fin_update ON public.pledges FOR UPDATE TO authenticated
  USING (private.can_write_permission((tenant_id)::text, 'financial_records'))
  WITH CHECK (private.can_write_permission((tenant_id)::text, 'financial_records'));
CREATE POLICY pledges_fin_delete ON public.pledges FOR DELETE TO authenticated
  USING (private.can_write_permission((tenant_id)::text, 'financial_records'));

DROP POLICY IF EXISTS pledge_campaigns_tenant_rls ON public.pledge_campaigns;
DROP POLICY IF EXISTS tenant_isolation ON public.pledge_campaigns;
DROP POLICY IF EXISTS pledge_campaigns_fin_read ON public.pledge_campaigns;
DROP POLICY IF EXISTS pledge_campaigns_fin_insert ON public.pledge_campaigns;
DROP POLICY IF EXISTS pledge_campaigns_fin_update ON public.pledge_campaigns;
DROP POLICY IF EXISTS pledge_campaigns_fin_delete ON public.pledge_campaigns;
CREATE POLICY pledge_campaigns_fin_read ON public.pledge_campaigns FOR SELECT TO authenticated
  USING (private.can_read_permission((tenant_id)::text, 'financial_records'));
CREATE POLICY pledge_campaigns_fin_insert ON public.pledge_campaigns FOR INSERT TO authenticated
  WITH CHECK (private.can_write_permission((tenant_id)::text, 'financial_records'));
CREATE POLICY pledge_campaigns_fin_update ON public.pledge_campaigns FOR UPDATE TO authenticated
  USING (private.can_write_permission((tenant_id)::text, 'financial_records'))
  WITH CHECK (private.can_write_permission((tenant_id)::text, 'financial_records'));
CREATE POLICY pledge_campaigns_fin_delete ON public.pledge_campaigns FOR DELETE TO authenticated
  USING (private.can_write_permission((tenant_id)::text, 'financial_records'));

DROP POLICY IF EXISTS tenant_isolation ON public.pledge_commitments;
DROP POLICY IF EXISTS pledge_commitments_fin_read ON public.pledge_commitments;
DROP POLICY IF EXISTS pledge_commitments_fin_insert ON public.pledge_commitments;
DROP POLICY IF EXISTS pledge_commitments_fin_update ON public.pledge_commitments;
DROP POLICY IF EXISTS pledge_commitments_fin_delete ON public.pledge_commitments;
CREATE POLICY pledge_commitments_fin_read ON public.pledge_commitments FOR SELECT TO authenticated
  USING (private.can_read_permission((tenant_id)::text, 'financial_records'));
CREATE POLICY pledge_commitments_fin_insert ON public.pledge_commitments FOR INSERT TO authenticated
  WITH CHECK (private.can_write_permission((tenant_id)::text, 'financial_records'));
CREATE POLICY pledge_commitments_fin_update ON public.pledge_commitments FOR UPDATE TO authenticated
  USING (private.can_write_permission((tenant_id)::text, 'financial_records'))
  WITH CHECK (private.can_write_permission((tenant_id)::text, 'financial_records'));
CREATE POLICY pledge_commitments_fin_delete ON public.pledge_commitments FOR DELETE TO authenticated
  USING (private.can_write_permission((tenant_id)::text, 'financial_records'));
