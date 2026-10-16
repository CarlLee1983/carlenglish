import { expect, test } from '@playwright/test';

test('Happy Prince editions appear in their stages and link each way', async ({ page, request }) => {
  await page.goto('/');
  const literature = page.getByRole('region', { name: '文學軌' });
  await expect(literature.getByRole('heading', { name: 'L1' }).locator('..').getByRole('link', { name: /The Happy Prince/ })).toHaveAttribute('href', '/classics/happy-prince-l1/');
  await expect(literature.getByRole('heading', { name: 'L3' }).locator('..').getByRole('link', { name: /The Happy Prince/ })).toHaveAttribute('href', '/classics/happy-prince-l3/');
  const sitemap = await (await request.get('/sitemap.xml')).text();

  for (const [from, to, parts, label] of [
    ['happy-prince-l1', 'happy-prince-l3', 5, /L3 原文/],
    ['happy-prince-l3', 'happy-prince-l1', 4, /L1 教學改寫/],
  ] as const) {
    await page.goto(`/classics/${from}/`);
    await expect(page.getByText('Oscar Wilde')).toBeVisible();
    await expect(page.getByText('1888')).toBeVisible();
    await expect(page.locator('.classic-toc li')).toHaveCount(parts);
    expect(sitemap).toContain(`https://carlenglish.gravito.dev/classics/${from}/`);
    await expect(page.locator('.classic-versions').getByRole('link', { name: label })).toHaveAttribute('href', `/classics/${to}/`);
    await page.goto(`/classics/${from}/${parts}/`);
    expect(sitemap).toContain(`https://carlenglish.gravito.dev/classics/${from}/${parts}/`);
    await expect(page.getByRole('heading', { name: '全篇回顧' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: '節導覽' }).getByRole('link', { name: new RegExp(`閱讀 ${label.source}`) })).toHaveAttribute('href', `/classics/${to}/`);
  }
  await page.goto('/classics/happy-prince-l3/4/');
  await expect(page.locator('.classic-story p')).toHaveCount(23);
  await expect(page.locator('.classic-story p').last()).toContainText('the Happy Prince shall praise me.');
});
