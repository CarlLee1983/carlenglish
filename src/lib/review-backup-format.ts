import { isRecord } from './guards.ts';
import { parseReviewState, type ReviewState } from './review-state.ts';

/** 備份檔大小上限（位元組），超過就不讀內容。 */
export const maxBackupBytes = 1_048_576;

export const backupFormat = 'carlenglish-review-backup';

export type BackupFailure = 'not-json' | 'wrong-format' | 'unsupported-version' | 'corrupt';
export type BackupParseResult =
  | { ok: true; state: ReviewState; cardCount: number }
  | { ok: false; reason: BackupFailure; message: string };

const backupMessages: Record<BackupFailure, string> = {
  'not-json': '這不是有效的備份檔：檔案內容不是 JSON。',
  'wrong-format': '這不是 CarlEnglish 的複習備份檔。',
  'unsupported-version': '這個備份檔的版本不支援，請用較新的網站版本開啟。',
  corrupt: '備份檔的內容損壞或缺少欄位，無法匯入。',
};

export function serializeBackup(state: ReviewState, now: Date): string {
  const exportedAt = now.toISOString();
  return JSON.stringify({ format: backupFormat, version: 1, exportedAt, state: { ...state, lastExportedAt: exportedAt } });
}

export function parseBackup(text: string): BackupParseResult {
  const fail = (reason: BackupFailure): BackupParseResult => ({ ok: false, reason, message: backupMessages[reason] });
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    return fail('not-json');
  }
  if (!isRecord(file) || file.format !== backupFormat) return fail('wrong-format');
  if (file.version !== 1) return fail('unsupported-version');
  const parsed = parseReviewState(file.state);
  return parsed.ok ? { ok: true, state: parsed.state, cardCount: parsed.state.cards.length } : fail('corrupt');
}
