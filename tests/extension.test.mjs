import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { getLearningLevel, getRelatedScenes } from '../src/lib/catalog.ts';

const projectRoot = process.cwd();
const fixtureId = 'catalog-beginner-00';
const originalIds = ['cafe-breakfast', 'school-greeting', 'supermarket-shopping', 'street-directions'];
const astroBin = join(projectRoot, 'node_modules/astro/bin/astro.mjs');

function fileHashes(root, paths) {
  const hashes = {};
  function visit(path) {
    if (!existsSync(path)) return;
    if (lstatSync(path).isDirectory()) {
      for (const name of readdirSync(path).sort()) visit(join(path, name));
    } else {
      hashes[relative(root, path)] = createHash('sha256').update(readFileSync(path)).digest('hex');
    }
  }
  for (const path of paths) visit(join(root, path));
  return hashes;
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

async function waitForPreview(origin, child, output) {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Isolated preview exited early: ${output()}`);
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch { /* Server has not opened its port yet. */ }
    await delay(100);
  }
  throw new Error(`Isolated preview did not become ready: ${output()}`);
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  child.kill('SIGTERM');
  const stopped = await Promise.race([exited.then(() => true), delay(5_000).then(() => false)]);
  if (!stopped) {
    child.kill('SIGKILL');
    await exited;
  }
}

async function expectOfficialReader(page, scene, profile, allScenes) {
  assert.equal(await page.getByRole('heading', { level: 1, name: scene.titleEn }).count(), 1);
  assert.equal(await page.getByText(scene.title, { exact: true }).count(), 1);
  const article = await page.getByRole('article').textContent();
  assert.ok(article.includes(scene.category) && article.includes(scene.level));
  const image = page.getByRole('img', { name: scene.image.alt });
  assert.equal(await image.getAttribute('src'), scene.image.src);
  assert.deepEqual(await image.evaluate((element) => [element.complete, element.naturalWidth, element.naturalHeight]),
    [true, scene.image.width, scene.image.height]);
  const paragraphs = await page.getByRole('region', { name: '英文短文' }).locator('[lang="en"] p')
    .evaluateAll((elements) => elements.map((element) => element.textContent));
  assert.deepEqual(paragraphs, scene.sentences.map((sentence) => sentence.segments.map((segment) => segment.text).join('')));
  const translation = page.locator('.translation');
  assert.equal(await translation.getAttribute('open'), null);
  await translation.locator('summary').click();
  assert.deepEqual(await translation.locator('p').allTextContents(), scene.sentences.map((sentence) => sentence.translation));
  const phraseData = await page.getByRole('region', { name: '常用短句' }).getByRole('listitem').evaluateAll((items) => items.map((item) => {
    const button = item.querySelector('button[data-pronounce]');
    return { text: item.textContent, label: button?.getAttribute('aria-label'), kind: button?.getAttribute('data-audio-kind'),
      src: button?.getAttribute('data-audio-src'), audioLabel: button?.getAttribute('data-label') };
  }));
  assert.equal(phraseData.length, scene.phrases.length);
  for (let i = 0; i < scene.phrases.length; i++) {
    const phrase = scene.phrases[i];
    assert.ok(phraseData[i].text.includes(phrase.english) && phraseData[i].text.includes(phrase.translation));
    assert.deepEqual([phraseData[i].label, phraseData[i].kind, phraseData[i].src, phraseData[i].audioLabel],
      [`聽短句 ${phrase.english} 的發音`, 'phrase', phrase.audio.src, phrase.english]);
  }
  const wordData = await page.getByRole('region', { name: '重點單字' }).getByRole('listitem').evaluateAll((items) => items.map((item) => {
    const button = item.querySelector('button[data-pronounce]');
    return { text: item.textContent, label: button?.getAttribute('aria-label'), kind: button?.getAttribute('data-audio-kind'),
      src: button?.getAttribute('data-audio-src'), audioLabel: button?.getAttribute('data-label') };
  }));
  assert.equal(wordData.length, scene.words.length);
  for (let i = 0; i < scene.words.length; i++) {
    const word = scene.words[i];
    assert.ok([word.english, word.translation, word.example].every((part) => wordData[i].text.includes(part)));
    assert.deepEqual([wordData[i].label, wordData[i].kind, wordData[i].src, wordData[i].audioLabel],
      [`聽 ${word.english} 的發音`, 'word', word.audio.src, word.english]);
  }
  assert.equal(await page.locator('[data-pronounce]').count(), 1 + scene.phrases.length + scene.words.length);
  const story = page.getByRole('button', { name: '朗讀整篇英文短文' });
  assert.deepEqual([await story.getAttribute('data-audio-kind'), await story.getAttribute('data-audio-src'), await story.getAttribute('data-label')],
    ['story', scene.audio.src, '整篇短文']);
  assert.equal(await page.getByRole('button', { name: '暫停朗讀' }).count(), 1);
  assert.equal(await page.getByRole('button', { name: '從頭朗讀' }).count(), 1);
  const attribution = page.locator('.pronunciation-attribution');
  assert.equal(await attribution.getAttribute('open'), null);
  await attribution.locator('summary').click();
  const creditText = await attribution.textContent();
  assert.ok([profile.provider, profile.voice, profile.libraryVersion, profile.modelLicenseName].every((part) => creditText.includes(part)));
  assert.equal(await attribution.getByRole('link', { name: '模型來源' }).getAttribute('href'), profile.sourceUrl);
  assert.equal(await attribution.getByRole('link', { name: profile.modelLicenseName }).getAttribute('href'), profile.modelLicenseUrl);
  const navigationRoutes = await page.getByRole('navigation', { name: '場景導覽' }).locator('a[href^="/scenes/"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  assert.deepEqual(navigationRoutes, getRelatedScenes(scene, allScenes).map((other) => `/scenes/${other.id}/`));
}

test('a large mixed-level catalog builds and serves complete routes without changing the main project', { timeout: 240_000 }, async () => {
  const scope = ['src', 'content', 'public', 'dist', 'astro.config.mjs', 'tsconfig.json', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'];
  const before = fileHashes(projectRoot, scope);
  const originalFiles = readdirSync(join(projectRoot, 'content/scenes')).filter((name) => name.endsWith('.json')).sort();
  const originals = originalFiles.map((name) => JSON.parse(readFileSync(join(projectRoot, 'content/scenes', name), 'utf8')));
  const officialIds = originals.map((scene) => scene.id);
  assert.equal(new Set(officialIds).size, officialIds.length, 'official scene IDs must be unique');
  for (const id of originalIds) assert.ok(officialIds.includes(id), `missing baseline scene ${id}`);
  assert.ok(!originalFiles.includes(`${fixtureId}.json`));
  const tempRoot = mkdtempSync(join(tmpdir(), 'carlenglish extension '));
  let child;
  let browser;
  try {
    for (const path of ['src', 'content', 'public']) cpSync(join(projectRoot, path), join(tempRoot, path), { recursive: true });
    for (const name of ['astro.config.mjs', 'tsconfig.json', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) {
      if (existsSync(join(projectRoot, name))) cpSync(join(projectRoot, name), join(tempRoot, name));
    }
    symlinkSync(join(projectRoot, 'node_modules'), join(tempRoot, 'node_modules'), 'dir');

    const original = JSON.parse(readFileSync(join(tempRoot, 'content/scenes/cafe-breakfast.json'), 'utf8'));
    const added = [];
    for (const [levelId, levelName] of [['beginner', '初級'], ['intermediate', '中級'], ['advanced', '高級']]) {
      for (let i = 0; i < 14; i++) {
        const copy = structuredClone(original);
        copy.id = `catalog-${levelId}-${String(i).padStart(2, '0')}`;
        copy.title = `${levelName}延伸讀本 ${i}`;
        copy.titleEn = `CatalogTitle${levelId}${i}End`;
        copy.level = levelName;
        copy.category = i % 2 === 0 ? '飲食' : '購物';
        writeFileSync(join(tempRoot, 'content/scenes', `${copy.id}.json`), JSON.stringify(copy));
        added.push(copy);
      }
    }
    assert.equal(added.length, 42);
    const small = added[13];
    small.image = { src: '/images/scenes/catalog-small-fixture.png', alt: 'A small café illustration', width: 320, height: 180 };
    await sharp(join(tempRoot, 'public', original.image.src.slice(1)))
      .resize(320, 180, { fit: 'cover' }).png()
      .toFile(join(tempRoot, 'public', small.image.src.slice(1)));
    writeFileSync(join(tempRoot, 'content/scenes', `${small.id}.json`), JSON.stringify(small));
    const fourth = added[0];
    const allScenes = readdirSync(join(tempRoot, 'content/scenes')).filter((name) => name.endsWith('.json')).sort()
      .map((name) => JSON.parse(readFileSync(join(tempRoot, 'content/scenes', name), 'utf8')));
    const tierScenes = (id) => allScenes.filter((scene) => getLearningLevel(scene).id === id);

    execFileSync(process.execPath, [astroBin, 'build'], { cwd: tempRoot, stdio: 'pipe', timeout: 90_000 });
    const routeRoot = join(tempRoot, 'dist/scenes');
    const expectedIds = allScenes.map((scene) => scene.id).sort();
    assert.deepEqual(readdirSync(routeRoot).filter((name) => lstatSync(join(routeRoot, name)).isDirectory()).sort(), expectedIds,
      'isolated build must preserve every official route and add exactly 42 fixtures');
    for (const id of expectedIds) assert.ok(existsSync(join(routeRoot, id, 'index.html')));
    for (const id of ['beginner', 'intermediate', 'advanced']) assert.ok(existsSync(join(tempRoot, 'dist/levels', id, 'index.html')));
    const port = await freePort();
    const origin = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, [astroBin, 'preview', '--host', '127.0.0.1', '--port', String(port), '--ignore-lock'], {
      cwd: tempRoot, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output = (output + chunk.toString()).slice(-4_000); });
    child.stderr.on('data', (chunk) => { output = (output + chunk.toString()).slice(-4_000); });
    await waitForPreview(origin, child, () => output);

    const site = 'https://carlenglish.gravito.dev';
    const sitemapResponse = await fetch(`${origin}/sitemap.xml`);
    assert.equal(sitemapResponse.status, 200);
    const sitemap = await sitemapResponse.text();
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    const expectedUrls = [
      `${site}/`, ...['beginner', 'intermediate', 'advanced'].map((id) => `${site}/levels/${id}/`),
      ...allScenes.map((scene) => `${site}/scenes/${scene.id}/`),
    ];
    assert.deepEqual(new Set(locs), new Set(expectedUrls));
    assert.equal(locs.length, expectedUrls.length);
    assert.ok(!sitemap.includes('lastmod'));

    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(origin);
    assert.equal(await page.getByRole('link', { name: /^閱讀/ }).count(), 0);
    for (const [levelId, levelName] of [['beginner', '初級'], ['intermediate', '中級'], ['advanced', '高級']]) {
      await page.getByRole('link', { name: `進入${levelName}` }).click();
      assert.equal(await page.getByRole('heading', { level: 1, name: `${levelName}讀本` }).count(), 1);
      assert.equal(await page.getByRole('link', { name: /^閱讀/ }).count(), tierScenes(levelId).length);
      assert.equal(await page.getByRole('link', { name: `閱讀${tierScenes(levelId)[0].title}` }).count(), 1);
      await page.goto(origin);
    }
    await page.goto(`${origin}/levels/beginner/`);
    const search = page.getByRole('searchbox', { name: '搜尋讀本' });
    const category = page.getByRole('combobox', { name: '生活主題' });
    await search.fill(fourth.titleEn.toUpperCase());
    assert.equal(await page.getByRole('link', { name: /^閱讀/ }).count(), 1);
    await search.fill('no matching catalog scene');
    assert.equal(await page.getByRole('link', { name: /^閱讀/ }).count(), 0);
    assert.equal(await page.getByText('沒有找到符合的讀本').count(), 1);
    await page.getByRole('button', { name: '清除篩選' }).click();
    assert.equal(await page.getByRole('link', { name: /^閱讀/ }).count(), tierScenes('beginner').length);
    await category.selectOption({ label: '購物' });
    assert.equal(await page.getByRole('link', { name: /^閱讀/ }).count(), tierScenes('beginner').filter((scene) => scene.category === '購物').length);
    await page.reload();
    assert.equal(await category.inputValue(), '購物');
    await page.getByRole('button', { name: '清除篩選' }).click();
    assert.equal(await page.getByRole('link', { name: /^閱讀/ }).count(), tierScenes('beginner').length);
    for (const representative of [added[0], added[14], added[28]]) {
      const pathname = `/scenes/${representative.id}/`;
      await page.goto(`${origin}${pathname}`);
      assert.equal(await page.locator('head link[rel="canonical"]').getAttribute('href'), `${site}${pathname}`);
      assert.equal(await page.locator('head meta[property="og:url"]').getAttribute('content'), `${site}${pathname}`);
      const shareUrl = await page.locator('head meta[property="og:image"]').getAttribute('content');
      assert.equal(shareUrl, `${site}/images/social/scenes/${representative.id}.png`);
      const shareResponse = await fetch(`${origin}${new URL(shareUrl).pathname}`);
      assert.equal(shareResponse.status, 200);
      const png = Buffer.from(await shareResponse.arrayBuffer());
      assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630]);
      const schemas = (await page.locator('head script[type="application/ld+json"]').allTextContents())
        .flatMap((text) => { const value = JSON.parse(text); return value['@graph'] ?? [value]; });
      const resource = schemas.find((node) => [node['@type']].flat().includes('LearningResource'));
      assert.ok(resource, representative.id);
      assert.equal(resource.name, representative.title);
      assert.equal(resource.alternateName, representative.titleEn);
      assert.equal(resource.educationalLevel, representative.level);
      assert.ok(JSON.stringify(resource.about).includes(representative.category));
      assert.ok(representative.phrases.every((phrase) => JSON.stringify(resource.teaches).includes(phrase.english)));
    }
    await page.goto(`${origin}/scenes/${small.id}/`);
    assert.equal(await page.locator('head link[rel="canonical"]').getAttribute('href'), `${site}/scenes/${small.id}/`);
    const brandUrl = `${site}/images/social/carlenglish.jpg`;
    assert.equal(await page.locator('head meta[property="og:image"]').getAttribute('content'), brandUrl);
    assert.equal(await page.locator('head meta[property="og:image:type"]').getAttribute('content'), 'image/jpeg');
    assert.equal(await page.locator('head meta[property="og:image:width"]').getAttribute('content'), '1200');
    assert.equal(await page.locator('head meta[property="og:image:height"]').getAttribute('content'), '630');
    assert.equal(await page.locator('head meta[name="twitter:image"]').getAttribute('content'), brandUrl);
    const brandAlt = await page.locator('head meta[property="og:image:alt"]').getAttribute('content');
    assert.ok(brandAlt && brandAlt !== small.image.alt);
    assert.equal(await page.locator('head meta[name="twitter:image:alt"]').getAttribute('content'), brandAlt);
    const brandResponse = await fetch(`${origin}/images/social/carlenglish.jpg`);
    assert.equal(brandResponse.status, 200);
    assert.equal(Buffer.from(await brandResponse.arrayBuffer()).subarray(0, 3).toString('hex'), 'ffd8ff');
    const brandSize = await page.evaluate(async () => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);
      image.onerror = reject;
      image.src = '/images/social/carlenglish.jpg';
    }));
    assert.deepEqual(brandSize, [1200, 630]);
    const smallSchemas = (await page.locator('head script[type="application/ld+json"]').allTextContents())
      .flatMap((text) => { const value = JSON.parse(text); return value['@graph'] ?? [value]; });
    const smallResource = smallSchemas.find((node) => [node['@type']].flat().includes('LearningResource'));
    assert.ok(smallResource);
    assert.equal(smallResource.name, small.title);
    assert.ok(JSON.stringify(smallResource.image).includes(`${site}${small.image.src}`));
    const smallImage = page.getByRole('img', { name: small.image.alt });
    assert.deepEqual(await smallImage.evaluate((image) => [image.naturalWidth, image.naturalHeight]), [320, 180]);
    const route = `${origin}/scenes/${fixtureId}/`;
    let response = await page.goto(route);
    assert.equal(response.status(), 200);
    await page.reload();
    assert.equal(await page.getByRole('heading', { level: 1, name: fourth.titleEn }).count(), 1);
    const related = page.getByRole('navigation', { name: '場景導覽' }).getByRole('link').filter({ hasNotText: /^回到/ });
    assert.equal(await related.count(), 3);
    for (const href of await related.evaluateAll((links) => links.map((link) => link.getAttribute('href')))) {
      const id = href.match(/\/scenes\/([^/]+)\//)?.[1];
      assert.ok(id && id !== fixtureId && tierScenes('beginner').some((scene) => scene.id === id), href);
    }
    const image = page.getByRole('img', { name: fourth.image.alt });
    assert.equal(await image.count(), 1);
    assert.deepEqual(await image.evaluate((element) => [element.complete, element.naturalWidth, element.naturalHeight]),
      [true, fourth.image.width, fourth.image.height]);
    const text = await page.getByRole('region', { name: '英文短文' }).locator('[lang="en"] p')
      .evaluateAll((elements) => elements.map((element) => element.textContent));
    assert.deepEqual(text, fourth.sentences.map((sentence) => sentence.segments.map((segment) => segment.text).join('')));
    const details = page.locator('.translation');
    assert.equal(await details.getAttribute('open'), null);
    await details.locator('summary').click();
    assert.equal(await details.getAttribute('open'), '');
    assert.deepEqual(await details.locator('p').allTextContents(), fourth.sentences.map((sentence) => sentence.translation));
    const phrases = page.getByRole('region', { name: '常用短句' }).getByRole('listitem');
    assert.equal(await phrases.count(), fourth.phrases.length);
    for (let i = 0; i < fourth.phrases.length; i++) {
      const item = await phrases.nth(i).textContent();
      assert.ok(item.includes(fourth.phrases[i].english) && item.includes(fourth.phrases[i].translation));
      const phrase = fourth.phrases[i];
      const button = phrases.nth(i).getByRole('button', { name: `聽短句 ${phrase.english} 的發音` });
      assert.equal(await button.getAttribute('data-audio-kind'), 'phrase');
      assert.equal(await button.getAttribute('data-audio-src'), phrase.audio.src);
      assert.equal(await button.getAttribute('data-label'), phrase.english);
    }
    const words = page.getByRole('region', { name: '重點單字' }).getByRole('listitem');
    assert.equal(await words.count(), fourth.words.length);
    for (let i = 0; i < fourth.words.length; i++) {
      const item = await words.nth(i).textContent();
      assert.ok([fourth.words[i].english, fourth.words[i].translation, fourth.words[i].example].every((part) => item.includes(part)));
      const button = words.nth(i).getByRole('button', { name: `聽 ${fourth.words[i].english} 的發音` });
      assert.equal(await button.count(), 1);
      assert.equal(await button.getAttribute('data-audio-kind'), 'word');
      assert.equal(await button.getAttribute('data-audio-src'), fourth.words[i].audio.src);
      assert.equal(await button.getAttribute('data-label'), fourth.words[i].english);
    }
    assert.equal(await page.locator('[data-pronounce]').count(), 1 + fourth.phrases.length + fourth.words.length);
    const story = page.getByRole('button', { name: '朗讀整篇英文短文' });
    assert.equal(await story.getAttribute('data-audio-kind'), 'story');
    assert.equal(await story.getAttribute('data-audio-src'), fourth.audio.src);
    assert.equal(await story.getAttribute('data-label'), '整篇短文');
    assert.equal(await page.getByRole('button', { name: '暫停朗讀' }).count(), 1);
    assert.equal(await page.getByRole('button', { name: '從頭朗讀' }).count(), 1);
    const attribution = page.locator('.pronunciation-attribution');
    assert.equal(await attribution.getAttribute('open'), null);
    await attribution.locator('summary').click();
    assert.equal(await attribution.getAttribute('open'), '');
    const profile = JSON.parse(readFileSync(join(tempRoot, 'content/audio/voice-profile.json'), 'utf8'));
    const creditText = await attribution.textContent();
    assert.ok([profile.provider, profile.voice, profile.libraryVersion, profile.modelLicenseName].every((part) => creditText.includes(part)));
    assert.equal(await attribution.getByRole('link', { name: '模型來源' }).getAttribute('href'), profile.sourceUrl);
    assert.equal(await attribution.getByRole('link', { name: profile.modelLicenseName }).getAttribute('href'), profile.modelLicenseUrl);
    for (const scene of originals) {
      const route = `${origin}/scenes/${scene.id}/`;
      const direct = await page.goto(route);
      assert.equal(direct.status(), 200, `${scene.id} must retain its direct route`);
      await expectOfficialReader(page, scene, profile, allScenes);
      const reloaded = await page.reload();
      assert.equal(reloaded.status(), 200, `${scene.id} must survive reload`);
      await expectOfficialReader(page, scene, profile, allScenes);
    }

  } finally {
    if (browser) await browser.close();
    if (child) await stopChild(child);
    rmSync(tempRoot, { recursive: true, force: true });
    assert.deepEqual(fileHashes(projectRoot, scope), before, 'main project source, content, assets, config, and dist must remain unchanged');
    assert.deepEqual(readdirSync(join(projectRoot, 'content/scenes')).filter((name) => name.endsWith('.json')).sort(), originalFiles);
    assert.ok(!existsSync(join(projectRoot, 'content/scenes', `${fixtureId}.json`)));
    assert.ok(!existsSync(join(projectRoot, 'dist/scenes', fixtureId)));
  }
});
