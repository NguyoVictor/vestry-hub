/**
 * Phase 4 acceptance canary (Findings 7, 9, 25) with REAL file uploads, as QA
 * Church A admin; plus direct Storage API negative checks as Church B admin
 * against Church A's tenant folders. Uploads are tiny generated PNGs tagged
 * QA-CANARY. Tenant ids come from PW_TENANT_A_ID / PW_TENANT_B_ID.
 */
import { deflateSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';
import { CANARY_TAG, signIn, watch } from './staging-canary-helpers';

test.describe.configure({ mode: 'serial' });

const A = process.env.PW_TENANT_A_ID ?? '';
const B = process.env.PW_TENANT_B_ID ?? '';

/** Minimal valid 16x16 RGB PNG (orange square). */
function png(): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const w = 16, h = 16;
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set([249, 115, 22], y * (w * 3 + 1) + 1 + x * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const file = (name: string) => ({ name, mimeType: 'image/png', buffer: png() });

async function expectToast(page: Page, text: RegExp) {
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: text }).first()).toBeVisible();
}
// Known, queued (billing phase): browser-side storage-usage PATCH on tenant_subscriptions is denied by RLS (correctly).
const relevant = (f: string[]) => f.filter(x => !/login_events|\/rest\/v1\/users\b|PATCH \/rest\/v1\/tenant_subscriptions/.test(x));

test('F7: facility WITH thumbnail is created, listed after reload, thumbnail served', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/facility-booking');
  await page.getByRole('button', { name: /Add Facility/ }).first().click();
  const dlg = page.getByRole('dialog');
  await dlg.getByPlaceholder('e.g., Main Hall').fill(`${CANARY_TAG} Thumb Hall`);
  await dlg.locator('input[type="file"][accept^="image"]').first().setInputFiles(file('canary-thumb.png'));
  await dlg.getByRole('button', { name: /^(Save|Create|Add)/ }).last().click();
  await expectToast(page, /Facility created/);
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  const card = page.getByText(`${CANARY_TAG} Thumb Hall`).first();
  await expect(card).toBeVisible();
  const thumb = page.locator(`img[src*="/storage/v1/object/public/facility-thumbnails/${A}/"]`).first();
  await expect(thumb).toBeVisible();
  const loaded = await thumb.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
  console.log('F7 thumbnail rendered:', loaded, '| failures:', JSON.stringify(relevant(w.failures)), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(loaded).toBe(true);
  expect(relevant(w.failures)).toEqual([]);
});

test('F9: incident WITH attachment is saved, listed, attachment opens, status change logged', async ({ page, context }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/incident-management');
  await page.waitForLoadState('networkidle').catch(() => {});
  if (!(await page.locator('tr').filter({ hasText: CANARY_TAG }).first().isVisible().catch(() => false))) {
    await page.getByRole('button', { name: /Report Incident/ }).first().click();
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('combobox').filter({ hasText: 'Select incident type' }).click();
    await page.getByRole('option').first().click();
    await sheet.getByPlaceholder('Describe what happened in detail...').fill(`${CANARY_TAG} incident with evidence — recovery canary.`);
    await sheet.locator('input[type="file"]').first().setInputFiles(file('canary evidence (1).png'));
    await sheet.getByRole('button', { name: 'Report Incident' }).last().click();
    await expectToast(page, /Incident reported successfully/);
  }
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  const row = page.locator('tr').filter({ hasText: CANARY_TAG }).first();
  await expect(row).toBeVisible();

  // View → attachment opens through a signed URL (private bucket).
  await row.getByRole('button').last().click();
  await page.getByRole('menuitem', { name: 'View' }).click();
  const popupPromise = context.waitForEvent('page');
  await page.getByRole('button', { name: /canary_evidence/ }).first().click();
  const popup = await popupPromise;
  await popup.waitForLoadState().catch(() => {});
  const signedUrl = popup.url();
  expect(signedUrl).toContain('/storage/v1/object/sign/incident-attachments/');
  const resp = await page.request.get(signedUrl);
  console.log('F9 signed attachment status:', resp.status(), resp.headers()['content-type']);
  expect(resp.status()).toBe(200);
  // The bare (unsigned) object URL must NOT be readable: the bucket is private.
  const pub = await page.request.get(signedUrl.replace('/object/sign/', '/object/public/').split('?')[0]);
  console.log('F9 unsigned public URL status:', pub.status());
  expect(pub.status()).toBeGreaterThanOrEqual(400);
  await popup.close();
  await page.keyboard.press('Escape');

  // Update Status → investigating; history row is written.
  await page.reload();
  await page.locator('tr').filter({ hasText: CANARY_TAG }).first().getByRole('button').last().click();
  await page.getByRole('menuitem', { name: 'Update Status' }).click();
  const modal = page.getByRole('dialog');
  await modal.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Investigating' }).click();
  await expect(modal.getByRole('combobox').first()).toContainText('Investigating');
  await modal.getByPlaceholder('Add a note about this status change...').fill('Canary status change');
  await modal.getByRole('button', { name: 'Save' }).click();
  await expectToast(page, /Status updated/);
  await page.reload();
  await expect(page.locator('tr').filter({ hasText: CANARY_TAG }).first()).toContainText(/Investigating/i);

  // Edit opens PRE-FILLED (was blank: sync ran only at mount).
  await page.locator('tr').filter({ hasText: CANARY_TAG }).first().getByRole('button').last().click();
  await page.getByRole('menuitem', { name: /Edit/ }).click();
  await expect(page.getByPlaceholder('Describe what happened in detail...')).toHaveValue(new RegExp(CANARY_TAG));
  await page.keyboard.press('Escape');
  console.log('F9 failures:', JSON.stringify(relevant(w.failures)), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(relevant(w.failures)).toEqual([]);
});

test('F25: General Settings saves timezone + new logo; both persist after reload', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/settings/general');
  await page.waitForLoadState('networkidle').catch(() => {});
  const tz = page.locator('label:text-is("Timezone")').locator('..').getByRole('combobox');
  await tz.click();
  await page.getByRole('option', { name: 'Africa/Kampala' }).click();
  await page.locator('input[type="file"][accept*="image"]').first().setInputFiles(file('canary-logo.png'));
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expectToast(page, /Settings saved successfully/);
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('label:text-is("Timezone")').locator('..').getByRole('combobox')).toContainText('Africa/Kampala');
  const logo = page.locator(`img[src*="/storage/v1/object/public/church-logos/${A}/logo-"]`).first();
  await expect(logo).toBeVisible();
  console.log('F25 failures:', JSON.stringify(relevant(w.failures)), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(relevant(w.failures)).toEqual([]);
});

test('Isolation: Church B admin cannot write into Church A storage folders or read A incident evidence', async ({ page }) => {
  expect(A && B && A !== B).toBeTruthy();
  let apikey = '';
  page.on('request', r => { if (!apikey && new URL(r.url()).hostname.endsWith('.supabase.co')) apikey = r.headers()['apikey'] ?? ''; });
  await signIn(page, 'B_ADMIN');
  await page.waitForLoadState('networkidle').catch(() => {});
  expect(apikey.length).toBeGreaterThan(10);
  const results = await page.evaluate(async ({ A, B, apikey }) => {
    const key = Object.keys(localStorage).find(k => /^sb-.*-auth-token$/.test(k));
    const token = key ? JSON.parse(localStorage.getItem(key) as string).access_token : '';
    const base = `https://${key!.slice(3, key!.indexOf('-auth-token'))}.supabase.co/storage/v1`;
    const hdr = { Authorization: `Bearer ${token}`, apikey };
    const put = async (bucket: string, path: string) => {
      const r = await fetch(`${base}/object/${bucket}/${path}`, { method: 'POST', headers: { ...hdr, 'Content-Type': 'image/png', 'x-upsert': 'false' }, body: new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }) });
      return r.status;
    };
    const list = async (bucket: string, prefix: string) => {
      const r = await fetch(`${base}/object/list/${bucket}`, { method: 'POST', headers: { ...hdr, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix, limit: 10 }) });
      const j = await r.json().catch(() => null);
      return Array.isArray(j) ? j.length : `status ${r.status}`;
    };
    return {
      bWritesAThumb: await put('facility-thumbnails', `${A}/qa-canary-cross-tenant.png`),
      bWritesAIncident: await put('incident-attachments', `${A}/qa-canary-cross-tenant.png`),
      bWritesALogo: await put('church-logos', `${A}/qa-canary-cross-tenant.png`),
      bListsAIncidents: await list('incident-attachments', `${A}/`),
      bWritesOwnIncidentFolder: await put('incident-attachments', `${B}/qa-canary-own-${Date.now()}.png`),
    };
  }, { A, B, apikey });
  console.log('Isolation results:', JSON.stringify(results));
  for (const k of ['bWritesAThumb', 'bWritesAIncident', 'bWritesALogo'] as const) {
    expect([400, 401, 403], k).toContain(results[k]);
  }
  expect(results.bListsAIncidents).toBe(0);
  expect(results.bWritesOwnIncidentFolder).toBe(200);
});

test('Embeds: every pinned select returns 200; the un-pinned form returns 300 (ambiguous)', async ({ page }) => {
  let apikey = '';
  page.on('request', r => { if (!apikey && new URL(r.url()).hostname.endsWith('.supabase.co')) apikey = r.headers()['apikey'] ?? ''; });
  await signIn(page, 'A_ADMIN');
  await page.waitForLoadState('networkidle').catch(() => {});
  const cases: Array<[string, string]> = [
    ['facilities', 'id,facility_images!facility_images_facility_id_fkey(id)'],
    ['announcements', 'id,announcement_types!announcements_category_id_fkey(label)'],
    ['testimonies', 'id,testimony_categories!testimonies_category_id_fkey(label),testimony_reactions!testimony_reactions_testimony_id_fkey(id),members!testimonies_member_id_fkey(first_name)'],
    ['group_members', 'group_id,groups!group_members_group_id_fkey(name)'],
    ['volunteers', 'role_id,volunteer_roles!volunteers_role_id_fkey(name)'],
    ['join_requests', 'id,members!join_requests_member_id_fkey(first_name)'],
  ];
  const { token, base } = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(k => /^sb-.*-auth-token$/.test(k))!;
    return { token: JSON.parse(localStorage.getItem(key) as string).access_token as string,
             base: `https://${key.slice(3, key.indexOf('-auth-token'))}.supabase.co/rest/v1` };
  });
  const get = async (t: string, sel: string) =>
    (await page.request.get(`${base}/${t}?select=${encodeURIComponent(sel)}&limit=1`,
      { headers: { Authorization: `Bearer ${token}`, apikey }, maxRedirects: 0 })).status();
  const out: Record<string, [number, number]> = {};
  for (const [t, sel] of cases) out[t] = [await get(t, sel), await get(t, sel.replace(/![a-z_]+\(/g, '('))];
  console.log('Embeds [pinned, unpinned]:', JSON.stringify(out));
  for (const [t, [pinned, unpinned]] of Object.entries(out)) {
    expect(pinned, `${t} pinned`).toBe(200);
    expect(unpinned, `${t} unpinned (proves the ambiguity)`).toBe(300);
  }
});
