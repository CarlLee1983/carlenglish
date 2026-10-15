import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldShowHomeScreenHint } from '../src/lib/home-screen.ts';

const agents = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipodSafari: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  ipadOldUa: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  ipadDesktopUa: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  desktopChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  windowsChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};
const show = (userAgent, maxTouchPoints, standalone = false) => shouldShowHomeScreenHint({ userAgent, maxTouchPoints, standalone });

test('shows the hint on iPhone, iPod and iPad Safari that is not a home-screen app', () => {
  assert.equal(show(agents.iphoneSafari, 5), true);
  assert.equal(show(agents.ipodSafari, 5), true);
  assert.equal(show(agents.ipadOldUa, 5), true);
  assert.equal(show(agents.ipadDesktopUa, 5), true);
});

test('does not show the hint once opened as a home-screen app', () => {
  assert.equal(show(agents.iphoneSafari, 5, true), false);
  assert.equal(show(agents.ipadDesktopUa, 5, true), false);
});

test('does not show the hint on Android, Windows or a Mac without a touch screen', () => {
  assert.equal(show(agents.androidChrome, 5), false);
  assert.equal(show(agents.windowsChrome, 0), false);
  assert.equal(show(agents.desktopChrome, 0), false);
  assert.equal(show(agents.ipadDesktopUa, 0), false);
  assert.equal(show(agents.ipadDesktopUa, 1), false);
});
