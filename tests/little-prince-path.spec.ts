import { test, expect } from '@playwright/test';
import { bridgeReadings, princePath, princeGoalPaths } from '../src/data/little-prince-path';

test('reading goal entry leads to a whole-book roadmap and optional drills', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /讀懂《小王子》英文譯本/ }).click();
  await expect(page).toHaveURL(new RegExp(`${princePath}$`));
  await expect(page.getByRole('heading', { level: 1 })).toContainText('英文譯本');
  await expect(page.locator('[data-chapters] > li')).toHaveCount(27);
  await expect(page.locator('[data-chapters] > li').last()).toContainText('第 27 章');
  await expect(page.locator('[data-reading-record]')).not.toHaveAttribute('open');
  await expect(page.getByRole('heading', { name: '按需補強：短文只是訓練' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const reading of bridgeReadings) {
    const link = page.locator(`a[href="${princePath}${reading.id}/"]`);
    await expect(link).toBeVisible();
  }
  const sitemap = await request.get('/sitemap.xml');
  for (const path of princeGoalPaths) expect(await sitemap.text()).toContain(path);
});

for (const [index, reading] of bridgeReadings.entries()) {
  test(`reading ${index + 1} keeps help closed, supports deliberate disclosure and fits viewport`, async ({ page }) => {
    await page.goto(`${princePath}${reading.id}/`);
    await expect(page.getByRole('heading', { name: reading.titleEn, exact: true })).toBeVisible();
    await expect(page.locator('.story')).toContainText(reading.paragraphs[0]);
    for (const attribute of ['data-hint', 'data-translation', 'data-answers']) {
      const details = page.locator(`details[${attribute}]`);
      await expect(details).not.toHaveAttribute('open');
      await details.locator('summary').focus();
      await page.keyboard.press('Enter');
      await expect(details).toHaveAttribute('open', '');
      await details.locator('summary').click();
      await expect(details).not.toHaveAttribute('open');
    }
    await expect(page.getByRole('navigation', { name: '其他補強練習' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.reload();
    await expect(page.locator('details[data-answers]')).not.toHaveAttribute('open');
  });
}

test('reading and reference answers work without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}${princePath}${bridgeReadings[0].id}/`);
  await expect(page.locator('.story')).toContainText(bridgeReadings[0].paragraphs[0]);
  await page.locator('[data-answers] summary').click();
  await expect(page.locator('[data-answers]')).toContainText(bridgeReadings[0].questions[0].answer);
  await context.close();
});
