import { Rating, createEmptyCard, fsrs, type Card, type CardInput } from 'ts-fsrs';

export interface CardContent { english: string; meaning: string; example: string | null; audioSrc: string | null }
export const cardSourceKinds = ['scene', 'article', 'wordlist'] as const;
export type CardSourceKind = (typeof cardSourceKinds)[number];
export type Grade = 'again' | 'good';
export interface CardSource { kind: CardSourceKind; id: string; title: string; href: string }

export type Action =
  | { type: 'ADD_CARD'; card: CardContent; source: CardSource; now: Date }
  | { type: 'REMOVE_CARD'; cardKey: string; source: CardSource }
  | { type: 'GRADE'; cardKey: string; grade: Grade; now: Date };

/** FSRS 排程狀態；日期以 ISO 字串存放，整份狀態可直接 JSON 序列化。 */
export type StoredSchedule = Omit<CardInput, 'due' | 'last_review'> & { due: string; last_review?: string };

export interface StoredCard {
  key: string;
  content: CardContent;
  sources: CardSource[];
  schedule: StoredSchedule;
}

export interface ReviewState { version: 1; cards: StoredCard[] }

const scheduler = fsrs();

export function emptyState(): ReviewState {
  return { version: 1, cards: [] };
}

export function cardKey(content: Pick<CardContent, 'english' | 'meaning'>): string {
  const normalize = (value: string) => value.trim().toLowerCase();
  return `${normalize(content.english)}\n${normalize(content.meaning)}`;
}

const sameSource = (a: CardSource, b: CardSource) => a.kind === b.kind && a.id === b.id;

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

export function todayQueue(state: ReviewState, now: Date): StoredCard[] {
  return state.cards.filter((card) => new Date(card.schedule.due).getTime() <= now.getTime());
}

export interface ReviewCounts {
  /** 到今天（本地時間）結束前會到期的卡，含新卡與稍後才到期的學習步驟。 */
  due: number;
  /** due 之中從未複習過的新卡。 */
  newCards: number;
  /** due 之中現在還沒到期、今天稍後才到期的張數。 */
  laterToday: number;
  /** laterToday 之中最早到期的時間，沒有則為 null。 */
  nextLaterToday: Date | null;
  /** 明天（本地時間）到期。 */
  tomorrow: number;
}

export function reviewCounts(state: ReviewState, now: Date): ReviewCounts {
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const startOfDayAfter = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  const dueToday = state.cards.filter((card) => new Date(card.schedule.due).getTime() < startOfTomorrow.getTime());
  const later = dueToday.map((card) => new Date(card.schedule.due))
    .filter((date) => date.getTime() > now.getTime())
    .sort((a, b) => a.getTime() - b.getTime());
  return {
    due: dueToday.length,
    newCards: dueToday.filter((card) => !card.schedule.last_review).length,
    laterToday: later.length,
    nextLaterToday: later[0] ?? null,
    tomorrow: state.cards.filter((card) => {
      const time = new Date(card.schedule.due).getTime();
      return time >= startOfTomorrow.getTime() && time < startOfDayAfter.getTime();
    }).length,
  };
}

export const isCardSourceKind = (value: unknown): value is CardSourceKind => cardSourceKinds.includes(value as CardSourceKind);

/** 來源連結只接受站內路徑：以單一 `/` 開頭，排除 `//host` 與 `javascript:` 等。 */
export const isInternalHref = (value: unknown): value is string => typeof value === 'string' && /^\/(?![/\\])/.test(value);

export function hasSource(state: ReviewState, key: string, source: CardSource): boolean {
  return state.cards.some((card) => card.key === key && card.sources.some((candidate) => sameSource(candidate, source)));
}

export function nextDue(state: ReviewState, key: string): Date | null {
  const card = state.cards.find((candidate) => candidate.key === key);
  return card ? new Date(card.schedule.due) : null;
}
