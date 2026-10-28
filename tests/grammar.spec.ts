import { test, expect } from '@playwright/test';
import { grammarLessons, grammarPaths } from '../src/data/grammar';

test('independent grammar entry exposes only completed lessons and keeps planned topics unlinked', async ({ page, request }) => {
  await page.goto('/');
  await page.locator('a[href="/grammar/"]').click();
  await expect(page).toHaveURL(/\/grammar\/$/);
  await expect(page.locator('.lesson-list > li')).toHaveCount(6);
  for (const lesson of grammarLessons) await expect(page.locator(`a[href="/grammar/${lesson.id}/"]`)).toBeVisible();
  await expect(page.getByRole('heading', { name: '後續知識版圖 · 尚未製作課程' })).toBeVisible();
  await expect(page.locator('section[aria-labelledby="planned-title"] a')).toHaveCount(0);
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  for (const path of grammarPaths) expect(await sitemap.text()).toContain(path);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

for (const lesson of grammarLessons) {
  test(`grammar ${lesson.id} preserves read-first disclosure, navigation and narrow layout`, async ({ page }) => {
    await page.goto(`/grammar/${lesson.id}/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(lesson.title);
    await expect(page.locator('.story')).toHaveText(lesson.story);
    for (const attr of ['data-example-help', 'data-translation', 'data-answers', 'data-sources']) {
      const details = page.locator(`details[${attr}]`).first();
      await expect(details).not.toHaveAttribute('open');
      await details.locator('summary').focus();
      await page.keyboard.press('Enter');
      await expect(details).toHaveAttribute('open', '');
      await details.locator('summary').click();
      await expect(details).not.toHaveAttribute('open');
    }
    await page.locator('[data-answers] summary').click();
    for (const question of lesson.questions) await expect(page.locator('[data-answers]')).toContainText(question.answer);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.reload();
    await expect(page.locator('[data-answers]')).not.toHaveAttribute('open');
    await page.getByRole('link', { name: '回文法區，自選卡點' }).click();
    await expect(page).toHaveURL(/\/grammar\/$/);
  });
}

test('grammar can be read and answers disclosed without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/grammar/${grammarLessons[0].id}/`);
  await expect(page.locator('.story')).toHaveText(grammarLessons[0].story);
  await page.locator('[data-answers] summary').click();
  await expect(page.locator('[data-answers]')).toContainText(grammarLessons[0].questions[0].answer);
  await context.close();
});
