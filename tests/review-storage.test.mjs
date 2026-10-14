import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyState, reduce } from '../src/lib/review-deck.ts';
import { loadReviewState, reviewStorageKey, saveReviewState } from '../src/lib/review-storage.ts';

const coffee = { english: 'coffee', meaning: '咖啡', example: 'I like coffee.', audioSrc: '/audio/words/coffee.mp3' };
const source = { kind: 'scene', id: 'cafe-breakfast', title: '咖啡店早餐', href: '/scenes/cafe-breakfast/' };
const now = new Date(2026, 9, 14, 9, 0, 0);
const sample = () => reduce(emptyState(), { type: 'ADD_CARD', card: coffee, source, now });

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
  };
}

const withCard = (mutate) => {
  const state = JSON.parse(JSON.stringify(sample()));
  mutate(state.cards[0]);
  return JSON.stringify(state);
};

test('an empty storage loads as an empty state', () => {
  const result = loadReviewState(fakeStorage());
  assert.equal(result.ok, true);
  assert.deepEqual(result.state, emptyState());
});

test('a saved state loads back unchanged', () => {
  const storage = fakeStorage();
  const state = sample();
  assert.deepEqual(saveReviewState(state, storage), { ok: true });
  const result = loadReviewState(storage);
  assert.equal(result.ok, true);
  assert.deepEqual(result.state, state);
});

test('broken JSON is reported as corrupt with the original cause', () => {
  const result = loadReviewState(fakeStorage({ [reviewStorageKey]: '{not json' }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'corrupt');
  assert.ok(result.error instanceof SyntaxError);
});

test('data with the wrong shape is reported as corrupt', () => {
  const broken = {
    'wrong version': JSON.stringify({ version: 2, cards: [], lastExportedAt: null }),
    'missing export time': JSON.stringify({ version: 1, cards: [], dailyNewLimit: null, subscriptions: [] }),
    'bad export time': JSON.stringify({ ...emptyState(), lastExportedAt: 'yesterday' }),
    'missing daily limit': JSON.stringify({ version: 1, cards: [], lastExportedAt: null, subscriptions: [] }),
    'missing subscriptions': JSON.stringify({ version: 1, cards: [], lastExportedAt: null, dailyNewLimit: null }),
    'external audio': withCard((card) => { card.content.audioSrc = 'https://evil.example/a.mp3'; }),
    'missing content': withCard((card) => { delete card.content; }),
    'missing stability': withCard((card) => { delete card.schedule.stability; }),
    'missing reps': withCard((card) => { delete card.schedule.reps; }),
    'bad state': withCard((card) => { card.schedule.state = 'new'; }),
    'bad due date': withCard((card) => { card.schedule.due = 'tomorrow-ish'; }),
    'bad last review date': withCard((card) => { card.schedule.last_review = 'nope'; }),
    'unknown source kind': withCard((card) => { card.sources[0].kind = 'video'; }),
    'javascript href': withCard((card) => { card.sources[0].href = 'javascript:alert(1)'; }),
    'protocol-relative href': withCard((card) => { card.sources[0].href = '//evil.example/'; }),
  };
  for (const [name, raw] of Object.entries(broken)) {
    const result = loadReviewState(fakeStorage({ [reviewStorageKey]: raw }));
    assert.equal(result.ok, false, name);
    assert.equal(result.reason, 'corrupt', name);
  }
});

test('a graded card with a last review date still loads', () => {
  const graded = reduce(sample(), { type: 'GRADE', cardKey: sample().cards[0].key, grade: 'good', now });
  const storage = fakeStorage();
  saveReviewState(graded, storage);
  assert.equal(loadReviewState(storage).ok, true);
});

test('a storage that throws on read or write is reported as unavailable', () => {
  const error = new Error('blocked');
  const throwing = { getItem: () => { throw error; }, setItem: () => { throw error; } };
  const loaded = loadReviewState(throwing);
  assert.equal(loaded.ok, false);
  assert.equal(loaded.reason, 'unavailable');
  assert.equal(loaded.error, error);
  const saved = saveReviewState(sample(), throwing);
  assert.equal(saved.ok, false);
  assert.equal(saved.reason, 'unavailable');
  assert.equal(saved.error, error);
});
