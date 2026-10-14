import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

type Word = { english: string; translation: string; example: string; audio: { src: string } };
type Scene = { id: string; title: string; words: Word[] };
const scene = JSON.parse(readFileSync(join(process.cwd(), 'content/scenes/cafe-breakfast.json'), 'utf8')) as Scene;
const [first, second] = scene.words;
const scenePath = `/scenes/${scene.id}/`;
const startTime = new Date(2026, 9, 14, 9, 0, 0);
const minutes = (count: number) => count * 60_000;
const day = 24 * 60 * minutes(1);

const addButton = (page: Page, word: Word) => page.getByRole('button', { name: `加入複習：${word.english}` });

async function addFromScene(page: Page, ...words: Word[]) {
  await page.goto(scenePath);
  for (const word of words) {
    await addButton(page, word).click();
    await expect(addButton(page, word)).toHaveAttribute('aria-pressed', 'true');
  }
}

const storedCards = (page: Page) => page.evaluate(() => {
  const raw = localStorage.getItem('carlenglish.review');
  return raw === null ? null : (JSON.parse(raw) as { cards: unknown[] }).cards;
});

async function flip(page: Page) {
  await page.getByRole('button', { name: '翻面' }).click();
}

test.describe('add to review from a scene', () => {
  test('toggles between added and not added, and keeps the state after reloading', async ({ page }) => {
    await page.goto(scenePath);
    const button = addButton(page, first);
    await expect(button).toBeVisible();
    await expect(button).toHaveText('加入複習');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await button.click();
    await expect(button).toHaveText('已加入');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(addButton(page, first)).toHaveText('已加入');
    await expect(addButton(page, second)).toHaveText('加入複習');
    await addButton(page, first).click();
    await expect(addButton(page, first)).toHaveText('加入複習');
    await expect(addButton(page, first)).toHaveAttribute('aria-pressed', 'false');
    await page.reload();
    await expect(addButton(page, first)).toHaveText('加入複習');
    await page.goto('/review/');
    await expect(page.getByText('還沒有字卡')).toBeVisible();
  });

  test('shows no add buttons without JavaScript while the word list stays readable', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL: test.info().project.use.baseURL });
    try {
      const page = await context.newPage();
      await page.goto(scenePath);
      await expect(page.getByRole('heading', { name: first.english, level: 3 })).toBeVisible();
      await expect(page.getByRole('button', { name: /加入複習/ })).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('tells the learner when the browser cannot save', async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
    });
    await page.goto(scenePath);
    await addButton(page, first).click();
    await expect(page.getByRole('status').filter({ hasText: '無法' })).toBeVisible();
    await expect(addButton(page, first)).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('review page', () => {
  test('runs the loop: counts, flip, grade, and the card is due again later', async ({ page }) => {
    await page.clock.install({ time: startTime });
    await addFromScene(page, first);
    await page.goto('/review/');
    await expect(page.getByRole('heading', { name: '複習', level: 1 })).toBeVisible();
    await expect(page.getByText('今天到期 1 張，其中新卡 1 張')).toBeVisible();

    // 正面只有英文詞，答案要翻面後才看得到。
    await expect(page.locator('[data-review-front]')).toHaveText(first.english);
    await expect(page.getByText(first.translation, { exact: true })).toBeHidden();
    await expect(page.getByRole('button', { name: '想起來了' })).toBeHidden();
    await flip(page);
    await expect(page.getByText(first.translation, { exact: true })).toBeVisible();
    await expect(page.getByText(first.example)).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(scene.title) })).toHaveAttribute('href', scenePath);
    await expect(page.getByRole('button', { name: '播放單字發音' })).toBeVisible();

    // 評分後出現下次到期訊息，且字卡離開佇列。
    await page.getByRole('button', { name: '想起來了' }).click();
    await expect(page.locator('[data-review-result]')).toContainText('下次：');
    await expect(page.getByText('現在沒有到期的字卡')).toBeVisible();
    await expect(page.getByText('稍後還有 1 張')).toBeVisible();

    // 學習步驟過後，同一張卡自動回到佇列；再答對一次就排到之後的日子。
    await page.clock.fastForward(minutes(11));
    await expect(page.locator('[data-review-front]')).toHaveText(first.english);
    await expect(page.getByText('今天到期 1 張，其中新卡 0 張')).toBeVisible();
    await flip(page);
    await page.getByRole('button', { name: '想起來了' }).click();
    await expect(page.locator('[data-review-result]')).toContainText(/下次：\d+ 天後/);
    await expect(page.getByText('今天的複習完成了')).toBeVisible();

    // 往後快轉一個月，重新開啟複習頁，字卡再次到期。
    await page.clock.setFixedTime(new Date(startTime.getTime() + 30 * day));
    await page.goto('/review/');
    await expect(page.locator('[data-review-front]')).toHaveText(first.english);
  });

  test('a card marked "forgot" returns within minutes', async ({ page }) => {
    await page.clock.install({ time: startTime });
    await addFromScene(page, first);
    await page.goto('/review/');
    await flip(page);
    await page.getByRole('button', { name: '忘記了' }).click();
    await expect(page.getByText('稍後還有 1 張')).toBeVisible();
    await page.clock.fastForward(minutes(2));
    await expect(page.locator('[data-review-front]')).toHaveText(first.english);
  });

  test('graded cards stay out of the queue after leaving and coming back', async ({ page }) => {
    await page.clock.install({ time: startTime });
    await addFromScene(page, first, second);
    await page.goto('/review/');
    await expect(page.getByText('今天到期 2 張，其中新卡 2 張')).toBeVisible();
    const answered = await page.locator('[data-review-front]').innerText();
    await flip(page);
    await page.getByRole('button', { name: '想起來了' }).click();
    await page.goto(scenePath);
    await page.goto('/review/');
    await expect(page.getByText('今天到期 2 張，其中新卡 1 張')).toBeVisible();
    await expect(page.locator('[data-review-front]')).not.toHaveText(answered);
  });

  test('keyboard: space flips, 1 and 2 grade, and the shortcuts are visible', async ({ page }) => {
    await page.clock.install({ time: startTime });
    await addFromScene(page, first, second);
    await page.goto('/review/');
    await expect(page.getByText('空白鍵').first()).toBeVisible();
    await page.keyboard.press('Space');
    await expect(page.getByText(first.translation, { exact: true }).or(page.getByText(second.translation, { exact: true }))).toBeVisible();
    await page.keyboard.press('2');
    await expect(page.getByText('今天到期 2 張，其中新卡 1 張')).toBeVisible();
    await page.keyboard.press('Enter');
    await page.keyboard.press('1');
    await expect(page.getByText('稍後還有 2 張')).toBeVisible();
  });

  test('grading keeps cards added from another tab in the meantime', async ({ page, context }) => {
    await addFromScene(page, first);
    await page.goto('/review/');
    await expect(page.getByText('今天到期 1 張，其中新卡 1 張')).toBeVisible();
    const other = await context.newPage();
    await addFromScene(other, second);
    await other.close();
    await flip(page);
    await page.getByRole('button', { name: '想起來了' }).click();
    // 另一個分頁加入的字卡沒有被這頁的舊資料蓋掉，並已出現在佇列。
    await expect(page.locator('[data-review-front]')).toHaveText(second.english);
    await page.goto(scenePath);
    await expect(addButton(page, second)).toHaveText('已加入');
  });

  test('exports a backup file named by local date and reports how many cards it holds', async ({ page }, testInfo) => {
    await page.clock.install({ time: startTime });
    await addFromScene(page, first, second);
    await page.goto('/review/');
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: '匯出備份' }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe('carlenglish-review-2026-10-14.json');
    const file = testInfo.outputPath('backup.json');
    await download.saveAs(file);
    const backup = JSON.parse(readFileSync(file, 'utf8'));
    expect(backup.format).toBe('carlenglish-review-backup');
    expect(backup.state.cards).toHaveLength(2);
    await expect(page.getByText('已匯出 2 張字卡')).toBeVisible();
  });

  test('restores cards and due dates by importing an exported backup into emptied storage', async ({ page }, testInfo) => {
    await page.clock.install({ time: startTime });
    await addFromScene(page, first, second);
    await page.goto('/review/');
    await flip(page);
    await page.getByRole('button', { name: '想起來了' }).click();
    const cardsBefore = await storedCards(page);
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: '匯出備份' }).click();
    const file = testInfo.outputPath('backup.json');
    await (await downloading).saveAs(file);

    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByText('還沒有字卡')).toBeVisible();
    await expect(page.getByRole('button', { name: '匯出備份' })).toBeDisabled();

    await page.getByLabel('匯入備份').setInputFiles(file);
    await expect(page.getByText('檔案內有 2 張字卡，將取代目前的 0 張')).toBeVisible();
    expect(await storedCards(page)).toBeNull();
    await page.getByRole('button', { name: '取代' }).click();
    await expect(page.getByText('已匯入 2 張字卡')).toBeVisible();
    await expect(page.getByText('今天到期 2 張，其中新卡 1 張')).toBeVisible();
    await expect(page.getByText('稍後還有 1 張')).toBeHidden();
    expect(await storedCards(page)).toEqual(cardsBefore);
  });

  test('rejects broken backup files and leaves the existing data untouched', async ({ page }, testInfo) => {
    await addFromScene(page, first);
    await page.goto('/review/');
    const before = await page.evaluate(() => localStorage.getItem('carlenglish.review'));
    const cases: [string, string, string][] = [
      ['not-json.json', '{oops', '不是有效的備份檔'],
      ['wrong-format.json', JSON.stringify({ hello: 'world' }), '不是 CarlEnglish 的複習備份檔'],
      ['future.json', JSON.stringify({ format: 'carlenglish-review-backup', version: 9, state: {} }), '版本不支援'],
      ['missing-fields.json', JSON.stringify({ format: 'carlenglish-review-backup', version: 1, state: { version: 1, cards: [{}] } }), '內容損壞'],
    ];
    for (const [name, content, message] of cases) {
      const path = testInfo.outputPath(name);
      writeFileSync(path, content);
      await page.getByLabel('匯入備份').setInputFiles(path);
      await expect(page.getByRole('status').filter({ hasText: message })).toBeVisible();
      await expect(page.getByRole('button', { name: '取代' })).toBeHidden();
      expect(await page.evaluate(() => localStorage.getItem('carlenglish.review'))).toBe(before);
    }
  });

  test('refuses an oversized backup file without reading it', async ({ page }) => {
    await addFromScene(page, first);
    await page.goto('/review/');
    const before = await page.evaluate(() => localStorage.getItem('carlenglish.review'));
    await page.getByLabel('匯入備份').setInputFiles({ name: 'huge.json', mimeType: 'application/json', buffer: Buffer.alloc(1_048_577, 32) });
    await expect(page.getByRole('status').filter({ hasText: '檔案太大' })).toBeVisible();
    await expect(page.getByRole('button', { name: '取代' })).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem('carlenglish.review'))).toBe(before);
  });

  test('cancelling an import changes nothing', async ({ page }, testInfo) => {
    await addFromScene(page, first);
    await page.goto('/review/');
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: '匯出備份' }).click();
    const file = testInfo.outputPath('backup.json');
    await (await downloading).saveAs(file);
    await addFromScene(page, second);
    await page.goto('/review/');
    const before = await page.evaluate(() => localStorage.getItem('carlenglish.review'));
    await page.getByLabel('匯入備份').setInputFiles(file);
    await expect(page.getByText('檔案內有 1 張字卡，將取代目前的 2 張')).toBeVisible();
    await page.getByRole('button', { name: '取消' }).click();
    await expect(page.getByRole('button', { name: '取代' })).toBeHidden();
    await expect(page.getByText('已取消匯入')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('carlenglish.review'))).toBe(before);
    await expect(page.getByLabel('匯入備份')).toHaveValue('');
  });

  test('plays the word audio from the card back', async ({ page }) => {
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
    await addFromScene(page, first);
    await page.goto('/review/');
    await flip(page);
    await page.getByRole('button', { name: '播放單字發音' }).click();
    const played = await page.evaluate(() => (window as unknown as { __played: string[] }).__played);
    expect(played.map((src) => new URL(src, 'http://x').pathname)).toEqual([first.audio.src]);
  });

  test('explains the problem instead of failing silently when stored data is corrupt', async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('carlenglish.review', '{not json'); });
    await page.goto('/review/');
    await expect(page.getByRole('alert')).toContainText('無法讀取');
  });

  test('is not indexed and stays inside the viewport with comfortable touch targets', async ({ page }) => {
    await page.clock.install({ time: startTime });
    await addFromScene(page, first);
    await page.goto('/review/');
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(await overflow()).toBeLessThanOrEqual(0);
    await flip(page);
    expect(await overflow()).toBeLessThanOrEqual(0);
    for (const name of ['忘記了', '想起來了', '播放單字發音']) {
      const box = await page.getByRole('button', { name }).boundingBox();
      expect(box!.height, name).toBeGreaterThanOrEqual(44);
    }
  });
});
