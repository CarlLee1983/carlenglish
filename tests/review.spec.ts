import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { reduce } from '../src/lib/review-deck';
import { emptyState } from '../src/lib/review-state';

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

type StorageCalls = { persisted: number; persist: number };
const storageCalls = (page: Page) => page.evaluate(() => (window as unknown as { __storageCalls: StorageCalls }).__storageCalls);

/** 讓 navigator.storage 回報指定的 persisted 狀態，並記錄 persisted()／persist() 的呼叫次數。 */
async function stubPersistentStorage(page: Page, persisted: boolean, persistRejects: boolean) {
  await page.addInitScript(({ persisted, persistRejects }) => {
    const calls = { persisted: 0, persist: 0 };
    (window as unknown as { __storageCalls: typeof calls }).__storageCalls = calls;
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        persisted: () => { calls.persisted++; return Promise.resolve(persisted); },
        persist: () => { calls.persist++; return persistRejects ? Promise.reject(new Error('denied')) : Promise.resolve(true); },
      },
    });
  }, { persisted, persistRejects });
}

const standaloneStub = (page: Page) => page.addInitScript(() => {
  Object.defineProperty(navigator, 'standalone', { configurable: true, value: true });
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

test.describe('navigation entry', () => {
  const entry = (page: Page) => page.locator('.site-header').getByRole('link', { name: /^複習/ });
  const badge = (page: Page) => page.locator('.site-header [data-review-badge]');

  test('shows only the word when there are no cards, and links to the review page', async ({ page }) => {
    await page.goto('/');
    await expect(entry(page)).toHaveAttribute('href', '/review/');
    await expect(entry(page)).toHaveAccessibleName('複習');
    await expect(badge(page)).toBeHidden();
  });

  test('shows only the entry without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL: test.info().project.use.baseURL });
    try {
      const page = await context.newPage();
      await page.goto('/');
      await expect(entry(page)).toBeVisible();
      await expect(badge(page)).toBeHidden();
    } finally {
      await context.close();
    }
  });

  test('updates at once on the same page when a card is added or removed, and persists across pages', async ({ page }) => {
    await page.goto(scenePath);
    await addButton(page, first).click();
    await expect(badge(page)).toHaveText('1');
    await expect(entry(page)).toHaveAccessibleName('複習，今天 1 張待複習');
    await addButton(page, second).click();
    await expect(badge(page)).toHaveText('2');
    await addButton(page, second).click();
    await expect(badge(page)).toHaveText('1');
    await page.goto('/');
    await expect(badge(page)).toHaveText('1');
    await expect(entry(page)).toHaveAccessibleName('複習，今天 1 張待複習');
  });

  test('marks the current page on the review page only', async ({ page }) => {
    await page.goto('/review/');
    await expect(entry(page)).toHaveAttribute('aria-current', 'page');
    await page.goto('/');
    await expect(entry(page)).not.toHaveAttribute('aria-current', /.*/);
  });

  test('counts down to nothing once the cards are scheduled beyond today', async ({ page }) => {
    await page.clock.install({ time: startTime });
    await addFromScene(page, first);
    await expect(badge(page)).toHaveText('1');
    await page.goto('/review/');
    await expect(badge(page)).toHaveText('1');
    await flip(page);
    await page.getByRole('button', { name: '想起來了' }).click();
    // 第一次答對只進入學習步驟（約 10 分鐘後），仍算今天。
    await expect(badge(page)).toHaveText('1');
    await page.clock.fastForward(minutes(11));
    await flip(page);
    await page.getByRole('button', { name: '想起來了' }).click();
    await expect(page.getByText('今天的複習完成了')).toBeVisible();
    await expect(badge(page)).toBeHidden();
    await expect(entry(page)).toHaveAccessibleName('複習');
  });

  for (const width of [320, 390]) {
    test(`does not add a header row at ${width}px for 2, 12 or 120 cards (capped at 99+)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      const headerHeight = async () => (await page.locator('.site-header').boundingBox())!.height;
      const without = await headerHeight();
      for (const [count, shown] of [[2, '2'], [12, '12'], [120, '99+']] as const) {
        let state = emptyState();
        const now = new Date();
        for (let index = 0; index < count; index++) {
          state = reduce(state, { type: 'ADD_CARD', card: { english: `word${index}`, meaning: `意思${index}`, example: null, audioSrc: null }, source: { kind: 'scene', id: scene.id, title: scene.title, href: scenePath }, now });
        }
        // 新卡受每日上限限制；這裡要測的是徽章寬度，所以把卡片標成已學過的到期舊卡。
        state = { ...state, cards: state.cards.map((card) => ({ ...card, firstReviewedAt: now.toISOString() })) };
        await page.evaluate((raw) => localStorage.setItem('carlenglish.review', raw), JSON.stringify(state));
        await page.reload();
        await expect(badge(page)).toHaveText(shown);
        await expect(entry(page)).toHaveAccessibleName(`複習，今天 ${count} 張待複習`);
        expect(await headerHeight(), `${count} cards`).toBe(without);
        const links = page.locator('.header-links a');
        const boxes = await links.evaluateAll((elements) => elements.map((element) => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return { x, y, width, height };
        }));
        // Narrow navigation has one stable row, including the largest visible badge.
        expect(Math.max(...boxes.map((box) => box.y)) - Math.min(...boxes.map((box) => box.y))).toBeLessThanOrEqual(1);
        for (const box of boxes) {
          expect(box.height).toBeGreaterThanOrEqual(44);
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(width);
        }
        for (let index = 1; index < boxes.length; index++) {
          expect(boxes[index].x).toBeGreaterThanOrEqual(boxes[index - 1].x + boxes[index - 1].width);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
      }
    });
  }

  test('stays inside the viewport with a comfortable touch target', async ({ page }) => {
    await addFromScene(page, first, second);
    for (const path of ['/', scenePath, '/review/']) {
      await page.goto(path);
      await expect(badge(page)).toHaveText('2');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
      const box = await entry(page).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('cards from article keywords', () => {
  const article = JSON.parse(readFileSync(join(process.cwd(), 'content/articles/riverside-library-late-hours.json'), 'utf8')) as {
    id: string; title: string; glossary: { english: string; translation: string }[];
  };
  const articlePath = `/articles/${article.id}/`;
  const keyword = article.glossary.find((item) => item.english === 'residents')!;
  // 例句的期望值取自文章內容的字面值：第一個含有 residents 的句子。
  const keywordSentence = "Some residents worry that the building's parking lot is not safe at night.";
  const keywordButton = (page: Page) => page.getByRole('button', { name: `加入複習：${keyword.english}` });

  test('toggles, keeps its state after reloading, and can be cancelled', async ({ page }) => {
    await page.goto(articlePath);
    await expect(keywordButton(page)).toHaveText('加入複習');
    await keywordButton(page).click();
    await expect(keywordButton(page)).toHaveText('已加入');
    await expect(keywordButton(page)).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(keywordButton(page)).toHaveText('已加入');
    await keywordButton(page).click();
    await expect(keywordButton(page)).toHaveText('加入複習');
    await expect(keywordButton(page)).toHaveAttribute('aria-pressed', 'false');
    await page.reload();
    await expect(keywordButton(page)).toHaveText('加入複習');
  });

  test('shows no add buttons without JavaScript while the keyword list stays readable', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL: test.info().project.use.baseURL });
    try {
      const page = await context.newPage();
      await page.goto(articlePath);
      await expect(page.getByRole('region', { name: '關鍵詞' }).getByText(keyword.english, { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: /加入複習/ })).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('the review card shows the article sentence and a link back, with no audio', async ({ page }) => {
    await page.goto(articlePath);
    await keywordButton(page).click();
    await expect(keywordButton(page)).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/review/');
    await expect(page.locator('[data-review-front]')).toHaveText(keyword.english);
    await flip(page);
    await expect(page.getByText(keyword.translation, { exact: true })).toBeVisible();
    await expect(page.locator('[data-review-example]')).toHaveText(keywordSentence);
    await expect(page.getByRole('link', { name: new RegExp(article.title) })).toHaveAttribute('href', articlePath);
    await expect(page.getByRole('button', { name: '播放單字發音' })).toBeHidden();
    await page.getByRole('button', { name: '想起來了' }).click();
    await expect(page.locator('[data-review-result]')).toContainText('下次：');
  });

  test('a card added from both a scene and an article shows both source links', async ({ page }) => {
    const content = { english: keyword.english, meaning: keyword.translation, example: keywordSentence, audioSrc: null };
    const now = new Date();
    let state = reduce(emptyState(), { type: 'ADD_CARD', card: content, source: { kind: 'scene', id: scene.id, title: scene.title, href: scenePath }, now });
    state = reduce(state, { type: 'ADD_CARD', card: content, source: { kind: 'article', id: article.id, title: article.title, href: articlePath }, now });
    expect(state.cards).toHaveLength(1);
    await page.addInitScript((raw) => {
      if (localStorage.getItem('carlenglish.review') === null) localStorage.setItem('carlenglish.review', raw);
    }, JSON.stringify(state));
    await page.goto('/review/');
    await flip(page);
    const links = page.locator('.review-sources a');
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveAttribute('href', scenePath);
    await expect(links.nth(1)).toHaveAttribute('href', articlePath);
    await expect(links.nth(0)).toContainText(scene.title);
    await expect(links.nth(1)).toContainText(article.title);
  });

  test('cards from a scene and from an article each link back to their own source', async ({ page }) => {
    await addFromScene(page, first);
    await page.goto(articlePath);
    await keywordButton(page).click();
    await expect(keywordButton(page)).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/review/');
    await expect(page.getByText('今天到期 2 張，其中新卡 2 張')).toBeVisible();
    const hrefs: string[] = [];
    for (let count = 0; count < 2; count++) {
      await flip(page);
      hrefs.push((await page.locator('.review-sources a').getAttribute('href'))!);
      await page.getByRole('button', { name: '想起來了' }).click();
    }
    expect(hrefs.sort()).toEqual([articlePath, scenePath].sort());
  });
});

test.describe('protecting progress', () => {
  const reminder = (page: Page) => page.getByRole('region', { name: '備份提醒' });

  test('the backup reminder appears, disappears after exporting, and returns after eight days', async ({ page }) => {
    await page.clock.install({ time: startTime });
    await page.goto('/review/');
    await expect(reminder(page)).toBeHidden();
    await addFromScene(page, first);
    await page.goto('/review/');
    await expect(reminder(page)).toContainText('還沒有備份過');

    const downloading = page.waitForEvent('download');
    await reminder(page).getByRole('button', { name: '立即匯出' }).click();
    await downloading;
    await expect(reminder(page)).toBeHidden();
    await page.reload();
    await expect(reminder(page)).toBeHidden();

    await page.clock.setFixedTime(new Date(startTime.getTime() + 8 * day));
    await page.reload();
    await expect(reminder(page)).toContainText('已超過 7 天沒有備份');
  });

  test('importing a backup recomputes the reminder from the imported export time', async ({ page }, testInfo) => {
    await page.clock.install({ time: startTime });
    await addFromScene(page, first);
    await page.goto('/review/');
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: '匯出備份', exact: true }).click();
    const file = testInfo.outputPath('backup.json');
    await (await downloading).saveAs(file);

    const backup = JSON.parse(readFileSync(file, 'utf8'));
    const staleFile = testInfo.outputPath('stale-backup.json');
    backup.state.lastExportedAt = new Date(startTime.getTime() - 8 * day).toISOString();
    writeFileSync(staleFile, JSON.stringify(backup));
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(reminder(page)).toBeHidden();
    await page.getByLabel('匯入備份').setInputFiles(staleFile);
    await page.getByRole('button', { name: '取代' }).click();
    await expect(page.getByText('已匯入 1 張字卡')).toBeVisible();
    await expect(reminder(page)).toContainText('已超過 7 天沒有備份');
  });

  test('asks the browser for persistent storage, and a refusal does not block reviewing', async ({ page }) => {
    await stubPersistentStorage(page, false, true);
    await addFromScene(page, first);
    await page.goto('/review/');
    await expect.poll(async () => (await storageCalls(page)).persist).toBe(1);
    await expect(page.locator('[data-review-front]')).toHaveText(first.english);
    await flip(page);
    await page.getByRole('button', { name: '想起來了' }).click();
    await expect(page.locator('[data-review-result]')).toContainText('下次：');
  });

  test('does not ask again when storage is already persistent', async ({ page }) => {
    await stubPersistentStorage(page, true, false);
    await page.goto('/review/');
    await expect.poll(async () => (await storageCalls(page)).persisted).toBeGreaterThan(0);
    expect((await storageCalls(page)).persist).toBe(0);
  });

  test('hides the home-screen hint outside iOS', async ({ page }) => {
    test.skip(test.info().project.name === 'mobile-webkit', 'covered by the iOS-like project below');
    await page.goto('/review/');
    await expect(page.getByRole('heading', { name: '複習', level: 1 })).toBeVisible();
    await expect(page.getByRole('region', { name: '加到主畫面' })).toBeHidden();
  });

  test('explains the move to the home screen on iOS, offers an export, and dismissal sticks', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile-webkit', 'only meaningful on the iOS-like project');
    await page.goto('/review/');
    const hint = page.getByRole('region', { name: '加到主畫面' });
    await expect(hint).toBeVisible();
    await expect(hint).toContainText('加入主畫面');
    await expect(hint).toContainText('匯入備份');
    await expect(hint.getByRole('button', { name: '先匯出備份' })).toBeHidden();

    await addFromScene(page, first);
    await page.goto('/review/');
    const downloading = page.waitForEvent('download');
    await hint.getByRole('button', { name: '先匯出備份' }).click();
    await downloading;
    await expect(page.getByText('已匯出 1 張字卡')).toBeVisible();

    await hint.getByRole('button', { name: '關閉說明' }).click();
    await expect(hint).toBeHidden();
    await page.reload();
    await expect(page.getByRole('heading', { name: '複習', level: 1 })).toBeVisible();
    await expect(hint).toBeHidden();
  });

  test('hides the home-screen hint when opened as a home-screen app', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile-webkit', 'only meaningful on the iOS-like project');
    await standaloneStub(page);
    await page.goto('/review/');
    await expect(page.getByRole('heading', { name: '複習', level: 1 })).toBeVisible();
    await expect(page.getByRole('region', { name: '加到主畫面' })).toBeHidden();
  });

  test('an empty home-screen app invites importing a backup from the browser and focuses the import control', async ({ page }) => {
    await standaloneStub(page);
    await page.goto('/review/');
    await expect(page.getByText('從瀏覽器搬過來？在這裡匯入備份')).toBeVisible();
    await expect(page.getByLabel('匯入備份')).toBeFocused();
  });

  test('a regular browser tab with no cards shows no move-over invitation', async ({ page }) => {
    await page.goto('/review/');
    await expect(page.getByText('還沒有字卡')).toBeVisible();
    await expect(page.getByText('從瀏覽器搬過來？在這裡匯入備份')).toBeHidden();
  });

  test('serves a minimal web app manifest linked from the page', async ({ page, request }) => {
    await page.goto('/review/');
    await expect(page.locator('head link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
    const response = await request.get('/manifest.webmanifest');
    expect(response.ok()).toBe(true);
    const manifest = await response.json();
    expect(manifest).toMatchObject({ name: 'CarlEnglish', lang: 'zh-Hant', start_url: '/review/', scope: '/', display: 'standalone' });
    expect(manifest.icons.map((icon: { src: string }) => icon.src)).toContain('/apple-touch-icon.png');
    expect((await request.get('/apple-touch-icon.png')).ok()).toBe(true);
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

  test('a failed save keeps the graded card out of the queue and the warning on screen', async ({ page }) => {
    // 固定時鐘在白天：評分後的學習步驟（約 10 分鐘）要落在「今天稍後」；用真實時間會在午夜前十分鐘內失敗。
    await page.clock.install({ time: startTime });
    const content = { english: first.english, meaning: first.translation, example: first.example, audioSrc: first.audio.src };
    const state = reduce(emptyState(), { type: 'ADD_CARD', card: content, source: { kind: 'scene', id: scene.id, title: scene.title, href: scenePath }, now: startTime });
    await page.addInitScript((raw) => {
      if (localStorage.getItem('carlenglish.review') === null) localStorage.setItem('carlenglish.review', raw);
      Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
    }, JSON.stringify(state));
    await page.goto('/review/');
    await expect(page.locator('[data-review-front]')).toHaveText(first.english);
    await flip(page);
    await page.getByRole('button', { name: '想起來了' }).click();
    await expect(page.getByText('離開本頁後會遺失')).toBeVisible();
    await expect(page.getByText('現在沒有到期的字卡')).toBeVisible();
    await expect(page.locator('[data-review-front]')).toBeHidden();
    await page.clock.fastForward(minutes(11));
    await expect(page.getByText('今天到期 1 張，其中新卡 0 張')).toBeVisible();
    await expect(page.getByText('離開本頁後會遺失')).toBeVisible();
    await page.clock.fastForward(16 * 60 * minutes(1));
    await expect(page.getByText('今天到期 1 張，其中新卡 0 張')).toBeVisible();
    await expect(page.getByText('離開本頁後會遺失')).toBeVisible();
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

  test.describe('local-day rollover', () => {
    test.use({ timezoneId: 'Asia/Taipei' });
  test('local midnight releases capped manual cards and refreshes the badge without subscriptions', async ({ page }) => {
    const evening = new Date('2026-10-14T23:40:00+08:00');
    await page.clock.install({ time: evening });
    await addFromScene(page, first, second);
    await page.goto('/review/');
    await page.getByLabel('每天新卡上限').fill('1');
    await page.getByLabel('每天新卡上限').blur();
    for (const round of [0, 1]) {
      await flip(page);
      await page.getByRole('button', { name: '想起來了' }).click();
      if (round === 0) await page.clock.fastForward(minutes(11));
    }
    await expect(page.getByText('今天的複習完成了')).toBeVisible();
    await expect(page.locator('[data-review-badge]')).toBeHidden();
    await page.clock.fastForward(minutes(10));
    await expect(page.locator('[data-review-front]')).toHaveText(second.english);
    await expect(page.getByText('今天到期 1 張，其中新卡 1 張')).toBeVisible();
    await expect(page.locator('[data-review-badge]')).toHaveText('1');
  });

  });

  test('typing grade digits in controls or editable text does not change the card schedule', async ({ page }) => {
    await page.clock.install({ time: startTime });
    await addFromScene(page, first);
    await page.goto('/review/');
    await flip(page);
    const before = await storedCards(page);
    const limit = page.getByLabel('每天新卡上限');
    await limit.fill('');
    await limit.pressSequentially('12');
    await expect(limit).toHaveValue('12');
    expect(await storedCards(page)).toEqual(before);
    await page.getByRole('button', { name: '播放單字發音' }).focus();
    await page.keyboard.press('1');
    await page.keyboard.press('2');
    expect(await storedCards(page)).toEqual(before);
    await page.evaluate(() => {
      const editor = document.createElement('div');
      editor.contentEditable = 'true';
      editor.id = 'test-editor';
      editor.innerHTML = '<span>editable</span>';
      document.body.append(editor);
      editor.focus();
    });
    await page.keyboard.type('12');
    expect(await storedCards(page)).toEqual(before);
    await expect(page.locator('[data-review-back]')).toBeVisible();
    // The same shortcut still grades when focus returns to the review card.
    await page.locator('[data-review-back]').focus();
    await page.keyboard.press('2');
    expect(await storedCards(page)).not.toEqual(before);
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
    await page.getByRole('button', { name: '匯出備份', exact: true }).click();
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
    await page.getByRole('button', { name: '匯出備份', exact: true }).click();
    const file = testInfo.outputPath('backup.json');
    await (await downloading).saveAs(file);

    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByText('還沒有字卡')).toBeVisible();
    await expect(page.getByRole('button', { name: '匯出備份', exact: true })).toBeDisabled();

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
    await page.getByRole('button', { name: '匯出備份', exact: true }).click();
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
    for (const name of ['忘記了', '想起來了', '播放單字發音', '立即匯出', '匯出備份']) {
      const box = await page.getByRole('button', { name, exact: true }).boundingBox();
      expect(box!.height, name).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('day boundary', () => {
  const cardState = (now: Date) => reduce(emptyState(), {
    type: 'ADD_CARD',
    card: { english: first.english, meaning: first.translation, example: first.example, audioSrc: first.audio.src },
    source: { kind: 'scene', id: scene.id, title: scene.title, href: scenePath },
    now,
  });

  // 「今天稍後才到期」以本地日界計算：忘記或剛學的卡約 10 分鐘後再出現，若那已經是明天，就算今天複習完成。
  for (const [label, time, finished] of [
    ['at noon the card comes back later today', new Date(2026, 9, 14, 12, 0, 0), false],
    ['five minutes before midnight the card is due tomorrow, so today is finished', new Date(2026, 9, 14, 23, 55, 0), true],
    ['ten minutes before midnight the card is still due today', new Date(2026, 9, 14, 23, 49, 0), false],
  ] as const) {
    test(label, async ({ page }) => {
      await page.clock.install({ time });
      await page.addInitScript((raw) => { if (localStorage.getItem('carlenglish.review') === null) localStorage.setItem('carlenglish.review', raw); }, JSON.stringify(cardState(time)));
      await page.goto('/review/');
      await flip(page);
      await page.getByRole('button', { name: '想起來了' }).click();
      await expect(page.getByText(finished ? '今天的複習完成了' : '現在沒有到期的字卡')).toBeVisible();
      await expect(page.getByText(finished ? '現在沒有到期的字卡' : '今天的複習完成了')).toBeHidden();
      if (finished) await expect(page.getByText('明天預計有 1 張到期')).toBeVisible();
    });
  }
});

test.describe('daily new-card limit', () => {
  const limitInput = (page: Page) => page.getByLabel('每天新卡上限');
  const front = (page: Page) => page.locator('[data-review-front]');

  test('defaults to 10 and rejects values outside 1 to 50', async ({ page }) => {
    await page.clock.install({ time: startTime });
    await addFromScene(page, first);
    await page.goto('/review/');
    await expect(limitInput(page)).toHaveValue('10');
    await limitInput(page).fill('51');
    await limitInput(page).blur();
    await expect(limitInput(page)).toHaveValue('10');
    await limitInput(page).fill('25');
    await limitInput(page).blur();
    await page.reload();
    await expect(limitInput(page)).toHaveValue('25');
  });

  test('cards beyond the limit wait until the next day, without more being handed out on reload', async ({ page }) => {
    await page.clock.install({ time: startTime });
    await addFromScene(page, first, second);
    await page.goto('/review/');
    await expect(page.getByText('今天到期 2 張，其中新卡 2 張')).toBeVisible();
    await limitInput(page).fill('1');
    await limitInput(page).blur();
    await expect(page.getByText('今天到期 1 張，其中新卡 1 張')).toBeVisible();
    await expect(page.locator('[data-review-badge]')).toHaveText('1');
    await expect(front(page)).toHaveText(first.english);

    await flip(page);
    await page.getByRole('button', { name: '想起來了' }).click();
    await page.clock.fastForward(minutes(11));
    await flip(page);
    await page.getByRole('button', { name: '想起來了' }).click();
    await expect(page.getByText('今天的複習完成了')).toBeVisible();
    await page.reload();
    await expect(page.getByText('今天的複習完成了')).toBeVisible();
    await expect(page.getByText('明天預計有 1 張到期')).toBeVisible();

    await page.clock.setFixedTime(new Date(startTime.getTime() + day));
    await page.reload();
    await expect(front(page)).toHaveText(second.english);
    await expect(page.getByText('今天到期 1 張，其中新卡 1 張')).toBeVisible();
  });

  test('the limit is kept in the backup file', async ({ page }) => {
    await page.clock.install({ time: startTime });
    await addFromScene(page, first);
    await page.goto('/review/');
    await limitInput(page).fill('7');
    await limitInput(page).blur();
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: '匯出備份', exact: true }).click();
    const file = JSON.parse(readFileSync(await (await downloading).path(), 'utf8'));
    expect(file.state.dailyNewLimit).toBe(7);
  });
});
