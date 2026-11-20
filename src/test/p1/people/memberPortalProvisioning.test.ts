import { describe, expect, it, vi } from 'vitest';
import {
  describeProvisioningError,
  isProvisionedStatus,
  provisionMemberPortalAccess,
} from '@/lib/memberPortalProvisioning';

// Finding 1: provisioning responses recognise exactly the three success
// statuses and never report success for invitation-era or error payloads.
const client = (result: { data?: unknown; error?: unknown }) => ({
  functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null, ...result }) },
});

describe('member portal provisioning client', () => {
  it('recognises only the required success statuses', () => {
    expect(isProvisionedStatus('already_provisioned')).toBe(true);
    expect(isProvisionedStatus('provisioned')).toBe(true);
    expect(isProvisionedStatus('provisioned_existing_identity')).toBe(true);
    expect(isProvisionedStatus('invitation_sent')).toBe(false);
    expect(isProvisionedStatus('identity_already_exists')).toBe(false);
  });

  it('invokes member-provision-access with member and tenant only', async () => {
    const c = client({ data: { ok: true, status: 'provisioned' } });
    await expect(provisionMemberPortalAccess(c as never, 'member-1', 'tenant-a')).resolves.toEqual({ ok: true, status: 'provisioned' });
    expect(c.functions.invoke).toHaveBeenCalledWith('member-provision-access', { body: { memberId: 'member-1', tenantId: 'tenant-a' } });
  });

  it('treats the legacy invitation response as a failure, not success', async () => {
    const c = client({ data: { ok: true, status: 'invitation_sent' } });
    await expect(provisionMemberPortalAccess(c as never, 'm', 't')).resolves.toEqual({ ok: false, error: 'unexpected_response' });
  });

  it('surfaces the server error code from a non-2xx response', async () => {
    const error = { context: { json: async () => ({ ok: false, error: 'member_linked_to_other_identity' }) } };
    const c = client({ error });
    await expect(provisionMemberPortalAccess(c as never, 'm', 't')).resolves.toEqual({ ok: false, error: 'member_linked_to_other_identity' });
  });

  it('reports network failures without throwing', async () => {
    const c = { functions: { invoke: vi.fn().mockRejectedValue(new Error('offline')) } };
    await expect(provisionMemberPortalAccess(c as never, 'm', 't')).resolves.toEqual({ ok: false, error: 'request_failed' });
  });

  it('uses no invitation or activation wording in error messages', () => {
    for (const code of ['member_email_missing', 'identity_creation_failed', 'forbidden', 'unknown_code']) {
      expect(describeProvisioningError(code)).not.toMatch(/invit|activat|approv/i);
    }
  });
});
