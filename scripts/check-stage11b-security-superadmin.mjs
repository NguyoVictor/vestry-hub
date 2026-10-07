import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const security = read('src/pages/security/SecurityCentre.tsx');
const sentry = read('src/components/security/SentryMonitor.tsx');
const posthog = read('src/components/security/PostHogDashboard.tsx');
const guard = read('src/components/layout/SuperAdminGuard.tsx');
const layout = read('src/components/layout/SuperAdminLayout.tsx');
const dashboard = read('src/pages/superadmin/SuperAdminDashboard.tsx');
const churches = read('src/pages/superadmin/SuperAdminChurches.tsx');
const subscriptions = read('src/pages/superadmin/SuperAdminStorageRequests.tsx');
const sentryFn = read('supabase/functions/fetch-sentry-issues/index.ts');
const sessionsFn = read('supabase/functions/get-active-sessions/index.ts');
const accessFn = read('supabase/functions/get-security-access-log/index.ts');
const platformFn = read('supabase/functions/platform-admin-overview/index.ts');

check('tenant security access log is server-authorized', security.includes('functions.invoke("get-security-access-log"') && accessFn.includes('authorizeTenantActor'));
check('active session endpoint authorizes tenant actor', sessionsFn.includes('authorizeTenantActor(req, service, String(tenant_id))'));
check('security export is functional', security.includes('const exportLogs = () =>') && security.includes('download = `security-log-'));
check('tenant security centre excludes platform sentry telemetry', !security.includes('<SentryMonitor') && !security.includes('<PostHogDashboard'));
check('sentry endpoint requires platform super admin', sentryFn.includes('is_super_admin') && sentryFn.includes('status !== "active"'));
check('sentry UI no longer creates tenant security alerts', !sentry.includes("from('security_alerts')") && !sentry.includes('useChurch'));
check('super admin guard requires is_super_admin', guard.includes('is_super_admin') && guard.includes('=== true'));
check('super admin overview uses server endpoint', dashboard.includes('functions.invoke("platform-admin-overview"'));
check('super admin churches use server endpoint', churches.includes('functions.invoke("platform-admin-overview"'));
check('super admin subscriptions use current model', subscriptions.includes('action: "subscriptions"') && !subscriptions.includes('CHURCH_STORAGE'));
check('legacy storage admin tables removed from super admin pages', !dashboard.includes('church_storage') && !churches.includes('church_storage') && !subscriptions.includes('storage_plans'));
check('platform endpoint validates platform super admin', platformFn.includes('actor.is_super_admin !== true') && platformFn.includes('actor.status !== "active"'));
check('platform endpoint uses current tenant subscription tables', platformFn.includes('tenant_subscriptions') && platformFn.includes('subscription_payment_attempts'));
check('sentry and posthog render only in platform dashboard', dashboard.includes('<SentryMonitor') && dashboard.includes('<PostHogDashboard') && posthog.includes('VITE_POSTHOG_DASHBOARD_URL'));
check('super admin navigation names current subscription surface', layout.includes('label: "Subscriptions"'));

const failed = checks.filter(c => !c.ok);
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
if (failed.length) { console.error(`Stage 11B contract: FAIL (${checks.length - failed.length}/${checks.length})`); process.exit(1); }
console.log(`Stage 11B contract: PASS (${checks.length}/${checks.length})`);
