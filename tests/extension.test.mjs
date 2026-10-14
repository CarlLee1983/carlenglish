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
const articleFixtureId = 'another-library-news';
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

test('an extension content file and image create a complete route without changing the main project', { timeout: 60_000 }, async () => {
  const scope = ['src', 'content', 'public', 'dist', 'astro.config.mjs', 'tsconfig.json', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'];
  const before = fileHashes(projectRoot, scope);
  const originalFiles = readdirSync(join(projectRoot, 'content/scenes')).filter((name) => name.endsWith('.json')).sort();
  assert.equal(originalFiles.length, 4, 'production content must contain the four official scenes');
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
    const fourth = structuredClone(original);
    fourth.id = fixtureId;
    fourth.title = '另一個咖啡店早餐';
    fourth.titleEn = 'Another breakfast at the café';
    fourth.image.src = `/images/scenes/${fixtureId}.webp`;
    cpSync(join(tempRoot, 'public', original.image.src.slice(1)), join(tempRoot, 'public', fourth.image.src.slice(1)));
    writeFileSync(join(tempRoot, 'content/scenes', `${fixtureId}.json`), JSON.stringify(fourth));

    const originalArticle = JSON.parse(readFileSync(join(tempRoot, 'content/articles/riverside-library-late-hours.json'), 'utf8'));
    const extraArticle = { ...originalArticle, id: articleFixtureId, title: '另一則圖書館消息', titleEn: 'Another library announcement' };
    writeFileSync(join(tempRoot, 'content/articles', `${articleFixtureId}.json`), JSON.stringify(extraArticle));

    execFileSync(process.execPath, [astroBin, 'build'], { cwd: tempRoot, stdio: 'pipe', timeout: 30_000 });
    assert.ok(existsSync(join(tempRoot, 'dist/scenes', fixtureId, 'index.html')));
    assert.ok(existsSync(join(tempRoot, 'dist/articles', articleFixtureId, 'index.html')));
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
    let response = await page.goto(origin);
    assert.equal(await page.getByRole('link', { name: `閱讀${fourth.title}` }).count(), 1);
    assert.equal(await page.getByRole('link', { name: /^閱讀/ }).count(), 5);
    assert.equal(await page.getByRole('link', { name: extraArticle.titleEn }).getAttribute('href'), `/articles/${articleFixtureId}/`);
    response = await page.goto(`${origin}/articles/${articleFixtureId}/`);
    assert.equal(response.status(), 200);
    assert.equal(await page.getByRole('heading', { level: 1, name: extraArticle.titleEn }).count(), 1);
    await page.goto(origin);
    const route = `${origin}/scenes/${fixtureId}/`;
    response = await page.goto(route);
    assert.equal(response.status(), 200);
    await page.reload();
    assert.equal(await page.getByRole('heading', { level: 1, name: fourth.titleEn }).count(), 1);
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
  } finally {
    if (browser) await browser.close();
    if (child) await stopChild(child);
    rmSync(tempRoot, { recursive: true, force: true });
    assert.deepEqual(fileHashes(projectRoot, scope), before, 'main project source, content, assets, config, and dist must remain unchanged');
    assert.deepEqual(readdirSync(join(projectRoot, 'content/scenes')).filter((name) => name.endsWith('.json')).sort(), originalFiles);
    assert.ok(!existsSync(join(projectRoot, 'public/images/scenes', `${fixtureId}.webp`)));
    assert.ok(!existsSync(join(projectRoot, 'dist/scenes', fixtureId)));
    assert.ok(!existsSync(join(projectRoot, 'dist/articles', articleFixtureId)));
  }
});
