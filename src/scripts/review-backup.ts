import { maxBackupBytes, parseBackup, serializeBackup } from '../lib/review-backup-format';
import { backupReminderDays, needsBackupReminder, reviewChangedEvent, type ReviewChangeSource, type ReviewState } from '../lib/review-state';
import { loadReviewState, saveReviewState } from '../lib/review-storage';

const pad = (value: number) => String(value).padStart(2, '0');
const localDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const reminderMessages = {
  never: '還沒有備份過。瀏覽器清除網站資料時，沒有備份的字卡會消失。',
  stale: `已超過 ${backupReminderDays} 天沒有備份。建議現在匯出一份。`,
};

function initializeBackup(root: HTMLElement) {
  const $ = <T extends HTMLElement>(name: string) => root.querySelector<T>(`[data-backup-${name}]`)!;
  const exportButton = $<HTMLButtonElement>('export');
  const exportHint = $('export-hint');
  const reminder = document.querySelector<HTMLElement>('[data-review-reminder]')!;
  const reminderText = reminder.querySelector<HTMLElement>('[data-reminder-text]')!;
  const hintExport = document.querySelector<HTMLButtonElement>('[data-hint-export]')!;
  const reminderExport = reminder.querySelector<HTMLButtonElement>('[data-reminder-export]')!;
  const fileInput = $<HTMLInputElement>('file');
  const status = $('status');
  const confirmBox = $('confirm');
  const confirmText = $('confirm-text');
  const replaceButton = $<HTMLButtonElement>('replace');
  const cancelButton = $<HTMLButtonElement>('cancel');
  let pending: { state: ReviewState; cardCount: number } | null = null;
  let selection = 0;

  function say(message: string, error?: unknown) {
    if (error) console.error(message, error);
    status.textContent = message;
  }

  function clearPending() {
    pending = null;
    fileInput.value = '';
    confirmBox.hidden = true;
  }

  function refreshExportAvailability() {
    const loaded = loadReviewState();
    const count = loaded.ok ? loaded.state.cards.length : 0;
    const now = new Date();
    const kind = loaded.ok ? needsBackupReminder(loaded.state, now) : null;
    reminder.hidden = kind === null;
    if (kind) reminderText.textContent = reminderMessages[kind];
    hintExport.hidden = count === 0;
    exportButton.disabled = count === 0;
    exportHint.hidden = count > 0;
    exportHint.textContent = loaded.ok ? '目前沒有字卡可以匯出。' : '目前的紀錄無法讀取，無法匯出。';
  }

  function exportBackup() {
    const loaded = loadReviewState();
    if (!loaded.ok) return say('無法讀取複習紀錄，所以無法匯出。', loaded.error);
    const now = new Date();
    const cardCount = loaded.state.cards.length;
    const url = URL.createObjectURL(new Blob([serializeBackup(loaded.state, now)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `carlenglish-review-${localDate(now)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    // 下載後重讀最新紀錄再寫入匯出時間，避免蓋掉其他分頁剛做的變更。
    const latest = loadReviewState();
    if (!latest.ok) return say(`已匯出 ${cardCount} 張字卡，但無法記錄匯出時間。`, latest.error);
    const saved = saveReviewState({ ...latest.state, lastExportedAt: now.toISOString() });
    if (!saved.ok) return say(`已匯出 ${cardCount} 張字卡，但無法記錄匯出時間（瀏覽器無法儲存）。`, saved.error);
    say(`已匯出 ${cardCount} 張字卡`);
    refreshExportAvailability();
  }

  exportButton.addEventListener('click', exportBackup);
  reminderExport.addEventListener('click', exportBackup);
  hintExport.addEventListener('click', exportBackup);

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    const mine = ++selection;
    confirmBox.hidden = true;
    pending = null;
    if (!file) return;
    if (file.size > maxBackupBytes) {
      fileInput.value = '';
      return say('檔案太大（上限 1 MB），沒有讀取。現有資料沒有變動。');
    }
    let parsed;
    try {
      parsed = parseBackup(await file.text());
    } catch (error) {
      if (mine !== selection) return;
      fileInput.value = '';
      return say('無法讀取這個檔案。', error);
    }
    // 讀檔期間又選了別的檔案，這份結果已過時。
    if (mine !== selection) return;
    if (!parsed.ok) {
      fileInput.value = '';
      return say(`${parsed.message}現有資料沒有變動。`);
    }
    const current = loadReviewState();
    const replacing = current.ok ? `將取代目前的 ${current.state.cards.length} 張` : '將取代目前無法讀取的紀錄';
    pending = parsed;
    confirmText.textContent = `檔案內有 ${parsed.cardCount} 張字卡，${replacing}。`;
    confirmBox.hidden = false;
    say('');
  });

  replaceButton.addEventListener('click', () => {
    if (!pending) return;
    const { state, cardCount } = pending;
    const saved = saveReviewState(state);
    if (!saved.ok) return say('瀏覽器無法儲存，匯入失敗，現有資料沒有變動。', saved.error);
    clearPending();
    say(`已匯入 ${cardCount} 張字卡`);
    refreshExportAvailability();
    document.dispatchEvent(new CustomEvent<ReviewChangeSource>(reviewChangedEvent, { detail: 'review-backup' }));
  });

  cancelButton.addEventListener('click', () => {
    clearPending();
    say('已取消匯入，現有資料沒有變動。');
  });

  root.hidden = false;
  refreshExportAvailability();
  window.addEventListener('storage', refreshExportAvailability);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshExportAvailability(); });
}

document.querySelectorAll<HTMLElement>('[data-review-backup]').forEach(initializeBackup);
