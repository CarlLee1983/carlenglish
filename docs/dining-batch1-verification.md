# 飲食生活自理第一批（Scenes 1–5）：驗證紀錄

日期：2026-10-27。本紀錄涵蓋單元一前 5 篇生活自理場景的工程檢驗、資料結構合規性、音訊哈希比對與端到端瀏覽器測試結果。

## 檢驗項目與涵蓋場景

1. `ordering-custom-drink`（客製化飲料甜度冰塊）
2. `checking-food-allergens`（確認餐點成分與過敏）
3. `split-bill-takeout`（外帶打包與分開結帳）
4. `wrong-order-at-restaurant`（送錯餐點時的反應）
5. `fast-food-combo`（點速食套餐選配餐）

## 驗證結果摘要

| 檢查項目 | 測試指令 | 結果 | 說明 |
| --- | --- | --- | --- |
| 內容結構檢核 | `node scripts/validate-content.mjs` | **PASS** | 87 場景全數通過，無跨類型重複 ID、無未參照詞彙、Schema 完全合規 |
| TypeScript 與 Astro 靜態檢查 | `pnpm run check` | **PASS** | 0 errors, 0 warnings, 0 hints |
| 靜態站點建置 | `pnpm run build` | **PASS** | 138 頁靜態路由生成完成，OG 社交分享圖片生成正常 |
| 核心單元與資料測試 | `pnpm run test:content` | **PASS** | 188 / 188 測試項目全數通過 |
| 擴充場景隔絕測試 | `pnpm run test:extension` | **PASS** | Playwright 混和分級路由測試通過 |
| 變更內容端到端瀏覽器測試 | `pnpm run verify:content-change` | **PASS** | 267 / 267 項跨瀏覽器（Chromium / WebKit）E2E 測試全數通過 |

## 音訊與視覺資產指標

- **音訊檔案**：共 87 個全新 MP3 檔案（30 句正文、25 組短句、32 個重點單字），總大小 1,595,844 bytes，總時長 192.60 秒。
- **音訊解碼驗證**：每一音檔皆經 FFmpeg 離線完全解碼檢驗無截斷，文字與 graphemes 完全符合。
- **圖像規格**：1536×1024 (3:2) 原創手繪繪本風格 WebP 圖片，Sharp quality 86 壓縮完成。
