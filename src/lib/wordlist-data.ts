import { isInternalHref, isRecord } from './guards.ts';
import { cardKey, type StoredCard, type Subscription } from './review-state.ts';

// 詞表在建置時輸出成靜態 JSON（/wordlists/<id>.json），複習頁只在有訂閱時載入。
// 這個模組不碰檔案系統，讓瀏覽器端的程式碼可以共用型別與驗證。

export interface WordListSource { name: string; authors: string; url: string; adaptation: string }
export interface WordListLicense { name: string; url: string }

export interface WordListEntryData {
  id: string;
  /** 詞頻序號，從 1 起連續遞增。 */
  rank: number;
  english: string;
  meaning: string;
  example: string;
  audioSrc: string;
}

export interface WordListData {
  id: string;
  name: string;
  description: string;
  source: WordListSource;
  license: WordListLicense;
  entries: WordListEntryData[];
}

export const wordListUrl = (id: string) => `/wordlists/${id}.json`;

/** 來源標示的簡短寫法，用在字卡背面與詞表清單。 */
export function attributionText(list: { source: Pick<WordListSource, 'name' | 'authors'>; license: Pick<WordListLicense, 'name'> }): string {
  return `${list.source.name}（${list.source.authors}），${list.license.name}`;
}

const isNonblank = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

/**
 * 每頁（導覽列徽章與複習頁）都會帶的極小摘要，不含詞條：最後一個詞頻序號與其下被排除的序號，
 * 足以算出一份訂閱還剩幾個詞，頁面因此不必載入整份詞表。
 */
export interface WordListSummary { id: string; lastRank: number; excludedRanks: number[] }

export function summarizeWordList(list: { id: string; entries: { rank: number }[]; excluded?: { rank: number }[] }): WordListSummary {
  const lastRank = list.entries.at(-1)?.rank ?? 0;
  return { id: list.id, lastRank, excludedRanks: (list.excluded ?? []).map((item) => item.rank).filter((rank) => rank < lastRank).sort((a, b) => a - b) };
}

/** 訂閱處理到 issuedThrough 之後，這份詞表還剩幾個詞（排除的序號不算；已是字卡而之後被跳過的，會高估一點）。 */
export function remainingWords(summary: WordListSummary, issuedThrough: number): number {
  if (issuedThrough >= summary.lastRank) return 0;
  return summary.lastRank - issuedThrough - summary.excludedRanks.filter((rank) => rank > issuedThrough).length;
}

/**
 * 複習頁用的精確剩餘數：訂閱還沒處理到、且還不是字卡的詞。取消後重新訂閱時 issuedThrough 會歸零，
 * 前面已發出的詞都已是字卡，所以不能只看序號（那是徽章用的 remainingWords 摘要估算）。
 */
export function unissuedWordCount(list: Pick<WordListData, 'entries'>, subscription: Pick<Subscription, 'issuedThrough'>, cards: Pick<StoredCard, 'key'>[]): number {
  const keys = new Set(cards.map((card) => card.key));
  return list.entries.filter((entry) => entry.rank > subscription.issuedThrough && !keys.has(cardKey(entry))).length;
}

export function unissuedFromLists(subscriptions: Pick<Subscription, 'wordListId' | 'issuedThrough'>[], summaries: WordListSummary[]): number {
  return subscriptions.reduce((total, subscription) => {
    const summary = summaries.find((candidate) => candidate.id === subscription.wordListId);
    return total + (summary ? remainingWords(summary, subscription.issuedThrough) : 0);
  }, 0);
}

export function parseWordListSummaries(value: unknown): WordListSummary[] | null {
  if (!Array.isArray(value)) return null;
  const valid = value.every((item) => isRecord(item) && isNonblank(item.id) && Number.isInteger(item.lastRank) && (item.lastRank as number) >= 0
    && Array.isArray(item.excludedRanks) && item.excludedRanks.every((rank) => Number.isInteger(rank) && rank > 0));
  return valid ? (value as WordListSummary[]) : null;
}

const isHttpsUrl = (value: unknown): boolean => {
  try {
    return typeof value === 'string' && new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

/** 瀏覽器端用：檢查 fetch 回來的詞表 JSON，通過才可用來發字卡；id 必須是請求的那份。 */
export function parseWordListData(value: unknown, expectedId: string): WordListData | null {
  if (!isRecord(value) || value.id !== expectedId || !isNonblank(value.name) || !isNonblank(value.description)) return null;
  const { source, license, entries } = value;
  if (!isRecord(source) || !['name', 'authors', 'adaptation'].every((field) => isNonblank(source[field])) || !isHttpsUrl(source.url)) return null;
  if (!isRecord(license) || !isNonblank(license.name) || !isHttpsUrl(license.url)) return null;
  if (!Array.isArray(entries) || entries.length === 0) return null;
  let previousRank = 0;
  const ids = new Set<string>();
  for (const entry of entries) {
    if (!isRecord(entry) || !isNonblank(entry.id) || !isNonblank(entry.english) || !isNonblank(entry.meaning) || !isNonblank(entry.example)) return null;
    if (!Number.isInteger(entry.rank) || (entry.rank as number) <= previousRank || !isInternalHref(entry.audioSrc)) return null;
    previousRank = entry.rank as number;
    if (ids.has(entry.id as string)) return null;
    ids.add(entry.id as string);
  }
  return value as unknown as WordListData;
}
