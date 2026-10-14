import { cardKey, hasSource, isCardSourceKind, isInternalHref, reduce, type CardContent, type CardSource } from '../lib/review-deck';
import { loadReviewState, saveReviewState } from '../lib/review-storage';

const saveFailureMessage = '無法在這個瀏覽器儲存複習紀錄（可能是私密瀏覽或空間已滿），這次的變更沒有保存。';
const loadFailureMessage = '無法讀取複習紀錄（可能是私密瀏覽、設定封鎖，或儲存的資料已損壞），暫時不能加入複習。';

function initializeReviewAdd(list: HTMLElement) {
  const buttons = [...list.querySelectorAll<HTMLButtonElement>('[data-review-add]')];
  const status = list.parentElement?.querySelector<HTMLElement>('[data-review-add-status]');
  const { reviewSourceKind, reviewSourceId, reviewSourceTitle, reviewSourceHref } = list.dataset;
  if (!status || !isCardSourceKind(reviewSourceKind) || !reviewSourceId || !reviewSourceTitle || !isInternalHref(reviewSourceHref)) return;
  const source: CardSource = { kind: reviewSourceKind, id: reviewSourceId, title: reviewSourceTitle, href: reviewSourceHref };

  const contentOf = (button: HTMLButtonElement): CardContent => ({
    english: button.dataset.english ?? '',
    meaning: button.dataset.meaning ?? '',
    example: button.dataset.example || null,
    audioSrc: button.dataset.audioSrc || null,
  });

  function showFailure(message: string, error: unknown) {
    console.error(message, error);
    status!.textContent = message;
    status!.hidden = false;
  }

  function render(button: HTMLButtonElement, added: boolean) {
    button.setAttribute('aria-pressed', String(added));
    button.textContent = added ? '已加入' : '加入複習';
  }

  /** 從儲存重讀並更新每顆按鈕；其他分頁可能已經改過。 */
  function refresh() {
    const loaded = loadReviewState();
    if (!loaded.ok) return showFailure(loadFailureMessage, loaded.error);
    status!.hidden = true;
    for (const button of buttons) render(button, hasSource(loaded.state, cardKey(contentOf(button)), source));
  }

  for (const button of buttons) {
    button.hidden = false;
    button.addEventListener('click', () => {
      const current = loadReviewState();
      if (!current.ok) return showFailure(loadFailureMessage, current.error);
      const content = contentOf(button);
      const key = cardKey(content);
      const added = hasSource(current.state, key, source);
      const next = reduce(current.state, added
        ? { type: 'REMOVE_CARD', cardKey: key, source }
        : { type: 'ADD_CARD', card: content, source, now: new Date() });
      const saved = saveReviewState(next);
      if (!saved.ok) return showFailure(saveFailureMessage, saved.error);
      status!.hidden = true;
      render(button, !added);
    });
  }
  refresh();
  window.addEventListener('storage', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
}

document.querySelectorAll<HTMLElement>('[data-review-source-kind]').forEach(initializeReviewAdd);
