import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { Scene } from '../src/lib/scenes';
import { getLearningLevel, learningLevels } from '../src/lib/catalog';
import { trackLabels, type Article } from '../src/lib/articles';
import { sceneSocialImage } from '../src/lib/seo';

const site = 'https://carlenglish.gravito.dev';
const scenes = readdirSync(join(process.cwd(), 'content/scenes')).filter((name) => name.endsWith('.json')).sort()
  .map((name) => JSON.parse(readFileSync(join(process.cwd(), 'content/scenes', name), 'utf8')) as Scene);
const articles = readdirSync(join(process.cwd(), 'content/articles')).filter((name) => name.endsWith('.json')).sort()
  .map((name) => JSON.parse(readFileSync(join(process.cwd(), 'content/articles', name), 'utf8')) as Article);
const pathFor = (scene: Scene) => `/scenes/${scene.id}/`;
const articlePathFor = (article: Article) => `/articles/${article.id}/`;
const paths = ['/', ...learningLevels.map((level) => `/levels/${level.id}/`), ...scenes.map(pathFor), ...articles.map(articlePathFor)];
const populated = learningLevels.filter((level) => scenes.some((scene) => getLearningLevel(scene).id === level.id));
const indexed = ['/', ...populated.map((level) => `/levels/${level.id}/`), ...scenes.map(pathFor), ...articles.map(articlePathFor)];
const meta = (page: Page, key: string, value: string) => page.locator(`head meta[${key}="${value}"]`);
const jsonLd = async (page: Page) => (await page.locator('head script[type="application/ld+json"]').allTextContents())
  .flatMap((text) => {
    const value = JSON.parse(text);
    return Array.isArray(value) ? value : value['@graph'] ?? [value];
  });
const hasType = (node: Record<string, unknown>, type: string) => (Array.isArray(node['@type']) ? node['@type'] : [node['@type']]).includes(type);

async function expectMetadata(page: Page, path: string, indexable: boolean, imageType: string) {
  const canonical = page.locator('head link[rel="canonical"]');
  await expect(canonical).toHaveAttribute('href', `${site}${path}`);
  await expect(meta(page, 'name', 'robots')).toHaveAttribute('content', indexable ? /\bindex\b.*\bfollow\b/ : /\bnoindex\b.*\bfollow\b/);
  const title = await page.title();
  const description = await meta(page, 'name', 'description').getAttribute('content');
  expect(description?.trim().length).toBeGreaterThan(0);
  await expect(meta(page, 'property', 'og:site_name')).toHaveAttribute('content', 'CarlEnglish');
  await expect(meta(page, 'property', 'og:type')).toHaveAttribute('content', 'website');
  await expect(meta(page, 'property', 'og:locale')).toHaveAttribute('content', 'zh_TW');
  await expect(meta(page, 'property', 'og:title')).toHaveAttribute('content', title);
  await expect(meta(page, 'property', 'og:description')).toHaveAttribute('content', description!);
  await expect(meta(page, 'property', 'og:url')).toHaveAttribute('content', `${site}${path}`);
  const image = await meta(page, 'property', 'og:image').getAttribute('content');
  expect(image?.startsWith(`${site}/`)).toBe(true);
  await expect(meta(page, 'property', 'og:image:type')).toHaveAttribute('content', imageType);
  await expect(meta(page, 'property', 'og:image:width')).toHaveAttribute('content', '1200');
  await expect(meta(page, 'property', 'og:image:height')).toHaveAttribute('content', '630');
  const imageAlt = await meta(page, 'property', 'og:image:alt').getAttribute('content');
  expect(imageAlt?.trim().length).toBeGreaterThan(0);
  await expect(meta(page, 'name', 'twitter:card')).toHaveAttribute('content', 'summary_large_image');
  await expect(meta(page, 'name', 'twitter:title')).toHaveAttribute('content', title);
  await expect(meta(page, 'name', 'twitter:description')).toHaveAttribute('content', description!);
  await expect(meta(page, 'name', 'twitter:image')).toHaveAttribute('content', image!);
  await expect(meta(page, 'name', 'twitter:image:alt')).toHaveAttribute('content', imageAlt!);
  return image!;
}

test('home and level pages publish matching metadata and data grounded in the visible catalog', async ({ page }) => {
  for (const path of ['/', ...learningLevels.map((level) => `/levels/${level.id}/`)]) {
    await page.goto(path);
    const level = learningLevels.find((candidate) => path === `/levels/${candidate.id}/`);
    const tier = level ? scenes.filter((scene) => getLearningLevel(scene).id === level.id) : scenes;
    await expectMetadata(page, path, !level || tier.length > 0, 'image/jpeg');
    const nodes = await jsonLd(page);
    expect(nodes.some((node) => hasType(node, level ? 'CollectionPage' : 'WebSite'))).toBe(true);
    expect(nodes.some((node) => hasType(node, 'WebPage'))).toBe(!level);
    expect(JSON.stringify(nodes)).not.toContain('SearchAction');
    if (level) {
      const itemList = nodes.find((node) => hasType(node, 'ItemList'));
      expect(itemList?.itemListElement).toHaveLength(tier.length);
      for (let i = 0; i < tier.length; i++) {
        expect(JSON.stringify(itemList?.itemListElement[i])).toContain(`${site}${pathFor(tier[i])}`);
      }
      expect(nodes.some((node) => hasType(node, 'BreadcrumbList'))).toBe(true);
    }
  }
});

test('every reader has its own canonical, share image, and content-grounded LearningResource', async ({ page, request }) => {
  test.setTimeout(120_000);
  const descriptions = new Set<string>();
  for (const scene of scenes) {
    await page.goto(pathFor(scene));
    const expectedShare = sceneSocialImage(scene);
    const image = await expectMetadata(page, pathFor(scene), true, expectedShare.type);
    expect(image).toBe(`${site}${expectedShare.src}`);
    await expect(meta(page, 'property', 'og:image:alt')).toHaveAttribute('content', expectedShare.alt);
    const response = await request.get(new URL(image).pathname);
    expect(response.ok()).toBe(true);
    const bytes = await response.body();
    if (expectedShare.type === 'image/png') {
      expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([1200, 630]);
    } else {
      expect(bytes.subarray(0, 3).toString('hex')).toBe('ffd8ff');
      const dimensions = await page.evaluate(async (src) => new Promise<[number, number]>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);
        image.onerror = reject;
        image.src = src;
      }), expectedShare.src);
      expect(dimensions).toEqual([1200, 630]);
    }
    const description = (await meta(page, 'name', 'description').getAttribute('content'))!;
    expect(descriptions.has(description)).toBe(false);
    descriptions.add(description);
    for (const part of [scene.title, scene.category, scene.level, String(scene.sentences.length), String(scene.phrases.length), String(scene.words.length)]) {
      expect(description).toContain(part);
    }
    const nodes = await jsonLd(page);
    const resource = nodes.find((node) => hasType(node, 'LearningResource'));
    expect(resource).toBeTruthy();
    expect(hasType(resource!, 'WebPage')).toBe(true);
    expect(resource?.name).toBe(scene.title);
    expect(resource?.alternateName).toBe(scene.titleEn);
    expect(resource?.description).toBe(description);
    expect(resource?.educationalLevel).toBe(scene.level);
    expect(resource?.learningResourceType).toBe('生活英文圖文讀本');
    expect(JSON.stringify(resource?.inLanguage)).toContain('en');
    expect(JSON.stringify(resource?.inLanguage)).toContain('zh-Hant');
    for (const phrase of scene.phrases) expect(JSON.stringify(resource?.teaches)).toContain(phrase.english);
    expect(JSON.stringify(resource?.about)).toContain(scene.category);
    expect(JSON.stringify(resource?.image)).toContain(`${site}${scene.image.src}`);
    expect(nodes.some((node) => hasType(node, 'BreadcrumbList'))).toBe(true);
    for (const invented of ['author', 'datePublished', 'review', 'aggregateRating']) expect(resource).not.toHaveProperty(invented);
  }
});

test('each article has grounded WebPage metadata and a canonical brand share card', async ({ page }) => {
  for (const article of articles) {
    const path = articlePathFor(article);
    await page.goto(path);
    const image = await expectMetadata(page, path, true, 'image/jpeg');
    expect(image).toBe(`${site}/images/social/carlenglish.jpg`);
    const description = (await meta(page, 'name', 'description').getAttribute('content'))!;
    for (const part of [article.title, trackLabels[article.track], article.stage, String(article.glossary.length), String(article.questions.length)]) {
      expect(description).toContain(part);
    }
    const nodes = await jsonLd(page);
    const webpage = nodes.find((node) => hasType(node, 'WebPage'));
    expect(webpage).toBeTruthy();
    expect(webpage?.name).toBe(article.title);
    expect(webpage?.description).toBe(description);
    expect(hasType(webpage!, 'LearningResource')).toBe(false);
    expect(nodes.some((node) => hasType(node, 'BreadcrumbList'))).toBe(true);
    if (article.origin === 'rewrite') expect(webpage?.isBasedOn).toBe(article.source?.url);
    else expect(webpage).not.toHaveProperty('isBasedOn');
    for (const invented of ['author', 'datePublished', 'review', 'aggregateRating']) expect(webpage).not.toHaveProperty(invented);
  }
});

test('metadata and structured data are server-rendered; filters and fragments do not change canonical', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: test.info().project.use.baseURL });
  try {
    const page = await context.newPage();
    const scene = scenes[0];
    await page.goto(`${pathFor(scene)}?q=coffee&category=飲食#phrases`);
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', `${site}${pathFor(scene)}`);
    expect((await jsonLd(page)).some((node) => hasType(node, 'LearningResource'))).toBe(true);
    await page.goto('/levels/beginner/?q=coffee&category=飲食#scenes');
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', `${site}/levels/beginner/`);
    expect((await jsonLd(page)).some((node) => hasType(node, 'CollectionPage'))).toBe(true);
    const article = articles[0];
    await page.goto(`${articlePathFor(article)}?q=coffee#story`);
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', `${site}${articlePathFor(article)}`);
    expect((await jsonLd(page)).some((node) => hasType(node, 'WebPage'))).toBe(true);
    await page.goto('/scenes/not-a-scene/');
    await expect(page.locator('head link[rel="canonical"]')).toHaveCount(0);
    await expect(meta(page, 'name', 'robots')).toHaveAttribute('content', /\bnoindex\b.*\bfollow\b/);
  } finally {
    await context.close();
  }
});

test('crawler endpoints reflect only indexable pages and real available media', async ({ page, request }) => {
  const sitemapResponse = await request.get('/sitemap.xml');
  expect(sitemapResponse.ok()).toBe(true);
  const sitemap = await sitemapResponse.text();
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(locs).toEqual(indexed.map((path) => `${site}${path}`));
  expect(sitemap).not.toMatch(/lastmod|\/404/);
  for (const loc of locs) expect(new URL(loc).search).toBe('');
  for (const level of learningLevels.filter((candidate) => !populated.includes(candidate))) {
    expect(locs).not.toContain(`${site}/levels/${level.id}/`);
  }
  const robotsResponse = await request.get('/robots.txt');
  expect(robotsResponse.ok()).toBe(true);
  const robots = await robotsResponse.text();
  expect(robots).toMatch(/Allow:\s*\//i);
  expect(robots).toContain(`Sitemap: ${site}/sitemap.xml`);
  expect(robots).not.toMatch(/Disallow:\s*\/levels\//i);
  for (const path of paths) {
    const response = await request.get(path);
    expect(response.ok(), path).toBe(true);
  }
  for (const [path, kind] of [
    ['/favicon.svg', 'svg'], ['/favicon-96x96.png', 'png'], ['/favicon.ico', 'ico'],
    ['/apple-touch-icon.png', 'png'], ['/images/social/carlenglish.jpg', 'jpeg'],
  ] as const) {
    const response = await request.get(path);
    expect(response.ok(), path).toBe(true);
    const bytes = await response.body();
    if (kind === 'svg') expect(bytes.toString()).toMatch(/<svg[\s>]/);
    if (kind === 'png') expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    if (kind === 'ico') expect(bytes.subarray(0, 4).toString('hex')).toBe('00000100');
    if (kind === 'jpeg') expect(bytes.subarray(0, 3).toString('hex')).toBe('ffd8ff');
  }
  await page.goto('/');
  for (const [rel, path] of [['icon', '/favicon.svg'], ['apple-touch-icon', '/apple-touch-icon.png']]) {
    await expect(page.locator(`head link[rel="${rel}"][href="${path}"]`)).toHaveCount(1);
  }
  const dimensions = await page.evaluate(async () => {
    const paths = ['/favicon-96x96.png', '/apple-touch-icon.png', '/images/social/carlenglish.jpg'];
    return await Promise.all(paths.map((path) => new Promise<[number, number]>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);
      image.onerror = reject;
      image.src = path;
    })));
  });
  expect(dimensions).toEqual([[96, 96], [180, 180], [1200, 630]]);
});
