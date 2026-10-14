import { reviewChangedEvent, reviewCounts } from '../lib/review-state';
import { loadReviewState } from '../lib/review-storage';

/** 徽章最多顯示到這個數字，超過顯示「99+」；可及名稱仍是實際張數。 */
const maxBadgeCount = 99;

/** 導覽列「複習」入口的張數徽章：今天（本地時間結束前）待複習的張數，含新卡。 */
function initializeReviewNav(link: HTMLAnchorElement) {
  const badge = link.querySelector<HTMLElement>('[data-review-badge]')!;

  function refresh() {
    const loaded = loadReviewState();
    // 讀不到時不打擾閱讀：與 0 張相同，只留入口文字，原因記在 console。
    if (!loaded.ok) console.error('Failed to load review state for the navigation badge', loaded.reason, loaded.error);
    const due = loaded.ok ? reviewCounts(loaded.state, new Date()).due : 0;
    badge.hidden = due === 0;
    badge.textContent = due === 0 ? '' : due > maxBadgeCount ? `${maxBadgeCount}+` : String(due);
    if (due === 0) link.removeAttribute('aria-label');
    else link.setAttribute('aria-label', `複習，今天 ${due} 張待複習`);
  }

  refresh();
  window.addEventListener('storage', refresh);
  document.addEventListener(reviewChangedEvent, refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
}

document.querySelectorAll<HTMLAnchorElement>('[data-review-nav]').forEach(initializeReviewNav);
