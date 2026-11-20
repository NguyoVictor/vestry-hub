/** Read-only source contract. NEVER makes API calls or database writes. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function checkStaffInviteHandshake(root = process.cwd()) {
  const failures = [];
  const get = (path) => {
    const full = resolve(root, path);
    if (!existsSync(full)) { failures.push(`Missing ${path}`); return ''; }
    return readFileSync(full, 'utf8');
  };
  const src = get('supabase/functions/send-invitation/index.ts');
  const sql = get('docs/recovery/sql/PHASE1B2_STAFF_INVITATION_TRIGGER_REVIEW.sql');
  const v2 = get('supabase/migrations/20261120043624_p1b2_staff_invite_insert_binding.sql');
  const handshake = get('supabase/functions/send-invitation/handshake.ts');
  const callback = get('src/pages/auth/InviteCallback.tsx');
  const guard = get('src/pages/auth/inviteCallbackGuards.ts');
  const must = (condition, description) => { if (!condition) failures.push(description); };

  must(src.includes('staff_invitation_handshake_version'), 'Missing server-side trigger version gate');
  must(src.includes('STAFF_INVITATION_REDIRECT_ORIGIN'), 'Missing fixed server-side QA preview redirect');
  must(src.includes('validateStaffInvite(') && src.includes('mayInviteStaff('), 'Missing server-side inviter role and tenant checks');
  must(src.includes('verifiedStaffInvitation('), 'Missing Auth profile and invitation postcondition checks');
  must(!/\.from\(["']users["']\)\s*\.insert\(/s.test(src), 'No staff profile insertion may follow Auth invitation in Edge Function');
  must(!/\.from\(["']users["']\)\s*\.upsert\(/s.test(src), 'Never upsert a staff profile from the invitation endpoint');
  must(src.indexOf('.insert({ tenant_id: tenantId, email, role') > 0 &&
       src.indexOf('.insert({ tenant_id: tenantId, email, role') < src.indexOf('service.auth.admin.inviteUserByEmail('),
       'Trusted staff invitation row must be inserted before Auth invite');
  must(!/data:\s*\{[^}]*\b(?:role|tenant_id)\b/.test(src), 'Never authorize via user-editable invite metadata');

  must(sql.includes('STAFF_INVITATION_HANDSHAKE_V1'), 'Migration SQL missing its fail-closed trigger guard');
  // GoTrue sets invited_at only AFTER the auth.users INSERT, so invited_at can
  // never distinguish an invite inside the AFTER INSERT trigger (V1 bug).
  must(v2.includes('STAFF_INVITATION_HANDSHAKE_V2') && v2.includes('binding_nonce_hash') &&
       v2.includes("raw_user_meta_data->>'staff_invitation_nonce'") && v2.includes('sha256('),
       'V2 migration must bind the invite via the hashed insert-time secret');
  must(!/if v_pending_staff_invites = 1 and new\.invited_at is null/.test(v2.replace(/\$old\$[\s\S]*?\$old\$/, '')),
       'V2 must not reintroduce the invited_at gate');
  must(v2.includes('SELECT 2') && src.includes('handshakeVersion !== 2'),
       'Edge Function must require handshake version 2');
  must(src.includes('binding_nonce_hash: binding.hash') && src.includes('staff_invitation_nonce: binding.nonce') &&
       src.indexOf('binding_nonce_hash: binding.hash') < src.indexOf('service.auth.admin.inviteUserByEmail('),
       'Edge Function must store only the secret hash before the Auth invite');
  must(handshake.includes('crypto.getRandomValues(new Uint8Array(32))'), 'Binding secret must be 256-bit random');
  must(sql.includes('v_pending_staff_invites > 1') && sql.includes('v_pending_staff_invites = 0'),
       'Migration must reject ambiguous and unbacked invitations');
  must(sql.includes('si.consumed_at is null') && sql.includes('si.expires_at > v_now'),
       'Migration must reject expired/consumed invitations');
  must(sql.includes('REVOKE ALL ON FUNCTION public.staff_invitation_handshake_version() FROM PUBLIC'),
       'Marker function must be unavailable to public users');

  must(callback.includes('supabase.auth.getUser()') && callback.includes('isValidInvitedStaffProfile'),
       'InviteCallback must validate the server-issued profile');
  must(!/\.(?:upsert|insert|update|delete)\s*\(/.test(callback),
       'InviteCallback must not mutate users or membership records');
  must(!callback.includes('user_metadata') && !callback.includes('create-staff-thread'),
       'InviteCallback must not trust editable user metadata or create threads');
  must(guard.includes('isValidInvitedStaffProfile'), 'Missing local callback profile validation helper');

  return failures;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const failures = checkStaffInviteHandshake();
  if (failures.length) {
    for (const failure of failures) console.error('FAIL:', failure);
    process.exitCode = 1;
  } else {
    console.log('PASS: Staff invitation source/trigger contract and local callback safety checks.');
    console.log('NOTE: This does not prove that SQL has been applied or any invitation has succeeded.');
  }
}
