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

const projectRoot = process.cwd();
const fixtureId = 'another-cafe-breakfast';
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

async function expectSceneContent(page, scene, profile, sceneIds) {
  assert.equal(await page.getByRole('heading', { level: 1, name: scene.titleEn }).count(), 1);
  assert.equal(await page.getByText(scene.title, { exact: true }).count(), 1);
  const metadata = await page.getByRole('article').textContent();
  assert.ok(metadata.includes(scene.category) && metadata.includes(scene.level));
  const image = page.getByRole('img', { name: scene.image.alt });
  assert.equal(await image.count(), 1);
  assert.equal(await image.getAttribute('src'), scene.image.src);
  assert.deepEqual(await image.evaluate((element) => [element.complete, element.naturalWidth, element.naturalHeight]),
    [true, scene.image.width, scene.image.height]);
  const text = await page.getByRole('region', { name: '英文短文' }).locator('[lang="en"] p')
    .evaluateAll((elements) => elements.map((element) => element.textContent));
  assert.deepEqual(text, scene.sentences.map((sentence) => sentence.segments.map((segment) => segment.text).join('')));
  const details = page.locator('.translation');
  assert.equal(await details.getAttribute('open'), null);
  await details.locator('summary').click();
  assert.equal(await details.getAttribute('open'), '');
  assert.deepEqual(await details.locator('p').allTextContents(), scene.sentences.map((sentence) => sentence.translation));
  const phrases = page.getByRole('region', { name: '常用短句' }).getByRole('listitem');
  assert.equal(await phrases.count(), scene.phrases.length);
  for (let i = 0; i < scene.phrases.length; i++) {
    const item = await phrases.nth(i).textContent();
    assert.ok(item.includes(scene.phrases[i].english) && item.includes(scene.phrases[i].translation));
    const phrase = scene.phrases[i];
    const button = phrases.nth(i).getByRole('button', { name: `聽短句 ${phrase.english} 的發音` });
    assert.equal(await button.getAttribute('data-audio-kind'), 'phrase');
    assert.equal(await button.getAttribute('data-audio-src'), phrase.audio.src);
    assert.equal(await button.getAttribute('data-label'), phrase.english);
  }
  const words = page.getByRole('region', { name: '重點單字' }).getByRole('listitem');
  assert.equal(await words.count(), scene.words.length);
  for (let i = 0; i < scene.words.length; i++) {
    const item = await words.nth(i).textContent();
    assert.ok([scene.words[i].english, scene.words[i].translation, scene.words[i].example].every((part) => item.includes(part)));
    const button = words.nth(i).getByRole('button', { name: `聽 ${scene.words[i].english} 的發音` });
    assert.equal(await button.count(), 1);
    assert.equal(await button.getAttribute('data-audio-kind'), 'word');
    assert.equal(await button.getAttribute('data-audio-src'), scene.words[i].audio.src);
    assert.equal(await button.getAttribute('data-label'), scene.words[i].english);
  }
  assert.equal(await page.locator('[data-pronounce]').count(), 1 + scene.phrases.length + scene.words.length);
  const story = page.getByRole('button', { name: '朗讀整篇英文短文' });
  assert.equal(await story.getAttribute('data-audio-kind'), 'story');
  assert.equal(await story.getAttribute('data-audio-src'), scene.audio.src);
  assert.equal(await story.getAttribute('data-label'), '整篇短文');
  assert.equal(await page.getByRole('button', { name: '暫停朗讀' }).count(), 1);
  assert.equal(await page.getByRole('button', { name: '從頭朗讀' }).count(), 1);
  const attribution = page.locator('.pronunciation-attribution');
  assert.equal(await attribution.getAttribute('open'), null);
  await attribution.locator('summary').click();
  assert.equal(await attribution.getAttribute('open'), '');
  const creditText = await attribution.textContent();
  assert.ok([profile.provider, profile.voice, profile.libraryVersion, profile.modelLicenseName].every((part) => creditText.includes(part)));
  assert.equal(await attribution.getByRole('link', { name: '模型來源' }).getAttribute('href'), profile.sourceUrl);
  assert.equal(await attribution.getByRole('link', { name: profile.modelLicenseName }).getAttribute('href'), profile.modelLicenseUrl);
  const navigationRoutes = await page.getByRole('navigation', { name: '場景導覽' }).locator('a[href^="/scenes/"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')).sort());
  assert.deepEqual(navigationRoutes, sceneIds.filter((id) => id !== scene.id).map((id) => `/scenes/${id}/`).sort());
}

test('one isolated extension preserves every official route and its complete content without changing the main project', { timeout: 60_000 }, async () => {
  const scope = ['src', 'content', 'public', 'dist', 'astro.config.mjs', 'tsconfig.json', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'];
  const before = fileHashes(projectRoot, scope);
  const originalFiles = readdirSync(join(projectRoot, 'content/scenes')).filter((name) => name.endsWith('.json')).sort();
  const originals = originalFiles.map((name) => JSON.parse(readFileSync(join(projectRoot, 'content/scenes', name), 'utf8')));
  const officialIds = originals.map((scene) => scene.id);
  assert.equal(new Set(officialIds).size, officialIds.length, 'official scene IDs must be unique');
  for (const id of originalIds) assert.ok(officialIds.includes(id), `original scene ${id} must remain available`);
  assert.ok(!officialIds.includes(fixtureId));
  const expectedIds = [...officialIds, fixtureId].sort();
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
    const extension = structuredClone(original);
    extension.id = fixtureId;
    extension.title = '另一個咖啡店早餐';
    extension.titleEn = 'Another breakfast at the café';
    extension.image.src = `/images/scenes/${fixtureId}.webp`;
    cpSync(join(tempRoot, 'public', original.image.src.slice(1)), join(tempRoot, 'public', extension.image.src.slice(1)));
    writeFileSync(join(tempRoot, 'content/scenes', `${fixtureId}.json`), JSON.stringify(extension));

    execFileSync(process.execPath, [astroBin, 'build'], { cwd: tempRoot, stdio: 'pipe', timeout: 30_000 });
    const routeRoot = join(tempRoot, 'dist/scenes');
    assert.deepEqual(readdirSync(routeRoot).filter((name) => lstatSync(join(routeRoot, name)).isDirectory()).sort(), expectedIds,
      'the isolated build must add exactly one route to the current official collection');
    for (const id of expectedIds) assert.ok(existsSync(join(routeRoot, id, 'index.html')));
    const port = await freePort();
    const origin = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, [astroBin, 'preview', '--host', '127.0.0.1', '--port', String(port), '--ignore-lock'], {
      cwd: tempRoot, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output = (output + chunk.toString()).slice(-4_000); });
    child.stderr.on('data', (chunk) => { output = (output + chunk.toString()).slice(-4_000); });
    await waitForPreview(origin, child, () => output);

    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(origin);
    const listedRoutes = await page.getByRole('link', { name: /^閱讀/ })
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')).sort());
    assert.equal(listedRoutes.length, originals.length + 1);
    assert.deepEqual(listedRoutes, expectedIds.map((id) => `/scenes/${id}/`));
    for (const scene of [...originals, extension]) {
      const link = page.getByRole('link', { name: `閱讀${scene.title}`, exact: true });
      assert.equal(await link.count(), 1);
      assert.equal(await link.getAttribute('href'), `/scenes/${scene.id}/`);
    }
    const profile = JSON.parse(readFileSync(join(tempRoot, 'content/audio/voice-profile.json'), 'utf8'));
    for (const scene of [...originals, extension]) {
      const route = `${origin}/scenes/${scene.id}/`;
      const response = await page.goto(route);
      assert.equal(response.status(), 200, `${scene.id} must retain its direct route`);
      await expectSceneContent(page, scene, profile, expectedIds);
      const reloaded = await page.reload();
      assert.equal(reloaded.status(), 200, `${scene.id} must survive reload`);
      await expectSceneContent(page, scene, profile, expectedIds);
    }
  } finally {
    if (browser) await browser.close();
    if (child) await stopChild(child);
    rmSync(tempRoot, { recursive: true, force: true });
    assert.deepEqual(fileHashes(projectRoot, scope), before, 'main project source, content, assets, config, and dist must remain unchanged');
    assert.deepEqual(readdirSync(join(projectRoot, 'content/scenes')).filter((name) => name.endsWith('.json')).sort(), originalFiles);
    assert.ok(!existsSync(join(projectRoot, 'public/images/scenes', `${fixtureId}.webp`)));
    assert.ok(!existsSync(join(projectRoot, 'dist/scenes', fixtureId)));
  }
});
