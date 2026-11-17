# 2026-11-17 新聞閱讀教材查核

## 範圍與建議順序

本批兩篇 N2 原創教學改寫，各三段英文與臺灣繁體中文輔助、五個關鍵詞、四題理解題及分開的參考答案。沿用既有中譯與答案預設收合顯示，不修改程式、schema、UI、依賴、圖音或其他批次。

1. `voyager-light-day-distance-2026`：一光日，是一天還是一段距離？144 字、13 句、平均約 11.1 字。由 This means 的定義猜詞，從單程訊號推論來回時間。
2. `cosi-payload-shipping-tests-2026`：太空儀器出貨了，為什麼還不能升空？148 字、13 句、平均約 11.4 字。追蹤運送、安裝、測試順序，區分已發生的動作與未來研究目標。

兩篇也可獨立閱讀；先找英文主旨，按需開中譯，回答後再看解析。不以日期或累積篇數推定已完成前課或自動升級。未取得使用者試讀或理解評量結果。兩篇 stageWarnings 均為空；人工逐段覆核英中對應、自然度、來源歸屬、日期與問題可回答性。

## 基準與去重

獨立雲端 checkout：`carlenglish-news-20261117`；工作分支 `content/news-reading-20261117`；最新 main 基底 `ca20f0d46f2e8316b88baa782adb82cbed0fdd3b`。已讀 README、CONTEXT、content-guide、spec 的新聞規格、news-social-reading-plan、ADR 0001、articles.ts、ArticleReader.astro、CI 文件與現行 workflow／Playwright 設定。checkout 沒有 AGENTS.md 或 `.agents/skills`，沒有相關本機 skill 可讀。

已查遠端分支、open PR、main 全部 20 篇文章的來源 URL／穩定 ID 與歷次新聞紀錄；沒有同日批次。唯一 open PR #30 是 11/13 的兩篇文化教材；先核對其 head `d92d8d59d276ff5218f256537fa2942da172a37d`、既有完成紀錄及成功的 CI run 43352221611，沒有未完成教材稿可接續。其本機目視缺項仍存在，不把成功 CI 當成人工目視，也未重做該批。新選的兩事件、URL 與 ID 皆未重複。

## 公開來源與不確定性

所有來源於 Asia/Taipei 2026-11-17 取用，當日改寫。搜尋用於發現，以下頁面均以雲端瀏覽器實際讀到公開正文，沒有登入、付費牆、權限拒絕或繞過操作。未取用新聞圖片、影片、音訊、原文長段或參與者聯絡資料作教材。

### 航海家一號

- 主來源：[NASA 公告 M26-086](https://www.nasa.gov/news-release/nasa-invites-media-public-to-join-voyager-1-one-light-day-activities/)，發布 2026-11-10、11-13 更新活動名單。支持 1977 年發射、預定 11-18 一光日、24 小時光行時間、11-17 日落後的象徵性燈光慶祝。`publishedAt` 保留首發日；`eventDate` 採未來里程碑日，而非公告或閃燈日期。
- 同任務交叉頁：[NASA 任務狀態](https://science.nasa.gov/mission/voyager/where-are-voyager-1-and-voyager-2-now/)，頁面更新 2026-11-16。支持光日是距離與來回約兩日；精確時刻為 11-18 02:16:07 PST，即台北 18:16:07。教材只精確到分鐘，不靠倒數計時推定事件已發生。
- 獨立新聞查核：[AP／Marcia Dunn](https://apnews.com/article/nasa-voyager-interstellar-space-light-day-67f53a0e274157c92305e0b03d4b800d)，頁面顯示更新 2026-11-14 21:01 GMT+8。完整正文核對單程 24 小時、1977 年發射及公共閃燈活動。穩定文章 ID：`67f53a0e274157c92305e0b03d4b800d`。
- 正文保留 expects／will，未宣稱里程碑已達成。兩日為假設立即回覆下的近似傳播時間，不承諾每筆操作固定四十八小時。燈光慶祝不是實際上傳指令，本文未要求讀者發文、上傳或參加活動。

### COSI 科學儀器

- 主來源：[NASA／Jeanette Kazmierczak，2026-11-16](https://science.nasa.gov/blogs/cosi/2026/11/16/nasa-payload-to-study-gamma-rays-arrives-at-northrop-grumman/)。完整正文支持儀器本月稍早抵達維吉尼亞州 Sterling 的 Northrop Grumman 工廠、待安裝至 LEOStar-2、振動與熱測試、預定 2027 年 8 月發射及伽瑪射線研究用途。照片說明另支持 11-02 裝車。
- 合作機構查核：[UC Berkeley COSI 任務首頁](https://cosi.ssl.berkeley.edu/)。公開頁面的 Updates and Achievements 記錄 2026-11-02 裝車運往 Northrop Grumman，並介紹伽瑪射線研究用途及 2027 年任務；不是獨立新聞調查。NASA 為抵達、後續測試與精確預定月份的一手來源，未找到第二個獨立來源重複證實全部細節，因此全篇保留 NASA 歸屬，不擴大宣稱。
- `eventDate` 採可以確認的 2026-11-02 出貨日；`publishedAt` 為 11-16。背景明示精確抵達日未提供，不能把裝車日、報導日與抵達日混為一談。NASA 的 over the summer 未指定日期，教材不自行補值。
- 儀器到廠不等於發射，更不代表已取得太空觀測成果。發射是取用時的計畫，可能變動。保留科學目標與已完成工程步驟之別，不搬入高負擔的反物質等專有名詞。

## 本機驗收與限制

- Node 24.22.1；用 `npm exec --package=pnpm@12.0.0` 執行指定 pnpm，`pnpm install --frozen-lockfile` 成功。lockfile 與套件設定未變。
- 專案沒有獨立 format 指令；JSON 二空格、尾端換行，`git diff --check` 通過。
- `pnpm run verify:static` 通過：Astro check 108 個檔案、0 errors／warnings；202 項內容／單元測試全部通過；內容驗證及 220 頁完整 build 成功。兩篇自動產生路由與 sitemap；保留既有大型 chunk 提示。
- 官方 `pnpm exec playwright install chromium webkit` 失敗：Chromium v1248 ZIP 缺 central directory／截斷；未完成 WebKit 安裝。不更換 binary 或削弱設定。
- 實際執行完整 `test:browser --max-failures=1` 及 `test:extension`，首次遇到全域 `/tmp` ENOSPC；沒有清理其他工作。改用本批 `.scratch/tmp` 可用磁碟後重跑兩者。
- 最終瀏覽器測試在缺少 `chromium_headless_shell-1248` executable 處停止：1 failed、3 interrupted、2817 did not run，另有提早停止錯誤；這不是頁面斷言通過，也不是完整 E2E 成功。
- 最終 `test:extension` 完成隔離副本建置，因相同 Chromium executable 缺失而失敗。精確 PR head 完整 CI 結果另記 PR，不能以舊批 CI 代替本批。
- 已啟動本批 dist preview，雲端瀏覽器開啟新文章回傳 `ERR_CONNECTION_REFUSED`。未完成桌機／手機實頁人工目視；CI 自動測試不等於目視、實機操作或理解評量。此類教材無圖音，不需也不聲稱實聽。

git HTTPS 推送缺少憑證，未成功；改用現有 GitHub connector 建立相同內容 tree，核對 tree SHA 後建立 draft PR。

僅提交本批兩篇教材與本紀錄，交付工作分支與 draft PR；不推 main、不合併、不設 auto-merge、不部署。
