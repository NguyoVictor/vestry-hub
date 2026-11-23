import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: {} } }));
import { functionErrorMessage, surfaceFunctionError } from '@/lib/functionGuard';

const httpError = (status: number, body: unknown) => {
  const res = new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  return Object.assign(new Error('Edge Function returned a non-2xx status code'), { context: res });
};

describe('T17: server-function errors show the reason given by the function', () => {
  it('reads error / message fields', () => {
    expect(functionErrorMessage({ error: 'Staff limit reached (3)' })).toBe('Staff limit reached (3)');
    expect(functionErrorMessage({ message: 'Forbidden' })).toBe('Forbidden');
    expect(functionErrorMessage({ error: { message: 'nested' } })).toBe('nested');
    expect(functionErrorMessage({ ok: false })).toBeNull();
    expect(functionErrorMessage(null)).toBeNull();
  });

  it('replaces the generic message, exposes the body as data, keeps the original body readable', async () => {
    const error = httpError(403, { error: 'Only an administrator of this church can connect IntaSend.' });
    const out = await surfaceFunctionError({ data: null, error });
    expect((out.error as Error).message).toBe('Only an administrator of this church can connect IntaSend.');
    expect((out.data as { error: string }).error).toMatch(/administrator/);
    await expect((error.context as Response).json()).resolves.toEqual({ error: 'Only an administrator of this church can connect IntaSend.' });
  });

  it('leaves successes and non-JSON errors alone', async () => {
    const ok = { data: { ok: true }, error: null };
    expect(await surfaceFunctionError(ok)).toBe(ok);
    const plain = Object.assign(new Error('Failed to send a request to the Edge Function'), {});
    const res = await surfaceFunctionError({ data: null, error: plain });
    expect((res.error as Error).message).toBe('Failed to send a request to the Edge Function');
  });
});
