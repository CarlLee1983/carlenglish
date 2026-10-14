import { parseWordListSummaries, type WordListSummary } from '../lib/wordlist-data';

/** 讀 Layout 在建置時輸出的詞表摘要；讀不到時當作沒有詞表，原因記在 console。 */
export function readWordListSummaries(): WordListSummary[] {
  const element = document.querySelector('script[data-wordlist-summaries]');
  try {
    const parsed = parseWordListSummaries(JSON.parse(element?.textContent ?? ''));
    if (parsed) return parsed;
    throw new Error('Unexpected word list summary shape.');
  } catch (error) {
    console.error('Failed to read the word list summaries', error);
    return [];
  }
}
