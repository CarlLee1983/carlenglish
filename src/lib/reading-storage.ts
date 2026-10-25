export const readingRates = [0.7, 0.8, 0.9, 1] as const;
export type ReadingRate = typeof readingRates[number];
export type ReadingMode = 'guided' | 'continuous';
export type ReadingPreferences = { rate?: ReadingRate; mode?: ReadingMode };
export type ReadingProgress = { schema: 1; version: string; index: number; completed: boolean };

const preferenceKey = 'carlenglish.reading.preferences';
const progressKey = (sceneId: string) => `carlenglish.reading.progress.${sceneId}`;
function decode(raw: string | null): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}

export function loadReadingState(sceneId: string, version: string, count: number) {
  const preferences: ReadingPreferences = {};
  let progress: ReadingProgress | null = null;
  let invalidProgress = false;
  let unavailable = false;
  try {
    const saved = decode(window.localStorage.getItem(preferenceKey));
    if (saved?.schema === 1) {
      if (readingRates.some((rate) => rate === saved.rate)) preferences.rate = saved.rate as ReadingRate;
      if (saved.mode === 'guided' || saved.mode === 'continuous') preferences.mode = saved.mode;
    }
    const raw = window.localStorage.getItem(progressKey(sceneId));
    const value = decode(raw);
    if (raw !== null) {
      if (value?.schema === 1 && value.version === version && Number.isSafeInteger(value.index)
        && (value.index as number) >= 0 && (value.index as number) < count && typeof value.completed === 'boolean'
        && (!value.completed || value.index === count - 1)) {
        progress = { schema: 1, version, index: value.index as number, completed: value.completed };
      } else invalidProgress = true;
    }
  } catch { unavailable = true; }
  return { preferences, progress, invalidProgress, unavailable };
}

export function saveReadingPreferences(preferences: ReadingPreferences): boolean {
  try {
    window.localStorage.setItem(preferenceKey, JSON.stringify({ schema: 1, ...preferences }));
    return true;
  } catch { return false; }
}

export function saveReadingProgress(sceneId: string, progress: ReadingProgress): boolean {
  try {
    window.localStorage.setItem(progressKey(sceneId), JSON.stringify(progress));
    return true;
  } catch { return false; }
}
