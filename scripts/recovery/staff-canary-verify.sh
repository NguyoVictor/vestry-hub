#!/usr/bin/env bash
# Read-only post-canary verification for the Phase 1B.2 staff invitation.
# Prints ONLY booleans and counts — never the tester email, ids or tokens.
#
# Usage (repo root):
#   QA_CANARY_EMAIL_FILE=.env.canary.local QA_CANARY_KEY=QA_A_STAFF_EMAIL QA_CANARY_TENANT=A \
#     bash scripts/recovery/staff-canary-verify.sh
# The git-ignored (.env*) file holds e.g.  QA_A_STAFF_EMAIL=someone@example.test
# Do NOT use .env.qa.local: that file is reserved for disposable-QA backend config.
# Run once BEFORE the invite (expect all identity counts 0) and once AFTER login.
set -euo pipefail
REF=xwbajophstetbnnemsyq
A=20d06ab3-5183-4b0b-b1af-ca009480503b
B=db75d0c0-ec9c-406e-a386-a690725b654f
[ "$(cat supabase/.temp/project-ref 2>/dev/null)" = "$REF" ] || { echo "Linked project is not staging; refusing." >&2; exit 2; }
FILE="${QA_CANARY_EMAIL_FILE:?}"; KEY="${QA_CANARY_KEY:?}"
case "${QA_CANARY_TENANT:?}" in A) T=$A; OTHER=$B;; B) T=$B; OTHER=$A;; *) echo "tenant must be A or B" >&2; exit 2;; esac
EMAIL="$(grep -E "^${KEY}=" "$FILE" | head -1 | cut -d= -f2- | tr -d '\r"' | tr '[:upper:]' '[:lower:]')"
[[ "$EMAIL" =~ ^[^[:space:]@\']+@[^[:space:]@\']+\.[^[:space:]@\']+$ ]] || { echo "No valid email for $KEY" >&2; exit 2; }

SQL="WITH si AS (SELECT * FROM public.staff_invitations WHERE lower(email) = '${EMAIL}'),
au AS (SELECT id FROM auth.users WHERE lower(email) = '${EMAIL}'),
pu AS (SELECT * FROM public.users WHERE lower(email) = '${EMAIL}')
SELECT
 (SELECT count(*) FROM si) AS invitation_rows,
 (SELECT count(*) FROM si WHERE consumed_at IS NOT NULL) AS consumed_rows,
 (SELECT count(*) FROM au) AS auth_identities,
 (SELECT count(*) FROM pu) AS staff_profiles,
 (SELECT bool_and(si.auth_user_id = pu.id) FROM si JOIN pu ON true) AS invite_bound_to_profile,
 (SELECT bool_and(au.id::text = pu.id) FROM au JOIN pu ON true) AS auth_id_equals_profile_id,
 (SELECT bool_and(tenant_id = '${T}') FROM si) AS invite_in_intended_tenant,
 (SELECT bool_and(tenant_id = '${T}') FROM pu) AS profile_in_intended_tenant,
 (SELECT bool_and(role = 'staff') FROM pu) AS profile_role_staff,
 (SELECT bool_and(status = 'active') FROM pu) AS profile_active,
 (SELECT bool_and(invitation_sent) FROM pu) AS invitation_sent_flag,
 (SELECT count(*) FROM pu WHERE tenant_id = '${OTHER}') AS profiles_in_other_church,
 (SELECT count(*) FROM public.member_auth_memberships m JOIN au ON m.auth_user_id = au.id) AS member_links,
 (SELECT count(*) FROM public.members WHERE lower(email) = '${EMAIL}') AS member_rows_any_tenant,
 (SELECT count(*) FROM public.tenants) AS tenants_total,
 (SELECT count(*) FROM auth.users) AS auth_users_total,
 (SELECT count(*) FROM public.users) AS profiles_total,
 (SELECT count(*) FROM public.members) AS members_total,
 (SELECT count(*) FROM public.staff_invitations) AS staff_invitations_total"
npx --yes supabase@2.122.1 db query --linked --project-ref "$REF" --output-format json "$SQL" 2>/dev/null \
  | python3 -I -c 'import json,sys; [print(f"{k}: {v}") for k,v in json.load(sys.stdin)["rows"][0].items()]'
