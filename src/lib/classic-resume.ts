const keyFor = (classicId: string) => `carlenglish.classic-resume.${classicId}`;

export function lastOpenedPart(classicId: string, partCount: number): number | null {
  try {
    const raw = window.localStorage.getItem(keyFor(classicId));
    if (raw === null || !/^[1-9]\d*$/.test(raw)) return null;
    const part = Number(raw);
    return Number.isSafeInteger(part) && part <= partCount ? part : null;
  } catch {
    return null;
  }
}

export function rememberOpenedPart(classicId: string, part: number, partCount: number): void {
  if (!Number.isSafeInteger(part) || part < 1 || part > partCount) return;
  try {
    window.localStorage.setItem(keyFor(classicId), String(part));
  } catch {
    // Reading the part must remain available when browser storage is blocked or full.
  }
}
