import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { Scene } from '../src/lib/scenes';
import { getLearningLevel, learningLevels } from '../src/lib/catalog';
import { selectScenes } from './helpers/scene-selection';

const contentDir = join(process.cwd(), 'content/scenes');
const scenes = readdirSync(contentDir).filter((name) => name.endsWith('.json')).sort()
  .map((name) => JSON.parse(readFileSync(join(contentDir, name), 'utf8')) as Scene);
const originalIds = ['cafe-breakfast', 'school-greeting', 'supermarket-shopping', 'street-directions'];
const scenePath = (scene: Scene) => `/scenes/${scene.id}/`;
const levelPath = (scene: Scene) => `/levels/${getLearningLevel(scene).id}/`;
const sceneLinks = (page: Page) => page.getByRole('link', { name: /^閱讀/ });
const storyParagraphs = (page: Page) => page.getByRole('region', { name: '英文短文' }).locator('[lang="en"] p');
const translationDisclosure = (page: Page) => page.getByRole('region', { name: '英文短文' }).locator('.translation');

async function expectImageLoaded(page: Page, scene: Scene) {
  const image = page.getByRole('img', { name: scene.image.alt });
  await image.scrollIntoViewIfNeeded();
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('src', scene.image.src);
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  const dimensions = await image.evaluate((element: HTMLImageElement) => ({
    complete: element.complete,
    naturalWidth: element.naturalWidth,
    naturalHeight: element.naturalHeight,
    displayWidth: element.getBoundingClientRect().width,
    displayHeight: element.getBoundingClientRect().height,
  }));
  expect(dimensions.complete).toBe(true);
  expect(dimensions.naturalWidth).toBe(scene.image.width);
  expect(dimensions.naturalHeight).toBe(scene.image.height);
  expect(dimensions.displayWidth).toBeGreaterThan(0);
  expect(dimensions.displayHeight).toBeGreaterThan(0);
  expect(dimensions.displayWidth / dimensions.displayHeight).toBeCloseTo(scene.image.width / scene.image.height, 2);
}

async function expectSceneContent(page: Page, scene: Scene) {
  await expect(page.getByRole('heading', { level: 1, name: scene.titleEn })).toBeVisible();
  const title = page.locator('.reader-heading .reader-title-zh');
  await expect(title).toHaveText(scene.title);
  await expect(title).toBeVisible();
  await expect(page.getByRole('article')).toContainText(scene.category);
  await expect(page.getByRole('article')).toContainText(scene.level);
  await expectImageLoaded(page, scene);
  const paragraphs = storyParagraphs(page);
  await expect(paragraphs).toHaveCount(scene.sentences.length);
  assert.deepEqual(
    await paragraphs.evaluateAll((elements) => elements.map((element) => element.textContent)),
    scene.sentences.map((sentence) => sentence.segments.map((segment) => segment.text).join('')),
  );
  const phraseItems = page.getByRole('region', { name: '常用短句' }).getByRole('listitem');
  await expect(phraseItems).toHaveCount(scene.phrases.length);
  for (let i = 0; i < scene.phrases.length; i++) {
    await expect(phraseItems.nth(i)).toContainText(scene.phrases[i].english);
    await expect(phraseItems.nth(i)).toContainText(scene.phrases[i].translation);
  }
  const wordItems = page.getByRole('region', { name: '重點單字' }).getByRole('listitem');
  await expect(wordItems).toHaveCount(scene.words.length);
  for (let i = 0; i < scene.words.length; i++) {
    await expect(wordItems.nth(i)).toContainText(scene.words[i].english);
    await expect(wordItems.nth(i)).toContainText(scene.words[i].translation);
    await expect(wordItems.nth(i)).toContainText(scene.words[i].example);
  }
}

async function expectNoHorizontalClipping(page: Page) {
  const result = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const selectors = 'main h1, main h2, main h3, main p, main li, main summary, main img, main a';
    const clipped = [...document.querySelectorAll(selectors)].filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && (rect.left < -1 || rect.right > width + 1);
    }).map((element) => ({ tag: element.tagName, text: element.textContent?.trim().slice(0, 40) }));
    return { width, scrollWidth: document.documentElement.scrollWidth, clipped };
  });
  expect(result.scrollWidth).toBeLessThanOrEqual(result.width + 1);
  expect(result.clipped).toEqual([]);
}

test('home offers the three learning levels without listing scenes', async ({ page }) => {
  const ids = scenes.map((scene) => scene.id);
  assert.equal(new Set(ids).size, ids.length, 'every discovered scene must have a unique route');
  for (const id of originalIds) assert.ok(ids.includes(id), `missing baseline scene ${id}`);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(sceneLinks(page)).toHaveCount(0);
  for (const level of learningLevels) {
    await expect(page.getByRole('link', { name: `進入${level.name}` })).toHaveAttribute('href', `/levels/${level.id}/`);
  }
});

for (const level of learningLevels) {
  test(`home enters the ${level.id} level and its page discovers official scenes`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    const entry = page.getByRole('link', { name: `進入${level.name}` });
    await expect(entry).toHaveAttribute('href', `/levels/${level.id}/`);
    await entry.click();
    await expect(page.getByRole('heading', { level: 1, name: `${level.name}讀本` })).toBeVisible();
    const currentLevel = page.getByRole('navigation', { name: '英文程度' }).getByRole('link', { name: level.name });
    await expect(currentLevel).toHaveAttribute('href', `/levels/${level.id}/`);
    await expect(currentLevel).toHaveAttribute('aria-current', 'page');
    const tierScenes = scenes.filter((scene) => getLearningLevel(scene).id === level.id);
    await expect(sceneLinks(page)).toHaveCount(tierScenes.length);
    assert.deepEqual(await sceneLinks(page).evaluateAll((links) => links.map((link) => link.getAttribute('href'))), tierScenes.map(scenePath));
    for (const scene of tierScenes) {
      const link = page.getByRole('link', { name: `閱讀${scene.title}`, exact: true });
      await expect(link).toHaveAttribute('href', scenePath(scene));
      await expect(link).toContainText(scene.titleEn);
      await expect(link).toContainText(scene.category);
      await expect(link).toContainText(scene.level);
      await expect(link).toContainText(`${scene.sentences.length} 句短文 · ${scene.phrases.length} 個短句 · ${scene.words.length} 個單字`);
      await expectImageLoaded(page, scene);
    }
    if (tierScenes.length === 0) {
      await expect(page.getByText('這個級別的讀本還在準備中')).toBeVisible();
      await expect(page.getByRole('link', { name: '先讀初級讀本' })).toHaveAttribute('href', '/levels/beginner/');
    }
  });
}

test('home preview loads and the first beginner entry fits the initial viewport', async ({ page }) => {
  const preview = scenes.find((scene) => scene.id === 'cafe-breakfast') ?? scenes[0];
  await page.goto('/');
  const image = page.getByRole('img', { name: preview.image.alt });
  await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  const rendered = await image.evaluate((element: HTMLImageElement) => ({
    currentSrc: element.currentSrc,
    origin: location.origin,
    ratio: element.naturalWidth / element.naturalHeight,
  }));
  expect(new URL(rendered.currentSrc).origin).toBe(rendered.origin);
  expect(new URL(rendered.currentSrc).pathname).toMatch(/^\/_astro\//);
  expect(rendered.ratio).toBeCloseTo(preview.image.width / preview.image.height, 2);
  const entry = page.getByRole('link', { name: '進入初級' });
  const box = await entry.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
});

test('home preview reserves its space while the image loads', async ({ page }) => {
  const preview = scenes.find((scene) => scene.id === 'cafe-breakfast') ?? scenes[0];
  let releaseImage!: () => void;
  const pendingImage = new Promise<void>((resolve) => { releaseImage = resolve; });
  let intercepted = 0;
  await page.route('**/_astro/*.webp', async (route) => {
    intercepted++;
    await pendingImage;
    await route.continue();
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => intercepted).toBeGreaterThan(0);
    const image = page.getByRole('img', { name: preview.image.alt });
    const entry = page.getByRole('link', { name: '進入初級' });
    const beforeImage = await image.boundingBox();
    const beforeEntry = await entry.boundingBox();
    expect(beforeImage).not.toBeNull();
    expect(beforeEntry).not.toBeNull();
    expect(beforeImage!.height).toBeGreaterThan(0);
    releaseImage();
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    const afterImage = await image.boundingBox();
    const afterEntry = await entry.boundingBox();
    expect(afterImage).not.toBeNull();
    expect(afterEntry).not.toBeNull();
    expect(Math.abs(afterImage!.height - beforeImage!.height)).toBeLessThan(1);
    expect(Math.abs(afterEntry!.y - beforeEntry!.y)).toBeLessThan(1);
  } finally {
    releaseImage();
  }
});

test('cafe reader image reserves its space while loading', async ({ page }) => {
  const scene = scenes.find((item) => item.id === 'cafe-breakfast')!;
  let releaseImage!: () => void;
  const pendingImage = new Promise<void>((resolve) => { releaseImage = resolve; });
  let intercepted = 0;
  await page.route(`**${scene.image.src}`, async (route) => {
    intercepted++;
    await pendingImage;
    await route.continue();
  });
  try {
    await page.goto(scenePath(scene), { waitUntil: 'domcontentloaded' });
    await expect.poll(() => intercepted).toBeGreaterThan(0);
    const image = page.getByRole('img', { name: scene.image.alt });
    const firstSentence = storyParagraphs(page).first();
    const beforeImage = await image.boundingBox();
    const beforeSentence = await firstSentence.boundingBox();
    expect(beforeImage).not.toBeNull();
    expect(beforeSentence).not.toBeNull();
    expect(beforeImage!.height).toBeGreaterThan(0);
    releaseImage();
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    const afterImage = await image.boundingBox();
    const afterSentence = await firstSentence.boundingBox();
    expect(afterImage).not.toBeNull();
    expect(afterSentence).not.toBeNull();
    expect(Math.abs(afterImage!.height - beforeImage!.height)).toBeLessThan(1);
    expect(Math.abs(afterSentence!.y - beforeSentence!.y)).toBeLessThan(1);
  } finally {
    releaseImage();
  }
});

test('catalog search and category boundaries contrast with their backgrounds', async ({ page }) => {
  await page.goto('/levels/beginner/');
  // Mobile WebKit reports its native select defaults until the first paint.
  await page.screenshot();
  for (const control of [page.getByRole('searchbox', { name: '搜尋讀本' }), page.getByRole('combobox', { name: '生活主題' })]) {
    await expect(control).toBeVisible();
    const contrasts = await control.evaluate((element) => {
      const rgb = (color: string) => {
        const channels = color.match(/[\d.]+/g)?.map(Number) ?? [];
        if (channels.length < 3) throw new Error(`Unexpected color: ${color}`);
        return channels.slice(0, 3).map((value) => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
      };
      const luminance = (color: string) => {
        const [red, green, blue] = rgb(color);
        return red * 0.2126 + green * 0.7152 + blue * 0.0722;
      };
      const contrast = (first: string, second: string) => {
        const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
        return (lighter + 0.05) / (darker + 0.05);
      };
      const style = getComputedStyle(element);
      let ancestor = element.parentElement;
      while (ancestor && getComputedStyle(ancestor).backgroundColor === 'rgba(0, 0, 0, 0)') ancestor = ancestor.parentElement;
      const surrounding = ancestor ? getComputedStyle(ancestor).backgroundColor : getComputedStyle(document.documentElement).backgroundColor;
      return {
        borderWidth: parseFloat(style.borderTopWidth),
        own: contrast(style.borderTopColor, style.backgroundColor),
        surrounding: contrast(style.borderTopColor, surrounding),
        colors: [style.borderTopColor, style.backgroundColor, surrounding],
      };
    });
    expect(contrasts.borderWidth).toBeGreaterThanOrEqual(1);
    expect(contrasts.own, `${await control.getAttribute('name')}: ${JSON.stringify(contrasts.colors)}`).toBeGreaterThanOrEqual(3);
    expect(contrasts.surrounding, `${await control.getAttribute('name')}: ${JSON.stringify(contrasts.colors)}`).toBeGreaterThanOrEqual(3);
  }
});

test('cafe breakfast starts within 1.35 viewports', async ({ page }) => {
  const scene = scenes.find((item) => item.id === 'cafe-breakfast')!;
  await page.goto(scenePath(scene));
  const firstSentence = storyParagraphs(page).first();
  await expect(firstSentence).toBeAttached();
  const box = await firstSentence.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeLessThan(1.35 * page.viewportSize()!.height);
});

test('level filters search, categories, clear, URL history, and reload', async ({ page }) => {
  const level = learningLevels.find(({ id }) => scenes.some((scene) => getLearningLevel(scene).id === id))!;
  const tierScenes = scenes.filter((scene) => getLearningLevel(scene).id === level.id);
  const target = tierScenes[0];
  const path = `/levels/${level.id}/`;
  await page.goto(path);
  const search = page.getByRole('searchbox', { name: '搜尋讀本' });
  const category = page.getByRole('combobox', { name: '生活主題' });
  await expect(category.getByRole('option', { name: '全部主題' })).toBeAttached();
  for (const control of [search, category]) {
    await expect(control).toBeVisible();
    expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
  await search.fill(`  ${target.titleEn.toUpperCase()}  `);
  await expect(sceneLinks(page)).toHaveCount(1);
  await expect(page.getByRole('link', { name: `閱讀${target.title}` })).toBeVisible();
  await expect(page).toHaveURL(/q=/);
  await page.reload();
  await expect(search).toHaveValue(target.titleEn.toUpperCase());
  await expect(sceneLinks(page)).toHaveCount(1);
  await search.fill('NO-MATCH-QUERY');
  await expect(sceneLinks(page)).toHaveCount(0);
  await expect(page.getByText('沒有找到符合的讀本')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('0');
  await page.getByRole('button', { name: '清除篩選' }).click();
  await expect(sceneLinks(page)).toHaveCount(tierScenes.length);
  await expect(search).toHaveValue('');
  await category.selectOption({ label: target.category });
  await expect(page).toHaveURL(/category=/);
  await expect(sceneLinks(page)).toHaveCount(tierScenes.filter((scene) => scene.category === target.category).length);
  await page.reload();
  await expect(category).toHaveValue(target.category);
  await page.goBack();
  await expect(category).not.toHaveValue(target.category);
  await expect(sceneLinks(page)).toHaveCount(tierScenes.length);
});

test('filtered catalog context survives reader reload, recommendations, and both return links', async ({ page }) => {
  const target = scenes[0];
  const level = getLearningLevel(target);
  const related = scenes.find((scene) => scene.id !== target.id && getLearningLevel(scene).id === level.id)!;
  const query = target.titleEn.toUpperCase();
  const expectedParams = { q: query, category: target.category };
  const expectContextLink = async (href: string | null, pathname: string) => {
    const url = new URL(href!, page.url());
    expect(url.pathname).toBe(pathname);
    expect(Object.fromEntries(url.searchParams)).toEqual(expectedParams);
  };

  for (const returnIndex of [0, 1]) {
    await page.goto(levelPath(target));
    await page.getByRole('searchbox', { name: '搜尋讀本' }).fill(query);
    await page.getByRole('combobox', { name: '生活主題' }).selectOption({ label: target.category });
    await expect(sceneLinks(page)).toHaveCount(1);
    const card = page.getByRole('link', { name: `閱讀${target.title}` });
    await expectContextLink(await card.getAttribute('href'), scenePath(target));
    await card.click();
    await expect(page.getByRole('heading', { level: 1, name: target.titleEn })).toBeVisible();
    const owner = page.getByRole('navigation', { name: '英文程度' }).getByRole('link', { name: level.name });
    await expect(owner).toHaveAttribute('aria-current', 'location');
    const returns = page.getByRole('link', { name: `回到${level.name}讀本` });
    await expect(returns).toHaveCount(2);
    for (let i = 0; i < 2; i++) await expectContextLink(await returns.nth(i).getAttribute('href'), levelPath(target));
    const recommendation = page.getByRole('navigation', { name: '場景導覽' }).getByRole('link', { name: new RegExp(related.title) });
    await expectContextLink(await recommendation.getAttribute('href'), scenePath(related));
    await page.reload();
    await expectContextLink(await returns.nth(returnIndex).getAttribute('href'), levelPath(target));
    if (returnIndex === 1) {
      await recommendation.click();
      await expect(page.getByRole('heading', { level: 1, name: related.titleEn })).toBeVisible();
      await expectContextLink(await page.getByRole('link', { name: `回到${level.name}讀本` }).last().getAttribute('href'), levelPath(target));
    }
    await page.getByRole('link', { name: `回到${level.name}讀本` }).nth(returnIndex).click();
    await expect(page).toHaveURL((url) => url.pathname === levelPath(target)
      && url.searchParams.get('q') === query && url.searchParams.get('category') === target.category);
    await expect(page.getByRole('searchbox', { name: '搜尋讀本' })).toHaveValue(query);
    await expect(page.getByRole('combobox', { name: '生活主題' })).toHaveValue(target.category);
    await expect(sceneLinks(page)).toHaveCount(1);
    await expect(page.getByRole('link', { name: `閱讀${target.title}` })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('1');
  }
});

test('stale category URLs show the unfiltered level safely', async ({ page }) => {
  const target = scenes[0];
  await page.goto(`${levelPath(target)}?category=${encodeURIComponent('不存在的主題')}`);
  await expect(page.getByRole('combobox', { name: '生活主題' })).toHaveValue('');
  await expect(sceneLinks(page)).toHaveCount(scenes.filter((scene) => getLearningLevel(scene).id === getLearningLevel(target).id).length);
});

test('level pages remain readable without JavaScript and links work by keyboard', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    const target = scenes[0];
    await page.goto(levelPath(target));
    await expect(page.getByRole('searchbox', { name: '搜尋讀本' })).toBeHidden();
    await expect(sceneLinks(page)).toHaveCount(scenes.filter((scene) => getLearningLevel(scene).id === getLearningLevel(target).id).length);
    const link = page.getByRole('link', { name: `閱讀${target.title}` });
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${scenePath(target)}$`));
    await expectSceneContent(page, target);
  } finally {
    await context.close();
  }
});

for (const scene of selectScenes(scenes)) {
  test(`${scene.id}: level journey, exact content, translation, direct URL, and reload`, { tag: '@content' }, async ({ page }) => {
    await page.goto(levelPath(scene));
    await page.getByRole('link', { name: `閱讀${scene.title}`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${scenePath(scene)}$`));
    await expectSceneContent(page, scene);
    const jump = page.getByRole('navigation', { name: '本篇內容' });
    for (const [name, hash] of [['短文', '#story'], ['短句', '#phrases'], ['單字', '#words']]) {
      await expect(jump.getByRole('link', { name })).toHaveAttribute('href', hash);
    }
    await jump.getByRole('link', { name: '短句' }).click();
    await expect(page).toHaveURL(/#phrases$/);
    await expect(page.getByRole('region', { name: '常用短句' })).toBeInViewport();
    const disclosure = translationDisclosure(page);
    const summary = disclosure.locator('summary');
    const translated = disclosure.locator('p');
    const englishBefore = await storyParagraphs(page).evaluateAll((elements) => elements.map((element) => element.textContent));
    await expect(disclosure).not.toHaveAttribute('open');
    await expect(summary).toContainText('查看繁體中文翻譯');
    await expect(translated.first()).toBeHidden();
    await summary.focus();
    await expect(summary).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(disclosure).toHaveAttribute('open', '');
    await expect(translated.first()).toHaveText(scene.sentences[0].translation);
    await expect(translated).toHaveCount(scene.sentences.length);
    for (let i = 0; i < scene.sentences.length; i++) await expect(translated.nth(i)).toHaveText(scene.sentences[i].translation);
    await page.keyboard.press('Space');
    await expect(disclosure).not.toHaveAttribute('open');
    await expect(translated.first()).toBeHidden();
    assert.deepEqual(await storyParagraphs(page).evaluateAll((elements) => elements.map((element) => element.textContent)), englishBefore);
    const back = page.getByRole('link', { name: `回到${getLearningLevel(scene).name}讀本` }).first();
    await expect(back).toHaveAttribute('href', levelPath(scene));
    await back.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${levelPath(scene)}$`));
    await page.goto(scenePath(scene));
    await page.reload();
    await expectSceneContent(page, scene);
    const recommendations = page.getByRole('navigation', { name: '場景導覽' }).getByRole('link').filter({ hasNotText: /^回到/ });
    const related = scenes.filter((other) => other.id !== scene.id && getLearningLevel(other).id === getLearningLevel(scene).id).slice(0, 3);
    await expect(recommendations).toHaveCount(related.length);
    assert.deepEqual(await recommendations.evaluateAll((links) => links.map((link) => new URL((link as HTMLAnchorElement).href).pathname)), related.map(scenePath));
    for (const other of related) await expect(page.getByRole('navigation', { name: '場景導覽' }).getByRole('link', { name: new RegExp(other.title) })).toHaveAttribute('href', scenePath(other));
  });

  test(`${scene.id}: level and reader fit viewport with translation closed and open`, async ({ page }) => {
    await page.goto(levelPath(scene));
    await expectNoHorizontalClipping(page);
    await page.goto(scenePath(scene));
    await expectNoHorizontalClipping(page);
    await translationDisclosure(page).locator('summary').click();
    await expect(translationDisclosure(page)).toHaveAttribute('open', '');
    await expectNoHorizontalClipping(page);
  });
}

const tierScenes = scenes.filter((scene) => getLearningLevel(scene).id === getLearningLevel(scenes[0]).id);
assert.ok(tierScenes.length >= 2, 'Translation navigation requires at least two scenes in the first learning level.');
for (const current of selectScenes(scenes).filter((scene) => getLearningLevel(scene).id === getLearningLevel(scenes[0]).id)) {
  test(`${current.id}: switching after opening translation shows only the next related scene`, { tag: '@content' }, async ({ page }) => {
    const next = tierScenes.find((candidate) => candidate.id !== current.id)!;
    await page.goto(scenePath(current));
    await translationDisclosure(page).locator('summary').click();
    await expect(translationDisclosure(page)).toHaveAttribute('open', '');
    await expect(translationDisclosure(page).locator('p').first()).toHaveText(current.sentences[0].translation);
    const nextLink = page.getByRole('navigation', { name: '場景導覽' }).getByRole('link', { name: new RegExp(next.title) });
    await nextLink.focus();
    await expect(nextLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${scenePath(next)}$`));
    await expectSceneContent(page, next);
    await expect(translationDisclosure(page)).not.toHaveAttribute('open');
    await expect(translationDisclosure(page).locator('p').first()).toBeHidden();
    await expect(page.getByRole('heading', { level: 1, name: current.titleEn })).toHaveCount(0);
  });
}

test('unknown scene shows custom 404 and return link', async ({ page }) => {
  const response = await page.goto('/scenes/not-a-scene/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: '找不到這個頁面' })).toBeVisible();
  for (const scene of scenes) await expect(page.getByRole('heading', { level: 1, name: scene.titleEn })).toHaveCount(0);
  await page.getByRole('main').getByRole('link', { name: '回到首頁' }).click();
  await expect(page).toHaveURL(/\/$/);
});
