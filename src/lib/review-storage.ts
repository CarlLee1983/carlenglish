import { emptyState, isCardSourceKind, isInternalHref, type ReviewState } from './review-deck.ts';

/** 複習紀錄唯一的本機儲存位置（ADR 0002）；換成後端儲存時替換這個模組。 */
export const reviewStorageKey = 'carlenglish.review';

export type StorageFailure = 'unavailable' | 'corrupt';
export type LoadResult = { ok: true; state: ReviewState } | { ok: false; reason: StorageFailure; error: unknown };
export type SaveResult = { ok: true } | { ok: false; reason: 'unavailable'; error: unknown };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string';
const isTextOrNull = (value: unknown) => value === null || isText(value);
const isNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
const isDate = (value: unknown) => isText(value) && !Number.isNaN(Date.parse(value));

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
  return isText(content.english) && isText(content.meaning) && isTextOrNull(content.example) && isTextOrNull(content.audioSrc)
    && value.sources.every(isSource) && isSchedule(value.schedule);
}

function isReviewState(value: unknown): value is ReviewState {
  return isRecord(value) && value.version === 1 && Array.isArray(value.cards) && value.cards.every(isStoredCard);
}

/** 預設用 window.localStorage；存取它本身就可能丟錯（隱私模式、被封鎖），所以在 try 內才解析。 */
export function loadReviewState(storage?: Pick<Storage, 'getItem'>): LoadResult {
  let raw: string | null;
  try {
    raw = (storage ?? window.localStorage).getItem(reviewStorageKey);
  } catch (error) {
    return { ok: false, reason: 'unavailable', error };
  }
  if (raw === null) return { ok: true, state: emptyState() };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isReviewState(parsed)) return { ok: true, state: parsed };
    return { ok: false, reason: 'corrupt', error: new Error('Stored review data has an unexpected shape.') };
  } catch (error) {
    return { ok: false, reason: 'corrupt', error };
  }
}

export function saveReviewState(state: ReviewState, storage?: Pick<Storage, 'setItem'>): SaveResult {
  try {
    (storage ?? window.localStorage).setItem(reviewStorageKey, JSON.stringify(state));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: 'unavailable', error };
  }
}
