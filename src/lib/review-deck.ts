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

export interface ReviewState {
  version: 1;
  cards: StoredCard[];
  lastExportedAt: string | null;
  /** 每日新卡上限；null 表示使用預設值（工單 06 才會使用）。 */
  dailyNewLimit: number | null;
  /** 詞表訂閱；目前一律為空陣列，元素形狀留給工單 07。 */
  subscriptions: never[];
}

/** 匯入成功等外部改動儲存後，通知複習頁重新讀取。 */
export const reviewChangedEvent = 'carlenglish:review-changed';
/** 備份檔大小上限（位元組），超過就不讀內容。 */
export const maxBackupBytes = 1_048_576;

const scheduler = fsrs();

export function emptyState(): ReviewState {
  return { version: 1, cards: [], lastExportedAt: null, dailyNewLimit: null, subscriptions: [] };
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

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
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
    && value.sources.every(isSource) && isSchedule(value.schedule);
}

const isDailyNewLimit = (value: unknown) => value === null || (Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 50);

/** 狀態形狀的唯一驗證：本機儲存讀回與備份匯入共用。 */
export function parseReviewState(value: unknown): { ok: true; state: ReviewState } | { ok: false } {
  const valid = isRecord(value) && value.version === 1 && Array.isArray(value.cards) && value.cards.every(isStoredCard)
    && new Set(value.cards.map((card: { key: string }) => card.key)).size === value.cards.length
    && (value.lastExportedAt === null || isDate(value.lastExportedAt))
    && isDailyNewLimit(value.dailyNewLimit) && Array.isArray(value.subscriptions) && value.subscriptions.length === 0;
  return valid ? { ok: true, state: value as unknown as ReviewState } : { ok: false };
}

export const backupFormat = 'carlenglish-review-backup';

export type BackupFailure = 'not-json' | 'wrong-format' | 'unsupported-version' | 'corrupt';
export type BackupParseResult =
  | { ok: true; state: ReviewState; cardCount: number }
  | { ok: false; reason: BackupFailure; message: string };

const backupMessages: Record<BackupFailure, string> = {
  'not-json': '這不是有效的備份檔：檔案內容不是 JSON。',
  'wrong-format': '這不是 CarlEnglish 的複習備份檔。',
  'unsupported-version': '這個備份檔的版本不支援，請用較新的網站版本開啟。',
  corrupt: '備份檔的內容損壞或缺少欄位，無法匯入。',
};

export function serializeBackup(state: ReviewState, now: Date): string {
  const exportedAt = now.toISOString();
  return JSON.stringify({ format: backupFormat, version: 1, exportedAt, state: { ...state, lastExportedAt: exportedAt } });
}

export function parseBackup(text: string): BackupParseResult {
  const fail = (reason: BackupFailure): BackupParseResult => ({ ok: false, reason, message: backupMessages[reason] });
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    return fail('not-json');
  }
  if (!isRecord(file) || file.format !== backupFormat) return fail('wrong-format');
  if (file.version !== 1) return fail('unsupported-version');
  const parsed = parseReviewState(file.state);
  return parsed.ok ? { ok: true, state: parsed.state, cardCount: parsed.state.cards.length } : fail('corrupt');
}
