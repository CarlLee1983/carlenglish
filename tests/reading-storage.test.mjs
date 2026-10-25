import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadReadingState, saveReadingPreferences, saveReadingProgress } from '../src/lib/reading-storage.ts';

const version = 'a'.repeat(64);
const key = 'carlenglish.reading.progress.cafe';
function storage(values = {}) {
  const data = new Map(Object.entries(values));
  globalThis.window = { localStorage: {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  } };
  return data;
}

test('missing preferences remain unset rather than saving a level default', () => {
  const data = storage();
  assert.deepEqual(loadReadingState('cafe', version, 6), {
    preferences: {}, progress: null, invalidProgress: false, unavailable: false,
  });
  assert.equal(data.size, 0);
  assert.equal(saveReadingPreferences({ rate: 0.8 }), true);
  assert.deepEqual(loadReadingState('cafe', version, 6).preferences, { rate: 0.8 });
});

test('only supported manual preferences are restored', () => {
  storage({ 'carlenglish.reading.preferences': JSON.stringify({ schema: 1, rate: 0.6, mode: 'guided' }) });
  assert.deepEqual(loadReadingState('cafe', version, 6).preferences, { mode: 'guided' });
  assert.equal(saveReadingPreferences({ rate: 1, mode: 'continuous' }), true);
  assert.deepEqual(loadReadingState('cafe', version, 6).preferences, { rate: 1, mode: 'continuous' });
});

test('progress is isolated by scene and tied to content version', () => {
  storage();
  assert.equal(saveReadingProgress('cafe', { schema: 1, version, index: 3, completed: false }), true);
  assert.equal(loadReadingState('cafe', version, 6).progress.index, 3);
  assert.equal(loadReadingState('other', version, 6).progress, null);
  const stale = loadReadingState('cafe', 'b'.repeat(64), 6);
  assert.equal(stale.progress, null);
  assert.equal(stale.invalidProgress, true);
});

test('malformed, out of range and inconsistent completion records are invalidated', () => {
  for (const value of ['{', 'null', '[]', ...[
    { schema: 2, version, index: 1, completed: false },
    { schema: 1, version, index: -1, completed: false },
    { schema: 1, version, index: 6, completed: false },
    { schema: 1, version, index: 1.5, completed: false },
    { schema: 1, version, index: 1, completed: 'false' },
    { schema: 1, version, index: 1, completed: true },
  ].map(JSON.stringify)]) {
    storage({ [key]: value });
    const loaded = loadReadingState('cafe', version, 6);
    assert.equal(loaded.progress, null, value);
    assert.equal(loaded.invalidProgress, true, value);
  }
  storage({ [key]: JSON.stringify({ schema: 1, version, index: 5, completed: true }) });
  assert.equal(loadReadingState('cafe', version, 6).progress.completed, true);
});

test('blocked reads and writes report unavailable without throwing or touching other features', () => {
  globalThis.window = { get localStorage() { throw new Error('blocked'); } };
  assert.equal(loadReadingState('cafe', version, 6).unavailable, true);
  assert.equal(saveReadingPreferences({ mode: 'guided' }), false);
  assert.equal(saveReadingProgress('cafe', { schema: 1, version, index: 1, completed: false }), false);
  const data = storage({ 'carlenglish.classic-resume.example': '2', 'review-state': 'keep' });
  saveReadingProgress('cafe', { schema: 1, version, index: 1, completed: false });
  assert.equal(data.get('carlenglish.classic-resume.example'), '2');
  assert.equal(data.get('review-state'), 'keep');
});
