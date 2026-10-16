import { expect, test } from '@playwright/test';

const overview = '/classics/scandal-in-bohemia-l4/';
const counts = [14, 31, 60, 28, 29, 30, 27, 40];

test('the eight-part L4 original is discoverable with its source and indexable routes', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByRole('region', { name: '文學軌' }).getByRole('link', { name: /A Scandal in Bohemia/ })).toHaveAttribute('href', overview);
  await page.goto(overview);
  await expect(page.getByRole('heading', { name: 'A Scandal in Bohemia' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Project Gutenberg #1661' })).toHaveAttribute('href', 'https://www.gutenberg.org/ebooks/1661');
  await expect(page.locator('.classic-toc li')).toHaveCount(8);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain(`https://carlenglish.gravito.dev${overview}`);
  for (let number = 1; number <= 8; number++) expect(sitemap).toContain(`https://carlenglish.gravito.dev${overview}${number}/`);
});

test('reader can follow all eight parts with original labels and letter breaks', async ({ page }) => {
  await page.goto(`${overview}1/`);
  for (const [index, count] of counts.entries()) {
    await expect(page).toHaveURL(new RegExp(`${overview}${index + 1}/$`));
    await expect(page.locator('.classic-story p')).toHaveCount(count);
    await expect(page.getByRole('heading', { name: '閱讀導讀' })).toBeVisible();
    await expect(page.locator('.question-list').first().locator('li')).toHaveCount(index === 2 || index === 4 ? 3 : 2);
    if (index < counts.length - 1) await page.getByRole('navigation', { name: '節導覽' }).getByRole('link', { name: /下一節/ }).click();
  }
  await expect(page.getByRole('heading', { name: '全篇回顧' })).toBeVisible();
  await expect(page.locator('.classic-story p').nth(26)).toContainText('MY DEAR MR. SHERLOCK HOLMES');
  expect(await page.locator('.classic-story p').nth(26).textContent()).toContain('\n');
  await page.getByRole('navigation', { name: '節導覽' }).getByRole('link', { name: /回到總覽/ }).click();
  await expect(page).toHaveURL(new RegExp(`${overview}$`));

  for (const [number, position, label] of [[1, 0, 'I.'], [4, 16, 'II.'], [7, 25, 'III.']] as const) {
    await page.goto(`${overview}${number}/`);
    await expect(page.locator('.classic-story p').nth(position)).toHaveText(label);
  }
});

test('an original-word annotation links to its explanation and back', async ({ page }) => {
  await page.goto(`${overview}1/`);
  const link = page.locator('.classic-story').getByRole('link', { name: '查看注釋：abhorrent' });
  await expect(link).toHaveCount(1);
  await link.click();
  await expect(page).toHaveURL(/#annotation-1$/);
  await page.getByRole('link', { name: '返回正文：abhorrent' }).click();
  await expect(page).toHaveURL(/#annotation-source-1$/);
});
