import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.CARLENGLISH_TEST_PORT ?? 4391);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('CARLENGLISH_TEST_PORT must be an integer from 1024 to 65535.');
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  testMatch: ['browser.spec.ts', 'pronunciation.spec.ts', 'seo.spec.ts', 'articles.spec.ts', 'classics.spec.ts', 'classics-annotations.spec.ts', 'classics-resume.spec.ts', 'classics-scandal.spec.ts', 'review.spec.ts', 'review-wordlist.spec.ts'],
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'desktop-dark', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, colorScheme: 'dark' } },
    { name: 'mobile-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'narrow-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `pnpm run preview --port ${port} --ignore-lock`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
