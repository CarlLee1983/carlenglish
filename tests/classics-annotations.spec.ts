import { expect, test } from '@playwright/test';

test('annotation link opens its explanation and returns to the original word by keyboard', async ({ page }) => {
  await page.goto('/classics/gift-of-the-magi-l1/2/');
  const body = page.locator('.classic-story');
  const text = await body.locator('p').nth(1).textContent();
  expect(text).toBe("Jim's gold watch was beautiful, but the old chain on it was not. Sometimes he looked at the watch when nobody was near. Della imagined him taking it out with the new silver chain. He could look at it proudly wherever he went.");
  const link = body.getByRole('link', { name: '查看注釋：chain' });
  await expect(link).toHaveCount(1);
  await expect(body.getByRole('link', { name: '查看注釋：silver chain' })).toHaveCount(1);
  await expect(link).toHaveText('');
  await expect(body.locator('p').first()).toHaveText('Della walked from shop to shop. She looked at many things, but none of them seemed right for Jim. Then, in a small shop window, she saw a simple silver chain. She knew at once that it was the gift she wanted.');
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#annotation-1$/);
  const annotation = page.locator('#annotation-1');
  await expect(annotation).toContainText('錶鍊');
  const back = annotation.getByRole('link', { name: '返回正文：chain' });
  await back.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#annotation-source-1$/);
});

test('first occurrence of an annotated term is linked once and paragraph text is unchanged', async ({ page }) => {
  await page.goto('/classics/gift-of-the-magi-l1/1/');
  const body = page.locator('.classic-story');
  await expect(body.getByRole('link', { name: '查看注釋：hair' })).toHaveCount(1);
  await expect(body.locator('p').nth(2)).toHaveText("After a while, she stood up and looked in the mirror. She let down her long brown hair. It fell past her knees. Jim loved her hair, and Della loved Jim's gold watch. The watch had belonged to his father. These were the two things they were most proud of.");
});
