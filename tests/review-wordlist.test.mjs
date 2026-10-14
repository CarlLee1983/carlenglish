import assert from 'node:assert/strict';
import test from 'node:test';
import { parseBackup, serializeBackup } from '../src/lib/review-backup-format.ts';
import { reduce } from '../src/lib/review-deck.ts';
import { cardKey, emptyState, reviewCounts, todayQueue } from '../src/lib/review-state.ts';

// 詞表訂閱：訂閱／取消、依詞頻發新卡、與手動字卡共用每日上限、與既有字卡去重。

const now = new Date(2026, 9, 14, 9, 0, 0);
const nextMorning = new Date(2026, 9, 15, 8, 0, 0);
const exportTime = new Date(2026, 9, 20, 18, 30, 0);
const minutes = (count) => count * 60_000;
const sceneSource = { kind: 'scene', id: 'cafe-breakfast', title: '咖啡店早餐', href: '/scenes/cafe-breakfast/' };

const makeList = (id, count, prefix = id) => ({
  id, name: `詞表 ${id}`, description: '測試詞表',
  source: { name: 'Sample 1.0', authors: 'Example, A.', url: 'https://example.org/', adaptation: '改作說明' },
  license: { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  entries: Array.from({ length: count }, (_, index) => ({
    id: `${prefix}${index + 1}`, rank: index + 1, english: `${prefix}${index + 1}`, meaning: `意思${prefix}${index + 1}`,
    example: `Example ${prefix}${index + 1}.`, audioSrc: `/audio/wordlists/${id}/${prefix}${index + 1}.mp3`,
  })),
});
const listSource = (id) => ({ kind: 'wordlist', id, title: `詞表 ${id}`, href: '/review/' });
const subscribe = (state, wordListId, at = now) => reduce(state, { type: 'SUBSCRIBE', wordListId, now: at });
const issue = (state, wordLists, at = now) => reduce(state, { type: 'ISSUE_NEW_CARDS', wordLists, now: at });
const wordsOf = (count) => Array.from({ length: count }, (_, index) => ({ english: `word${index}`, meaning: `字${index}`, example: null, audioSrc: null }));
const addAll = (state, words, at) => words.reduce((acc, card) => reduce(acc, { type: 'ADD_CARD', card, source: sceneSource, now: at }), state);
const englishOf = (queue) => queue.map((card) => card.content.english);
const wordlistA = makeList('list-a', 25, 'a');

test('subscribing records the list once, and unsubscribing removes it', () => {
  const state = subscribe(emptyState(), 'list-a');
  assert.deepEqual(state.subscriptions, [{ wordListId: 'list-a', subscribedAt: now.toISOString(), issuedThrough: 0, issuedCount: 0 }]);
  assert.equal(subscribe(state, 'list-a', new Date(now.getTime() + minutes(5))), state);
  assert.equal(subscribe(state, 'list-b').subscriptions.length, 2);
  assert.deepEqual(reduce(state, { type: 'UNSUBSCRIBE', wordListId: 'list-a' }).subscriptions, []);
  assert.equal(reduce(state, { type: 'UNSUBSCRIBE', wordListId: 'nope' }), state);
});

test('a subscription issues the list in frequency order, up to the daily limit, as cards that carry the list as their source', () => {
  const state = issue(subscribe(emptyState(), 'list-a'), [wordlistA]);
  assert.deepEqual(englishOf(todayQueue(state, now)), wordlistA.entries.slice(0, 10).map((entry) => entry.english));
  const first = state.cards[0];
  assert.deepEqual(first.content, { english: 'a1', meaning: '意思a1', example: 'Example a1.', audioSrc: '/audio/wordlists/list-a/a1.mp3' });
  assert.deepEqual(first.sources, [listSource('list-a')]);
  assert.equal(first.firstReviewedAt, null);
  assert.deepEqual(state.subscriptions[0], { wordListId: 'list-a', subscribedAt: now.toISOString(), issuedThrough: 10, issuedCount: 10 });
});

test('issuing again the same day changes nothing, even after cards are reviewed', () => {
  let state = issue(subscribe(emptyState(), 'list-a'), [wordlistA]);
  assert.equal(issue(state, [wordlistA]), state);
  for (const card of state.cards.slice(0, 4)) state = reduce(state, { type: 'GRADE', cardKey: card.key, grade: 'good', now });
  assert.equal(issue(state, [wordlistA]), state);
  assert.equal(state.cards.length, 10);
});

test('the next day issues only as many as the allowance minus the new cards still waiting', () => {
  let state = reduce(subscribe(emptyState(), 'list-a'), { type: 'SET_DAILY_NEW_LIMIT', limit: 4 });
  state = issue(state, [wordlistA]);
  for (const card of state.cards.slice(0, 3)) state = reduce(state, { type: 'GRADE', cardKey: card.key, grade: 'good', now });
  // 昨天學了 3 張，還有 1 張新卡沒學：今天額度 4，已有 1 張在等，補 3 張。
  const next = issue(state, [wordlistA], nextMorning);
  assert.deepEqual(next.cards.map((card) => card.content.english), ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7']);
  assert.equal(next.subscriptions[0].issuedThrough, 7);
  // 新卡沒學完，同一天再發也不會多出來。
  assert.equal(issue(next, [wordlistA], new Date(nextMorning.getTime() + minutes(30))), next);
});

test('new cards the learner has not started pile up no further: nothing more is issued while the allowance is already waiting', () => {
  const state = issue(subscribe(emptyState(), 'list-a'), [wordlistA]);
  assert.equal(issue(state, [wordlistA], nextMorning), state);
  assert.equal(state.cards.length, 10);
});

test('manual cards take the day\'s new-card slots first, and the list fills the rest', () => {
  const state = issue(subscribe(addAll(emptyState(), wordsOf(3), now), 'list-a'), [wordlistA]);
  assert.deepEqual(englishOf(todayQueue(state, now)), ['word0', 'word1', 'word2', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7']);
  assert.equal(state.subscriptions[0].issuedCount, 7);
});

test('a manual card added after list cards were issued still comes before them', () => {
  let state = issue(subscribe(emptyState(), 'list-a'), [wordlistA]);
  state = addAll(state, wordsOf(1), now);
  const queue = englishOf(todayQueue(state, now));
  assert.equal(queue.length, 10);
  assert.deepEqual(queue.slice(0, 3), ['word0', 'a1', 'a2']);
  assert.equal(queue.includes('a10'), false);
});

test('a list card that is also added by hand keeps both sources and counts as a manual card', () => {
  let state = issue(subscribe(emptyState(), 'list-a'), [wordlistA]);
  state = reduce(state, { type: 'ADD_CARD', card: state.cards[9].content, source: sceneSource, now });
  const queue = todayQueue(state, now);
  assert.equal(queue[0].content.english, 'a10');
  assert.deepEqual(queue[0].sources, [listSource('list-a'), sceneSource]);
  assert.equal(state.cards.length, 10);
});

test('several subscriptions share one daily limit and take turns in subscription order', () => {
  const wordlistB = makeList('list-b', 25, 'b');
  let state = reduce(emptyState(), { type: 'SET_DAILY_NEW_LIMIT', limit: 5 });
  state = subscribe(subscribe(state, 'list-a'), 'list-b');
  state = issue(state, [wordlistB, wordlistA]);
  assert.deepEqual(state.cards.map((card) => card.content.english), ['a1', 'b1', 'a2', 'b2', 'a3']);
  assert.deepEqual(state.subscriptions.map((entry) => [entry.wordListId, entry.issuedThrough]), [['list-a', 3], ['list-b', 2]]);
});

test('manual cards that fill the limit leave no slot for any list', () => {
  let state = reduce(addAll(emptyState(), wordsOf(5), now), { type: 'SET_DAILY_NEW_LIMIT', limit: 5 });
  state = issue(subscribe(subscribe(state, 'list-a'), 'list-b'), [wordlistA, makeList('list-b', 3, 'b')]);
  assert.equal(state.cards.length, 5);
  assert.deepEqual(state.subscriptions.map((entry) => entry.issuedThrough), [0, 0]);
});

test('a list entry that is already a card is skipped without using a slot, whatever its review state', () => {
  const list = makeList('list-a', 6, 'a');
  let state = reduce(emptyState(), { type: 'SET_DAILY_NEW_LIMIT', limit: 3 });
  const reviewed = { english: 'A2', meaning: ' 意思a2 ', example: null, audioSrc: null };
  const waiting = { english: 'a3', meaning: '意思a3', example: null, audioSrc: null };
  state = addAll(state, [reviewed, waiting], now);
  state = reduce(state, { type: 'GRADE', cardKey: cardKey(reviewed), grade: 'good', now });
  state = issue(subscribe(state, 'list-a'), [list]);
  // 額度 3：a2 已學過（今天用掉 1 個），a3 在等（占 1 個），剩 1 個給 a1；a2、a3 被跳過。
  assert.deepEqual(state.cards.map((card) => card.content.english).sort(), ['A2', 'a1', 'a3']);
  assert.deepEqual(state.subscriptions[0], { wordListId: 'list-a', subscribedAt: now.toISOString(), issuedThrough: 1, issuedCount: 1 });
  // 隔天 a1 還沒學：額度 3、等待 2 張（a1、a3），只補 1 張；a2、a3 已是字卡，跳過不占額度。
  const nextDay = issue(state, [list], nextMorning);
  assert.deepEqual(nextDay.subscriptions[0], { wordListId: 'list-a', subscribedAt: now.toISOString(), issuedThrough: 4, issuedCount: 2 });
  assert.equal(nextDay.cards.filter((card) => card.sources.some((source) => source.kind === 'wordlist')).length, 2);
});

test('the same English word with another meaning is a different card and is issued', () => {
  const list = makeList('list-a', 2, 'a');
  list.entries[0] = { ...list.entries[0], english: 'issue', meaning: '發行' };
  const state = issue(subscribe(addAll(emptyState(), [{ english: 'issue', meaning: '議題', example: null, audioSrc: null }], now), 'list-a'), [list]);
  assert.deepEqual(state.cards.map((card) => card.content.meaning), ['議題', '發行', '意思a2']);
});

test('a finished list stops issuing, and a subscribed list that is not provided is left alone', () => {
  const short = makeList('list-a', 2, 'a');
  const state = issue(subscribe(emptyState(), 'list-a'), [short]);
  assert.equal(state.cards.length, 2);
  assert.equal(state.subscriptions[0].issuedThrough, 2);
  assert.equal(issue(state, [short], nextMorning), state);
  const missing = subscribe(emptyState(), 'list-gone');
  assert.equal(issue(missing, [short]), missing);
  const none = emptyState();
  assert.equal(issue(none, [short]), none);
});

test('unsubscribing keeps the cards already issued and stops further issuing', () => {
  let state = issue(subscribe(emptyState(), 'list-a'), [wordlistA]);
  state = reduce(state, { type: 'UNSUBSCRIBE', wordListId: 'list-a' });
  assert.equal(state.cards.length, 10);
  assert.deepEqual(state.subscriptions, []);
  assert.equal(issue(state, [wordlistA], nextMorning), state);
  assert.equal(todayQueue(state, now).length, 10);
});

test('issuing never mutates its inputs', () => {
  const state = subscribe(addAll(emptyState(), wordsOf(2), now), 'list-a');
  const before = JSON.stringify(state);
  const list = JSON.stringify(wordlistA);
  issue(state, [wordlistA]);
  assert.equal(JSON.stringify(state), before);
  assert.equal(JSON.stringify(wordlistA), list);
});

test('tomorrow\'s count includes list cards that will be issued, up to the limit left after carried-over cards', () => {
  const state = addAll(emptyState(), wordsOf(13), now);
  assert.equal(reviewCounts(state, now, 0).tomorrow, 3);
  assert.equal(reviewCounts(state, now, 40).tomorrow, 10);
  assert.equal(reviewCounts(emptyState(), now, 4).tomorrow, 4);
  assert.equal(reviewCounts(emptyState(), now, 40).tomorrow, 10);
  assert.equal(reviewCounts(emptyState(), now).tomorrow, 0);
});

test('subscriptions and issued cards survive a backup round trip', () => {
  let state = issue(subscribe(subscribe(emptyState(), 'list-a'), 'list-b'), [wordlistA, makeList('list-b', 3, 'b')]);
  state = reduce(state, { type: 'GRADE', cardKey: state.cards[0].key, grade: 'good', now });
  const parsed = parseBackup(serializeBackup(state, exportTime));
  assert.equal(parsed.ok, true);
  assert.deepEqual({ ...parsed.state, lastExportedAt: null }, state);
  assert.deepEqual(parsed.state.subscriptions, state.subscriptions);
});

test('a backup with a malformed subscription is rejected', () => {
  const base = JSON.parse(serializeBackup(subscribe(emptyState(), 'list-a'), exportTime));
  const good = base.state.subscriptions[0];
  const withSubscriptions = (subscriptions) => JSON.stringify({ ...base, state: { ...base.state, subscriptions } });
  assert.equal(parseBackup(withSubscriptions([good])).ok, true);
  const rejected = {
    'missing id': { ...good, wordListId: undefined },
    'blank id': { ...good, wordListId: '' },
    'bad date': { ...good, subscribedAt: 'yesterday' },
    'negative position': { ...good, issuedThrough: -1 },
    'fractional position': { ...good, issuedThrough: 1.5, issuedCount: 1 },
    'text position': { ...good, issuedThrough: '3' },
    'count above position': { ...good, issuedThrough: 2, issuedCount: 3 },
    'missing count': { ...good, issuedCount: undefined },
    'extra field': { ...good, extra: 1 },
  };
  for (const [name, entry] of Object.entries(rejected)) assert.equal(parseBackup(withSubscriptions([entry])).ok, false, name);
  assert.equal(parseBackup(withSubscriptions([good, good])).ok, false, 'duplicate list');
  assert.equal(parseBackup(withSubscriptions('list-a')).ok, false, 'not an array');
});

test('a wordlist card source passes the backup source checks', () => {
  const state = issue(subscribe(emptyState(), 'list-a'), [wordlistA]);
  const file = JSON.parse(serializeBackup(state, exportTime));
  const evil = { ...file, state: { ...file.state, cards: [{ ...file.state.cards[0], sources: [{ ...listSource('list-a'), href: '//evil.example' }] }] } };
  assert.equal(parseBackup(JSON.stringify(evil)).ok, false);
});
