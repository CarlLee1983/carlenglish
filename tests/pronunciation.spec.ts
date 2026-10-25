import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { getLearningLevel } from '../src/lib/catalog';

type Clip = { src: string; voiceId: string; textSha256: string; sha256: string };
type Item = { id: string; english: string; audio: Clip };
type Scene = { id: string; level: string; sentences: { audio: Clip }[]; phrases: Item[]; words: Item[]; voiceProfile?: { label: string } };
const contentDir = join(process.cwd(), 'content/scenes');
const scenes = readdirSync(contentDir).filter((name) => name.endsWith('.json')).sort()
  .map((name) => JSON.parse(readFileSync(join(contentDir, name), 'utf8')) as Scene);
const profile = JSON.parse(readFileSync(join(process.cwd(), 'content/audio/voice-profile.json'), 'utf8')) as {
  id: string; label: string; provider: string; voice: string; libraryVersion: string;
  sourceUrl: string; modelLicenseName: string; modelLicenseUrl: string;
};
const first = scenes.find((scene) => scene.id === 'cafe-breakfast')!;
if (!first) throw new Error('The original cafe-breakfast scene must remain available for playback regression tests.');
const route = `/scenes/${first.id}/`;
type ClipState = { src: string; preload: string; currentTime: number; paused: boolean; plays: number; syncPlays: number; pauses: number; playbackRate: number; sources: string[] };
type MockState = { clips: ClipState[] };
type AudioMock = {
  state: () => MockState;
  event: (index: number, name: string, ended?: boolean) => void;
  settle: (index: number, name?: string) => void;
  seek: (index: number, seconds: number) => void;
  throwNext: (name: string) => void;
};

async function mockAudio(page: Page, unsupported = false) {
  await page.addInitScript((unsupported) => {
    if (unsupported) {
      Object.defineProperty(window, 'Audio', { configurable: true, value: undefined });
      return;
    }
    let inClick = false;
    document.addEventListener('click', () => { inClick = true; }, true);
    document.addEventListener('click', () => { inClick = false; });
    let nextThrow: string | null = null;
    const clips: FakeAudio[] = [];
    class FakeAudio extends EventTarget {
      private source: string;
      sources: string[] = [];
      playbackRate = 1;
      get src() { return this.source; }
      set src(value: string) { this.source = value; this.sources.push(value); this.currentTime = 0; this.ended = false; }
      load() {}
      preload = '';
      currentTime = 0;
      paused = true;
      ended = false;
      plays = 0;
      syncPlays = 0;
      pauses = 0;
      pending: { resolve: () => void; reject: (error: Error) => void }[] = [];
      constructor(src = '') { super(); this.source = src; this.sources.push(src); clips.push(this); }
      play() {
        this.plays++;
        if (inClick) this.syncPlays++;
        this.ended = false;
        if (nextThrow) {
          const name = nextThrow;
          nextThrow = null;
          throw Object.assign(new Error(name), { name });
        }
        this.paused = false;
        return new Promise<void>((resolve, reject) => this.pending.push({ resolve, reject }));
      }
      pause() { this.pauses++; this.paused = true; }
    }
    Object.defineProperty(window, 'Audio', { configurable: true, value: FakeAudio });
    Object.defineProperty(window, '__audioMock', { configurable: true, value: {
      state: () => ({ clips: clips.map(({ src, preload, currentTime, paused, plays, syncPlays, pauses, playbackRate, sources }) =>
        ({ src, preload, currentTime, paused, plays, syncPlays, pauses, playbackRate, sources })) }),
      event: (index: number, name: string, ended?: boolean) => {
        const audio = clips[index];
        if (!audio) return;
        if (name === 'ended') audio.ended = ended ?? true;
        audio.dispatchEvent(new Event(name));
      },
      settle: (index: number, name?: string) => {
        const pending = clips[index]?.pending.shift();
        if (!pending) return;
        if (name) pending.reject(name === 'NotAllowedError'
          ? new DOMException('Playback blocked', name) : Object.assign(new Error(name), { name }));
        else pending.resolve();
      },
      seek: (index: number, seconds: number) => { if (clips[index]) clips[index].currentTime = seconds; },
      throwNext: (name: string) => { nextThrow = name; },
    } });
  }, unsupported);
}
async function state(page: Page): Promise<MockState> {
  return page.evaluate(() => (window as typeof window & { __audioMock: AudioMock }).__audioMock.state());
}
async function action(page: Page, name: 'event' | 'lateEnded' | 'resolve' | 'reject' | 'seek' | 'throwNext', indexOrName: number | string, value?: string | number) {
  await page.evaluate(({ name, indexOrName, value }) => {
    const mock = (window as typeof window & { __audioMock: AudioMock }).__audioMock;
    if (name === 'event') mock.event(indexOrName as number, value as string);
    if (name === 'lateEnded') mock.event(indexOrName as number, 'ended', false);
    if (name === 'resolve') mock.settle(indexOrName as number);
    if (name === 'reject') mock.settle(indexOrName as number, value as string);
    if (name === 'seek') mock.seek(indexOrName as number, value as number);
    if (name === 'throwNext') mock.throwNext(indexOrName as string);
  }, { name, indexOrName, value });
}
const story = (page: Page) => page.locator('[data-pronounce][data-audio-kind="story"]');
const phrase = (page: Page, item: Item) => page.getByRole('button', { name: `聽短句 ${item.english} 的發音` });
const word = (page: Page, item: Item) => page.getByRole('button', { name: `聽 ${item.english} 的發音` });
const pause = (page: Page) => story(page);
const resume = (page: Page) => story(page);
const restart = (page: Page) => page.locator('[data-story-restart]');
const stop = (page: Page) => page.locator('[data-pronounce-stop]');
const status = (page: Page) => page.locator('[data-pronounce-status]');
const dialog = (page: Page) => page.locator('[data-follow-dialog]');
const rows = (page: Page) => page.locator('[data-story-sentence]');
const rate = (page: Page) => page.locator('[data-reading-rate]');
const mode = (page: Page) => page.locator('[data-reading-mode]');
const previous = (page: Page) => page.locator('[data-story-previous]');
const repeat = (page: Page) => page.locator('[data-story-repeat]');
const completion = (page: Page) => page.locator('[data-follow-completion]');
const openButton = (page: Page) => page.locator('[data-follow-open]');
async function openFocus(page: Page) {
  await openButton(page).click();
  await expect(dialog(page)).toBeVisible();
}
async function closeFocus(page: Page) {
  await dialog(page).locator('[data-follow-close]:visible').first().click();
  await expect(dialog(page)).not.toBeVisible();
}
async function settings(page: Page) {
  const details = dialog(page).locator('details').filter({ has: mode(page) });
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
}
async function selectSentence(page: Page, index: number) {
  await settings(page);
  await page.locator('[data-follow-sentence]').selectOption(String(index));
}
async function playSentence(page: Page, index: number) {
  await selectSentence(page, index);
  await story(page).click();
}
const progressKey = (scene = first) => `carlenglish.reading.progress.${scene.id}`;
async function latest(page: Page) { return (await state(page)).clips.length - 1; }
async function finish(page: Page) {
  const index = await latest(page);
  await action(page, 'event', index, 'playing');
  await action(page, 'event', index, 'ended');
}
async function savedProgress(page: Page, scene = first) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), progressKey(scene));
}
const entries = (scene: Scene) => [
  { kind: 'story', label: '英文短文', audio: scene.sentences[0].audio },
  ...scene.phrases.map((item) => ({ kind: 'phrase', label: item.english, audio: item.audio })),
  ...scene.words.map((item) => ({ kind: 'word', label: item.english, audio: item.audio })),
];

for (const scene of scenes) {
  test(`${scene.id} exposes sentence assets and opens focus without autoplay`, async ({ page }) => {
    await mockAudio(page);
    await page.goto(`/scenes/${scene.id}/`);
    await expect(dialog(page)).not.toBeVisible();
    await expect(page.locator('[data-sentence-play]')).toHaveCount(0);
    await expect(rows(page)).toHaveCount(scene.sentences.length);
    for (const [index, item] of scene.sentences.entries()) {
      await expect(rows(page).nth(index)).toHaveAttribute('data-audio-src', item.audio.src);
      await expect(rows(page).nth(index)).toHaveAttribute('data-translation', /.+/);
    }
    const buttons = page.locator('[data-pronounce]');
    const expected = entries(scene);
    await expect(buttons).toHaveCount(expected.length);
    for (const item of expected) {
      const button = page.locator(`[data-pronounce][data-audio-kind="${item.kind}"][data-audio-src="${item.audio.src}"]`);
      await expect(button).toHaveAttribute('data-audio-kind', item.kind);
      await expect(button).toHaveAttribute('data-audio-src', item.audio.src);
      expect(item.audio.voiceId).toBe(profile.id);
    }
    await expect(page.locator('.pronunciation-voice')).toContainText(profile.label);
    await expect(page.locator('.pronunciation-voice')).toContainText('AI 合成語音');
    await openFocus(page);
    await expect(story(page)).toHaveAccessibleName('播放本句');
    await expect(rate(page)).toHaveValue(getLearningLevel(scene).id === 'beginner' ? '0.8' : '1');
    await expect(mode(page)).toHaveValue(getLearningLevel(scene).id === 'beginner' ? 'guided' : 'continuous');
    expect((await state(page)).clips).toHaveLength(0);
    const box = await story(page).boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await story(page).focus();
    await page.keyboard.press('Enter');
    expect((await state(page)).clips[0]).toMatchObject({ src: scene.sentences[0].audio.src, syncPlays: 1 });
    await closeFocus(page);
    const credits = page.locator('.pronunciation-attribution');
    await credits.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(credits).toHaveAttribute('open', '');
    for (const value of [profile.provider, profile.voice, profile.libraryVersion, profile.modelLicenseName]) await expect(credits).toContainText(value);
    await expect(credits.getByRole('link', { name: '模型來源' })).toHaveAttribute('href', profile.sourceUrl);
    await expect(credits.getByRole('link', { name: profile.modelLicenseName })).toHaveAttribute('href', profile.modelLicenseUrl);
    await expect(page).toHaveURL(new RegExp(`/scenes/${scene.id}/$`));
  });
}

for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 664 }]) {
  test(`focus keeps a long sentence, translation, and primary visible at ${viewport.width}px and Escape returns to it`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockAudio(page);
    await page.goto(route);
    await openFocus(page);
    await selectSentence(page, 1);
    const details = dialog(page).locator('details').filter({ has: mode(page) });
    if (await details.getAttribute('open') !== null) await details.locator('summary').click();
    await page.locator('[data-follow-translation]').click();
    const translation = page.locator('[data-follow-translation-text]');
    await expect(translation).toBeVisible();
    for (const locator of [page.locator('[data-follow-content]'), translation, story(page)]) {
      const rect = await locator.boundingBox();
      expect(rect).not.toBeNull();
      expect(rect!.x).toBeGreaterThanOrEqual(-1);
      expect(rect!.y).toBeGreaterThanOrEqual(-1);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(viewport.height + 1);
    }
    const initialScroll = await page.evaluate(() => window.scrollY);
    await story(page).focus();
    await page.keyboard.press('PageDown');
    expect(await page.evaluate(() => window.scrollY)).toBe(initialScroll);
    await story(page).click();
    await action(page, 'event', 0, 'playing');
    await page.keyboard.press('Escape');
    await expect(dialog(page)).not.toBeVisible();
    expect((await state(page)).clips[0].paused).toBe(true);
    await expect(rows(page).nth(1).locator('p')).toBeFocused();
    await expect(rows(page).nth(1).locator('p')).toBeInViewport();
    expect(await savedProgress(page)).toMatchObject({ index: 1 });
    await action(page, 'reject', 0, 'NotAllowedError');
    await action(page, 'event', 0, 'playing');
    await openFocus(page);
    await expect(story(page)).toHaveAccessibleName('播放本句');
    expect((await state(page)).clips).toHaveLength(1);
    await expect(page).toHaveURL(new RegExp(`${route}$`));
  });
}

test('an old queued dialog close cannot interrupt a reopened playback attempt', async ({ page }) => {
  await mockAudio(page);
  await page.goto(route);
  await openFocus(page);
  await playSentence(page, 1);
  await expect(story(page)).toHaveAccessibleName('暫停');
  await closeFocus(page);
  await openFocus(page);
  expect((await state(page)).clips).toHaveLength(1);
  await story(page).click();
  await dialog(page).evaluate((element) => element.dispatchEvent(new Event('close')));
  await action(page, 'reject', 0, 'NotAllowedError');
  await action(page, 'event', 0, 'playing');
  await expect(dialog(page)).toBeVisible();
  await expect(rows(page).nth(1)).toHaveAttribute('aria-current', 'true');
  await expect(story(page)).toHaveAccessibleName('暫停');
  const clips = (await state(page)).clips;
  expect(clips).toHaveLength(2);
  expect(clips[0]).toMatchObject({ paused: true, plays: 1 });
  expect(clips[1]).toMatchObject({ src: first.sentences[1].audio.src, paused: false, plays: 1, pauses: 0 });
  await action(page, 'event', 1, 'playing');
  await expect(page.locator('[data-follow-status]')).toContainText('正在朗讀第 2 句');
});

test('an unchanged reader cannot overwrite a newer sentence saved by another tab when leaving', async ({ page, context }) => {
  await mockAudio(page);
  await page.goto(route);
  const version = await page.locator('[data-reading-version]').getAttribute('data-reading-version');
  const newer = await context.newPage();
  await mockAudio(newer);
  try {
    for (const leaving of ['close', 'background', 'pagehide']) {
      await page.evaluate(({ key, version }) => localStorage.setItem(key, JSON.stringify({
        schema: 1, version, index: 0, completed: false,
      })), { key: progressKey(), version });
      await page.reload();
      await openFocus(page);
      await newer.goto(route);
      await openFocus(newer);
      await selectSentence(newer, 2);
      expect(await savedProgress(newer)).toMatchObject({ index: 2 });
      if (leaving === 'close') await closeFocus(page);
      else if (leaving === 'pagehide') await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      else await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(await savedProgress(page), leaving).toMatchObject({ index: 2, completed: false });
      expect((await state(page)).clips).toHaveLength(0);
    }
  } finally { await newer.close(); }
});

test('the reader remains complete with JavaScript disabled', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}${route}`);
    await expect(rows(page)).toHaveCount(first.sentences.length);
    await expect(rows(page).locator('p')).toHaveCount(first.sentences.length);
    await expect(story(page)).toBeDisabled();
    await expect(openButton(page)).toBeDisabled();
    const translation = page.locator('.translation');
    await translation.locator('summary').click();
    await expect(translation).toHaveAttribute('open', '');
    await expect(translation.locator('p')).toHaveCount(first.sentences.length);
    await expect(phrase(page, first.phrases[0])).toBeDisabled();
    await expect(word(page, first.words[0])).toBeDisabled();
  } finally { await context.close(); }
});

test('word and phrase progress only on playing, then end with distinct messages', async ({ page }) => {
  await mockAudio(page);
  await page.goto(route);
  const w = first.words[0];
  await word(page, w).focus();
  await page.keyboard.press('Enter');
  await expect(word(page, w)).toHaveText('準備中');
  await expect(status(page)).toHaveText(`正在準備 ${w.english} 的發音。`);
  await action(page, 'resolve', 0);
  await expect(word(page, w)).toHaveText('準備中');
  await action(page, 'event', 0, 'playing');
  await expect(word(page, w)).toHaveText('再聽一次');
  await expect(status(page)).toHaveText(`正在播放 ${w.english} 的發音。`);
  await action(page, 'event', 0, 'ended');
  await expect(status(page)).toHaveText(`已播放 ${w.english} 的發音。`);
  const p = first.phrases[0];
  await phrase(page, p).click();
  await expect(status(page)).toHaveText(`正在準備短句：${p.english}`);
  await action(page, 'event', 1, 'playing');
  await expect(phrase(page, p)).toHaveText('再聽一次');
  await expect(status(page)).toHaveText(`正在播放短句：${p.english}`);
  await action(page, 'event', 1, 'ended');
  await expect(status(page)).toHaveText(`已播放短句：${p.english}`);
  await expect(stop(page)).toBeDisabled();
});

test('guided primary advances only after listening and previous selection stays silent', async ({ page }) => {
  await mockAudio(page);
  await page.goto(route);
  await openFocus(page);
  await expect(previous(page)).toBeDisabled();
  await story(page).click();
  await finish(page);
  await expect(story(page)).toHaveAccessibleName('下一句');
  expect((await state(page)).clips.reduce((n, clip) => n + clip.plays, 0)).toBe(1);
  await repeat(page).click();
  expect((await state(page)).clips.at(-1)?.src).toBe(first.sentences[0].audio.src);
  await finish(page);
  await story(page).click();
  await expect(rows(page).nth(1)).toHaveAttribute('aria-current', 'true');
  expect((await state(page)).clips.at(-1)?.src).toBe(first.sentences[1].audio.src);
  await previous(page).click();
  await expect(rows(page).nth(0)).toHaveAttribute('aria-current', 'true');
  await expect(story(page)).toHaveAccessibleName('播放本句');
  expect((await state(page)).clips.at(-1)?.paused).toBe(true);
  const count = (await state(page)).clips.length;
  await selectSentence(page, first.sentences.length - 1);
  expect((await state(page)).clips).toHaveLength(count);
  await expect(rows(page).nth(first.sentences.length - 1)).toHaveAttribute('aria-current', 'true');
});

test('continuous reading advances once, applies live changes, and persists explicit preferences', async ({ page }) => {
  await mockAudio(page);
  await page.goto(route);
  expect(await page.evaluate(() => localStorage.getItem('carlenglish.reading.preferences'))).toBeNull();
  await openFocus(page);
  await settings(page);
  await mode(page).selectOption('continuous');
  await story(page).click();
  for (const value of ['0.7', '0.8', '0.9', '1']) {
    await rate(page).selectOption(value);
    expect((await state(page)).clips.at(-1)?.playbackRate).toBe(Number(value));
  }
  await finish(page);
  await expect(rows(page).nth(1)).toHaveAttribute('aria-current', 'true');
  expect((await state(page)).clips.at(-1)?.src).toBe(first.sentences[1].audio.src);
  await action(page, 'lateEnded', await latest(page));
  await expect(rows(page).nth(1)).toHaveAttribute('aria-current', 'true');
  await mode(page).selectOption('guided');
  await finish(page);
  await expect(rows(page).nth(1)).toHaveAttribute('aria-current', 'true');
  await expect(stop(page)).toBeDisabled();
  await rate(page).selectOption('0.7');
  const other = scenes.find((scene) => getLearningLevel(scene).id !== 'beginner') ?? scenes.find((scene) => scene.id !== first.id)!;
  await page.goto(`/scenes/${other.id}/`);
  await openFocus(page);
  await expect(rate(page)).toHaveValue('0.7');
  await expect(mode(page)).toHaveValue('guided');
  expect((await state(page)).clips).toHaveLength(0);
  await closeFocus(page);
  await word(page, other.words[0]).click();
  expect((await state(page)).clips.at(-1)?.playbackRate).toBe(0.7);
  await phrase(page, other.phrases[0]).click();
  expect((await state(page)).clips.at(-1)?.playbackRate).toBe(0.7);
});

test('pause preserves seconds and sample interruption retains the sentence for manual restart', async ({ page }) => {
  await mockAudio(page);
  await page.goto(route);
  await openFocus(page);
  await playSentence(page, 1);
  await action(page, 'event', 0, 'playing');
  await action(page, 'seek', 0, 4);
  await pause(page).click();
  expect((await state(page)).clips[0]).toMatchObject({ currentTime: 4, paused: true });
  await action(page, 'reject', 0, 'NotAllowedError');
  await action(page, 'event', 0, 'playing');
  await expect(resume(page)).toHaveAccessibleName('繼續播放');
  await resume(page).click();
  expect((await state(page)).clips[0]).toMatchObject({ plays: 2, currentTime: 4, paused: false });
  await action(page, 'event', 0, 'pause');
  await action(page, 'lateEnded', 0);
  await expect(rows(page).nth(1)).toHaveAttribute('aria-current', 'true');
  await action(page, 'event', 0, 'playing');
  await closeFocus(page);
  await word(page, first.words[0]).click();
  expect((await state(page)).clips[0]).toMatchObject({ paused: true });
  await finish(page);
  await expect(rows(page).nth(1)).toHaveAttribute('aria-current', 'true');
  await openFocus(page);
  await expect(story(page)).toHaveAccessibleName('播放本句');
  await expect(stop(page)).toBeDisabled();
  const playCount = (await state(page)).clips.reduce((n, clip) => n + clip.plays, 0);
  expect(playCount).toBe(3);
  await story(page).click();
  expect((await state(page)).clips.at(-1)).toMatchObject({ src: first.sentences[1].audio.src, currentTime: 0 });
  await settings(page);
  await restart(page).click();
  await expect(rows(page).nth(0)).toHaveAttribute('aria-current', 'true');
  await expect(story(page)).toHaveAccessibleName('播放本句');
  expect((await state(page)).clips.at(-1)?.paused).toBe(true);
});

test('stop and reload retain a sentence but require a click to restart at its beginning', async ({ page }) => {
  await mockAudio(page);
  await page.goto(route);
  if (!await dialog(page).isVisible()) await openFocus(page);
  await playSentence(page, 2);
  await action(page, 'seek', 0, 3);
  await closeFocus(page);
  await action(page, 'reject', 0, 'NotAllowedError');
  await action(page, 'event', 0, 'playing');
  await expect(stop(page)).toBeDisabled();
  expect(await savedProgress(page)).toMatchObject({ schema: 1, index: 2, completed: false });
  await page.reload();
  await expect(openButton(page)).toContainText('接續');
  await openFocus(page);
  await expect(page.locator('[data-follow-sentence]')).toHaveValue('2');
  expect((await state(page)).clips).toHaveLength(0);
  await story(page).click();
  expect((await state(page)).clips[0]).toMatchObject({ src: first.sentences[2].audio.src, currentTime: 0 });
  const other = scenes.find((scene) => scene.id !== first.id)!;
  await page.goto(`/scenes/${other.id}/`);
  await expect(openButton(page)).toBeEnabled();
  await page.goto(route);
  await expect(openButton(page)).toContainText('接續');
  await openFocus(page);
  await expect(page.locator('[data-follow-sentence]')).toHaveValue('2');
});

test('completion summary focuses its title and replay resets silently', async ({ page }) => {
  await mockAudio(page);
  await page.goto(route);
  await openFocus(page);
  await playSentence(page, first.sentences.length - 1);
  await finish(page);
  await expect(story(page)).toHaveAccessibleName('完成本輪');
  expect(await savedProgress(page)).toMatchObject({ completed: true });
  await story(page).click();
  await expect(completion(page)).toBeVisible();
  await expect(completion(page).getByRole('heading')).toBeFocused();
  await page.locator('[data-follow-replay]').click();
  await expect(story(page)).toHaveAccessibleName('播放本句');
  await expect(page.locator('[data-follow-sentence]')).toHaveValue('0');
  expect((await state(page)).clips).toHaveLength(1);
  await playSentence(page, first.sentences.length - 1);
  await finish(page);
  await page.reload();
  expect(await savedProgress(page)).toMatchObject({ completed: true });
  await expect(openButton(page)).toHaveText('再練一次');
  await openFocus(page);
  await expect(story(page)).toHaveAccessibleName('播放本句');
  await expect(page.locator('[data-follow-sentence]')).toHaveValue('0');
  expect((await state(page)).clips).toHaveLength(0);
  await story(page).click();
  expect((await state(page)).clips[0].src).toBe(first.sentences[0].audio.src);
  await expect(page).toHaveURL(new RegExp(`${route}$`));
});

for (const record of [
  { schema: 1, version: 'obsolete', index: 2, completed: false },
  { schema: 1, version: 'obsolete', index: 999, completed: false },
]) {
  test(`invalid progress ${record.index} resets safely and explains the reset`, async ({ page }) => {
    await mockAudio(page);
    await page.goto(route);
    const version = await page.locator('[data-reading-version]').getAttribute('data-reading-version');
    await page.evaluate(({ key, record, version }) => localStorage.setItem(key, JSON.stringify({
      ...record, version: record.index === 999 ? version : record.version,
    })), { key: progressKey(), record, version });
    await page.reload();
    await expect(openButton(page)).toBeEnabled();
    await openFocus(page);
    await expect(story(page)).toHaveAccessibleName('播放本句');
    await expect(page.locator('[data-reading-storage-status]').first()).toContainText(/從頭/);
    await story(page).click();
    expect((await state(page)).clips[0].src).toBe(first.sentences[0].audio.src);
  });
}

test('unavailable storage leaves playback usable and reports saving failure separately', async ({ page }) => {
  await mockAudio(page);
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Unavailable', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
  });
  await page.goto(route);
  await openFocus(page);
  await story(page).click();
  await action(page, 'event', 0, 'playing');
  await expect(page.locator('[data-reading-storage-status]').first()).toContainText(/無法.*保[存留]/);
  await expect(stop(page)).toBeEnabled();
  await expect(rows(page).nth(0)).toHaveAttribute('aria-current', 'true');
});

test('a failed sentence remains selected and retry never skips its content', async ({ page }) => {
  await mockAudio(page);
  await page.goto(route);
  await openFocus(page);
  await settings(page);
  await mode(page).selectOption('continuous');
  if (!await dialog(page).isVisible()) await openFocus(page);
  await playSentence(page, 2);
  await action(page, 'reject', 0, 'NotAllowedError');
  await expect(status(page)).toContainText('瀏覽器未允許播放');
  await expect(rows(page).nth(2)).toHaveAttribute('aria-current', 'true');
  await expect(stop(page)).toBeDisabled();
  expect(await savedProgress(page)).toMatchObject({ index: 2, completed: false });
  await story(page).click();
  expect((await state(page)).clips.at(-1)?.src).toBe(first.sentences[2].audio.src);
  await action(page, 'event', 0, 'ended');
  await expect(rows(page).nth(2)).toHaveAttribute('aria-current', 'true');
});

test('repeat and change invalidate prior audio events and promises', async ({ page }) => {
  await mockAudio(page);
  await page.goto(route);
  await word(page, first.words[0]).click();
  await action(page, 'seek', 0, 2);
  await word(page, first.words[0]).click();
  expect((await state(page)).clips[0]).toMatchObject({ pauses: 1, currentTime: 0 });
  await action(page, 'reject', 0, 'NotAllowedError');
  await action(page, 'event', 0, 'ended');
  await phrase(page, first.phrases[0]).click();
  await action(page, 'reject', 1, 'Error');
  await action(page, 'event', 1, 'error');
  await expect(status(page)).toHaveText(`正在準備短句：${first.phrases[0].english}`);
  await action(page, 'event', 2, 'playing');
  await expect(status(page)).toHaveText(`正在播放短句：${first.phrases[0].english}`);
});

test('unsupported Audio and failures leave reading usable', async ({ page }) => {
  await mockAudio(page, true);
  await page.goto(route);
  await expect(story(page)).toBeDisabled();
  await expect(phrase(page, first.phrases[0])).toBeDisabled();
  await expect(word(page, first.words[0])).toBeDisabled();
  await expect(status(page)).toHaveText('此瀏覽器不支援頁內音訊播放，閱讀內容仍可使用。');
  await expect(page.getByRole('region', { name: '英文短文' })).toBeVisible();
});
for (const failure of [
  { kind: 'throw', name: 'Error', message: '音檔暫時無法播放，請再試一次。' },
  { kind: 'reject', name: 'Error', message: '音檔暫時無法播放，請再試一次。' },
  { kind: 'reject', name: 'NotAllowedError', message: '瀏覽器未允許播放，請再點一次播放按鈕。' },
  { kind: 'event', name: 'error', message: '音檔暫時無法播放，請再試一次。' },
]) {
  test(`${failure.kind} ${failure.name} resets controls`, async ({ page }) => {
    await mockAudio(page);
    await page.goto(route);
    if (failure.kind === 'throw') await action(page, 'throwNext', failure.name);
    await word(page, first.words[0]).click();
    if (failure.kind === 'reject') await action(page, 'reject', 0, failure.name);
    if (failure.kind === 'event') await action(page, 'event', 0, failure.name);
    await expect(stop(page)).toBeDisabled();
    await expect(word(page, first.words[0])).toHaveText('聽發音');
    await expect(status(page)).toHaveText(failure.message);
  });
}

test('startup and stall watchdogs ignore intentional pauses and sustained progress', async ({ page }) => {
  await page.clock.install();
  await mockAudio(page);
  await page.goto(route);
  await word(page, first.words[0]).click();
  await page.clock.fastForward(8_100);
  await expect(status(page)).toHaveText('播放沒有開始，請再試一次。');
  await openFocus(page);
  await story(page).click();
  await action(page, 'event', 1, 'playing');
  for (let second = 1; second <= 4; second++) {
    await page.clock.fastForward(7_500);
    await action(page, 'seek', 1, second);
    await action(page, 'event', 1, 'timeupdate');
    await expect(status(page)).toHaveText(/正在朗讀/);
  }
  await pause(page).click();
  await page.clock.fastForward(30_000);
  await expect(status(page)).toHaveText(/已暫停/);
  await resume(page).click();
  await expect(status(page)).toContainText('準備');
  await action(page, 'event', 1, 'playing');
  await page.clock.fastForward(15_100);
  await expect(status(page)).toHaveText('播放暫時停住了，請再試一次。');
  await expect(stop(page)).toBeDisabled();
});

test('pagehide and hidden visibility stop all levels', async ({ page }) => {
  await mockAudio(page);
  await page.goto(route);
  if (!await dialog(page).isVisible()) await openFocus(page);
  await playSentence(page, 2);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  expect(await savedProgress(page)).toMatchObject({ index: 2, completed: false });
  await expect(status(page)).toContainText('已停止播放');
  await action(page, 'reject', 0, 'NotAllowedError');
  await expect(dialog(page)).not.toBeVisible();
  await phrase(page, first.phrases[0]).click();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(status(page)).toContainText('已停止播放');
  await expect(stop(page)).toBeDisabled();
  await action(page, 'event', 1, 'ended');
  await expect(status(page)).toContainText('已停止播放');
});

test('all referenced MP3s decode and native continuous reading advances between sentence assets', async ({ page }, testInfo) => {
  test.skip(!['desktop-chromium', 'mobile-webkit'].includes(testInfo.project.name), 'Chromium and WebKit verify shared audio assets.');
  testInfo.setTimeout(180_000);
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    const clips: HTMLAudioElement[] = [];
    Object.defineProperty(window, '__nativeAudioClips', { value: clips });
    Object.defineProperty(window, 'Audio', { configurable: true, value: function (src?: string) {
      const audio = new NativeAudio(src);
      clips.push(audio);
      return audio;
    } });
  });
  await page.goto(route);
  await word(page, first.words[0]).click();
  await expect(status(page)).toHaveText(`已播放 ${first.words[0].english} 的發音。`, { timeout: 15_000 });
  await openFocus(page);
  await settings(page);
  await mode(page).selectOption('continuous');
  await rate(page).selectOption('1');
  await playSentence(page, first.sentences.length - 2);
  await expect(rows(page).nth(first.sentences.length - 2)).toHaveAttribute('aria-current', 'true');
  await expect.poll(() => page.evaluate(() =>
    (window as typeof window & { __nativeAudioClips: HTMLAudioElement[] }).__nativeAudioClips.at(-1)?.currentTime ?? 0,
  )).toBeGreaterThan(0);
  await pause(page).click();
  await expect(resume(page)).toHaveAccessibleName('繼續播放');
  await resume(page).click();
  await expect(rows(page).nth(first.sentences.length - 1)).toHaveAttribute('aria-current', 'true', { timeout: 30_000 });
  await expect(story(page)).toHaveAccessibleName('完成本輪', { timeout: 30_000 });
  const clips = scenes.flatMap((scene) => [
    ...scene.sentences.map(({ audio }) => ({ audio })),
    ...scene.phrases, ...scene.words,
  ]);
  const sources = [...new Set(clips.map((entry) => entry.audio.src))];
  expect(sources.length).toBeGreaterThan(0);
  const outcomes = await page.evaluate(async (sources) => {
    const results: { src: string; ok: boolean; reason?: string }[] = [];
    const decoder = new AudioContext();
    const concurrency = 20;
    for (let i = 0; i < sources.length; i += concurrency) {
      const batch = sources.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(async (src) => {
        const response = await fetch(src);
        if (!response.ok || !response.headers.get('content-type')?.includes('audio/')) {
          return { src, ok: false, reason: `HTTP ${response.status} ${response.headers.get('content-type')}` };
        }
        try {
          const buffer = await response.arrayBuffer();
          const decoded = await decoder.decodeAudioData(buffer);
          return { src, ok: decoded.length > 0 && decoded.duration > 0, reason: `decoded duration ${decoded.duration}` };
        } catch (error) {
          return { src, ok: false, reason: String(error) };
        }
      }));
      results.push(...batchResults);
    }
    await decoder.close();
    return results;
  }, sources);
  expect(outcomes).toHaveLength(sources.length);
  expect(outcomes.filter((outcome) => !outcome.ok)).toEqual([]);
});
