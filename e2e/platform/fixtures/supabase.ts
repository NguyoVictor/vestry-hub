import { createClient } from '@supabase/supabase-js';
import { requireDisposablePlatformTestEnv } from './safety';

function baseConfig() {
  requireDisposablePlatformTestEnv();
  const url = process.env.PW_SUPABASE_URL;
  if (!url) throw new Error('PW_SUPABASE_URL is required for direct platform contracts.');
  return { url };
}

export function platformServiceClient() {
  const { url } = baseConfig();
  const key = process.env.PW_SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('PW_SUPABASE_SERVICE_ROLE_KEY is required for fixture setup/cleanup only.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function platformActorClient(accessToken: string) {
  const { url } = baseConfig();
  const key = process.env.PW_SUPABASE_ANON_KEY;
  if (!key) throw new Error('PW_SUPABASE_ANON_KEY is required for actor-scoped authorization probes.');
  if (!accessToken?.trim()) throw new Error('Actor access token is required.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken.trim()}` } },
  });
}

export function actorAccessToken(actor: 'tenant-a-admin' | 'tenant-b-admin' | 'member-a' | 'member-b') {
  const key = `PW_${actor.toUpperCase().replaceAll('-', '_')}_ACCESS_TOKEN`;
  return process.env[key]?.trim() || undefined;
}
