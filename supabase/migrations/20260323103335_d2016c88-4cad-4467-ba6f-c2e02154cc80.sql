-- Fix mutable search_path on functions

CREATE OR REPLACE FUNCTION public.seed_chart_of_accounts(p_tenant_id character varying)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO chart_of_accounts (tenant_id, account_name, account_type, account_code, is_default) VALUES
    (p_tenant_id, 'Cash on Hand', 'asset', '1001', true),
    (p_tenant_id, 'Bank Account (General)', 'asset', '1002', true),
    (p_tenant_id, 'Bank Account (Savings)', 'asset', '1003', true),
    (p_tenant_id, 'Accounts Receivable', 'asset', '1100', true),
    (p_tenant_id, 'Prepaid Expenses', 'asset', '1200', true),
    (p_tenant_id, 'Property & Equipment', 'asset', '1500', true),
    (p_tenant_id, 'Accounts Payable', 'liability', '2001', true),
    (p_tenant_id, 'Accrued Expenses', 'liability', '2100', true),
    (p_tenant_id, 'Deferred Revenue', 'liability', '2200', true),
    (p_tenant_id, 'Tithes', 'income', '4001', true),
    (p_tenant_id, 'Offerings', 'income', '4002', true),
    (p_tenant_id, 'Building Fund', 'income', '4003', true),
    (p_tenant_id, 'Donations', 'income', '4004', true),
    (p_tenant_id, 'Event Income', 'income', '4005', true),
    (p_tenant_id, 'Other Income', 'income', '4999', true),
    (p_tenant_id, 'Salaries & Wages', 'expense', '5001', true),
    (p_tenant_id, 'Utilities', 'expense', '5002', true),
    (p_tenant_id, 'Rent', 'expense', '5003', true),
    (p_tenant_id, 'Equipment', 'expense', '5004', true),
    (p_tenant_id, 'Maintenance', 'expense', '5005', true),
    (p_tenant_id, 'Events', 'expense', '5006', true),
    (p_tenant_id, 'Outreach', 'expense', '5007', true),
    (p_tenant_id, 'Supplies', 'expense', '5008', true),
    (p_tenant_id, 'Transport', 'expense', '5009', true),
    (p_tenant_id, 'Other Expenses', 'expense', '5999', true),
    (p_tenant_id, 'Retained Surplus', 'equity', '3001', true),
    (p_tenant_id, 'Opening Balance Equity', 'equity', '3002', true);
END;
$function$;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;
