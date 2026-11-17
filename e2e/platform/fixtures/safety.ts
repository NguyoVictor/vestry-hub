export interface PlatformSafetyConfig {
  disposable: true;
  tenantAId: string;
  tenantBId: string;
  baseUrl: string;
}

export function requireDisposablePlatformTestEnv(): PlatformSafetyConfig {
  if (process.env.PW_PLATFORM_TEST_ENV !== 'disposable') {
    throw new Error('Refusing platform E2E: PW_PLATFORM_TEST_ENV must equal "disposable".');
  }
  const supabaseUrl = process.env.PW_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    throw new Error('Refusing platform E2E: PW_SUPABASE_URL must identify a disposable backend.');
  }
  let supabaseHost: string;
  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/i.test(url.hostname)) {
      throw new Error('not a supported Supabase HTTPS URL');
    }
    supabaseHost = url.hostname.toLowerCase();
  } catch {
    throw new Error('Refusing platform E2E: invalid PW_SUPABASE_URL.');
  }
  // This database is shared by the Vercel Production and Preview environments.
  // A disposable flag alone must never authorize destructive tests against it.
  if (supabaseHost === 'xwbajophstetbnnemsyq.supabase.co') {
    throw new Error('Refusing platform E2E: shared Vestry Hub staging Supabase project is not disposable.');
  }
  const tenantAId = process.env.PW_TENANT_A_ID?.trim();
  const tenantBId = process.env.PW_TENANT_B_ID?.trim();
  if (!tenantAId || !tenantBId || tenantAId === tenantBId) {
    throw new Error('PW_TENANT_A_ID and PW_TENANT_B_ID must identify two different disposable tenants.');
  }
  const baseUrl = process.env.PW_BASE_URL?.trim() || 'http://127.0.0.1:4173';
  if (/vestryhub\.com$/i.test(new URL(baseUrl).hostname) && process.env.PW_ALLOW_PRODUCTION_E2E !== 'I_UNDERSTAND_DESTRUCTIVE_TESTS') {
    throw new Error('Refusing destructive platform E2E against a production vestryhub.com host.');
  }
  return { disposable: true, tenantAId, tenantBId, baseUrl };
}
