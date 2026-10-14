import assert from 'node:assert/strict';
import test from 'node:test';
import { cardKey, emptyState, isCardSourceKind, isInternalHref, nextDue, reduce, reviewCounts, todayQueue } from '../src/lib/review-deck.ts';

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
  const counts = reviewCounts(state, now);
  assert.equal(counts.due, 4); // 到今天結束前會到期：coffee、tea、juice，加上稍後才到期的 milk
  assert.equal(counts.newCards, 2); // coffee、juice
  assert.equal(counts.tomorrow, 1);
  assert.equal(counts.laterToday, 1);
  assert.equal(counts.nextLaterToday.getTime(), nextDue(state, at(words[2])).getTime());
});

test('only site-internal paths and known kinds are accepted as sources', () => {
  assert.equal(isInternalHref('/scenes/cafe-breakfast/'), true);
  for (const href of ['//evil.example', 'javascript:alert(1)', 'https://evil.example/', '', 'scenes/x/']) assert.equal(isInternalHref(href), false, href);
  assert.equal(isCardSourceKind('scene'), true);
  assert.equal(isCardSourceKind('video'), false);
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
