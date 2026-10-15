import { emptyState, parseReviewState, type ReviewState } from './review-state.ts';

/** 複習紀錄唯一的本機儲存位置（ADR 0002）；換成後端儲存時替換這個模組。 */
export const reviewStorageKey = 'carlenglish.review';

export type StorageFailure = 'unavailable' | 'corrupt';
export type LoadResult = { ok: true; state: ReviewState } | { ok: false; reason: StorageFailure; error: unknown };
export type SaveResult = { ok: true } | { ok: false; reason: 'unavailable'; error: unknown };

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
    const parsed = parseReviewState(JSON.parse(raw));
    if (parsed.ok) return { ok: true, state: parsed.state };
    return { ok: false, reason: 'corrupt', error: new Error('Stored review data has an unexpected shape.') };
  } catch (error) {
    return { ok: false, reason: 'corrupt', error };
  }
}

/** 主畫面說明的關閉狀態是介面偏好，不屬於複習狀態，也不進備份，所以用獨立的 key。 */
export const homeScreenHintKey = 'carlenglish.home-screen-hint-dismissed';

export function isHomeScreenHintDismissed(storage?: Pick<Storage, 'getItem'>): boolean {
  try {
    return (storage ?? window.localStorage).getItem(homeScreenHintKey) === '1';
  } catch (error) {
    console.error('Failed to read the home-screen hint preference', error);
    return false;
  }
}

export function dismissHomeScreenHint(storage?: Pick<Storage, 'setItem'>): SaveResult {
  try {
    (storage ?? window.localStorage).setItem(homeScreenHintKey, '1');
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: 'unavailable', error };
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
