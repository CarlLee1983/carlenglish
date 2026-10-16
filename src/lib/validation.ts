// 場景與文章共用的小型驗證函式；錯誤累積到 issues，不直接丟出。
export type RecordValue = Record<string, unknown>;
export const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function record(value: unknown, path: string, issues: string[]): RecordValue {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as RecordValue;
  }
  issues.push(`${path}: expected an object`);
  return {};
}

export function nonblank(value: unknown, path: string, issues: string[]): string {
  if (typeof value === 'string' && value.trim()) return value;
  issues.push(`${path}: expected nonempty text`);
  return '';
}

export function identifier(value: unknown, path: string, issues: string[]): string {
  const id = nonblank(value, path, issues);
  if (id && !idPattern.test(id)) issues.push(`${path}: expected a lowercase hyphenated ID`);
  return id;
}

export function array(value: unknown, path: string, issues: string[], min?: number, max?: number): unknown[] {
  if (!Array.isArray(value)) {
    issues.push(`${path}: expected an array`);
    return [];
  }
  if (min !== undefined && (value.length < min || value.length > max!)) {
    issues.push(`${path}: expected ${min}–${max} items, found ${value.length}`);
  }
  return value;
}

export function httpsUrl(value: unknown, path: string, issues: string[]): string {
  const text = nonblank(value, path, issues);
  if (text) {
    try {
      const url = new URL(text);
      if (text !== text.trim() || url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
        issues.push(`${path}: expected an HTTPS URL with a hostname and no credentials`);
      }
    } catch {
      issues.push(`${path}: expected an HTTPS URL with a hostname and no credentials`);
    }
  }
  return text;
}

export function onlyFields(data: RecordValue, allowed: readonly string[], path: string, issues: string[]): void {
  for (const key of Object.keys(data)) {
    if (!allowed.includes(key)) issues.push(`${path}.${key}: unexpected field`);
  }
}

export function crossTypeDuplicateIds(
  scenes: { id: string; source: string }[], articles: { id: string; source: string }[],
  wordLists: { id: string; source: string }[] = [], classics: { id: string; source: string }[] = [],
): string[] {
  const seen = new Map<string, { kind: string; source: string }>();
  const issues: string[] = [];
  for (const [kind, entries] of [['scene', scenes], ['article', articles], ['word list', wordLists], ['classic', classics]] as const) {
    for (const entry of entries) {
      const earlier = seen.get(entry.id);
      if (earlier) issues.push(`duplicate ID "${entry.id}": used by ${earlier.kind} ${earlier.source} and ${kind} ${entry.source}`);
      else seen.set(entry.id, { kind, source: entry.source });
    }
  }
  return issues;
}
