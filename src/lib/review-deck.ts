import { Rating, createEmptyCard, fsrs, type Card } from 'ts-fsrs';
import { cardKey, isDailyNewLimit, isNewCard, newCardAllowance, sameSource, type CardContent, type CardSource, type Grade, type ReviewState, type StoredCard, type StoredSchedule, type Subscription } from './review-state.ts';
import type { WordListData } from './wordlist-data.ts';

// 這個模組是唯一需要 ts-fsrs 的地方；不需要排程演算法的純函式都在 review-state.ts，讓每頁載入的腳本不必帶進 ts-fsrs。

export type Action =
  | { type: 'ADD_CARD'; card: CardContent; source: CardSource; now: Date }
  | { type: 'REMOVE_CARD'; cardKey: string; source: CardSource }
  | { type: 'GRADE'; cardKey: string; grade: Grade; now: Date }
  | { type: 'SET_DAILY_NEW_LIMIT'; limit: number | null }
  | { type: 'SUBSCRIBE'; wordListId: string; now: Date }
  | { type: 'UNSUBSCRIBE'; wordListId: string }
  | { type: 'ISSUE_NEW_CARDS'; wordLists: WordListData[]; now: Date };

const scheduler = fsrs();

function serializeSchedule(card: Card): StoredSchedule {
  const { due, last_review, ...rest } = card;
  return { ...rest, due: due.toISOString(), ...(last_review ? { last_review: last_review.toISOString() } : {}) };
}

const newSchedule = (now: Date): StoredSchedule => serializeSchedule(createEmptyCard(now));

/**
 * 依詞頻把訂閱詞表的詞發成新卡。今天的新卡額度先給已在等的新卡（手動加入的、前幾天發了還沒學的），
 * 剩下的才由各訂閱詞表輪流補上；詞表裡已經是字卡的詞跳過，不占額度。額度用完或詞表發完就原樣回傳。
 */
function issueNewCards(state: ReviewState, wordLists: WordListData[], now: Date): ReviewState {
  let slots = newCardAllowance(state, now) - state.cards.filter(isNewCard).length;
  if (slots <= 0 || state.subscriptions.length === 0) return state;
  const lists = new Map(wordLists.map((list) => [list.id, list]));
  const subscriptions = state.subscriptions.map((subscription) => ({ ...subscription }));
  const cards = [...state.cards];
  const keys = new Set(cards.map((card) => card.key));
  let changed = false;

  /** 讓一份訂閱前進到下一個尚未是字卡的詞並發出；回傳這份詞表之後是否還有詞。 */
  const issueNext = (subscription: Subscription, list: WordListData): boolean => {
    for (const entry of list.entries) {
      if (entry.rank <= subscription.issuedThrough) continue;
      subscription.issuedThrough = entry.rank;
      changed = true;
      const content: CardContent = { english: entry.english, meaning: entry.meaning, example: entry.example, audioSrc: entry.audioSrc };
      const key = cardKey(content);
      if (keys.has(key)) continue;
      keys.add(key);
      cards.push({ key, content, sources: [{ kind: 'wordlist', id: list.id, title: list.name, href: '/review/' }], schedule: newSchedule(now), firstReviewedAt: null });
      subscription.issuedCount += 1;
      slots -= 1;
      break;
    }
    return list.entries.some((entry) => entry.rank > subscription.issuedThrough);
  };

  let active = subscriptions.filter((subscription) => lists.has(subscription.wordListId));
  while (slots > 0 && active.length > 0) {
    active = active.filter((subscription) => slots <= 0 || issueNext(subscription, lists.get(subscription.wordListId)!));
  }
  return changed ? { ...state, cards, subscriptions } : state;
}

export function reduce(state: ReviewState, action: Action): ReviewState {
  switch (action.type) {
    case 'ADD_CARD': {
      const key = cardKey(action.card);
      const existing = state.cards.find((candidate) => candidate.key === key);
      if (existing) {
        if (existing.sources.some((source) => sameSource(source, action.source))) return state;
        const merged = { ...existing, sources: [...existing.sources, { ...action.source }] };
        return { ...state, cards: state.cards.map((candidate) => (candidate === existing ? merged : candidate)) };
      }
      const card: StoredCard = { key, content: { ...action.card }, sources: [{ ...action.source }], schedule: newSchedule(action.now), firstReviewedAt: null };
      return { ...state, cards: [...state.cards, card] };
    }
    case 'REMOVE_CARD': {
      const target = state.cards.find((candidate) => candidate.key === action.cardKey);
      if (!target) return state;
      const sources = target.sources.filter((source) => !sameSource(source, action.source));
      if (sources.length === target.sources.length) return state;
      if (sources.length === 0 && target.firstReviewedAt === null) return { ...state, cards: state.cards.filter((candidate) => candidate !== target) };
      return { ...state, cards: state.cards.map((candidate) => (candidate === target ? { ...target, sources } : candidate)) };
    }
    case 'GRADE': {
      const target = state.cards.find((candidate) => candidate.key === action.cardKey);
      if (!target) return state;
      const rating = action.grade === 'again' ? Rating.Again : Rating.Good;
      const { card } = scheduler.next(target.schedule, action.now, rating);
      const graded: StoredCard = { ...target, schedule: serializeSchedule(card), firstReviewedAt: target.firstReviewedAt ?? action.now.toISOString() };
      return { ...state, cards: state.cards.map((candidate) => (candidate === target ? graded : candidate)) };
    }
    case 'SET_DAILY_NEW_LIMIT':
      return isDailyNewLimit(action.limit) && action.limit !== state.dailyNewLimit ? { ...state, dailyNewLimit: action.limit } : state;
    case 'SUBSCRIBE':
      if (state.subscriptions.some((subscription) => subscription.wordListId === action.wordListId)) return state;
      return { ...state, subscriptions: [...state.subscriptions, { wordListId: action.wordListId, subscribedAt: action.now.toISOString(), issuedThrough: 0, issuedCount: 0 }] };
    case 'UNSUBSCRIBE':
      return state.subscriptions.some((subscription) => subscription.wordListId === action.wordListId)
        ? { ...state, subscriptions: state.subscriptions.filter((subscription) => subscription.wordListId !== action.wordListId) }
        : state;
    case 'ISSUE_NEW_CARDS':
      return issueNewCards(state, action.wordLists, action.now);
    default:
      return state;
  }
}
