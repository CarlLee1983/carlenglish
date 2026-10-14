import { shouldShowHomeScreenHint } from '../lib/home-screen';
import { reviewChangedEvent } from '../lib/review-state';
import { dismissHomeScreenHint, isHomeScreenHintDismissed, loadReviewState } from '../lib/review-storage';

/** 申請持久儲存；不支援或被拒絕都不打擾學習者，也不阻擋複習。 */
async function requestPersistentStorage() {
  try {
    const storage = navigator.storage;
    if (!storage?.persisted || !storage.persist) return;
    if (!(await storage.persisted())) await storage.persist();
  } catch (error) {
    console.error('Persistent storage request failed', error);
  }
}

const isStandalone = () => (navigator as Navigator & { standalone?: boolean }).standalone === true
  || window.matchMedia('(display-mode: standalone)').matches;

function initializeHomeScreenHint(hint: HTMLElement) {
  const show = shouldShowHomeScreenHint({ userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints, standalone: isStandalone() });
  if (!show || isHomeScreenHintDismissed()) return;
  hint.hidden = false;
  hint.querySelector<HTMLButtonElement>('[data-hint-dismiss]')!.addEventListener('click', () => {
    hint.hidden = true;
    const saved = dismissHomeScreenHint();
    if (!saved.ok) console.error('Failed to remember the dismissed home-screen hint', saved.error);
  });
}

/** 主畫面 App 的紀錄與瀏覽器分開；空的時候邀請學習者匯入從瀏覽器匯出的備份（沿用既有匯入控制）。 */
function initializeStandaloneInvitation(invitation: HTMLElement) {
  if (!isStandalone()) return;
  const update = (focus: boolean) => {
    const loaded = loadReviewState();
    const empty = loaded.ok && loaded.state.cards.length === 0;
    invitation.hidden = !empty;
    if (empty && focus) document.querySelector<HTMLInputElement>('[data-backup-file]')?.focus();
  };
  update(true);
  window.addEventListener('storage', () => update(false));
  document.addEventListener(reviewChangedEvent, () => update(false));
}

document.querySelectorAll<HTMLElement>('[data-review-hint]').forEach(initializeHomeScreenHint);
document.querySelectorAll<HTMLElement>('[data-review-standalone-hint]').forEach(initializeStandaloneInvitation);
void requestPersistentStorage();
