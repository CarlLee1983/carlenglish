import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { Scene } from '../src/lib/scenes';

const contentDir = join(process.cwd(), 'content/scenes');
const scenes = readdirSync(contentDir).filter((name) => name.endsWith('.json')).sort()
  .map((name) => JSON.parse(readFileSync(join(contentDir, name), 'utf8')) as Scene);
const expectedIds = ['cafe-breakfast', 'school-greeting', 'supermarket-shopping', 'street-directions'];
const scenePath = (scene: Scene) => `/scenes/${scene.id}/`;
const storyParagraphs = (page: Page) => page.getByRole('region', { name: '英文短文' }).locator('[lang="en"] p');
const translationDisclosure = (page: Page) => page.getByRole('region', { name: '英文短文' }).locator('.translation');

async function expectImageLoaded(page: Page, scene: Scene) {
  const image = page.getByRole('img', { name: scene.image.alt });
  await expect(image).toBeVisible();
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
  await expect(page.getByText(scene.title, { exact: true })).toBeVisible();
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

test('all official scenes are discovered on the list', async ({ page }) => {
  assert.deepEqual(scenes.map((scene) => scene.id).sort(), expectedIds.slice().sort());
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  for (const scene of scenes) {
    const link = page.getByRole('link', { name: `閱讀${scene.title}` });
    await expect(link).toHaveAttribute('href', scenePath(scene));
    await expect(link).toContainText(scene.titleEn);
    await expectImageLoaded(page, scene);
  }
});

for (const scene of scenes) {
  test(`${scene.id}: list, exact content, translation, direct URL, and reload`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: `閱讀${scene.title}` }).click();
    await expect(page).toHaveURL(new RegExp(`${scenePath(scene)}$`));
    await expectSceneContent(page, scene);
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
    await expect(translated).toHaveCount(scene.sentences.length);
    for (let i = 0; i < scene.sentences.length; i++) await expect(translated.nth(i)).toHaveText(scene.sentences[i].translation);
    await page.keyboard.press('Space');
    await expect(disclosure).not.toHaveAttribute('open');
    await expect(translated.first()).toBeHidden();
    assert.deepEqual(await storyParagraphs(page).evaluateAll((elements) => elements.map((element) => element.textContent)), englishBefore);
    const back = page.getByRole('link', { name: /回到場景列表/ }).first();
    await back.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/$/);
    await page.goto(scenePath(scene));
    await page.reload();
    await expectSceneContent(page, scene);
  });

  test(`${scene.id}: list and reader fit viewport with translation closed and open`, async ({ page }) => {
    await page.goto('/');
    await expectNoHorizontalClipping(page);
    await page.goto(scenePath(scene));
    await expectNoHorizontalClipping(page);
    await translationDisclosure(page).locator('summary').click();
    await expect(translationDisclosure(page)).toHaveAttribute('open', '');
    await expectNoHorizontalClipping(page);
  });
}

test('switching after opening translation shows only the next scene', async ({ page }) => {
  for (let i = 0; i < scenes.length; i++) {
    const current = scenes[i];
    const next = scenes[(i + 1) % scenes.length];
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
    await expect(page.getByRole('img', { name: current.image.alt })).toHaveCount(0);
    await expect(translationDisclosure(page)).not.toContainText(current.sentences[0].translation);
  }
});

test('unknown scene shows custom 404 and return link', async ({ page }) => {
  const response = await page.goto('/scenes/not-a-scene/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: '找不到這個場景' })).toBeVisible();
  for (const scene of scenes) await expect(page.getByRole('heading', { level: 1, name: scene.titleEn })).toHaveCount(0);
  await page.getByRole('link', { name: /回到場景列表/ }).click();
  await expect(page).toHaveURL(/\/$/);
});
