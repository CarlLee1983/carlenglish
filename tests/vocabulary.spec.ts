import { expect, test } from '@playwright/test';
import { loadVocabularyCatalog } from '../src/lib/vocabulary';

const groups = loadVocabularyCatalog();

test('all levels expose content-grounded vocabulary, source links, and metadata @content', async ({ page }) => {
  for (const { level, entries } of groups) {
    await page.goto(`/vocabulary/${level.id}/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${level.name}單字庫`);
    await expect(page.locator('[data-vocabulary-row]')).toHaveCount(entries.length);
    expect(await page.locator('[data-vocabulary-row]').evaluateAll((rows) => rows.map((row) => ({
      english: (row as HTMLElement).dataset.english,
      meaning: (row as HTMLElement).dataset.meaning,
      example: (row as HTMLElement).dataset.example,
      audioSrc: (row as HTMLElement).dataset.audioSrc,
      href: row.querySelector('a')?.getAttribute('href'),
    })))).toEqual(entries.map(({ english, meaning, example, audioSrc, source }) => ({ english, meaning, example, audioSrc, href: source.href })));
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://carlenglish.gravito.dev/vocabulary/${level.id}/`);
    await expect(page.getByRole('navigation', { name: '詞彙程度' }).locator('[aria-current="page"]')).toHaveText(`${level.name}詞彙`);
    for (const list of groups.find((group) => group.level.id === level.id)!.sources) {
      await expect(page.locator(`#source-${list.id}`)).toContainText(list.source.authors);
      await expect(page.locator(`#source-${list.id}`)).toContainText(list.license.name);
    }
  }
});

test('vocabulary is discoverable from home and each level, and supports level switching', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: '分級單字庫・列印與手機字卡' }).click();
  await expect(page).toHaveURL(/\/vocabulary\/beginner\/$/);
  await page.getByRole('link', { name: '中級詞彙', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('中級單字庫');
  for (const { level } of groups) {
    await page.goto(`/levels/${level.id}/`);
    await page.getByRole('link', { name: `${level.name}單字庫・列印與字卡` }).click();
    await expect(page).toHaveURL(new RegExp(`/vocabulary/${level.id}/$`));
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('search filters the list and practice deck, survives reload, and recovers from no matches', async ({ page }) => {
  await page.goto('/vocabulary/beginner/');
  const query = '蘋果';
  const expected = groups[0].entries.filter((entry) => `${entry.english} ${entry.meaning} ${entry.example}`.includes(query));
  const search = page.getByRole('searchbox');
  await search.fill(query);
  await expect(page.locator('[data-vocabulary-row]:visible')).toHaveCount(expected.length);
  await page.reload();
  await expect(search).toHaveValue(query);
  await page.getByRole('button', { name: '用字卡練習', exact: true }).click();
  await expect(page.locator('[data-vocabulary-position]')).toHaveText(`1 / ${expected.length}`);
  await expect(page.locator('[data-vocabulary-word]')).toHaveText(expected[0].english);
  await page.goBack();
  await expect(search).toBeVisible();
  await expect(search).toHaveValue(query);
  await search.fill('zzzzzz-no-match');
  await expect(page.locator('[data-vocabulary-empty]')).toBeVisible();
  await expect(page.getByRole('button', { name: '用字卡練習', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '列印詞彙表' })).toBeDisabled();
  await page.getByRole('button', { name: '清除', exact: true }).click();
  await expect(page.locator('[data-vocabulary-row]:visible')).toHaveCount(groups[0].entries.length);
});

test('cards reveal answers, reset on navigation, preserve keyboard control and stop audio', async ({ page }) => {
  await page.goto('/vocabulary/advanced/?view=cards');
  const entries = groups[2].entries;
  const flip = page.locator('[data-vocabulary-flip]');
  await expect(flip).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[data-vocabulary-answer]')).toBeHidden();
  await expect(page.locator('[data-vocabulary-previous]')).toBeDisabled();
  await expect(page.locator('[data-vocabulary-audio]')).toHaveAttribute('src', entries[0].audioSrc);
  await expect(flip).toHaveAccessibleName(new RegExp(entries[0].english));
  await flip.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-vocabulary-meaning]')).toHaveText(entries[0].meaning);
  await expect(page.locator('[data-vocabulary-answer]')).toBeVisible();
  await expect(flip).toHaveAccessibleDescription(`${entries[0].meaning} ${entries[0].example}`);
  const audio = page.locator('[data-vocabulary-audio]');
  expect(await audio.evaluate(async (element: HTMLAudioElement) => { await element.play(); return element.paused; })).toBe(false);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-vocabulary-word]')).toHaveText(entries[1].english);
  await expect(page.locator('[data-vocabulary-answer]')).toBeHidden();
  await expect(page.locator('[data-vocabulary-audio]')).toHaveAttribute('src', entries[1].audioSrc);
  expect(await audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
  await page.locator('[data-vocabulary-previous]').click();
  await expect(flip).toBeFocused();
  await expect(page.locator('[data-vocabulary-position]')).toHaveText(`1 / ${entries.length}`);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('searchbox')).toBeVisible();
  expect(await page.locator('[data-vocabulary-audio]').evaluate((audio: HTMLAudioElement) => audio.paused)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('native scroll reconciles cards without revealing answers and excludes inactive slides from focus', async ({ page }) => {
  await page.goto('/vocabulary/beginner/?view=cards');
  const track = page.locator('[data-vocabulary-track]');
  await expect(track).toHaveCSS('scroll-snap-type', 'x mandatory');
  await track.evaluate((element) => { element.scrollLeft = element.clientWidth; });
  await expect(page.locator('[data-vocabulary-position]')).toHaveText(`2 / ${groups[0].entries.length}`);
  const card = page.locator('[data-vocabulary-flip]');
  await expect(card).toHaveAttribute('aria-expanded', 'false');
  await card.click();
  await expect(card).toHaveAttribute('aria-expanded', 'true');
  await track.evaluate((element) => { element.scrollLeft = 0; });
  await expect(page.locator('[data-vocabulary-position]')).toHaveText(`1 / ${groups[0].entries.length}`);
  await expect(card).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[data-card-slide]:not([inert])')).toHaveCount(1);
  await card.focus();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.closest('[data-card-slide]')?.getAttribute('aria-hidden') === 'true')).toBe(false);
    expect(await page.evaluate(() => !document.hasFocus() || !!document.activeElement?.closest('[data-vocabulary-practice]'))).toBe(true);
  }
});

test('native touch tracks before release, snaps, and permits a reverse gesture @content', async ({ browser, browserName, baseURL }) => {
  test.skip(browserName !== 'chromium', 'Trusted touch injection requires the Chromium protocol; cross-engine reconciliation is covered separately.');
  const context = await browser.newContext({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto(`${baseURL}/vocabulary/advanced/?view=cards`);
  const track = page.locator('[data-vocabulary-track]');
  const box = (await track.boundingBox())!;
  const y = box.y + box.height * .45;
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 320, y }] });
  for (const x of [300, 280, 250, 220]) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
  const moving = await track.evaluate((element) => element.scrollLeft);
  expect(moving).toBeGreaterThan(20);
  expect(moving).toBeLessThan(390);
  for (const x of [180, 140, 100, 60]) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeCloseTo(390, 0);
  await expect(page.locator('[data-vocabulary-position]')).toHaveText('2 / 50');
  await expect(page.locator('[data-vocabulary-flip]')).toHaveAttribute('aria-expanded', 'false');
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 70, y }] });
  for (const x of [100, 140, 180, 220, 260, 300, 330]) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeCloseTo(0, 0);
  await expect(page.locator('[data-vocabulary-position]')).toHaveText('1 / 50');
  await page.touchscreen.tap(180, y);
  await expect(page.locator('[data-vocabulary-flip]')).toHaveAttribute('aria-expanded', 'true');
  await context.close();
});

test('viewing attribution and returning preserves the current card and answer', async ({ page }) => {
  await page.goto('/vocabulary/advanced/');
  await page.getByRole('button', { name: /練習字卡：/ }).nth(3).click();
  const flip = page.locator('[data-vocabulary-flip]');
  await flip.click();
  const source = page.locator('[data-vocabulary-source]');
  await expect(source).toHaveAttribute('href', /^#source-/);
  await source.click();
  await expect(page).toHaveURL(/\?view=cards#source-/);
  await expect(page.locator('[data-vocabulary]')).toHaveAttribute('data-view', 'cards');
  await expect(page.locator('[data-vocabulary-position]')).toHaveText(`4 / ${groups[2].entries.length}`);
  await expect(flip).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.vocabulary-attribution')).toBeInViewport();
  await page.goBack();
  await expect(page).toHaveURL(/\?view=cards$/);
  await expect(page.locator('[data-vocabulary-position]')).toHaveText(`4 / ${groups[2].entries.length}`);
  await expect(flip).toHaveAttribute('aria-expanded', 'true');
});

test('last cards can restart and single result decks handle both ends', async ({ page }) => {
  await page.goto('/vocabulary/advanced/');
  const count = groups[2].entries.length;
  await page.getByRole('button', { name: /練習字卡：/ }).nth(count - 2).click();
  await page.locator('[data-vocabulary-next]').click();
  await expect(page.locator('[data-vocabulary-position]')).toHaveText(`${count} / ${count}`);
  await expect(page.locator('[data-vocabulary-next]')).toBeDisabled();
  await expect(page.locator('[data-vocabulary-flip]')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('[data-vocabulary-position]')).toHaveText(`${count - 1} / ${count}`);
  await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: '從第一張再練一次' }).click();
  await expect(page.locator('[data-vocabulary-position]')).toHaveText(`1 / ${count}`);
  await expect(page.locator('[data-vocabulary-previous]')).toBeDisabled();
  await page.getByRole('button', { name: '返回詞彙表' }).click();
  await page.getByRole('searchbox').fill(groups[2].entries[0].example);
  await page.getByRole('button', { name: '用字卡練習', exact: true }).click();
  await expect(page.locator('[data-vocabulary-position]')).toHaveText('1 / 1');
  await expect(page.locator('[data-vocabulary-previous]')).toBeDisabled();
  await expect(page.locator('[data-vocabulary-next]')).toBeDisabled();
  await page.locator('[data-vocabulary-flip]').click();
  await page.getByRole('button', { name: '從第一張再練一次' }).click();
  await expect(page.locator('[data-vocabulary-answer]')).toBeHidden();
});

test('printing includes only matching rows even from card mode, in a plain readable layout', async ({ page }) => {
  await page.goto('/vocabulary/beginner/?q=coffee');
  const matches = await page.locator('[data-vocabulary-row]:visible').count();
  expect(matches).toBeGreaterThan(0);
  await page.evaluate(() => { window.print = () => { document.body.dataset.printRequested = 'true'; }; });
  await page.getByRole('button', { name: '列印詞彙表' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-print-requested', 'true');
  await page.getByRole('button', { name: '用字卡練習', exact: true }).click();
  await page.locator('[data-vocabulary-flip]').click();
  await page.locator('[data-vocabulary-source]').click();
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('[data-vocabulary-practice]')).toBeHidden();
  await expect(page.locator('.site-header')).toBeHidden();
  await expect(page.locator('.site-footer')).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('[data-vocabulary-row]:visible')).toHaveCount(matches);
  await expect(page.locator('[data-vocabulary-row-start]:visible')).toHaveCount(0);
  await expect(page.locator('.vocabulary-table')).toHaveCSS('font-size', /13\.33/);
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(0, 0, 0)');
  await expect(page.locator('.vocabulary-attribution')).toBeVisible();
  await expect(page.locator('.vocabulary-attribution')).toContainText('CC BY-SA 4.0');
  await expect(page.locator('.vocabulary-source-url').first()).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(page.locator('[data-vocabulary-info-panel]')).toBeVisible();
  await page.getByRole('button', { name: '返回字卡', exact: true }).click();
  await expect(page.locator('[data-vocabulary-info-panel]')).toBeHidden();
  await expect(page.locator('[data-vocabulary-flip]')).toHaveAttribute('aria-expanded', 'true');
});

test('without JavaScript the full vocabulary and sources remain readable and printable @content', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/vocabulary/intermediate/`);
  await expect(page.locator('[data-vocabulary-row]')).toHaveCount(groups[1].entries.length);
  await expect(page.locator('[data-vocabulary-tools]')).toBeHidden();
  await expect(page.locator('[data-vocabulary-primary-source]').first()).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('[data-vocabulary-row]:visible')).toHaveCount(groups[1].entries.length);
  await context.close();
});

test('rapid discrete navigation, resize and short-screen controls keep one stable card', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/vocabulary/advanced/?view=cards');
  const card = page.locator('[data-vocabulary-flip]');
  const next = page.locator('[data-vocabulary-next]');
  const before = (await next.boundingBox())!;
  await card.click();
  const after = (await next.boundingBox())!;
  expect(Math.abs(before.y - after.y)).toBeLessThan(1);
  expect(after.y + after.height).toBeLessThanOrEqual(568);
  await card.focus();
  for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft');
  await expect(page.locator('[data-vocabulary-position]')).toHaveText('8 / 50');
  await expect(page.locator('[data-vocabulary-word]')).toHaveText(groups[2].entries[7].english);
  const track = page.locator('[data-vocabulary-track]');
  await track.evaluate((element) => { element.scrollLeft = element.clientWidth * 15.7; });
  await page.keyboard.press('ArrowLeft');
  // Any pending native scroll must reconcile to the same selected entry, without a late jump.
  await expect.poll(() => track.evaluate((element) => Math.abs(element.scrollLeft / element.clientWidth - Math.round(element.scrollLeft / element.clientWidth)))).toBeLessThan(.01);
  const position = await page.locator('[data-vocabulary-position]').textContent();
  const word = await page.locator('[data-vocabulary-word]').textContent();
  await page.setViewportSize({ width: 568, height: 320 });
  await expect(page.locator('[data-vocabulary-position]')).toHaveText(position!);
  await expect(page.locator('[data-vocabulary-word]')).toHaveText(word!);
  await expect.poll(() => track.evaluate((element) => Math.abs(element.scrollLeft / element.clientWidth - Math.round(element.scrollLeft / element.clientWidth)))).toBeLessThan(.01);
  const landscapeNext = (await next.boundingBox())!;
  expect(landscapeNext.y + landscapeNext.height).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('reduced motion and enlarged text retain navigation, readable scrolling and reachable controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/vocabulary/advanced/?view=cards');
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await page.locator('[data-vocabulary-flip]').click();
  const face = page.locator('[data-vocabulary-flip]');
  expect(await face.locator('[data-card-back]').evaluate((element) => element.clientHeight > 110 && getComputedStyle(element).overflowY === 'auto')).toBe(true);
  const next = page.locator('[data-vocabulary-next]');
  const box = (await next.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(568);
  await next.click();
  await expect(page.locator('[data-vocabulary-position]')).toHaveText('2 / 50');
  await expect(page.locator('[data-vocabulary-answer]')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('compact pronunciation control plays, stops on card change and recovers from media failure', async ({ page }) => {
  await page.goto('/vocabulary/beginner/?view=cards');
  await page.getByRole('button', { name: '聽單字發音', exact: true }).click();
  await expect(page.locator('[data-vocabulary-play]')).toHaveAttribute('data-state', 'playing');
  await page.getByRole('button', { name: '下一張', exact: true }).click();
  await expect(page.locator('[data-vocabulary-play]')).toHaveAttribute('data-state', 'idle');
  expect(await page.locator('[data-vocabulary-audio]').evaluate((audio: HTMLAudioElement) => audio.paused)).toBe(true);
  let block = true;
  let requests = 0;
  await page.route('**/audio/wordlists/**', (route) => { requests++; return block ? route.abort() : route.continue(); });
  await page.getByRole('button', { name: '聽單字發音', exact: true }).click();
  await expect(page.locator('[data-vocabulary-audio-status]')).toContainText('重試');
  const failedRequests = requests;
  block = false;
  await page.getByRole('button', { name: '聽單字發音', exact: true }).click();
  await expect(page.locator('[data-vocabulary-play]')).toHaveAttribute('data-state', 'playing');
  expect(requests).toBeGreaterThan(failedRequests);
  await expect(page.locator('[data-vocabulary-position]')).toHaveText('2 / 50');
  await page.getByRole('button', { name: '停止發音', exact: true }).click();
  await expect(page.locator('[data-vocabulary-play]')).toHaveAttribute('data-state', 'idle');
});

test('cancelled loading and a late failure never overwrite the next card audio state', async ({ page }) => {
  await page.goto('/vocabulary/beginner/?view=cards');
  await page.evaluate(() => {
    const audio = document.querySelector<HTMLAudioElement>('[data-vocabulary-audio]')!;
    const pending = new Promise<void>((_, reject) => { (window as any).rejectOldAudio = reject; });
    audio.play = () => pending;
    (window as any).oldAudio = audio;
  });
  await page.getByRole('button', { name: '聽單字發音', exact: true }).click();
  await expect(page.locator('[data-vocabulary-play]')).toHaveAttribute('data-state', 'loading');
  await page.getByRole('button', { name: '取消載入', exact: true }).click();
  await expect(page.locator('[data-vocabulary-play]')).toHaveAttribute('data-state', 'idle');
  await page.getByRole('button', { name: '下一張', exact: true }).click();
  await page.evaluate(async () => {
    (window as any).rejectOldAudio(new Error('late old request failure'));
    (window as any).oldAudio.dispatchEvent(new Event('error'));
    await Promise.resolve();
  });
  await expect(page.locator('[data-vocabulary-play]')).toHaveAttribute('data-state', 'idle');
  await expect(page.locator('[data-vocabulary-audio-status]')).toBeEmpty();
  await expect(page.locator('[data-vocabulary-audio]')).toHaveAttribute('src', groups[0].entries[1].audioSrc);
});

test('leaving practice while print is open prevents a late print event from reopening it', async ({ page }) => {
  await page.goto('/vocabulary/beginner/');
  await page.getByRole('button', { name: '用字卡練習', exact: true }).click();
  await page.evaluate(() => { window.dispatchEvent(new Event('beforeprint')); window.dispatchEvent(new Event('beforeprint')); });
  await page.goBack();
  await expect(page.locator('[data-vocabulary]')).toHaveAttribute('data-view', 'list');
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(page.locator('[data-vocabulary-practice]')).not.toHaveAttribute('open');
  await expect(page.getByRole('searchbox')).toBeVisible();
});

test('a cancelled request failing late can retry on the same card immediately', async ({ page }) => {
  await page.goto('/vocabulary/beginner/?view=cards');
  let requests = 0;
  let failRequest: (() => Promise<void>) | undefined;
  await page.route('**/audio/wordlists/**', (route) => {
    requests++;
    if (requests === 1) { failRequest = () => route.abort(); return; }
    return route.continue();
  });
  await page.getByRole('button', { name: '聽單字發音', exact: true }).click();
  await expect.poll(() => requests).toBe(1);
  await page.getByRole('button', { name: '取消載入', exact: true }).click();
  await failRequest!();
  await expect.poll(() => page.locator('[data-vocabulary-audio]').evaluate((audio: HTMLAudioElement) => !!audio.error)).toBe(true);
  await expect(page.locator('[data-vocabulary-audio-status]')).toBeEmpty();
  await page.getByRole('button', { name: '聽單字發音', exact: true }).click();
  await expect(page.locator('[data-vocabulary-play]')).toHaveAttribute('data-state', 'playing');
  expect(requests).toBeGreaterThan(1);
  await expect(page.locator('[data-vocabulary-position]')).toHaveText('1 / 50');
});

test('button paging has intermediate frames instead of teleporting @motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/vocabulary/beginner/?view=cards');
  await page.evaluate(() => {
    const track = document.querySelector<HTMLElement>('[data-vocabulary-track]')!;
    const trace = { width: track.clientWidth, positions: [] as number[], done: false };
    (window as any).pagingTrace = trace;
    document.querySelector('[data-vocabulary-next]')!.addEventListener('click', () => {
      let frames = 0;
      function sample() {
        trace.positions.push(track.scrollLeft);
        if (++frames < 24) requestAnimationFrame(sample); else trace.done = true;
      }
      requestAnimationFrame(sample);
    }, { capture: true, once: true });
  });
  await page.getByRole('button', { name: '下一張', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).pagingTrace.done)).toBe(true);
  const trace = await page.evaluate(() => (window as any).pagingTrace as { width: number; positions: number[] });
  expect(trace.positions.filter((position) => position > 0 && position < trace.width)).not.toHaveLength(0);
  await expect(page.locator('[data-vocabulary-position]')).toHaveText('2 / 50');
  await expect.poll(() => page.locator('[data-vocabulary-track]').evaluate((track) => track.scrollLeft / track.clientWidth)).toBeCloseTo(1, 2);
});

test('pointer reveal has a reversible flip animation @motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/vocabulary/beginner/?view=cards');
  await expect(page.locator('[data-deck-scene="ready"]')).toBeVisible();
  const face = page.locator('[data-vocabulary-flip]');
  const trace = await face.evaluate(async (element) => {
    const rotor = element.querySelector<HTMLElement>('[data-card-rotor]')!;
    const turn = () => Number(rotor.style.transform.match(/rotateY\(([-\d.]+)rad\)/)?.[1] ?? 0);
    const click = () => element.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    const depth = () => Number(rotor.style.transform.match(/translate3d\([^,]+,[^,]+, ([-\d.]+)px\)/)?.[1] ?? 0);
    const rest = depth();
    const start = performance.now();
    click();
    const forward: number[] = [];
    const depths: number[] = [];
    for (let n = 0; n < 4; n++) { await new Promise(requestAnimationFrame); forward.push(turn()); depths.push(depth()); }
    // Time spent before passing 150° is what makes a flip read as rotation instead of a cut; frame counts vary with load.
    let sweep = 0;
    for (let n = 0; n < 120 && !sweep; n++) {
      await new Promise(requestAnimationFrame);
      depths.push(depth());
      if (turn() > Math.PI * 5 / 6) sweep = performance.now() - start;
    }
    click();
    const reverse: number[] = [];
    for (let n = 0; n < 60; n++) { await new Promise(requestAnimationFrame); reverse.push(turn()); }
    return { forward, reverse, sweep, rest, depths };
  });
  expect(trace.forward.some((angle) => angle > 0 && angle < Math.PI)).toBe(true);
  expect(trace.sweep).toBeGreaterThanOrEqual(150);
  expect(Math.max(...trace.depths.map((value) => Math.abs(value - trace.rest)))).toBeGreaterThan(20);
  expect(trace.reverse.some((angle) => angle > 0 && angle < trace.forward.at(-1)!)).toBe(true);
  expect(trace.reverse.at(-1)).toBeCloseTo(0, 2);
  await expect(face).toHaveAttribute('aria-expanded', 'false');
  await expect(face).toHaveAttribute('data-deck-side', 'front');
  await expect(page.locator('[data-vocabulary-answer]')).toBeHidden();
});

test('listening interrupts pending paging at a nonzero card without a late scroll cancelling it', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/vocabulary/beginner/?view=cards');
  for (let n = 0; n < 5; n++) await page.getByRole('button', { name: '下一張', exact: true }).click();
  await expect(page.locator('[data-vocabulary-position]')).toHaveText('6 / 50');
  await expect.poll(() => page.locator('[data-vocabulary-track]').evaluate((track) => track.scrollLeft / track.clientWidth)).toBeCloseTo(5, 2);
  await page.getByRole('button', { name: '下一張', exact: true }).click();
  await page.getByRole('button', { name: '聽單字發音', exact: true }).click();
  await expect(page.locator('[data-vocabulary-position]')).toHaveText('7 / 50');
  await expect(page.locator('[data-vocabulary-audio-status]')).toContainText(/正在播放|已播放/);
  await page.evaluate(async () => { for (let n = 0; n < 10; n++) await new Promise(requestAnimationFrame); });
  await expect(page.locator('[data-vocabulary-audio-status]')).toContainText(/正在播放|已播放/);
  expect(await page.locator('[data-vocabulary-audio]').evaluate((audio: HTMLAudioElement) => !audio.paused || audio.ended)).toBe(true);
  await expect(page.locator('[data-vocabulary-audio]')).toHaveAttribute('src', groups[0].entries[6].audioSrc);
  await expect.poll(() => page.locator('[data-vocabulary-track]').evaluate((track) => track.scrollLeft / track.clientWidth)).toBeCloseTo(6, 2);
});


test('Three deck is lazy, renders real WebGL, sleeps at rest and is released on exit @content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const original = WebGL2RenderingContext.prototype.drawElements;
    (window as any).deckDraws = 0;
    WebGL2RenderingContext.prototype.drawElements = function (...args: Parameters<typeof original>) {
      (window as any).deckDraws++;
      return original.apply(this, args);
    };
  });
  await page.goto('/vocabulary/beginner/');
  await expect(page.locator('[data-vocabulary-deck]')).toHaveCount(0);
  await page.getByRole('button', { name: '用字卡練習', exact: true }).click();
  const canvas = page.locator('[data-vocabulary-deck]');
  await expect(canvas).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).deckDraws)).toBeGreaterThan(0);
  await expect.poll(() => page.locator('[data-vocabulary-flip] [data-card-rotor]').evaluate((rotor: HTMLElement) => rotor.style.transform)).toContain('scale(1)');
  const resting = await page.evaluate(async () => {
    for (let n = 0; n < 4; n++) await new Promise(requestAnimationFrame);
    const before = (window as any).deckDraws;
    for (let n = 0; n < 8; n++) await new Promise(requestAnimationFrame);
    return { before, after: (window as any).deckDraws };
  });
  expect(resting.after).toBe(resting.before);
  await expect(canvas).toHaveAttribute('aria-hidden', 'true');
  expect(await canvas.evaluate((node) => getComputedStyle(node).pointerEvents)).toBe('none');
  await page.getByRole('button', { name: '返回詞彙表', exact: true }).click();
  await expect(canvas).toHaveCount(0);
  await expect(page.locator('[data-deck-scene]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '用字卡練習', exact: true })).toBeFocused();
});

test('Three deck pauses for sources and print, resumes the same card, and handles context loss @content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/vocabulary/beginner/?view=cards');
  const canvas = page.locator('[data-vocabulary-deck]');
  await expect(canvas).toBeVisible();
  await canvas.evaluate((node) => { (window as any).originalDeck = node; });
  await page.keyboard.press('ArrowRight');
  await page.locator('[data-vocabulary-flip]').click();
  await page.getByRole('button', { name: '查看來源與授權', exact: true }).click();
  await expect(canvas).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(canvas).toBeVisible();
  expect(await canvas.evaluate((node) => node === (window as any).originalDeck)).toBe(true);
  await expect(page.locator('[data-vocabulary-position]')).toHaveText('2 / 50');
  await expect(page.locator('[data-vocabulary-flip]')).toHaveAttribute('aria-expanded', 'true');
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await expect(canvas).toBeHidden();
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(canvas).toBeVisible();
  expect(await canvas.evaluate((node) => node === (window as any).originalDeck)).toBe(true);
  await canvas.evaluate((node) => node.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(canvas).toHaveCount(0);
  const face = page.locator('[data-vocabulary-flip]');
  expect(await face.locator('[data-card-back]').evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  await expect(page.locator('[data-vocabulary-answer]')).toBeVisible();
  await face.click();
  await expect(face).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-vocabulary-position]')).toHaveText('3 / 50');
});

test('reduced motion retains a readable card and restores Three without resetting the answer @content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/vocabulary/beginner/?view=cards');
  await expect(page.locator('[data-vocabulary-deck]')).toHaveCount(0);
  await page.locator('[data-vocabulary-flip]').click();
  await expect(page.locator('[data-vocabulary-answer]')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('[data-vocabulary-deck]')).toBeVisible();
  await expect(page.locator('[data-vocabulary-flip]')).toHaveAttribute('data-deck-side', 'back');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-vocabulary-deck]')).toHaveCount(0);
  await expect(page.locator('[data-vocabulary-answer]')).toBeVisible();
});

test('a Three import completing after exit cannot mount a stale deck @content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/vocabulary/beginner/');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let chunk = '';
  await page.route('**/*vocabulary-deck-scene*.js', async (route) => {
    chunk = route.request().url();
    await gate;
    await route.continue();
  }, { times: 1 });
  await page.getByRole('button', { name: '用字卡練習', exact: true }).click();
  await expect.poll(() => chunk).not.toBe('');
  await page.getByRole('button', { name: '返回詞彙表', exact: true }).click();
  release();
  await page.evaluate(async (url) => { await import(/* @vite-ignore */ url); }, chunk);
  await expect(page.locator('[data-vocabulary-deck]')).toHaveCount(0);
  await expect(page.locator('[data-deck-scene]')).toHaveCount(0);
  await page.getByRole('button', { name: '用字卡練習', exact: true }).click();
  await expect(page.locator('[data-vocabulary-deck]')).toBeVisible();
  await expect(page.locator('[data-vocabulary-position]')).toHaveText('1 / 50');
});

test('unavailable WebGL keeps native cards, answers and navigation working @content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...options: any[]) {
      if (kind === 'webgl2') return null;
      return original.call(this, kind as any, ...options);
    } as typeof original;
  });
  const loaded = page.waitForResponse((response) => response.url().includes('vocabulary-deck-scene') && response.status() === 200);
  await page.goto('/vocabulary/beginner/?view=cards');
  await loaded;
  await page.evaluate(async () => { for (let n = 0; n < 6; n++) await new Promise(requestAnimationFrame); });
  await expect(page.locator('[data-deck-scene]')).toHaveCount(0);
  await expect(page.locator('[data-vocabulary-deck]')).toHaveCount(0);
  await page.locator('[data-vocabulary-flip]').click();
  await expect(page.locator('[data-vocabulary-answer]')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-vocabulary-position]')).toHaveText('2 / 50');
  await expect(page.locator('[data-vocabulary-answer]')).toBeHidden();
});
