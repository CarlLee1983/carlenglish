import { expect, test } from '@playwright/test';

const overview = '/classics/gift-of-the-magi-l1/';

test('learner finds the L1 classic, its source, and all three parts', async ({ page }) => {
  await page.goto('/');
  const literature = page.getByRole('region', { name: '文學軌' });
  await expect(literature.getByRole('heading', { name: 'L1' })).toBeVisible();
  for (const stage of ['L2', 'L3', 'L4']) await expect(literature.getByRole('heading', { name: stage })).toBeVisible();
  await literature.getByRole('link', { name: /The Gift of the Magi/ }).click();
  await expect(page).toHaveURL(new RegExp(`${overview}$`));
  await expect(page.getByRole('heading', { name: 'The Gift of the Magi' })).toBeVisible();
  await expect(page.getByText('O. Henry')).toBeVisible();
  await expect(page.getByText('1905')).toBeVisible();
  await expect(page.getByText('教學改寫').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Project Gutenberg #7256/ })).toHaveAttribute('href', 'https://www.gutenberg.org/ebooks/7256');
  await expect(page.locator('.classic-toc li')).toHaveCount(3);
});

test('each part shows English body, questions and usable navigation', async ({ page }) => {
  await page.goto(`${overview}1/`);
  await expect(page.getByRole('heading', { name: '閱讀導讀' })).toBeVisible();
  await expect(page.locator('.classic-story p')).toHaveCount(8);
  await expect(page.locator('.classic-story')).not.toContainText('聖誕節');
  await expect(page.getByRole('heading', { name: '全篇回顧' })).toHaveCount(0);
  const answer = page.locator('.answer').first();
  await expect(answer.locator('summary')).toHaveAccessibleName('查看參考答案：Della 遇到什麼困難？她想達成什麼事？');
  await answer.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(answer).toHaveAttribute('open', '');
  await page.getByRole('navigation', { name: '節導覽' }).getByRole('link', { name: /下一節/ }).click();
  await expect(page).toHaveURL(new RegExp(`${overview}2/$`));
  await page.getByRole('navigation', { name: '節導覽' }).getByRole('link', { name: /下一節/ }).click();
  await expect(page.getByRole('heading', { name: '全篇回顧' })).toBeVisible();
  await page.getByRole('navigation', { name: '節導覽' }).getByRole('link', { name: /回到總覽/ }).click();
  await expect(page).toHaveURL(new RegExp(`${overview}$`));
});

test('classic pages are indexable and fit 320px', async ({ page, request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const path of [overview, `${overview}1/`, `${overview}2/`, `${overview}3/`]) {
    expect(sitemap).toContain(`https://carlenglish.gravito.dev${path}`);
    await page.goto(path);
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', `https://carlenglish.gravito.dev${path}`);
    await page.setViewportSize({ width: 320, height: 700 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  }
});
