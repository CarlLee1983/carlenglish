import { reviewChangedEvent, type ReviewChangeSource } from '../lib/review-state';

/**
 * 複習紀錄可能被改動的三種時機：其他分頁寫入（storage）、分頁回到前景、同頁的別的腳本發出 reviewChangedEvent。
 * self 是呼叫者自己發出事件時用的來源；看到自己的事件要忽略，免得用儲存裡的舊資料蓋掉剛改的記憶體狀態。
 */
export function onReviewStateMayChange(callback: () => void, self?: ReviewChangeSource) {
  window.addEventListener('storage', callback);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) callback(); });
  document.addEventListener(reviewChangedEvent, (event) => {
    if ((event as CustomEvent<ReviewChangeSource>).detail !== self) callback();
  });
}

/** 通知同頁其他腳本重算；source 是發出者，自己的監聽器靠它忽略。 */
export function announceReviewChange(source: ReviewChangeSource) {
  document.dispatchEvent(new CustomEvent<ReviewChangeSource>(reviewChangedEvent, { detail: source }));
}
