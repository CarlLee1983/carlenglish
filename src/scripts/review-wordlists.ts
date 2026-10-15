import { issuedCardCount, type ReviewState } from '../lib/review-state';
import { parseWordListData, unissuedWordCount, type WordListData } from '../lib/wordlist-data';

const wordListFailureMessage = (names: string[]) => `無法載入詞表「${names.join('」「')}」，暫時不會發出這${names.length > 1 ? '些' : '份'}詞表的新字卡。請確認網路連線後重新整理本頁。`;

/** 複習頁的詞表區：訂閱按鈕、進度、載入失敗提示，以及訂閱詞表內容的取得。狀態的讀寫仍由呼叫端負責。 */
export function createWordListPanel(section: HTMLElement) {
  const errorBox = section.querySelector<HTMLElement>('[data-review-wordlist-error]')!;
  const items = [...section.querySelectorAll<HTMLElement>('[data-wordlist]')];
  const itemFor = (id: string) => items.find((item) => item.dataset.wordlistId === id);
  /** 已載入的詞表內容；只有訂閱了的詞表才會被載入。 */
  const loaded = new Map<string, WordListData>();
  const loading = new Set<string>();
  const failed = new Set<string>();

  async function fetchWordList(id: string) {
    loading.add(id);
    try {
      const response = await fetch(itemFor(id)!.dataset.wordlistUrl!);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = parseWordListData(await response.json(), id);
      if (!data) throw new Error('The word list data has an unexpected shape.');
      loaded.set(id, data);
    } catch (error) {
      console.error(`Failed to load word list "${id}"`, error);
      failed.add(id);
    } finally {
      loading.delete(id);
    }
  }

  return {
    /** 字卡背面的來源標示；沒有這份詞表時為 undefined。 */
    attribution: (id: string) => itemFor(id)?.dataset.wordlistAttribution,
    loadedLists: () => [...loaded.values()],
    /** 讓載入失敗過的詞表（單一或全部）下次有機會再試。 */
    retry: (id?: string) => (id === undefined ? failed.clear() : failed.delete(id)),
    onToggle(handler: (id: string) => void) {
      for (const item of items) {
        item.querySelector<HTMLButtonElement>('[data-wordlist-toggle]')!.addEventListener('click', () => handler(item.dataset.wordlistId!));
      }
    },
    /** 只載入有訂閱、還沒載入、也還沒失敗過的詞表；回傳是否有嘗試載入（完成後呼叫端要再同步一次）。 */
    async loadMissing(state: ReviewState | null): Promise<boolean> {
      if (!state) return false;
      const missing = state.subscriptions.map((subscription) => subscription.wordListId)
        .filter((id) => itemFor(id) && !loaded.has(id) && !loading.has(id) && !failed.has(id));
      if (missing.length === 0) return false;
      await Promise.all(missing.map(fetchWordList));
      return true;
    },
    render(state: ReviewState | null) {
      section.hidden = !state;
      if (!state) return;
      for (const item of items) {
        const subscription = state.subscriptions.find((candidate) => candidate.wordListId === item.dataset.wordlistId);
        const name = item.dataset.wordlistName ?? '';
        const toggle = item.querySelector<HTMLButtonElement>('[data-wordlist-toggle]')!;
        toggle.textContent = subscription ? '取消訂閱' : '訂閱';
        toggle.setAttribute('aria-label', `${subscription ? '取消訂閱' : '訂閱'} ${name}`);
        const progress = item.querySelector<HTMLElement>('[data-wordlist-progress]')!;
        progress.hidden = !subscription;
        if (!subscription) {
          progress.textContent = '';
          continue;
        }
        // 剩餘數要看詞表內容（排除已是字卡的詞）；內容還沒載入前只顯示已發出的張數。
        const list = loaded.get(subscription.wordListId);
        const issued = `已發出 ${issuedCardCount(state, subscription.wordListId)} 張`;
        progress.textContent = list ? `${issued}，剩餘 ${unissuedWordCount(list, subscription, state.cards)} 字` : issued;
      }
      const failedNames = state.subscriptions.filter((subscription) => failed.has(subscription.wordListId))
        .map((subscription) => itemFor(subscription.wordListId)?.dataset.wordlistName ?? subscription.wordListId);
      errorBox.hidden = failedNames.length === 0;
      errorBox.textContent = failedNames.length === 0 ? '' : wordListFailureMessage(failedNames);
    },
  };
}
