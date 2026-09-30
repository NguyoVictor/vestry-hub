import { test, expect } from '@playwright/test';
import { buildTenantUrl } from '../../../src/lib/tenantHost';

test('QR/share URLs are tenant-host aware', () => {
  expect(buildTenantUrl('grace-church', '/member/login', { baseDomain: 'vestryhub.com' })).toBe('https://grace-church.vestryhub.com/member/login');
});
