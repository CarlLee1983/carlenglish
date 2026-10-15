// 與複習狀態無關的通用型別守衛；讓詞表與備份格式不必為了它們依賴 review-state。

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** 站內連結只接受單一 `/` 開頭的路徑，排除 `//host` 與 `javascript:` 等。 */
export const isInternalHref = (value: unknown): value is string => typeof value === 'string' && /^\/(?![/\\])/.test(value);
