import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const overview = '/classics/gift-of-the-magi-l1/';
const originalOverview = '/classics/gift-of-the-magi-l3/';
const resumeLink = (page: Page) => page.getByRole('link', { name: /^繼續讀第 \d+ 節$/ });

test('opening a part offers a direct link back to the last opened part of that classic', async ({ page }) => {
  await page.goto(overview);
  await expect(resumeLink(page)).toHaveCount(0);
  await page.getByRole('link', { name: /第 2 節/ }).click();
  // Let the part's module script save the position before navigating away.
  await page.waitForURL(`${overview}2/`, { waitUntil: 'load' });
  await page.goto(overview);
  await expect(resumeLink(page)).toHaveText('繼續讀第 2 節');
  await expect(resumeLink(page)).toHaveAttribute('href', `${overview}2/`);
  await page.reload();
  await resumeLink(page).click();
  await expect(page).toHaveURL(new RegExp(`${overview}2/$`));
});

test('rewrite and original remember their own last opened parts', async ({ page }) => {
  await page.goto(`${overview}2/`);
  await page.goto(originalOverview);
  await expect(resumeLink(page)).toHaveCount(0);
  await page.goto(`${originalOverview}1/`);
  await page.goto(originalOverview);
  await expect(resumeLink(page)).toHaveAttribute('href', `${originalOverview}1/`);
  await page.goto(overview);
  await expect(resumeLink(page)).toHaveAttribute('href', `${overview}2/`);
});

test('Back and Forward refresh the resume link and last opened part', async ({ page }) => {
  await page.goto(overview);
  await page.goto(`${overview}1/`);
  await page.goto(overview);
  await expect(resumeLink(page)).toHaveText('繼續讀第 1 節');
  await page.goto(`${overview}2/`);
  await page.goBack();
  await expect(resumeLink(page)).toHaveText('繼續讀第 2 節');
  await page.goBack();
  await page.goForward();
  await expect(resumeLink(page)).toHaveText('繼續讀第 1 節');
});

test('a restored page reflects parts opened while it was inactive', async ({ page, context }) => {
  await page.goto(`${overview}1/`);
  await page.goto(overview);
  await expect(resumeLink(page)).toHaveText('繼續讀第 1 節');
  const other = await context.newPage();
  await other.goto(`${overview}2/`);
  await other.close();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(resumeLink(page)).toHaveText('繼續讀第 2 節');

  await page.goto(`${overview}1/`);
  const next = await context.newPage();
  await next.goto(`${overview}2/`);
  await next.close();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await page.goto(overview);
  await expect(resumeLink(page)).toHaveText('繼續讀第 1 節');
});

test('invalid saved part numbers do not offer a resume link', async ({ page }) => {
  await page.goto(overview);
  const key = 'carlenglish.classic-resume.gift-of-the-magi-l1';
  for (const value of ['0', '4', '-1', '2.5', 'NaN', '{broken', '02']) {
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key, value });
    await page.reload();
    await expect(resumeLink(page)).toHaveCount(0);
  }
});

for (const blocked of ['getter', 'getItem', 'setItem'] as const) {
  test(`reading stays usable when storage ${blocked} throws`, async ({ page }) => {
    await page.addInitScript((failure) => {
      if (failure === 'getter') Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); } });
      else Storage.prototype[failure] = () => { throw new DOMException('blocked', 'SecurityError'); };
    }, blocked);
    await page.goto(`${overview}2/`);
    await expect(page.getByRole('heading', { name: '英文正文' })).toBeVisible();
    await page.getByRole('link', { name: /回到總覽/ }).click();
    await expect(page.getByRole('heading', { name: 'The Gift of the Magi' })).toBeVisible();
    await expect(resumeLink(page)).toHaveCount(0);
  });
}

test('review backup export and import leave resume position out', async ({ page }, testInfo) => {
  await page.goto('/scenes/cafe-breakfast/');
  await page.getByRole('button', { name: /^加入複習：/ }).first().click();
  await page.goto(`${overview}2/`);
  await page.goto(overview);
  await expect(resumeLink(page)).toHaveText('繼續讀第 2 節');

  await page.goto('/review/');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '匯出備份', exact: true }).click();
  const file = testInfo.outputPath('review-backup.json');
  await (await downloading).saveAs(file);
  const backup = readFileSync(file, 'utf8');
  expect(backup).not.toContain('classic-resume');
  expect(backup).not.toContain('gift-of-the-magi-l1');

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel('匯入備份').setInputFiles(file);
  await page.getByRole('button', { name: '取代' }).click();
  await page.goto(overview);
  await expect(resumeLink(page)).toHaveCount(0);

  await page.goto(`${overview}1/`);
  await page.goto('/review/');
  await page.getByLabel('匯入備份').setInputFiles(file);
  await page.getByRole('button', { name: '取代' }).click();
  await page.goto(overview);
  await expect(resumeLink(page)).toHaveText('繼續讀第 1 節');
});
