-- G7b — members log cash / bank transfer / cheque gifts as PENDING; church
-- finance staff confirm or reject them (pre-production scope, user decision
-- 2026-11-23). Before: the member portal inserted these gifts as 'confirmed'
-- straight from the browser (blocked by RLS → always failed); on 21 Nov the
-- option was disabled.
--  * member_declare_gift(): the member is resolved on the server from the
--    signed-in identity (member_auth_memberships / member session) — never
--    from a browser-supplied id. Status is always 'pending'. Limits: amount
--    1..1,000,000, date within the last 90 days, ≤ 10 open declarations.
--  * staff_review_member_gift(): church staff holding 'financial_records'
--    confirm (→ confirmed) or reject with a reason (→ cancelled). Only pending
--    member-declared gifts; first decision wins; reviewer + time recorded.
--  * Members already read their own gifts (20261121090000).
-- Additive. Rollback: drop the two functions and the four columns.

ALTER TABLE public.giving_records
  ADD COLUMN IF NOT EXISTS submitted_by_member boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_by varchar,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_note text;
CREATE INDEX IF NOT EXISTS giving_records_member_declared_pending
  ON public.giving_records (tenant_id, created_at) WHERE submitted_by_member AND payment_status = 'pending';

CREATE OR REPLACE FUNCTION public.member_declare_gift(
  p_tenant_id text, p_amount numeric, p_giving_type text, p_payment_method text,
  p_given_on date DEFAULT NULL, p_reference text DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE v_member text; v_open int; v_id text; v_date date := coalesce(p_given_on, current_date);
BEGIN
  SELECT mam.member_id INTO v_member
    FROM public.member_auth_memberships mam
    JOIN public.members m ON m.id = mam.member_id AND m.tenant_id = mam.tenant_id
   WHERE mam.auth_user_id = (SELECT auth.uid()) AND (mam.tenant_id)::text = p_tenant_id
     AND coalesce(m.status, 'active') <> 'inactive'
     AND coalesce(m.membership_status, 'active') <> 'Pending Approval'
   LIMIT 1;
  IF v_member IS NULL THEN v_member := private.member_session_member_id(p_tenant_id); END IF;
  IF v_member IS NULL THEN RAISE EXCEPTION 'Only members of this church can record a gift.' USING ERRCODE = '42501'; END IF;

  IF p_amount IS NULL OR p_amount < 1 OR p_amount > 1000000 THEN
    RAISE EXCEPTION 'Enter an amount between 1 and 1,000,000.' USING ERRCODE = '22023';
  END IF;
  IF p_payment_method NOT IN ('cash', 'bank_transfer', 'cheque') THEN
    RAISE EXCEPTION 'Choose cash, bank transfer or cheque.' USING ERRCODE = '22023';
  END IF;
  IF p_giving_type NOT IN ('tithe', 'offering', 'pledge_payment', 'special_donation') THEN
    RAISE EXCEPTION 'Choose a giving type.' USING ERRCODE = '22023';
  END IF;
  IF v_date > current_date + 1 OR v_date < current_date - 90 THEN
    RAISE EXCEPTION 'The date must be within the last 90 days.' USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO v_open FROM public.giving_records
   WHERE (tenant_id)::text = p_tenant_id AND member_id = v_member AND submitted_by_member AND payment_status = 'pending';
  IF v_open >= 10 THEN
    RAISE EXCEPTION 'You already have 10 gifts awaiting confirmation. Please wait for the finance team.' USING ERRCODE = '53400';
  END IF;

  INSERT INTO public.giving_records(tenant_id, member_id, amount, currency, giving_type, payment_method, payment_status,
                                    given_at, external_reference, notes, submitted_by_member, payment_provider)
  VALUES (p_tenant_id, v_member, round(p_amount, 2), 'KES', p_giving_type::public.giving_type_enum,
          p_payment_method::public.payment_method_enum, 'pending', v_date,
          nullif(left(btrim(coalesce(p_reference, '')), 60), ''), nullif(left(btrim(coalesce(p_note, '')), 300), ''),
          true, 'member_declared')
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'payment_status', 'pending');
END $fn$;

CREATE OR REPLACE FUNCTION public.staff_review_member_gift(p_gift_id text, p_decision text, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE g public.giving_records; v_status text; v_note text := nullif(left(btrim(coalesce(p_note, '')), 300), '');
BEGIN
  SELECT * INTO g FROM public.giving_records WHERE id = p_gift_id;
  IF g.id IS NULL THEN RAISE EXCEPTION 'Gift not found.' USING ERRCODE = 'P0002'; END IF;
  IF NOT (private.is_platform_super_admin()
          OR ((private.get_staff_tenant_id())::text = (g.tenant_id)::text
              AND private.can_write_permission((g.tenant_id)::text, 'financial_records'))) THEN
    RAISE EXCEPTION 'Only finance staff of this church can confirm gifts.' USING ERRCODE = '42501';
  END IF;
  IF NOT g.submitted_by_member THEN RAISE EXCEPTION 'This gift was not submitted by a member.' USING ERRCODE = '22023'; END IF;
  IF p_decision = 'confirm' THEN v_status := 'confirmed';
  ELSIF p_decision = 'reject' THEN
    IF v_note IS NULL THEN RAISE EXCEPTION 'Give a reason for rejecting this gift.' USING ERRCODE = '22023'; END IF;
    v_status := 'cancelled';
  ELSE RAISE EXCEPTION 'Unknown decision.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.giving_records
     SET payment_status = v_status::public.payment_status_enum, reviewed_by = (SELECT auth.uid())::text,
         reviewed_at = now(), review_note = v_note,
         recorded_by = coalesce(recorded_by, (SELECT auth.uid())::text)
   WHERE id = g.id AND payment_status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'This gift has already been reviewed.' USING ERRCODE = '40001'; END IF;
  RETURN jsonb_build_object('id', g.id, 'payment_status', v_status);
END $fn$;

REVOKE ALL ON FUNCTION public.member_declare_gift(text, numeric, text, text, date, text, text),
  public.staff_review_member_gift(text, text, text) FROM PUBLIC, anon;
-- anon too: legacy member-session tokens (private.member_session_member_id);
-- the function still refuses callers who are not a member of the church.
GRANT EXECUTE ON FUNCTION public.member_declare_gift(text, numeric, text, text, date, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_review_member_gift(text, text, text) TO authenticated;
