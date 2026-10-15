import assert from 'node:assert/strict';
import test from 'node:test';
import { parseBackup, serializeBackup } from '../src/lib/review-backup-format.ts';
import { isInternalHref } from '../src/lib/guards.ts';
import { reduce } from '../src/lib/review-deck.ts';
import { cardKey, emptyState, isCardSourceKind, needsBackupReminder, nextDue, reviewCounts, todayQueue } from '../src/lib/review-state.ts';

const coffee = { english: 'coffee', meaning: '咖啡', example: 'I like coffee.', audioSrc: '/audio/words/coffee.wav' };
const sceneSource = { kind: 'scene', id: 'cafe-breakfast', title: '咖啡店早餐', href: '/scenes/cafe-breakfast/' };
const now = new Date(2026, 9, 14, 9, 0, 0);

test('a newly added card is due right away and appears in today\'s queue', () => {
  const state = reduce(emptyState(), { type: 'ADD_CARD', card: coffee, source: sceneSource, now });
  const queue = todayQueue(state, now);
  assert.equal(queue.length, 1);
  assert.deepEqual(queue[0].content, coffee);
  assert.deepEqual(queue[0].sources, [sceneSource]);
});

const minutes = (count) => count * 60_000;
const key = cardKey(coffee);

test('a card graded "again" leaves the queue now and comes back within ten minutes', () => {
  let state = reduce(emptyState(), { type: 'ADD_CARD', card: coffee, source: sceneSource, now });
  state = reduce(state, { type: 'GRADE', cardKey: key, grade: 'again', now });
  assert.equal(todayQueue(state, now).length, 0);
  assert.equal(todayQueue(state, new Date(now.getTime() + minutes(10))).length, 1);
});

test('repeated "good" answers push the next due date out to at least a day, and the input state is untouched', () => {
  let state = reduce(emptyState(), { type: 'ADD_CARD', card: coffee, source: sceneSource, now });
  state = reduce(state, { type: 'GRADE', cardKey: key, grade: 'good', now });
  const firstDue = nextDue(state, key);
  assert.ok(firstDue.getTime() > now.getTime());
  const before = JSON.stringify(state);
  const graded = reduce(state, { type: 'GRADE', cardKey: key, grade: 'good', now: firstDue });
  assert.equal(JSON.stringify(state), before);
  assert.ok(nextDue(graded, key).getTime() - firstDue.getTime() >= 24 * 60 * minutes(1));
});

test('grading or removing a card that does not exist leaves the state unchanged', () => {
  const state = reduce(emptyState(), { type: 'ADD_CARD', card: coffee, source: sceneSource, now });
  assert.deepEqual(reduce(state, { type: 'GRADE', cardKey: 'nope', grade: 'good', now }), state);
  assert.deepEqual(reduce(state, { type: 'REMOVE_CARD', cardKey: 'nope', source: sceneSource }), state);
});

test('counts report today\'s due and new cards, cards due later today, and tomorrow\'s cards', () => {
  const words = ['coffee', 'tea', 'milk', 'bread', 'juice'].map((english) => ({ english, meaning: `${english}-zh`, example: null, audioSrc: null }));
  let state = emptyState();
  for (const card of words) state = reduce(state, { type: 'ADD_CARD', card, source: sceneSource, now });
  // 'tea' 已複習過（不再是新卡）後再次到期；'milk' 忘記了，稍後再到期；'bread' 明天到期。
  const at = (card) => cardKey(card);
  state = reduce(state, { type: 'GRADE', cardKey: at(words[1]), grade: 'good', now: new Date(now.getTime() - 60 * minutes(1)) });
  state = reduce(state, { type: 'GRADE', cardKey: at(words[2]), grade: 'again', now });
  const tomorrowNoon = new Date(2026, 9, 15, 12, 0, 0);
  state = { ...state, cards: state.cards.map((card) => (card.key === at(words[3]) ? { ...card, schedule: { ...card.schedule, due: tomorrowNoon.toISOString() } } : card)) };
  const counts = reviewCounts(state, now, 0);
  assert.equal(counts.due, 4); // 到今天結束前會到期：coffee、tea、juice，加上稍後才到期的 milk
  assert.equal(counts.newCards, 2); // coffee、juice
  assert.equal(counts.tomorrow, 1);
  assert.equal(counts.laterToday, 1);
  assert.equal(counts.nextLaterToday.getTime(), nextDue(state, at(words[2])).getTime());
});

test('the same word with a different meaning becomes a separate card with its own sources', () => {
  const issueTopic = { english: 'issue', meaning: '議題', example: null, audioSrc: null };
  const issueRelease = { english: 'Issue', meaning: '發行', example: null, audioSrc: null };
  let state = reduce(emptyState(), { type: 'ADD_CARD', card: issueTopic, source: sceneSource, now });
  state = reduce(state, { type: 'ADD_CARD', card: issueRelease, source: articleSource, now });
  state = reduce(state, { type: 'ADD_CARD', card: issueTopic, source: articleSource, now });
  const queue = todayQueue(state, now);
  assert.equal(queue.length, 2);
  const topic = queue.find((card) => card.content.meaning === '議題');
  const release = queue.find((card) => card.content.meaning === '發行');
  assert.deepEqual(topic.sources, [sceneSource, articleSource]);
  assert.deepEqual(release.sources, [articleSource]);
});

test('only site-internal paths and known kinds are accepted as sources', () => {
  assert.equal(isInternalHref('/scenes/cafe-breakfast/'), true);
  for (const href of ['//evil.example', 'javascript:alert(1)', 'https://evil.example/', '', 'scenes/x/']) assert.equal(isInternalHref(href), false, href);
  assert.equal(isCardSourceKind('scene'), true);
  assert.equal(isCardSourceKind('video'), false);
});

const exportTime = new Date(2026, 9, 20, 18, 30, 0);

test('a backup round-trips to an equivalent state and records the export time', () => {
  let state = reduce(emptyState(), { type: 'ADD_CARD', card: coffee, source: sceneSource, now });
  state = reduce(state, { type: 'ADD_CARD', card: coffee, source: articleSource, now });
  state = reduce(state, { type: 'GRADE', cardKey: key, grade: 'good', now });
  const parsed = parseBackup(serializeBackup(state, exportTime));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.cardCount, 1);
  assert.equal(parsed.state.lastExportedAt, exportTime.toISOString());
  assert.deepEqual({ ...parsed.state, lastExportedAt: null }, state);
  assert.equal(state.lastExportedAt, null);
});

test('the backup file is a versioned envelope', () => {
  const file = JSON.parse(serializeBackup(emptyState(), exportTime));
  assert.equal(file.format, 'carlenglish-review-backup');
  assert.equal(file.version, 1);
  assert.equal(file.exportedAt, exportTime.toISOString());
  assert.equal(file.state.version, 1);
});

test('broken backup files are rejected with the matching reason', () => {
  const good = JSON.parse(serializeBackup(reduce(emptyState(), { type: 'ADD_CARD', card: coffee, source: sceneSource, now }), exportTime));
  const cases = [
    ['not json', '{oops', 'not-json'],
    ['array', [], 'wrong-format'],
    ['other format', { ...good, format: 'anki' }, 'wrong-format'],
    ['no format', { version: 1 }, 'wrong-format'],
    ['future version', { ...good, version: 2 }, 'unsupported-version'],
    ['missing state', { format: good.format, version: 1, exportedAt: good.exportedAt }, 'corrupt'],
    ['bad card', { ...good, state: { ...good.state, cards: [{ key: 'x' }] } }, 'corrupt'],
    ['bad export time', { ...good, state: { ...good.state, lastExportedAt: 'yesterday' } }, 'corrupt'],
    ['evil href', { ...good, state: { ...good.state, cards: [{ ...good.state.cards[0], sources: [{ ...sceneSource, href: '//evil.example' }] }] } }, 'corrupt'],
  ];
  for (const [name, input, reason] of cases) {
    const result = parseBackup(typeof input === 'string' ? input : JSON.stringify(input));
    assert.equal(result.ok, false, name);
    assert.equal(result.reason, reason, name);
    assert.match(result.message, /[一-鿿]/, name);
  }
});

test('an empty state carries the reserved settings fields', () => {
  assert.equal(emptyState().dailyNewLimit, null);
  assert.deepEqual(emptyState().subscriptions, []);
});

test('backup validation covers reserved fields, unsafe paths, key integrity and date format', () => {
  const base = JSON.parse(serializeBackup(reduce(emptyState(), { type: 'ADD_CARD', card: coffee, source: sceneSource, now }), exportTime));
  const withState = (change) => ({ ...base, state: { ...base.state, ...change } });
  const withCard = (change) => withState({ cards: [{ ...base.state.cards[0], ...change }] });
  const withSchedule = (change) => withCard({ schedule: { ...base.state.cards[0].schedule, ...change } });
  const missing = (field) => { const state = { ...base.state }; delete state[field]; return { ...base, state }; };
  const rejected = {
    'missing dailyNewLimit': missing('dailyNewLimit'),
    'missing subscriptions': missing('subscriptions'),
    'limit zero': withState({ dailyNewLimit: 0 }),
    'limit too high': withState({ dailyNewLimit: 51 }),
    'limit fractional': withState({ dailyNewLimit: 1.5 }),
    'limit as text': withState({ dailyNewLimit: '10' }),
    'malformed subscription': withState({ subscriptions: [{ id: 'ngsl' }] }),
    'subscriptions not an array': withState({ subscriptions: {} }),
    'external audio': withCard({ content: { ...coffee, audioSrc: 'https://evil.example/a.mp3' } }),
    'protocol-relative audio': withCard({ content: { ...coffee, audioSrc: '//evil.example/a.mp3' } }),
    'duplicate keys': withState({ cards: [base.state.cards[0], base.state.cards[0]] }),
    'key does not match content': withCard({ key: 'something-else' }),
    'numeric due': withSchedule({ due: '1' }),
    'date-only last review': withSchedule({ last_review: '2026-10-14' }),
    'numeric export time': withState({ lastExportedAt: '1' }),
  };
  for (const [name, input] of Object.entries(rejected)) {
    const result = parseBackup(JSON.stringify(input));
    assert.equal(result.ok, false, name);
    assert.equal(result.reason, 'corrupt', name);
  }
  assert.equal(parseBackup(JSON.stringify(withState({ dailyNewLimit: 25 }))).ok, true);
  assert.equal(parseBackup(JSON.stringify(withSchedule({ last_review: '2026-10-14T09:00:00+08:00' }))).ok, true);
});

test('the backup reminder needs cards and a missing or stale export', () => {
  const week = 7 * 24 * 60 * minutes(1);
  const withCards = reduce(emptyState(), { type: 'ADD_CARD', card: coffee, source: sceneSource, now });
  const exportedAt = (date) => ({ ...withCards, lastExportedAt: date.toISOString() });
  assert.equal(needsBackupReminder(emptyState(), now), null);
  assert.equal(needsBackupReminder(withCards, now), 'never');
  assert.equal(needsBackupReminder(exportedAt(new Date(now.getTime() - week)), now), null);
  assert.equal(needsBackupReminder(exportedAt(new Date(now.getTime() - week - minutes(1))), now), 'stale');
  assert.equal(needsBackupReminder(exportedAt(now), now), null);
  assert.equal(needsBackupReminder({ ...emptyState(), lastExportedAt: new Date(2020, 0, 1).toISOString() }, now), null);
});

test('state survives a JSON round trip with the same queue', () => {
  const state = reduce(emptyState(), { type: 'ADD_CARD', card: coffee, source: sceneSource, now });
  const graded = reduce(state, { type: 'GRADE', cardKey: key, grade: 'good', now });
  const restored = JSON.parse(JSON.stringify(graded));
  assert.equal(restored.version, 1);
  const later = new Date(now.getTime() + minutes(10));
  assert.equal(todayQueue(restored, later).length, 1);
  const again = reduce(restored, { type: 'GRADE', cardKey: key, grade: 'good', now: later });
  assert.ok(nextDue(again, key).getTime() > later.getTime());
});

const articleSource = { kind: 'article', id: 'library-news', title: '圖書館消息', href: '/articles/library-news/' };

test('removing one of two sources keeps the card with the other source', () => {
  let state = reduce(emptyState(), { type: 'ADD_CARD', card: coffee, source: sceneSource, now });
  state = reduce(state, { type: 'ADD_CARD', card: coffee, source: articleSource, now });
  state = reduce(state, { type: 'REMOVE_CARD', cardKey: key, source: sceneSource });
  const queue = todayQueue(state, now);
  assert.equal(queue.length, 1);
  assert.deepEqual(queue[0].sources, [articleSource]);
});

test('removing the last source deletes a never-reviewed card but keeps a reviewed one', () => {
  const added = reduce(emptyState(), { type: 'ADD_CARD', card: coffee, source: sceneSource, now });
  assert.equal(reduce(added, { type: 'REMOVE_CARD', cardKey: key, source: sceneSource }).cards.length, 0);
  const reviewed = reduce(added, { type: 'GRADE', cardKey: key, grade: 'again', now });
  const kept = reduce(reviewed, { type: 'REMOVE_CARD', cardKey: key, source: sceneSource });
  assert.equal(kept.cards.length, 1);
  assert.deepEqual(kept.cards[0].sources, []);
  assert.ok(nextDue(kept, key));
});

test('adding the same word and meaning from another source merges into one card keeping the first snapshot', () => {
  let state = reduce(emptyState(), { type: 'ADD_CARD', card: coffee, source: sceneSource, now });
  state = reduce(state, { type: 'ADD_CARD', card: { ...coffee, english: ' Coffee ', example: 'Different.' }, source: articleSource, now });
  state = reduce(state, { type: 'ADD_CARD', card: coffee, source: articleSource, now });
  const queue = todayQueue(state, now);
  assert.equal(queue.length, 1);
  assert.deepEqual(queue[0].content, coffee);
  assert.deepEqual(queue[0].sources, [sceneSource, articleSource]);
});

const wordsOf = (count) => Array.from({ length: count }, (_, index) => ({ english: `word${index}`, meaning: `字${index}`, example: null, audioSrc: null }));
const addAll = (state, words, at) => words.reduce((acc, card) => reduce(acc, { type: 'ADD_CARD', card, source: sceneSource, now: at }), state);
const englishOf = (queue) => queue.map((card) => card.content.english);
const nextMorning = new Date(2026, 9, 15, 8, 0, 0);

test('only the default 10 new cards are offered per day, oldest first', () => {
  const state = addAll(emptyState(), wordsOf(13), now);
  assert.deepEqual(englishOf(todayQueue(state, now)), wordsOf(10).map((card) => card.english));
  const counts = reviewCounts(state, now, 0);
  assert.equal(counts.due, 10);
  assert.equal(counts.newCards, 10);
});

test('a custom limit applies, and the daily limit setting is validated by the reducer', () => {
  let state = addAll(emptyState(), wordsOf(5), now);
  state = reduce(state, { type: 'SET_DAILY_NEW_LIMIT', limit: 2 });
  assert.equal(state.dailyNewLimit, 2);
  assert.equal(todayQueue(state, now).length, 2);
  assert.equal(reviewCounts(state, now, 0).due, 2);
  for (const bad of [0, 51, 1.5, NaN, '5']) assert.equal(reduce(state, { type: 'SET_DAILY_NEW_LIMIT', limit: bad }), state, String(bad));
  assert.equal(reduce(state, { type: 'SET_DAILY_NEW_LIMIT', limit: null }).dailyNewLimit, null);
});

test('cards graded today use up the day\'s new-card allowance, so refreshing does not hand out more', () => {
  const words = wordsOf(5);
  let state = reduce(addAll(emptyState(), words, now), { type: 'SET_DAILY_NEW_LIMIT', limit: 2 });
  state = reduce(state, { type: 'GRADE', cardKey: cardKey(words[0]), grade: 'again', now });
  state = reduce(state, { type: 'GRADE', cardKey: cardKey(words[1]), grade: 'again', now });
  const later = new Date(now.getTime() + minutes(11));
  assert.deepEqual(englishOf(todayQueue(state, later)), ['word0', 'word1']);
  assert.equal(reviewCounts(state, later, 0).newCards, 0);
});

test('overflow cards are carried over and come in order on following days', () => {
  const words = wordsOf(5);
  let state = reduce(addAll(emptyState(), words, now), { type: 'SET_DAILY_NEW_LIMIT', limit: 2 });
  for (const card of words.slice(0, 2)) state = reduce(state, { type: 'GRADE', cardKey: cardKey(card), grade: 'good', now });
  // 當天晚上：word0／word1 的學習步驟早已到期，但新卡額度用完，word2 起不發。
  assert.deepEqual(englishOf(todayQueue(state, new Date(2026, 9, 14, 23, 0, 0))), ['word0', 'word1']);
  assert.deepEqual(englishOf(todayQueue(state, nextMorning)), ['word0', 'word1', 'word2', 'word3']);
  assert.equal(reviewCounts(state, nextMorning, 0).newCards, 2);
});

test('due old cards are never held back by the limit', () => {
  const words = wordsOf(4);
  let state = reduce(addAll(emptyState(), words, now), { type: 'SET_DAILY_NEW_LIMIT', limit: 1 });
  state = addAll(state, wordsOf(6).slice(4), now);
  for (const card of words) state = reduce(state, { type: 'GRADE', cardKey: cardKey(card), grade: 'again', now });
  const later = new Date(now.getTime() + minutes(11));
  // 額度（1）已被今天學過的 4 張用完：4 張舊卡全部出現，新卡一張都不發。
  assert.deepEqual(englishOf(todayQueue(state, later)), words.map((card) => card.english));
  assert.equal(reviewCounts(state, later, 0).due, 4);
});

test('the first grade stamps firstReviewedAt once and later grades keep it', () => {
  const state = reduce(emptyState(), { type: 'ADD_CARD', card: coffee, source: sceneSource, now });
  assert.equal(state.cards[0].firstReviewedAt, null);
  const first = reduce(state, { type: 'GRADE', cardKey: key, grade: 'again', now });
  assert.equal(first.cards[0].firstReviewedAt, now.toISOString());
  const second = reduce(first, { type: 'GRADE', cardKey: key, grade: 'good', now: new Date(now.getTime() + minutes(11)) });
  assert.equal(second.cards[0].firstReviewedAt, now.toISOString());
});

test('tomorrow\'s count includes the carried-over new cards up to the limit', () => {
  const state = reduce(addAll(emptyState(), wordsOf(5), now), { type: 'SET_DAILY_NEW_LIMIT', limit: 2 });
  assert.equal(reviewCounts(state, now, 0).tomorrow, 2);
});

test('firstReviewedAt is validated in stored state and survives a backup round trip', () => {
  const graded = reduce(reduce(emptyState(), { type: 'ADD_CARD', card: coffee, source: sceneSource, now }), { type: 'GRADE', cardKey: key, grade: 'good', now });
  const parsed = parseBackup(serializeBackup(graded, exportTime));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.state.cards[0].firstReviewedAt, now.toISOString());
  const file = JSON.parse(serializeBackup(graded, exportTime));
  for (const value of ['yesterday', 5, undefined]) {
    const card = { ...file.state.cards[0] };
    if (value === undefined) delete card.firstReviewedAt; else card.firstReviewedAt = value;
    assert.equal(parseBackup(JSON.stringify({ ...file, state: { ...file.state, cards: [card] } })).ok, false, String(value));
  }
});
