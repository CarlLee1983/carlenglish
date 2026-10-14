import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { Article } from '../src/lib/articles';

const contentDir = join(process.cwd(), 'content/articles');
const articles = readdirSync(contentDir).filter((name) => name.endsWith('.json')).sort()
  .map((name) => JSON.parse(readFileSync(join(contentDir, name), 'utf8')) as Article);
const byId = (id: string) => articles.find((article) => article.id === id)!;
const articlePath = (article: Article) => `/articles/${article.id}/`;
const body = (page: Page) => page.getByRole('region', { name: '英文本文' });
const originText = (article: Article) => article.origin === 'rewrite' ? '教學簡化版' : '教練原創，人物、地點與帳號皆為虛構';

async function expectNoHorizontalScroll(page: Page) {
  const { width, scrollWidth } = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(width + 1);
}

async function expectArticleContent(page: Page, article: Article) {
  await expect(page.getByRole('heading', { level: 1, name: article.titleEn })).toBeVisible();
  await expect(page.getByText(article.title, { exact: true })).toBeVisible();
  await expect(page.getByText(originText(article), { exact: true })).toBeVisible();
  const region = body(page);
  if (article.paragraphs) {
    await expect(region.locator('[lang="en"] p')).toHaveCount(article.paragraphs.length);
    for (const paragraph of article.paragraphs) await expect(region.getByText(paragraph.english, { exact: true })).toBeVisible();
  }
  if (article.posts) {
    await expect(region.getByRole('listitem')).toHaveCount(article.posts.length);
    for (const post of article.posts) await expect(region.getByText(post.english, { exact: true })).toBeVisible();
  }
}

test('the list shows every article in the news and posts section and links to it', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 2, name: '新聞與貼文' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: '新聞' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: '貼文' })).toBeVisible();
  for (const article of articles) {
    const link = page.getByRole('link', { name: article.titleEn });
    await expect(link).toHaveAttribute('href', articlePath(article));
    await expect(link).toContainText(article.title);
    await expect(link).toContainText(article.stage);
    await expect(link).toContainText(originText(article));
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
});

test('the header link jumps to the articles section', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: '新聞與貼文' }).first().click();
  await expect(page).toHaveURL(/\/#articles$/);
  await expect(page.getByRole('heading', { level: 2, name: '新聞與貼文' })).toBeInViewport();
});

for (const article of articles) {
  test(`${article.id}: opens from the list, shows exact content, and survives direct load and reload`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: article.titleEn }).click();
    await expect(page).toHaveURL(new RegExp(`${articlePath(article)}$`));
    await expectArticleContent(page, article);
    await page.goto(articlePath(article));
    await page.reload();
    await expectArticleContent(page, article);
    await expectNoHorizontalScroll(page);
  });

  test(`${article.id}: translation is collapsed by default and opens with the keyboard`, async ({ page }) => {
    await page.goto(articlePath(article));
    const region = body(page);
    const summary = region.locator('summary');
    const items = (article.paragraphs ?? article.posts)!;
    await expect(region.locator('details')).not.toHaveAttribute('open');
    await expect(region.getByText(items[0].translation)).toBeHidden();
    await summary.focus();
    await expect(summary).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(region.locator('details')).toHaveAttribute('open', '');
    for (const item of items) await expect(region.getByText(item.translation)).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test(`${article.id}: reference answers are collapsed and open with the keyboard`, async ({ page }) => {
    await page.goto(articlePath(article));
    const region = page.getByRole('region', { name: '讀後提問' });
    for (const item of article.questions) await expect(region.getByText(item.question, { exact: true })).toBeVisible();
    const summaries = region.getByText('查看參考答案');
    await expect(summaries).toHaveCount(article.questions.length);
    for (let i = 0; i < article.questions.length; i++) {
      const answer = region.getByText(article.questions[i].answer, { exact: true });
      await expect(answer).toBeHidden();
      expect((await summaries.nth(i).boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await summaries.nth(i).focus();
      await page.keyboard.press('Enter');
      await expect(answer).toBeVisible();
    }
    await expectNoHorizontalScroll(page);
  });

  test(`${article.id}: has no audio or buttons and marks English text with lang="en"`, async ({ page }) => {
    await page.goto(articlePath(article));
    await expect(page.locator('audio, button')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: article.titleEn })).toHaveAttribute('lang', 'en');
    const region = body(page);
    if (article.paragraphs) await expect(region.locator('div[lang="en"]')).toHaveCount(1);
    for (const post of article.posts ?? []) await expect(region.getByText(post.english, { exact: true })).toHaveAttribute('lang', 'en');
  });

  test(`${article.id}: keyword list matches the data`, async ({ page }) => {
    await page.goto(articlePath(article));
    const region = page.getByRole('region', { name: '關鍵詞' });
    await expect(region.getByRole('listitem')).toHaveCount(article.glossary.length);
    for (const item of article.glossary) {
      await expect(region.getByText(item.english, { exact: true })).toBeVisible();
      await expect(region.getByText(item.translation, { exact: true })).toBeVisible();
    }
  });

  test(`${article.id}: navigation reaches the other articles and the home page`, async ({ page }) => {
    await page.goto(articlePath(article));
    const nav = page.getByRole('navigation', { name: '文章導覽' });
    for (const other of articles.filter((item) => item.id !== article.id)) {
      await expect(nav.getByRole('link', { name: other.titleEn })).toHaveAttribute('href', articlePath(other));
    }
    await expect(page.getByRole('link', { name: /回到首頁/ }).first()).toHaveAttribute('href', '/');
  });
}

test('the N2 rewrite shows its source link and all five dates', async ({ page }) => {
  const article = byId('nobel-medicine-2026');
  const source = article.source!;
  await page.goto(articlePath(article));
  const region = page.getByRole('region', { name: '來源' });
  await expect(region.getByText(source.outlet)).toBeVisible();
  const link = region.getByRole('link', { name: source.title });
  await expect(link).toHaveAttribute('href', source.url);
  expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  for (const date of [source.publishedAt, source.eventDate, source.rewrittenAt, source.accessedAt]) {
    await expect(region.getByText(date).first()).toBeVisible();
  }
  await expect(page.getByRole('region', { name: '背景' })).toContainText(article.background!);
});

test('original articles have no source block and N1 has no background block', async ({ page }) => {
  await page.goto(articlePath(byId('riverside-library-late-hours')));
  await expect(page.getByRole('region', { name: '來源' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '背景' })).toHaveCount(0);
});

test('the S1 posts show reply and quote markers', async ({ page }) => {
  const article = byId('subway-app-update-posts');
  await page.goto(articlePath(article));
  const items = body(page).getByRole('listitem');
  for (let i = 0; i < article.posts!.length; i++) {
    const post = article.posts![i];
    await expect(items.nth(i)).toContainText(post.author);
    if (post.replyTo) await expect(items.nth(i)).toContainText(`回覆 ${post.replyTo}`);
    else await expect(items.nth(i)).not.toContainText('回覆');
    if (post.quoting) await expect(items.nth(i)).toContainText(`引用 ${post.quoting}`);
    else await expect(items.nth(i)).not.toContainText('引用');
  }
});

test('article pages load no third-party scripts or audio', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1') external.push(request.url());
  });
  for (const article of articles) await page.goto(articlePath(article));
  expect(external).toEqual([]);
});

test('the list stays within the viewport', async ({ page }) => {
  await page.goto('/');
  await expectNoHorizontalScroll(page);
});
