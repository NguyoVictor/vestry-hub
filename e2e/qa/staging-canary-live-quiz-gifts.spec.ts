/**
 * Pre-production canary (23 Nov): T2 live quiz played end to end in two
 * browsers (Church A admin hosts; a signed-out player joins by PIN), and G7b
 * finance staff confirming / rejecting member-declared gifts.
 * Writes only QA-CANARY-tagged rows in QA Church A. For G7b the two pending
 * gifts are created beforehand by the member through member_declare_gift
 * (notes "<tag> gift confirm" / "<tag> gift reject"), see PW_GIFT_TAG.
 */
import { expect, test } from '@playwright/test';
import { CANARY_TAG, signIn, watch } from './staging-canary-helpers';

test.describe.configure({ mode: 'serial' });
const settle = (p: import('@playwright/test').Page) => p.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

test('T2: write a quiz, host it, a player joins by PIN and plays to the end', async ({ page, browser }, testInfo) => {
  test.setTimeout(240_000);
  const w = watch(page);
  const title = `${CANARY_TAG} Live`;
  await signIn(page, 'A_ADMIN');
  await page.goto('/training');
  await settle(page);
  await page.getByRole('button', { name: 'Launch Live Quiz' }).click();
  await expect(page).toHaveURL(/\/training\/quizzes$/);

  // Author
  await page.getByRole('button', { name: 'New quiz' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Title').fill(title);
  await dlg.getByLabel('Question 1', { exact: true }).fill('Who built the ark?');
  await dlg.getByLabel('Question 1 answer 1').fill('Moses');
  await dlg.getByLabel('Question 1 answer 2').fill('Noah');
  await dlg.getByRole('button', { name: 'Mark answer 2 correct' }).click();
  await dlg.getByRole('button', { name: 'Save quiz' }).click();
  await expect(dlg).toBeHidden();
  await page.reload(); await settle(page);
  const card = page.getByTestId('quiz-card').filter({ hasText: title });
  await expect(card).toContainText('1 question');

  // Host
  await card.getByRole('button', { name: `Host ${title} live` }).click();
  await expect(page).toHaveURL(/\/training\/host\//);
  const pin = (await page.getByTestId('game-pin').innerText()).trim();
  expect(pin).toMatch(/^[A-Z0-9]{6}$/);

  // Player: separate signed-out browser
  const playerCtx = await browser.newContext({ baseURL: testInfo.project.use.baseURL, extraHTTPHeaders: testInfo.project.use.extraHTTPHeaders, serviceWorkers: 'block' });
  const player = await playerCtx.newPage();
  const pw = watch(player);
  await player.goto(`/join/${pin}`);
  await player.getByLabel('Nickname').fill('Canary Player');
  await player.getByRole('button', { name: 'Join game' }).click();
  await expect(player.getByText("You're in!")).toBeVisible();

  await expect(page.getByTestId('lobby-player').filter({ hasText: 'Canary Player' })).toBeVisible();
  await page.getByRole('button', { name: /^Start/ }).click();

  await expect(player.getByTestId('player-question')).toHaveText('Who built the ark?');
  await player.getByTestId('player-option').filter({ hasText: 'Noah' }).click();
  await expect(player.getByTestId('answer-locked')).toBeVisible();

  // Everyone answered -> host reveals automatically.
  await expect(page.getByTestId('host-correct-option')).toContainText('Noah');
  await expect(player.getByTestId('result')).toContainText('Correct!');
  await page.getByRole('button', { name: 'Show leaderboard' }).click();
  await expect(page.getByTestId('leaderboard-row').first()).toContainText('Canary Player');
  await page.getByRole('button', { name: 'Finish & show winners' }).click();
  await expect(page.getByText('Final results')).toBeVisible();
  await expect(player.getByTestId('final-rank')).toContainText('#1 of 1');

  console.log('T2 PIN', pin, '| host failures:', JSON.stringify(w.failures), '| player failures:', JSON.stringify(pw.failures),
    '| pageErrors:', JSON.stringify([...w.pageErrors, ...pw.pageErrors]));
  expect(w.pageErrors).toEqual([]);
  expect(pw.pageErrors).toEqual([]);
  expect(pw.failures).toEqual([]);
  await playerCtx.close();
});

test('G7b: finance staff confirm one member-declared gift and reject another with a reason', async ({ page }) => {
  const tag = process.env.PW_GIFT_TAG;
  test.skip(!tag, 'PW_GIFT_TAG not set (pending gifts are created by the member beforehand)');
  const w = watch(page);
  await signIn(page, 'A_ADMIN');
  await page.goto('/giving-records');
  await settle(page);
  const queue = page.getByTestId('pending-member-gifts');
  await expect(queue).toBeVisible();
  const confirmRow = queue.getByTestId('pending-gift-row').filter({ hasText: `${tag} gift confirm` });
  const rejectRow = queue.getByTestId('pending-gift-row').filter({ hasText: `${tag} gift reject` });
  await expect(confirmRow).toBeVisible();
  await confirmRow.getByRole('button', { name: /^Confirm/ }).click();
  await expect(confirmRow).toHaveCount(0);

  await rejectRow.getByRole('button', { name: /^Reject/ }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg.getByRole('button', { name: 'Reject gift' })).toBeDisabled();
  await dlg.getByLabel(/Reason/).fill('QA canary: not found in the bank statement');
  await dlg.getByRole('button', { name: 'Reject gift' }).click();
  await expect(rejectRow).toHaveCount(0);

  await page.reload(); await settle(page);
  await expect(page.getByTestId('pending-gift-row').filter({ hasText: tag })).toHaveCount(0);
  console.log('G7b failures:', JSON.stringify(w.failures), '| pageErrors:', JSON.stringify(w.pageErrors));
  expect(w.pageErrors).toEqual([]);
});
