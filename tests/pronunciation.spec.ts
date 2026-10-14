import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

type Clip = { src: string; voiceId: string; textSha256: string; sha256: string };
type Item = { id: string; english: string; audio: Clip };
type Scene = { id: string; audio: Clip; phrases: Item[]; words: Item[]; voiceProfile?: { label: string } };
const scenes = ['cafe-breakfast', 'street-directions', 'supermarket-shopping'].map((id) =>
  JSON.parse(readFileSync(join(process.cwd(), `content/scenes/${id}.json`), 'utf8')) as Scene,
);
const profile = JSON.parse(readFileSync(join(process.cwd(), 'content/audio/voice-profile.json'), 'utf8')) as {
  id: string; label: string; provider: string; voice: string; libraryVersion: string;
  sourceUrl: string; modelLicenseName: string; modelLicenseUrl: string;
};
const first = scenes[0];
const route = `/scenes/${first.id}/`;
type ClipState = { src: string; preload: string; currentTime: number; paused: boolean; plays: number; syncPlays: number; pauses: number };
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
      src: string;
      preload = '';
      currentTime = 0;
      paused = true;
      ended = false;
      plays = 0;
      syncPlays = 0;
      pauses = 0;
      pending: { resolve: () => void; reject: (error: Error) => void }[] = [];
      constructor(src: string) { super(); this.src = src; clips.push(this); }
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
      state: () => ({ clips: clips.map(({ src, preload, currentTime, paused, plays, syncPlays, pauses }) =>
        ({ src, preload, currentTime, paused, plays, syncPlays, pauses })) }),
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
const story = (page: Page) => page.getByRole('button', { name: '朗讀整篇英文短文' });
const phrase = (page: Page, item: Item) => page.getByRole('button', { name: `聽短句 ${item.english} 的發音` });
const word = (page: Page, item: Item) => page.getByRole('button', { name: `聽 ${item.english} 的發音` });
const pause = (page: Page) => page.getByRole('button', { name: '暫停朗讀' });
const resume = (page: Page) => page.getByRole('button', { name: '繼續朗讀' });
const restart = (page: Page) => page.getByRole('button', { name: '從頭朗讀' });
const stop = (page: Page) => page.getByRole('button', { name: '停止播放' });
const status = (page: Page) => page.getByRole('status');
const entries = (scene: Scene) => [
  { kind: 'story', label: '整篇短文', audio: scene.audio },
  ...scene.phrases.map((item) => ({ kind: 'phrase', label: item.english, audio: item.audio })),
  ...scene.words.map((item) => ({ kind: 'word', label: item.english, audio: item.audio })),
];

for (const scene of scenes) {
  test(`${scene.id} exposes every clip, one voice profile, keyboard controls, and fitting layout`, async ({ page, context }) => {
    await mockAudio(page);
    await page.goto(`/scenes/${scene.id}/`);
    await expect(status(page)).toHaveText('點選播放按鈕，即可聽固定美式女聲。');
    await expect(stop(page)).toBeDisabled();
    await expect(pause(page)).toBeDisabled();
    await expect(restart(page)).toBeDisabled();
    await expect(page.locator('.pronunciation-voice')).toContainText(profile.label);
    await expect(page.locator('.pronunciation-voice')).toContainText('AI 合成語音');
    const expected = entries(scene);
    expect(expected).toHaveLength(14);
    const buttons = page.locator('[data-pronounce]');
    await expect(buttons).toHaveCount(14);
    for (const [index, item] of expected.entries()) {
      const button = buttons.nth(index);
      await expect(button).toBeEnabled();
      await expect(button).toHaveAttribute('data-audio-kind', item.kind);
      await expect(button).toHaveAttribute('data-label', item.label);
      await expect(button).toHaveAttribute('data-audio-src', item.audio.src);
      expect(item.audio.voiceId).toBe(profile.id);
      expect(item.audio.src).toMatch(new RegExp(`^/audio/${item.kind === 'story' ? 'stories' : `${item.kind}s`}/.+\\.mp3$`));
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await expect(story(page)).toHaveText('朗讀整篇');
    for (const item of scene.phrases) await expect(phrase(page, item)).toHaveText('聽短句');
    for (const item of scene.words) await expect(word(page, item)).toHaveText('聽發音');
    const credits = page.locator('.pronunciation-attribution');
    await expect(credits).not.toHaveAttribute('open');
    await credits.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(credits).toHaveAttribute('open', '');
    await expect(credits).toContainText('音源與製作方式');
    for (const value of [profile.provider, profile.voice, profile.libraryVersion, profile.modelLicenseName]) {
      await expect(credits).toContainText(value);
    }
    await expect(credits.getByRole('link', { name: '模型來源' })).toHaveAttribute('href', profile.sourceUrl);
    await expect(credits.getByRole('link', { name: profile.modelLicenseName })).toHaveAttribute('href', profile.modelLicenseUrl);
    await expect(credits).not.toContainText('音檔授權');
    expect((await state(page)).clips).toHaveLength(0);
    const fit = await page.evaluate(() => ({ width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      buttons: [...document.querySelectorAll<HTMLButtonElement>('[data-pronounce], [data-story-pause], [data-story-restart], [data-pronounce-stop]')]
        .map((button) => ({ left: button.getBoundingClientRect().left, right: button.getBoundingClientRect().right })),
    }));
    expect(fit.scrollWidth).toBeLessThanOrEqual(fit.width + 1);
    for (const button of fit.buttons) {
      expect(button.left).toBeGreaterThanOrEqual(-1);
      expect(button.right).toBeLessThanOrEqual(fit.width + 1);
    }
    for (let index = 0; index < expected.length; index++) await buttons.nth(index).click();
    await expect(page).toHaveURL(new RegExp(`/scenes/${scene.id}/$`));
    expect(context.pages()).toHaveLength(1);
    expect((await state(page)).clips.map(({ src, preload, plays, syncPlays, pauses, currentTime }) =>
      ({ src, preload, plays, syncPlays, pauses, currentTime }))).toEqual(expected.map((item, index) => ({
      src: item.audio.src, preload: 'none', plays: 1, syncPlays: 1,
      pauses: index === expected.length - 1 ? 0 : 1, currentTime: 0,
    })));
  });
}

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

test('story supports pause, resume from position, restart, and switch to a phrase', async ({ page }) => {
  await mockAudio(page);
  await page.goto(route);
  await story(page).click();
  await expect(status(page)).toHaveText('正在準備整篇朗讀。');
  await expect(story(page)).toHaveText('準備中');
  await expect(pause(page)).toBeEnabled();
  await expect(restart(page)).toBeEnabled();
  await action(page, 'event', 0, 'playing');
  await expect(status(page)).toHaveText('正在朗讀整篇短文。');
  await expect(story(page)).toHaveText('重新朗讀');
  await action(page, 'seek', 0, 4);
  await pause(page).click();
  await expect(status(page)).toHaveText('已暫停整篇朗讀。');
  await expect(resume(page)).toBeEnabled();
  await expect(story(page)).toHaveText('重新朗讀');
  expect((await state(page)).clips[0]).toMatchObject({ currentTime: 4, paused: true });
  await action(page, 'reject', 0, 'NotAllowedError');
  await action(page, 'event', 0, 'playing');
  await expect(status(page)).toHaveText('已暫停整篇朗讀。');
  await resume(page).click();
  await expect(status(page)).toHaveText('正在準備繼續朗讀。');
  expect((await state(page)).clips[0]).toMatchObject({ plays: 2, currentTime: 4, paused: false });
  await action(page, 'event', 0, 'playing');
  await expect(status(page)).toHaveText('正在朗讀整篇短文。');
  await restart(page).click();
  expect((await state(page)).clips[0]).toMatchObject({ pauses: 2, currentTime: 0 });
  expect((await state(page)).clips[1]).toMatchObject({ src: first.audio.src, plays: 1, currentTime: 0 });
  await phrase(page, first.phrases[0]).click();
  expect((await state(page)).clips[1]).toMatchObject({ pauses: 1, currentTime: 0 });
  await expect(pause(page)).toBeDisabled();
  await expect(restart(page)).toBeDisabled();
  await expect(status(page)).toHaveText(`正在準備短句：${first.phrases[0].english}`);
});

test('story ending clears controls and Stop ignores stale playback callbacks', async ({ page }) => {
  await mockAudio(page);
  await page.goto(route);
  await story(page).click();
  await action(page, 'event', 0, 'playing');
  await action(page, 'event', 0, 'ended');
  await expect(status(page)).toHaveText('已完成整篇朗讀。');
  await expect(pause(page)).toBeDisabled();
  await expect(restart(page)).toBeDisabled();
  await story(page).click();
  await stop(page).focus();
  await page.keyboard.press('Enter');
  await expect(status(page)).toHaveText('已停止播放。');
  await expect(stop(page)).toBeDisabled();
  await action(page, 'reject', 1, 'NotAllowedError');
  await action(page, 'event', 1, 'playing');
  await expect(status(page)).toHaveText('已停止播放。');
});

test('queued pause and stale end after resume cannot complete the story', async ({ page }) => {
  await mockAudio(page);
  await page.goto(route);
  await story(page).click();
  await action(page, 'event', 0, 'playing');
  await action(page, 'seek', 0, 3);
  await pause(page).click();
  await resume(page).click();
  await expect(status(page)).toHaveText('正在準備繼續朗讀。');
  expect((await state(page)).clips[0]).toMatchObject({ paused: false, currentTime: 3 });
  await action(page, 'event', 0, 'pause');
  await action(page, 'lateEnded', 0);
  await expect(status(page)).toHaveText('正在準備繼續朗讀。');
  await expect(stop(page)).toBeEnabled();
  await action(page, 'event', 0, 'playing');
  await expect(status(page)).toHaveText('正在朗讀整篇短文。');
  await action(page, 'lateEnded', 0);
  await expect(status(page)).toHaveText('正在朗讀整篇短文。');
  await action(page, 'event', 0, 'ended');
  await expect(status(page)).toHaveText('已完成整篇朗讀。');
  await expect(stop(page)).toBeDisabled();
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
  await story(page).click();
  await action(page, 'event', 1, 'playing');
  for (let second = 1; second <= 4; second++) {
    await page.clock.fastForward(7_500);
    await action(page, 'seek', 1, second);
    await action(page, 'event', 1, 'timeupdate');
    await expect(status(page)).toHaveText('正在朗讀整篇短文。');
  }
  await pause(page).click();
  await page.clock.fastForward(30_000);
  await expect(status(page)).toHaveText('已暫停整篇朗讀。');
  await resume(page).click();
  await expect(status(page)).toHaveText('正在準備繼續朗讀。');
  await action(page, 'event', 1, 'playing');
  await page.clock.fastForward(15_100);
  await expect(status(page)).toHaveText('播放暫時停住了，請再試一次。');
  await expect(stop(page)).toBeDisabled();
});

test('pagehide and hidden visibility stop all levels', async ({ page }) => {
  await mockAudio(page);
  await page.goto(route);
  await story(page).click();
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect(status(page)).toHaveText('已停止播放。');
  await action(page, 'reject', 0, 'NotAllowedError');
  await phrase(page, first.phrases[0]).click();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(status(page)).toHaveText('已停止播放。');
  await expect(stop(page)).toBeDisabled();
  await action(page, 'event', 1, 'ended');
  await expect(status(page)).toHaveText('已停止播放。');
});

test('all 42 MP3s decode and real word plus long story playback works', async ({ page }, testInfo) => {
  test.skip(!['desktop-chromium', 'mobile-webkit'].includes(testInfo.project.name), 'Chromium and WebKit verify shared audio assets.');
  testInfo.setTimeout(90_000);
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
  await story(page).click();
  await expect(status(page)).toHaveText('正在朗讀整篇短文。', { timeout: 10_000 });
  await expect.poll(() => page.evaluate(() =>
    (window as typeof window & { __nativeAudioClips: HTMLAudioElement[] }).__nativeAudioClips.at(-1)?.currentTime ?? 0,
  )).toBeGreaterThan(0);
  await pause(page).click();
  await expect(status(page)).toHaveText('已暫停整篇朗讀。');
  await resume(page).click();
  await expect(status(page)).toHaveText('已完成整篇朗讀。', { timeout: 60_000 });
  const sources = scenes.flatMap((scene) => entries(scene).map((entry) => entry.audio.src));
  expect(sources).toHaveLength(42);
  const outcomes = await page.evaluate(async (sources) => Promise.all(sources.map(async (src) => {
    const response = await fetch(src);
    if (!response.ok || !response.headers.get('content-type')?.includes('audio/')) {
      return { src, ok: false, reason: `HTTP ${response.status} ${response.headers.get('content-type')}` };
    }
    const audio = new Audio(src);
    audio.preload = 'metadata';
    return new Promise<{ src: string; ok: boolean; reason?: string }>((resolve) => {
      const timeout = window.setTimeout(() => resolve({ src, ok: false, reason: 'metadata timeout' }), 10_000);
      audio.addEventListener('loadedmetadata', () => {
        window.clearTimeout(timeout);
        resolve({ src, ok: Number.isFinite(audio.duration) && audio.duration > 0, reason: `duration ${audio.duration}` });
      }, { once: true });
      audio.addEventListener('error', () => {
        window.clearTimeout(timeout);
        resolve({ src, ok: false, reason: `media error ${audio.error?.code}` });
      }, { once: true });
      audio.load();
    });
  })), sources);
  expect(outcomes.filter((outcome) => !outcome.ok)).toEqual([]);
});
