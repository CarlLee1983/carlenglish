import type { CardInput } from 'ts-fsrs';

export interface CardContent { english: string; meaning: string; example: string | null; audioSrc: string | null }
export const cardSourceKinds = ['scene', 'article', 'wordlist'] as const;
export type CardSourceKind = (typeof cardSourceKinds)[number];
export type Grade = 'again' | 'good';
export interface CardSource { kind: CardSourceKind; id: string; title: string; href: string }

/** FSRS 排程狀態；日期以 ISO 字串存放，整份狀態可直接 JSON 序列化。 */
export type StoredSchedule = Omit<CardInput, 'due' | 'last_review'> & { due: string; last_review?: string };

export interface StoredCard {
  key: string;
  content: CardContent;
  sources: CardSource[];
  schedule: StoredSchedule;
  /** 第一次被評分的時間（ISO）；null 表示從未評分，仍是新卡。每日新卡額度以它計算。 */
  firstReviewedAt: string | null;
}

export interface ReviewState {
  version: 1;
  cards: StoredCard[];
  lastExportedAt: string | null;
  /** 每日新卡上限；null 表示使用預設值（defaultDailyNewLimit）。 */
  dailyNewLimit: number | null;
  /** 詞表訂閱；目前一律為空陣列，元素形狀留給工單 07。 */
  subscriptions: never[];
}

/** 儲存被改動後的通知事件；detail 是發出者，發出者自己的監聽器要忽略，免得用舊資料蓋掉剛改的記憶體狀態。 */
export const reviewChangedEvent = 'carlenglish:review-changed';
export type ReviewChangeSource = 'review-page' | 'review-add' | 'review-backup';


export function emptyState(): ReviewState {
  return { version: 1, cards: [], lastExportedAt: null, dailyNewLimit: null, subscriptions: [] };
}

export function cardKey(content: Pick<CardContent, 'english' | 'meaning'>): string {
  const normalize = (value: string) => value.trim().toLowerCase();
  return `${normalize(content.english)}\n${normalize(content.meaning)}`;
}

export const sameSource = (a: CardSource, b: CardSource) => a.kind === b.kind && a.id === b.id;

export const defaultDailyNewLimit = 10;
export const minDailyNewLimit = 1;
export const maxDailyNewLimit = 50;

/** 每日新卡上限的唯一驗證：null（預設）或 1–50 的整數。 */
export const isDailyNewLimit = (value: unknown): value is number | null => value === null
  || (Number.isInteger(value) && (value as number) >= minDailyNewLimit && (value as number) <= maxDailyNewLimit);

export const effectiveDailyNewLimit = (state: ReviewState): number => state.dailyNewLimit ?? defaultDailyNewLimit;

const isNewCard = (card: StoredCard) => card.firstReviewedAt === null;

const startOfLocalDay = (date: Date, offsetDays = 0) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + offsetDays);

/** 今天（本地時間日界）還能發出的新卡張數：上限減去今天第一次被評分的卡數。 */
function newCardAllowance(state: ReviewState, now: Date): number {
  const start = startOfLocalDay(now).getTime();
  const end = startOfLocalDay(now, 1).getTime();
  const startedToday = state.cards.filter((card) => {
    if (card.firstReviewedAt === null) return false;
    const time = new Date(card.firstReviewedAt).getTime();
    return time >= start && time < end;
  }).length;
  return Math.max(0, effectiveDailyNewLimit(state) - startedToday);
}

/** 到期的舊卡全部出現，不受上限；新卡依加入先後，只取今天剩餘額度。 */
export function todayQueue(state: ReviewState, now: Date): StoredCard[] {
  const due = state.cards.filter((card) => new Date(card.schedule.due).getTime() <= now.getTime());
  const newCards = due.filter(isNewCard).slice(0, newCardAllowance(state, now));
  return [...due.filter((card) => !isNewCard(card)), ...newCards];
}

export interface ReviewCounts {
  /** 到今天（本地時間）結束前會到期的卡，含新卡（只算到今天額度為止）與稍後才到期的學習步驟。 */
  due: number;
  /** due 之中從未複習過的新卡，已受每日上限限制。 */
  newCards: number;
  /** due 之中現在還沒到期、今天稍後才到期的張數。 */
  laterToday: number;
  /** laterToday 之中最早到期的時間，沒有則為 null。 */
  nextLaterToday: Date | null;
  /** 明天（本地時間）預計到期：明天到期的舊卡，加上順延、明天可發出的新卡。 */
  tomorrow: number;
}

export function reviewCounts(state: ReviewState, now: Date): ReviewCounts {
  const startOfTomorrow = startOfLocalDay(now, 1);
  const startOfDayAfter = startOfLocalDay(now, 2);
  const dueTodayOld = state.cards.filter((card) => !isNewCard(card) && new Date(card.schedule.due).getTime() < startOfTomorrow.getTime());
  const dueNew = state.cards.filter((card) => isNewCard(card) && new Date(card.schedule.due).getTime() < startOfTomorrow.getTime());
  const newToday = Math.min(dueNew.length, newCardAllowance(state, now));
  const later = dueTodayOld.map((card) => new Date(card.schedule.due))
    .filter((date) => date.getTime() > now.getTime())
    .sort((a, b) => a.getTime() - b.getTime());
  const dueTomorrow = state.cards.filter((card) => {
    const time = new Date(card.schedule.due).getTime();
    return time >= startOfTomorrow.getTime() && time < startOfDayAfter.getTime();
  }).length;
  // 假設今天發出的新卡都學完，被順延的新卡明天最多再發一個上限。
  const carriedOver = Math.min(effectiveDailyNewLimit(state), dueNew.length - newToday);
  return {
    due: dueTodayOld.length + newToday,
    newCards: newToday,
    laterToday: later.length,
    nextLaterToday: later[0] ?? null,
    tomorrow: dueTomorrow + carriedOver,
  };
}

export const isCardSourceKind = (value: unknown): value is CardSourceKind => cardSourceKinds.includes(value as CardSourceKind);

/** 來源連結只接受站內路徑：以單一 `/` 開頭，排除 `//host` 與 `javascript:` 等。 */
export const isInternalHref = (value: unknown): value is string => typeof value === 'string' && /^\/(?![/\\])/.test(value);

export const backupReminderDays = 7;

/** 'never'：有字卡但從未匯出；'stale'：距上次匯出超過 backupReminderDays 天；null：不需要提醒。 */
export function needsBackupReminder(state: ReviewState, now: Date): 'never' | 'stale' | null {
  if (state.cards.length === 0) return null;
  if (state.lastExportedAt === null) return 'never';
  const elapsed = now.getTime() - new Date(state.lastExportedAt).getTime();
  return elapsed > backupReminderDays * 24 * 60 * 60 * 1000 ? 'stale' : null;
}

export function hasSource(state: ReviewState, key: string, source: CardSource): boolean {
  return state.cards.some((card) => card.key === key && card.sources.some((candidate) => sameSource(candidate, source)));
}

export function nextDue(state: ReviewState, key: string): Date | null {
  const card = state.cards.find((candidate) => candidate.key === key);
  return card ? new Date(card.schedule.due) : null;
}

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string';
const isTextOrNull = (value: unknown) => value === null || isText(value);
const isNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const isDate = (value: unknown) => isText(value) && isoDatePattern.test(value) && !Number.isNaN(Date.parse(value));
const isInternalPathOrNull = (value: unknown) => value === null || isInternalHref(value);

function isSource(value: unknown): boolean {
  return isRecord(value) && isCardSourceKind(value.kind) && isText(value.id) && isText(value.title) && isInternalHref(value.href);
}

function isSchedule(value: unknown): boolean {
  return isRecord(value) && isDate(value.due) && (value.last_review === undefined || isDate(value.last_review))
    && ['stability', 'difficulty', 'elapsed_days', 'scheduled_days', 'learning_steps', 'reps', 'lapses'].every((field) => isNumber(value[field]))
    && [0, 1, 2, 3].includes(value.state as number);
}

function isStoredCard(value: unknown): boolean {
  if (!isRecord(value) || !isText(value.key) || !isRecord(value.content) || !Array.isArray(value.sources)) return false;
  const { content } = value;
  return isText(content.english) && isText(content.meaning) && isTextOrNull(content.example) && isInternalPathOrNull(content.audioSrc)
    && value.key === cardKey({ english: content.english, meaning: content.meaning })
    && value.sources.every(isSource) && isSchedule(value.schedule) && (value.firstReviewedAt === null || isDate(value.firstReviewedAt));
}

/** 狀態形狀的唯一驗證：本機儲存讀回與備份匯入共用。 */
export function parseReviewState(value: unknown): { ok: true; state: ReviewState } | { ok: false } {
  const valid = isRecord(value) && value.version === 1 && Array.isArray(value.cards) && value.cards.every(isStoredCard)
    && new Set(value.cards.map((card: { key: string }) => card.key)).size === value.cards.length
    && (value.lastExportedAt === null || isDate(value.lastExportedAt))
    && isDailyNewLimit(value.dailyNewLimit) && Array.isArray(value.subscriptions) && value.subscriptions.length === 0;
  return valid ? { ok: true, state: value as unknown as ReviewState } : { ok: false };
}
