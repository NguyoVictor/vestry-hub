/**
 * Hard-fail guard for destructive platform Playwright tests.
 * This is intentionally stricter than normal environment configuration.
 */
export interface PlatformSafetyConfig {
  disposable: true;
  tenantAId: string;
  tenantBId: string;
  baseUrl: string;
}

const PROTECTED_REFS = new Set([
  'xwbajophstetbnnemsyq', // Existing Vestry staging; shared by Vercel Production + Preview
  'crjdsxxkspvdwknrmijs', // Existing churchapp project; not disposable
]);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function parseUrl(raw: string, name: string): URL {
  try {
    const url = new URL(raw);
    if (url.username || url.password || url.search || url.hash) throw new Error('URL has unexpected components');
    return url;
  } catch {
    throw new Error(`Refusing platform E2E: invalid ${name}.`);
  }
}

export function requireDisposablePlatformTestEnv(): PlatformSafetyConfig {
  if (process.env.PW_PLATFORM_TEST_ENV !== 'disposable') {
    throw new Error('Refusing platform E2E: PW_PLATFORM_TEST_ENV must equal "disposable".');
  }

  const supabaseUrlRaw = process.env.PW_SUPABASE_URL?.trim();
  if (!supabaseUrlRaw) {
    throw new Error('Refusing platform E2E: PW_SUPABASE_URL must identify a disposable backend.');
  }
  const supabaseUrl = parseUrl(supabaseUrlRaw, 'PW_SUPABASE_URL');
  const hostname = supabaseUrl.hostname.toLowerCase();
  const ref = process.env.PW_QA_PROJECT_REF?.trim().toLowerCase();
  if (!ref) throw new Error('Refusing platform E2E: explicit PW_QA_PROJECT_REF is required.');

  const isLocal = LOCAL_HOSTS.has(hostname) && supabaseUrl.protocol === 'http:' && supabaseUrl.port === '54321';
  if (isLocal) {
    if (ref !== 'local') {
      throw new Error('Refusing platform E2E: local Supabase must use PW_QA_PROJECT_REF=local.');
    }
  } else {
    if (supabaseUrl.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(hostname)) {
      throw new Error('Refusing platform E2E: invalid PW_SUPABASE_URL.');
    }
    const actualRef = hostname.slice(0, -'.supabase.co'.length);
    if (PROTECTED_REFS.has(actualRef)) {
      throw new Error('Refusing platform E2E: protected/shared Vestry Hub Supabase project is not disposable.');
    }
    if (ref !== actualRef || PROTECTED_REFS.has(ref)) {
      throw new Error('Refusing platform E2E: PW_QA_PROJECT_REF must match the explicit disposable Supabase project.');
    }
  }

  const tenantAId = process.env.PW_TENANT_A_ID?.trim();
  const tenantBId = process.env.PW_TENANT_B_ID?.trim();
  if (!tenantAId || !tenantBId || tenantAId === tenantBId) {
    throw new Error('PW_TENANT_A_ID and PW_TENANT_B_ID must identify two different disposable tenants.');
  }

  const baseUrl = process.env.PW_BASE_URL?.trim() || 'http://127.0.0.1:4173';
  const parsedBase = parseUrl(baseUrl, 'PW_BASE_URL');
  if (!['http:', 'https:'].includes(parsedBase.protocol)) {
    throw new Error('Refusing platform E2E: PW_BASE_URL must use HTTP(S).');
  }
  const appHost = parsedBase.hostname.toLowerCase();
  if (appHost === 'vestryhub.com' || appHost.endsWith('.vestryhub.com')) {
    throw new Error('Refusing destructive platform E2E against a production vestryhub.com host.');
  }
  if (!LOCAL_HOSTS.has(appHost)) {
    const qaHost = process.env.PW_QA_APP_HOST?.trim().toLowerCase();
    if (!qaHost || qaHost !== appHost) {
      throw new Error('Refusing platform E2E: nonlocal PW_BASE_URL requires exact PW_QA_APP_HOST allowlisting.');
    }
  }

  // The following environment value must describe the *built frontend* backend.
  // Phase 0 also requires independent browser-network verification of this claim.
  const frontendBackendRaw = process.env.PW_FRONTEND_SUPABASE_URL?.trim();
  if (!frontendBackendRaw) {
    throw new Error('Refusing platform E2E: PW_FRONTEND_SUPABASE_URL must be set and verified against the running app.');
  }
  const frontendBackend = parseUrl(frontendBackendRaw, 'PW_FRONTEND_SUPABASE_URL');
  if (frontendBackend.origin !== supabaseUrl.origin || frontendBackend.pathname.replace(/\/$/, '') !== supabaseUrl.pathname.replace(/\/$/, '')) {
    throw new Error('Refusing platform E2E: frontend and direct-test Supabase targets do not match.');
  }

  return { disposable: true, tenantAId, tenantBId, baseUrl };
}
