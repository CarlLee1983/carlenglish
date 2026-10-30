# 安全應變與突發狀況第十二批（Scenes 56–60）：驗證紀錄

日期：2026-10-27。本紀錄涵蓋單元十二「安全應變與突發狀況」全部 5 篇生活自理場景的工程檢驗、資料結構合規性、音訊哈希比對與端到端瀏覽器測試結果。
至此，NGSL-Spoken 60 篇日常自理場景擴充計畫全體系（Scenes 1–60）正式圓滿達成 100% 竣工！

## 檢驗項目與涵蓋場景

1. `fire-alarm-drill-response`（火災警報響起時的疏散應變）
2. `asking-police-for-help`（在路上遇到困難向警察局求助）
3. `typhoon-weather-notice`（颱風警報停班停課與活動改期）
4. `first-aid-for-minor-cut`（手指小割傷使用急救箱消毒包紮）
5. `seeking-lost-pet-notice`（張貼社區尋找走失貓咪啟事）

## 驗證結果摘要

| 檢查項目 | 測試指令 | 結果 | 說明 |
| --- | --- | --- | --- |
| 內容結構檢核 | `node scripts/validate-content.mjs` | **PASS** | 142 場景全數通過，無跨類型重複 ID、無未參照詞彙、Schema 完全合規 |
| TypeScript 與 Astro 靜態檢查 | `pnpm run check` | **PASS** | 0 errors, 0 warnings, 0 hints |
| 核心單元與資料測試 | `pnpm run test:content` | **PASS** | 188 / 188 測試項目全數通過，NGSL 單字整合完全符合 |
| 隔離延伸建置測試 | `pnpm run test:extension` | **PASS** | 42 篇虛擬場景延伸測試全數通過 |
| 靜態站點建置 | `pnpm run build` | **PASS** | 193 頁靜態路由生成完成，OG 社交分享圖片生成正常 |
| 變更內容端到端瀏覽器測試 | `pnpm run verify:content-change` | **PASS** | 2,427 通過 (12 skipped, 0 failed)，跨瀏覽器（Chromium / WebKit）E2E 測試與延伸建置測試全數通過 |

## 音訊與視覺資產指標

- **音訊檔案**：共 85 個全新 MP3 檔案（30 句正文、25 組短句、30 個重點單字），總大小 1,989,428 bytes，總時長 233.78 秒。
- **音訊解碼驗證**：每一音檔皆經 FFmpeg 離線完全解碼檢驗無截斷，文字與 graphemes 完全符合。
- **圖像規格**：1536×1024 (3:2) 原創手繪繪本風格 WebP 圖片，Sharp quality 86 壓縮完成，無文字與無商標。
