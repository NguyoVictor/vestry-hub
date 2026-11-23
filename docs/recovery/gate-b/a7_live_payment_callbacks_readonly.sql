-- A7 — which LIVE churches may be losing M-Pesa payment callbacks? READ-ONLY.
-- Run in the Production (churchapp, crjdsxxkspvdwknrmijs) Supabase SQL editor.
-- Background: the live Settings → Payments page shows a "Callback URL" built
-- from VITE_SUPABASE_URL, which on the live site points at STAGING, where
-- payment-webhook is not deployed. Any church that pasted that URL into its
-- PayHero / Daraja settings sends payment confirmations to nowhere: the money
-- reaches the church's M-Pesa account, but Vestry never marks the gift paid.
-- Uses to_jsonb() so it works even if some columns do not exist. Writes nothing.

-- 1) Churches that set up M-Pesa on the live site
SELECT t.id, t.name,
       to_jsonb(t) ->> 'payhero_connected'      AS payhero_connected,
       to_jsonb(t) ->> 'payhero_channel_type'   AS channel_type,
       to_jsonb(t) ->> 'payhero_channel_number' AS channel_number,
       to_jsonb(t) ->> 'c2b_registered'         AS c2b_registered,
       (to_jsonb(t) ->> 'daraja_shortcode') IS NOT NULL AS has_daraja_shortcode
FROM public.tenants t
WHERE coalesce(to_jsonb(t) ->> 'payhero_connected', 'false') = 'true'
   OR coalesce(to_jsonb(t) ->> 'c2b_registered', 'false') = 'true'
   OR to_jsonb(t) ->> 'payhero_channel_number' IS NOT NULL
   OR to_jsonb(t) ->> 'daraja_shortcode' IS NOT NULL
ORDER BY t.name;

-- 2) Symptom: M-Pesa gifts stuck in "pending" (callback never arrived), per church, last 120 days
SELECT g.tenant_id, t.name,
       count(*) FILTER (WHERE g.payment_status = 'pending')   AS stuck_pending,
       count(*) FILTER (WHERE g.payment_status = 'confirmed') AS confirmed,
       sum(g.amount) FILTER (WHERE g.payment_status = 'pending') AS pending_amount_kes,
       min(g.created_at) FILTER (WHERE g.payment_status = 'pending') AS oldest_pending,
       max(g.created_at) AS latest_mpesa_gift
FROM public.giving_records g
JOIN public.tenants t ON t.id::text = g.tenant_id::text
WHERE g.payment_method::text = 'mpesa' AND g.created_at > now() - interval '120 days'
GROUP BY g.tenant_id, t.name
ORDER BY stuck_pending DESC;
