import { isInternalHref, isRecord } from './review-state.ts';

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

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

/** 瀏覽器端用：檢查 fetch 回來的詞表 JSON，通過才可用來發字卡；id 必須是請求的那份。 */
export function parseWordListData(value: unknown, expectedId: string): WordListData | null {
  if (!isRecord(value) || value.id !== expectedId || !isText(value.name) || !isText(value.description)) return null;
  const { source, license, entries } = value;
  if (!isRecord(source) || !['name', 'authors', 'url', 'adaptation'].every((field) => isText(source[field]))) return null;
  if (!isRecord(license) || !isText(license.name) || !isText(license.url)) return null;
  if (!Array.isArray(entries) || entries.length === 0) return null;
  let previousRank = 0;
  for (const entry of entries) {
    if (!isRecord(entry) || !isText(entry.id) || !isText(entry.english) || !isText(entry.meaning) || !isText(entry.example)) return null;
    if (!Number.isInteger(entry.rank) || (entry.rank as number) <= previousRank || !isInternalHref(entry.audioSrc)) return null;
    previousRank = entry.rank as number;
  }
  return value as unknown as WordListData;
}
