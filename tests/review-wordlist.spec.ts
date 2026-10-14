import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

type Word = { english: string; translation: string; example: string; audio: { src: string } };
type Scene = { id: string; title: string; words: Word[] };
type ListEntry = { id: string; english: string; meaning: string; example: string; audio: { src: string } };
const scene = JSON.parse(readFileSync(join(process.cwd(), 'content/scenes/cafe-breakfast.json'), 'utf8')) as Scene;
const list = JSON.parse(readFileSync(join(process.cwd(), 'content/wordlists/ngsl-spoken/wordlist.json'), 'utf8')) as { name: string; entries: ListEntry[] };
const [be, the, you] = list.entries;
const [first] = scene.words;
const startTime = new Date(2026, 9, 14, 9, 0, 0);
const minutes = (count: number) => count * 60_000;
const day = 24 * 60 * minutes(1);

const listItem = (page: Page) => page.locator('[data-wordlist-id="ngsl-spoken"]');
const subscribeButton = (page: Page) => page.getByRole('button', { name: `訂閱 ${list.name}`, exact: true });
const unsubscribeButton = (page: Page) => page.getByRole('button', { name: `取消訂閱 ${list.name}`, exact: true });
const front = (page: Page) => page.locator('[data-review-front]');
const flip = (page: Page) => page.getByRole('button', { name: '翻面' }).click();
const limitInput = (page: Page) => page.getByLabel('每天新卡上限');

const stored = (page: Page) => page.evaluate(() => {
  const raw = localStorage.getItem('carlenglish.review');
  return raw === null ? null : (JSON.parse(raw) as { cards: { content: { english: string }; sources: { kind: string }[] }[]; subscriptions: { wordListId: string; issuedThrough: number; issuedCount: number }[] });
});

async function subscribe(page: Page) {
  await page.goto('/review/');
  await subscribeButton(page).click();
  await expect(unsubscribeButton(page)).toBeVisible();
}

test.describe('word list subscription', () => {
  test('lists the word list with its size, description, source and license, and loads nothing until subscribed', async ({ page }) => {
    const requested: string[] = [];
    page.on('request', (request) => { if (request.url().includes('/wordlists/')) requested.push(request.url()); });
    await page.goto('/review/');
    const item = listItem(page);
    await expect(item.getByRole('heading', { name: list.name })).toBeVisible();
    await expect(item).toContainText('共 100 字');
    await expect(item).toContainText('口語最常用');
    await expect(item.getByRole('link', { name: /NGSL-Spoken 1\.2/ })).toHaveAttribute('href', /newgeneralservicelist\.com/);
    await expect(item.getByRole('link', { name: 'CC BY-SA 4.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-sa/4.0/');
    await expect(item).toContainText('Browne, C. & Culligan, B.');
    await expect(subscribeButton(page)).toBeVisible();
    await expect(item.locator('[data-wordlist-progress]')).toBeHidden();
    await page.reload();
    await expect(subscribeButton(page)).toBeVisible();
    expect(requested).toEqual([]);
  });

  test('subscribing hands out the most frequent words as new cards and shows the progress', async ({ page }) => {
    const requested: string[] = [];
    page.on('request', (request) => { if (request.url().includes('/wordlists/')) requested.push(new URL(request.url()).pathname); });
    await page.clock.install({ time: startTime });
    await subscribe(page);
    await expect(page.getByText('今天到期 10 張，其中新卡 10 張')).toBeVisible();
    await expect(front(page)).toHaveText(be.english);
    await expect(listItem(page).locator('[data-wordlist-progress]')).toHaveText('已發出 10 張，剩餘 90 張');
    expect(requested).toEqual(['/wordlists/ngsl-spoken.json']);
    await expect(page.locator('[data-review-badge]')).toHaveText('10');

    await flip(page);
    await expect(page.getByText(be.meaning, { exact: true })).toBeVisible();
    await expect(page.getByText(be.example, { exact: true })).toBeVisible();
    const sources = page.locator('[data-review-sources]');
    await expect(sources).toContainText(`詞表：${list.name}`);
    await expect(sources).toContainText('Browne, C. & Culligan, B.');
    await expect(sources).toContainText('CC BY-SA 4.0');
    await expect(sources.getByRole('link')).toHaveCount(0);

    await page.getByRole('button', { name: '想起來了' }).click();
    await expect(front(page)).toHaveText(the.english);
    await page.reload();
    await expect(page.getByText('今天到期 10 張，其中新卡 9 張')).toBeVisible();
    await expect(listItem(page).locator('[data-wordlist-progress]')).toHaveText('已發出 10 張，剩餘 90 張');
    const state = await stored(page);
    expect(state?.cards.map((card) => card.content.english)).toEqual(list.entries.slice(0, 10).map((entry) => entry.english));
    expect(state?.subscriptions).toMatchObject([{ wordListId: 'ngsl-spoken', issuedThrough: 10, issuedCount: 10 }]);
  });

  test('plays the word audio from a word list card', async ({ page, request }) => {
    await page.addInitScript(() => {
      const played: string[] = [];
      (window as unknown as { __played: string[] }).__played = played;
      class FakeAudio extends EventTarget {
        src: string;
        constructor(src: string) { super(); this.src = src; }
        play() { played.push(this.src); return Promise.resolve(); }
        pause() {}
      }
      Object.defineProperty(window, 'Audio', { configurable: true, value: FakeAudio });
    });
    await subscribe(page);
    await expect(front(page)).toHaveText(be.english);
    await flip(page);
    await page.getByRole('button', { name: '播放單字發音' }).click();
    const played = await page.evaluate(() => (window as unknown as { __played: string[] }).__played);
    expect(played.map((src) => new URL(src, 'http://x').pathname)).toEqual([be.audio.src]);
    const response = await request.get(be.audio.src);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('audio');
  });

  test('manual cards come first and share the daily limit with the list', async ({ page }) => {
    await page.goto(`/scenes/${scene.id}/`);
    await page.getByRole('button', { name: `加入複習：${first.english}` }).click();
    await expect(page.getByRole('button', { name: `加入複習：${first.english}` })).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/review/');
    await limitInput(page).fill('3');
    await limitInput(page).blur();
    await subscribeButton(page).click();
    await expect(page.getByText('今天到期 3 張，其中新卡 3 張')).toBeVisible();
    await expect(front(page)).toHaveText(first.english);
    await expect(listItem(page).locator('[data-wordlist-progress]')).toHaveText('已發出 2 張，剩餘 98 張');
    expect((await stored(page))?.cards.map((card) => card.content.english)).toEqual([first.english, be.english, the.english]);
  });

  test('unsubscribing keeps the cards already handed out and stops handing out more', async ({ page }) => {
    await page.clock.install({ time: startTime });
    await subscribe(page);
    await expect(page.getByText('今天到期 10 張，其中新卡 10 張')).toBeVisible();
    await unsubscribeButton(page).click();
    await expect(subscribeButton(page)).toBeVisible();
    await expect(listItem(page).locator('[data-wordlist-progress]')).toBeHidden();
    await expect(page.getByText('今天到期 10 張，其中新卡 10 張')).toBeVisible();
    await page.reload();
    await expect(page.getByText('今天到期 10 張，其中新卡 10 張')).toBeVisible();
    expect((await stored(page))?.subscriptions).toEqual([]);
    await page.clock.setFixedTime(new Date(startTime.getTime() + day));
    await page.reload();
    expect((await stored(page))?.cards).toHaveLength(10);
  });

  test('the next day hands out the following words once today\'s are learned', async ({ page }) => {
    await page.clock.install({ time: startTime });
    await page.goto('/review/');
    await limitInput(page).fill('2');
    await limitInput(page).blur();
    await subscribeButton(page).click();
    await expect(page.getByText('今天到期 2 張，其中新卡 2 張')).toBeVisible();
    for (const round of [0, 1]) {
      for (const english of [be.english, the.english]) {
        await expect(front(page)).toHaveText(english);
        await flip(page);
        await page.getByRole('button', { name: '想起來了' }).click();
      }
      if (round === 0) await page.clock.fastForward(minutes(11));
    }
    await expect(page.getByText('今天的複習完成了')).toBeVisible();
    await page.reload();
    await expect(page.getByText('今天的複習完成了')).toBeVisible();
    expect((await stored(page))?.cards).toHaveLength(2);

    await page.clock.setFixedTime(new Date(startTime.getTime() + day));
    await page.reload();
    await expect(page.getByText(/其中新卡 2 張/)).toBeVisible();
    const state = await stored(page);
    expect(state?.cards.map((card) => card.content.english)).toEqual([be.english, the.english, you.english, list.entries[3].english]);
    expect(state?.subscriptions).toMatchObject([{ issuedThrough: 4, issuedCount: 4 }]);
  });

  test('explains the problem when the word list cannot be loaded, and recovers on the next visit', async ({ page }) => {
    await page.route('**/wordlists/ngsl-spoken.json', (route) => route.abort());
    await page.goto('/review/');
    await subscribeButton(page).click();
    await expect(page.getByRole('alert')).toContainText(`無法載入詞表「${list.name}」`);
    await expect(page.getByRole('alert')).toContainText('重新整理');
    await expect(unsubscribeButton(page)).toBeVisible();
    expect(await stored(page)).toMatchObject({ cards: [], subscriptions: [{ wordListId: 'ngsl-spoken', issuedThrough: 0 }] });
    await page.unroute('**/wordlists/ngsl-spoken.json');
    await page.reload();
    await expect(front(page)).toHaveText(be.english);
    await expect(page.getByRole('alert')).toBeHidden();
  });

  test('rejects a word list response with an unexpected shape instead of handing out broken cards', async ({ page }) => {
    await page.route('**/wordlists/ngsl-spoken.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'ngsl-spoken', entries: [] }) }));
    await page.goto('/review/');
    await subscribeButton(page).click();
    await expect(page.getByRole('alert')).toContainText('無法載入詞表');
    expect((await stored(page))?.cards).toEqual([]);
  });

  test('subscriptions and handed-out cards travel with the backup file', async ({ page }, testInfo) => {
    await subscribe(page);
    await expect(front(page)).toHaveText(be.english);
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: '匯出備份', exact: true }).click();
    const file = testInfo.outputPath('backup.json');
    await (await downloading).saveAs(file);
    const backup = JSON.parse(readFileSync(file, 'utf8'));
    expect(backup.state.subscriptions).toMatchObject([{ wordListId: 'ngsl-spoken', issuedThrough: 10, issuedCount: 10 }]);
    expect(backup.state.cards).toHaveLength(10);

    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(subscribeButton(page)).toBeVisible();
    await page.getByLabel('匯入備份').setInputFiles(file);
    await page.getByRole('button', { name: '取代' }).click();
    await expect(unsubscribeButton(page)).toBeVisible();
    await expect(listItem(page).locator('[data-wordlist-progress]')).toHaveText('已發出 10 張，剩餘 90 張');
    await expect(front(page)).toHaveText(be.english);
  });

  test('stays inside the viewport with comfortable touch targets', async ({ page }) => {
    await page.goto('/review/');
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(await overflow()).toBeLessThanOrEqual(0);
    expect((await subscribeButton(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await subscribeButton(page).click();
    await expect(unsubscribeButton(page)).toBeVisible();
    expect((await unsubscribeButton(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await overflow()).toBeLessThanOrEqual(0);
    await flip(page);
    expect(await overflow()).toBeLessThanOrEqual(0);
  });
});
