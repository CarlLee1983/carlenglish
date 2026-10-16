import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const firstPart = '/classics/gift-of-the-magi-l1/1/';
const secondPart = '/classics/gift-of-the-magi-l1/2/';
const thirdPart = '/classics/gift-of-the-magi-l1/3/';
const giftButton = (page: Page) => page.getByRole('button', { name: '加入複習：gift' });

test('an annotation becomes a card with its original sentence and a link back to its part', async ({ page }) => {
  await page.goto(firstPart);
  await giftButton(page).click();
  await expect(giftButton(page)).toHaveText('已加入');

  await page.goto('/review/');
  await expect(page.locator('[data-review-front]')).toHaveText('gift');
  await page.getByRole('button', { name: '翻面' }).click();
  await expect(page.locator('[data-review-meaning]')).toHaveText('禮物');
  await expect(page.locator('[data-review-example]')).toHaveText('Tomorrow was Christmas, and she still had no gift for Jim, her husband.');
  await expect(page.getByRole('button', { name: '播放單字發音' })).toBeHidden();
  const source = page.getByRole('link', { name: '回到來源：麥琪的禮物｜第 1 節 A Gift for Jim' });
  await expect(source).toHaveAttribute('href', firstPart);
  await source.click();
  await expect(page).toHaveURL(new RegExp(`${firstPart}$`));
  await expect(giftButton(page)).toHaveText('已加入');
});

test('the same annotation in two parts keeps two sources on one card', async ({ page }) => {
  await page.goto(firstPart);
  await giftButton(page).click();
  await page.goto(secondPart);
  await giftButton(page).click();
  await expect(giftButton(page)).toHaveText('已加入');

  await page.goto('/review/');
  await expect(page.locator('[data-review-front]')).toHaveText('gift');
  await page.getByRole('button', { name: '翻面' }).click();
  await expect(page.locator('[data-review-sources] a')).toHaveCount(2);
  await expect(page.locator('[data-review-sources] a').first()).toHaveAttribute('href', firstPart);
  await expect(page.locator('[data-review-sources] a').last()).toHaveAttribute('href', secondPart);
  await expect(page.locator('[data-review-example]')).toHaveText('Tomorrow was Christmas, and she still had no gift for Jim, her husband.');

  await page.goto(firstPart);
  await giftButton(page).click();
  await page.goto(secondPart);
  await expect(giftButton(page)).toHaveText('已加入');
  await page.goto('/review/');
  await page.getByRole('button', { name: '翻面' }).click();
  await expect(page.locator('[data-review-sources] a')).toHaveCount(1);
  await expect(page.locator('[data-review-sources] a')).toHaveAttribute('href', secondPart);
});

test('a scene and classic share one card, and both old and new backups restore', async ({ page }) => {
  await page.goto('/scenes/birthday-party/');
  await giftButton(page).click();
  await page.goto('/review/');
  const oldDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '匯出備份', exact: true }).click();
  const oldFile = await (await oldDownload).path();
  const oldCard = JSON.parse(readFileSync(oldFile, 'utf8')).state.cards[0];

  await page.goto(firstPart);
  await giftButton(page).click();
  await page.goto(secondPart);
  await giftButton(page).click();
  await page.goto('/review/');
  await expect(page.locator('[data-review-front]')).toHaveText('gift');
  await page.getByRole('button', { name: '翻面' }).click();
  await expect(page.locator('[data-review-example]')).toHaveText('I open the colorful gift box.');
  await expect(page.getByRole('button', { name: '播放單字發音' })).toBeVisible();
  await expect(page.locator('[data-review-sources] a')).toHaveCount(3);

  const newDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '匯出備份', exact: true }).click();
  const newFile = await (await newDownload).path();
  const newBackup = JSON.parse(readFileSync(newFile, 'utf8'));
  expect(newBackup.state.cards).toHaveLength(1);
  expect(newBackup.state.cards[0].schedule).toEqual(oldCard.schedule);
  expect(newBackup.state.cards[0].content).toEqual(oldCard.content);
  expect(newBackup.state.cards[0].sources).toEqual([
    oldCard.sources[0],
    { kind: 'classic', id: 'gift-of-the-magi-l1', title: '麥琪的禮物｜第 1 節 A Gift for Jim', href: firstPart },
    { kind: 'classic', id: 'gift-of-the-magi-l1', title: '麥琪的禮物｜第 2 節 A Chain for the Watch', href: secondPart },
  ]);

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel('匯入備份').setInputFiles(oldFile);
  await page.getByRole('button', { name: '取代' }).click();
  await page.getByRole('button', { name: '翻面' }).click();
  await expect(page.locator('[data-review-sources] a')).toHaveCount(1);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel('匯入備份').setInputFiles(newFile);
  await page.getByRole('button', { name: '取代' }).click();
  await page.getByRole('button', { name: '翻面' }).click();
  await expect(page.locator('[data-review-sources] a')).toHaveCount(3);
  await expect(page.locator('[data-review-sources] a').last()).toHaveAttribute('href', secondPart);
});

test('an article and classic annotation with the same meaning share one card', async ({ page }) => {
  const couldButton = page.getByRole('button', { name: '加入複習：could' });
  await page.goto('/articles/moon-battery-cold-test-2026/');
  await couldButton.click();
  await page.goto(thirdPart);
  await couldButton.click();
  await page.goto('/review/');
  await expect(page.locator('[data-review-front]')).toHaveText('could');
  await page.getByRole('button', { name: '翻面' }).click();
  await expect(page.locator('[data-review-meaning]')).toHaveText('可能、能夠（依語境判斷）');
  await expect(page.locator('[data-review-example]')).toHaveText('After such severe cold, the batteries would need heaters before they could operate again.');
  await expect(page.locator('[data-review-sources] a')).toHaveCount(2);
  await expect(page.locator('[data-review-sources] a').first()).toHaveAttribute('href', '/articles/moon-battery-cold-test-2026/');
  await expect(page.locator('[data-review-sources] a').last()).toHaveAttribute('href', thirdPart);
});
