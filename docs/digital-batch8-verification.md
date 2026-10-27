# 數位與日常通訊第八批（Scenes 36–40）：驗證紀錄

日期：2026-10-27。本紀錄涵蓋單元八「數位與日常通訊」全部 5 篇生活自理場景的工程檢驗、資料結構合規性、音訊哈希比對與端到端瀏覽器測試結果。

## 檢驗項目與涵蓋場景

1. `cafe-wifi-password`（咖啡店詢問 Wi-Fi 密碼）
2. `borrowing-power-bank`（手機電量不足借行動電源）
3. `resending-verification-code`（沒收到驗證簡訊請求重發）
4. `device-connection-trouble`（設備無法連線請教店員）
5. `confirming-online-booking`（確認線上預約編號）

## 驗證結果摘要

| 檢查項目 | 測試指令 | 結果 | 說明 |
| --- | --- | --- | --- |
| 內容結構檢核 | `node scripts/validate-content.mjs` | **PASS** | 122 場景全數通過，無跨類型重複 ID、無未參照詞彙、Schema 完全合規 |
| TypeScript 與 Astro 靜態檢查 | `pnpm run check` | **PASS** | 0 errors, 0 warnings, 0 hints |
| 核心單元與資料測試 | `pnpm run test:content` | **PASS** | 188 / 188 測試項目全數通過，NGSL 單字整合完全符合 |
| 隔離延伸建置測試 | `pnpm run test:extension` | **PASS** | 42 篇虛擬場景延伸測試全數通過 |
| 靜態站點建置 | `pnpm run build` | **PASS** | 173 頁靜態路由生成完成，OG 社交分享圖片生成正常 |
| 變更內容端到端瀏覽器測試 | `pnpm run verify:content-change` | **PASS** | 2,207 通過 (12 skipped, 0 failed)，跨瀏覽器（Chromium / WebKit）E2E 測試與延伸建置測試全數通過 |

## 音訊與視覺資產指標

- **音訊檔案**：共 85 個全新 MP3 檔案（30 句正文、25 組短句、30 個重點單字），總大小 1,854,452 bytes，總時長 219.03 秒。
- **音訊解碼驗證**：每一音檔皆經 FFmpeg 離線完全解碼檢驗無截斷，文字與 graphemes 完全符合。
- **圖像規格**：1536×1024 (3:2) 原創手繪繪本風格 WebP 圖片，Sharp quality 86 壓縮完成，無文字與無商標。
