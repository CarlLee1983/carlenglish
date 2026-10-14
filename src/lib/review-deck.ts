import { Rating, createEmptyCard, fsrs, type Card } from 'ts-fsrs';
import { cardKey, sameSource, type CardContent, type CardSource, type Grade, type ReviewState, type StoredCard, type StoredSchedule } from './review-state.ts';

// 這個模組是唯一需要 ts-fsrs 的地方；不需要排程演算法的純函式都在 review-state.ts，讓每頁載入的腳本不必帶進 ts-fsrs。

export type Action =
  | { type: 'ADD_CARD'; card: CardContent; source: CardSource; now: Date }
  | { type: 'REMOVE_CARD'; cardKey: string; source: CardSource }
  | { type: 'GRADE'; cardKey: string; grade: Grade; now: Date };

const scheduler = fsrs();

function serializeSchedule(card: Card): StoredSchedule {
  const { due, last_review, ...rest } = card;
  return { ...rest, due: due.toISOString(), ...(last_review ? { last_review: last_review.toISOString() } : {}) };
}

const newSchedule = (now: Date): StoredSchedule => serializeSchedule(createEmptyCard(now));

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
      const card: StoredCard = { key, content: { ...action.card }, sources: [{ ...action.source }], schedule: newSchedule(action.now) };
      return { ...state, cards: [...state.cards, card] };
    }
    case 'REMOVE_CARD': {
      const target = state.cards.find((candidate) => candidate.key === action.cardKey);
      if (!target) return state;
      const sources = target.sources.filter((source) => !sameSource(source, action.source));
      if (sources.length === target.sources.length) return state;
      if (sources.length === 0 && !target.schedule.last_review) return { ...state, cards: state.cards.filter((candidate) => candidate !== target) };
      return { ...state, cards: state.cards.map((candidate) => (candidate === target ? { ...target, sources } : candidate)) };
    }
    case 'GRADE': {
      const target = state.cards.find((candidate) => candidate.key === action.cardKey);
      if (!target) return state;
      const rating = action.grade === 'again' ? Rating.Again : Rating.Good;
      const { card } = scheduler.next(target.schedule, action.now, rating);
      const graded: StoredCard = { ...target, schedule: serializeSchedule(card) };
      return { ...state, cards: state.cards.map((candidate) => (candidate === target ? graded : candidate)) };
    }
    default:
      return state;
  }
}
