export interface HomeScreenEnvironment {
  userAgent: string;
  maxTouchPoints: number;
  /** 以主畫面 web app 開啟（navigator.standalone 或 display-mode: standalone）。 */
  standalone: boolean;
}

/** iOS／iPadOS 上、尚未以主畫面 web app 開啟時為 true；這是 Safari 清除儲存規則（ADR 0002）會影響的情況之一，不限定瀏覽器。 */
export function shouldShowHomeScreenHint({ userAgent, maxTouchPoints, standalone }: HomeScreenEnvironment): boolean {
  if (standalone) return false;
  const iosDevice = /iPhone|iPad|iPod/.test(userAgent);
  // iPadOS 13 起預設送出 Mac 的 UA，只能靠觸控點數區分。
  const desktopUaIpad = /Macintosh/.test(userAgent) && maxTouchPoints > 1;
  return iosDevice || desktopUaIpad;
}
