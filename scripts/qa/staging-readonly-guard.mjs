/**
 * Strict read-only staging smoke guard. NOT a replacement for the disposable
 * database guard in e2e/platform/fixtures/safety.ts.
 * This guard allows no POST/PATCH/PUT/DELETE requests (even for analytics).
 */
export const STAGING_SUPABASE_ORIGIN = 'https://xwbajophstetbnnemsyq.supabase.co';
const PROTECTED_APP_DOMAIN = /(^|\.)vestryhub\.com$/i;

export function requireStagingReadOnlyEnv(env = process.env) {
  if (env.PW_STAGING_READONLY !== '1') throw new Error('PW_STAGING_READONLY must be 1');
  const raw = (env.PW_STAGING_BASE_URL || '').trim();
  if (!raw) throw new Error('PW_STAGING_BASE_URL must be an exact preview deployment URL');
  let url;
  try { url = new URL(raw); } catch { throw new Error('Invalid PW_STAGING_BASE_URL'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      url.pathname !== '/' || url.port || !url.hostname.endsWith('.vercel.app')) {
    throw new Error('PW_STAGING_BASE_URL must be an exact HTTPS Vercel preview origin');
  }
  if (PROTECTED_APP_DOMAIN.test(url.hostname) || url.hostname === 'vestry-hub.vercel.app') {
    throw new Error('Production aliases are not allowed in staging read-only tests');
  }
  if (env.PW_STAGING_ALLOWED_HOST !== url.hostname) {
    throw new Error('PW_STAGING_ALLOWED_HOST must exactly equal the preview hostname');
  }
  if (env.PW_STAGING_SUPABASE_URL !== STAGING_SUPABASE_ORIGIN) {
    throw new Error('PW_STAGING_SUPABASE_URL must exactly match Vestry Hub staging');
  }
  return Object.freeze({ baseURL: url.origin, appHost: url.hostname, backend: STAGING_SUPABASE_ORIGIN });
}

export function classifyReadOnlyRequest(rawUrl, method, cfg) {
  let url;
  try { url = new URL(rawUrl); } catch { return { allow: false, reason: 'Invalid request URL' }; }
  const verb = String(method).toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(verb)) {
    return { allow: false, reason: `Blocked non-read-only ${verb} request` };
  }
  if (url.hostname.endsWith('.supabase.co') && url.origin !== cfg.backend) {
    return { allow: false, reason: 'Blocked request to unexpected Supabase backend' };
  }
  // Prevent following links or fetching resources from the live app domain.
  if (PROTECTED_APP_DOMAIN.test(url.hostname)) {
    return { allow: false, reason: 'Blocked request to protected production domain' };
  }
  return { allow: true };
}
