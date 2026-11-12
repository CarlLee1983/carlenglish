# 2026-11-10 新聞閱讀教材查核

## 範圍與閱讀順序

本批新增兩篇 N2 原創教學改寫，各三段英文與繁體中文輔助、五個關鍵詞、四題中文理解題。中譯與參考答案沿用預設收合呈現。只增加兩份文章 JSON 與本紀錄，不改 schema、UI、依賴、圖音、其他批次或個人學習紀錄。

1. `escapade-earth-boost-2026`，前往火星，為什麼先繞回地球？144 字、12 句，平均句長 12 字。練習找消息歸屬、區分已完成的動作與未來計畫。
2. `ozone-hole-weather-recovery-2026`，臭氧洞很大，就代表修復失敗了嗎？151 字、12 句，平均句長約 12.6 字。練習用轉折連接表面相反的訊息、區分單年觀測與長期趨勢。

兩篇也可獨立閱讀。先讀英文找主旨，再按需開中譯，作答後才看答案。保持既有 N2 設計，不因日期或篇數推定讀者升級。沒有使用者試讀或能力評量結果。

讀稿覆核了英中對應、來源、日期、題目與答案。將臭氧段落改成「完全恢復仍是預測」，避免誤導為修復尚未開始；排名明寫 seventh largest。兩篇 `stageWarnings` 均為空。

## 基準與去重

2026-11-10 以最新 main `a6807164e7b7ea9cbe2c7c1f2b7af2f8a9d2fcfb` 建立獨立雲端 checkout 與 `content/news-reading-20261110` 分支。已讀 README、CONTEXT、內容維護／新聞閱讀規格、`src/lib/articles.ts`、`ArticleReader.astro`、`docs/ci.md`、Playwright 設定及現行 CI／Verification workflow。此 main 沒有 AGENTS.md 或 `.agents/skills`。

核對全部 18 篇既有文章、來源 URL、穩定 ID、既有查核紀錄、全部遠端分支及 open PR。open PR 與全狀態的 `20261110` PR 查詢皆無結果；沒有同日分支或可接續的同日稿件。本批兩事件、來源 URL 與 ID 均未出現。既有火星模擬生活篇與本批太空船飛行事件不同，不重寫舊篇。

## 來源與日期

全部取用及改寫日期為 2026-11-10。以下依實際讀取的公開一手來源撰寫，非僅依搜尋摘要。英文另擬，不轉載原文段落、照片、影片或音訊。

### ESCAPADE

- 主來源：[NASA，2026-11-09](https://science.nasa.gov/science-research/heliophysics/nasas-escapade-completes-powered-earth-flybys-now-en-route-to-mars/)。支持第一段的近地飛掠、兩次日期與約九分鐘引擎運轉；第二段的 2025 年發射、等待行星位置及間接路線；第三段的預定抵達與研究目的。
- 交叉核對：[UC Berkeley，2026-11-09](https://news.berkeley.edu/2026/11/09/berkeleys-escapade-spacecraft-say-goodbye-to-earth-next-stop-mars/)。公開全文首次讀取成功，支持兩艘分別在 11 月 7 日／9 日飛掠、引擎與引力共同作用、等待路線及預期抵達月份。後續兩次開啟遇到讀取工具 Internal Error，不能宣稱每次均可重現。
- `eventDate` 為第二艘完成飛掠的 2026-11-09；正文與背景同時保留第一艘的 11 月 7 日，發射另標 2025 年 11 月。未把本次飛掠當成發射。
- NASA 與 Berkeley 均為任務參與機構，這是合作機構交叉核對，並非獨立新聞調查。抵達、入軌與研究仍是未來工作；沒有把任務目標寫成已得到的研究成果。略去措辭範圍不同的「首次」宣稱。

### 南極臭氧洞

- 主來源：[NASA Earth Observatory，2026-11-09](https://science.nasa.gov/earth/earth-observatory/ozone-hole-reaches-its-2026-maximum/)。支持第一段的「洞」定義、日期與面積排名，第二段的強極地渦旋及寒冷條件，第三段的面積與臭氧流失程度之別。
- 交叉核對：[NOAA，2026-11-04](https://www.noaa.gov/news-release/noaa-nasa-release-measurements-of-2026-ozone-hole)。完整公開頁面支持季節平均面積、9 月 18 日最大面積、天氣作用、國際管制及長期修復判讀。兩頁共享 NASA／NOAA 的年度分析，不是兩套獨立研究。
- `publishedAt` 為 NASA 專文日 2026-11-09；`eventDate` 為當年單日最大面積日 2026-09-18。第七大是 9 月 7 日至 10 月 13 日的平均面積排名；背景明確標示比較期間，不用單日最大值替代。
- 一年變大不等於長期修復已失敗；完全恢復仍是預測。來源對歷史最大臭氧洞年份的寫法不同，未自行判定測量口徑或使用該比較，也未把最大面積與最低臭氧濃度當成同一指標。

另評估生態 AI 題：大學公告公開，但論文只讀到公開摘要、全文需訂閱，未繞過限制。已選到兩個可完整核對的題目，不為湊三篇增加較弱來源。

## 驗證與限制

- Node 24.22.1、pnpm 12.0.0。指定 pnpm 安裝於暫存目錄，`pnpm install --frozen-lockfile` 成功；lockfile 與套件設定沒有改動。
- 最終內容的 `pnpm run verify:static` 成功：Astro check 108 個檔案、0 errors／warnings；202 項單元／內容測試全部通過；內容驗證與 218 頁建置成功。建置仍有既有大型 JavaScript chunk 提示。專案沒有獨立格式化命令，兩份 JSON 以二空格及尾端換行整理，`git diff --check` 通過。
- 已啟動完整 `pnpm run verify`；靜態階段通過後，瀏覽器啟動連續失敗，確認缺相符 executable 後中止，不能稱完整驗證通過。
- 官方 `pnpm exec playwright install chromium webkit` 的 Chromium 下載返回損毀／截斷 ZIP，安裝失敗，WebKit 未完成安裝。沒有改 Playwright 設定、替換 binary 路徑或略過測試掩蓋缺件。
- 最終稿另執行 `pnpm run test:browser --max-failures=1`：1 failed、3 interrupted、2775 did not run；失敗於啟動缺少的 `chromium_headless_shell-1248`，不是頁面斷言。這是環境阻塞重現，不是完整 E2E。
- `pnpm run test:extension` 已實際執行。首次與建置並行，讀取正在更新的 dist 時遇到缺檔；已在完整建置結束後單獨重跑。最終測試完成隔離副本建置，再因同一 Chromium executable 缺失而失敗。不能以首次競態判定正式素材缺漏。
- 另嘗試使用已安裝的系統 Chromium 156.0.8078.79，僅供兩篇文章桌機／手機版面截圖補查，不代替指定版本測試。瀏覽器因 `socket() failed: Operation not permitted` 無法啟動，未取得截圖；因此本次沒有完成桌機／手機實頁目視。沒有修改系統安全設定。
- 精確 PR head 的完整 GitHub CI 結果另記於 PR。CI 是自動檢查，不等於人工目視、實機操作或使用者理解測驗。本批無音檔，不聲稱實聽驗收。

只交付工作分支與 draft PR，不推 main、不合併、不設 auto-merge、不部署。
