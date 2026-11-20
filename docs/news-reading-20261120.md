# 2026-11-20 新聞閱讀教材查核

## 範圍與建議順序

本批兩篇 N2 原創教學改寫，各三段英文與臺灣繁體中文輔助、五個關鍵詞、四題及分開的參考答案。沿用翻譯與答案預設收合，不修改 UI、schema、程式、圖音、依賴或其他批次。

1. `freshwater-research-guide-2026`：關心水資源，可以從住家附近開始嗎？138 字、12 句、平均 11.5 字。找導言主旨，區分學習目標與試用證據，追蹤 according to 的歸屬。
2. `baby-star-data-sounds-2026`：星星的聲音，真的是錄音嗎？144 字、13 句、平均約 11.1 字。由定義猜詞，從資料映射推論音量的意義，分辨觀測與呈現方式。

兩篇可獨立閱讀。先讀英文、按需開中譯，作答後再開答案。每篇涵蓋主旨、段落關係、上下文猜字與推論；僅聚焦上述一至兩項核心技能。不以篇數推定能力或自動升級；未取得使用者試讀與理解評量。兩篇 stageWarnings 為空。作者逐段校對英中對應、來源歸屬、日期、自然度及答案可由正文支持。

## 基準與去重

獨立雲端 checkout `/workspace/carlenglish-20261120`，main `a554309f4316d322e80ef24a283f5f90d2997f8f`，工作分支 `content/news-reading-20261120`。已讀 README、CONTEXT、content-guide、news-social-reading-plan、articles.ts、ArticleReader.astro、Playwright 設定及 CI／Verification／Deploy 工作流；確認沒有 AGENTS.md 或 `.agents/skills`。沒有格式化指令，沿用 JSON 二空格與尾端換行。

已檢查遠端全部分支、open PR、main 的 22 篇文章及先前新聞紀錄的 URL／ID／題目。沒有同日批次；唯一 open 新聞 PR #30 為 11/13 已完成待審稿，不重作或合併。已合併 Voyager #31 不重寫。兩個新來源 URL、ID 及事件均未重複。

## 來源與限制

取用與改寫日均為 UTC 2026-11-20。搜尋只用於發現，正文取用方法另列；不以搜尋摘要冒充已讀原文。不使用原文長段、新聞圖片、影音或聯絡資料。

### 淡水指南

- 主來源：[Smithsonian 官方公告](https://www.si.edu/newsdesk/releases/new-smithsonian-science-education-guide-helps-youth-explore-earths-freshwater)，2026-11-17。公開 HTML 正文透過一般 HTTPS GET 成功取得並逐段閱讀（含指南介紹、試用、教育者活動與下載段落）；web open 曾回 520，雲端瀏覽器 API 未能載入分頁，沒有把這兩次失敗算作已讀。公告穩定識別碼 SI-346-2026、頁面 node/723619。
- 支持免費指南、11–18 歲受眾、地方與全球的連結、跨自然及社會科學、三十多個教育場域試用與捐贈檢測工具組。全篇保留中心歸屬；試用過不等於證明所有班級有效，不聲稱已評估學習成效。
- [公告所連指南頁](https://ssec.si.edu/water-guide) 顯示 Request Rejected／OCIO Help Desk，停止取用，沒有重試、換路或下載 PDF。不能交叉核實指南內部活動與細節，因此不寫入教材；亦沒有獨立第二來源證實試用數量，保留 according to the center。
- 報導日 11/17；公告只說指南已推出，未給精確首次上架日。`eventDate` 採公告日，背景明示界線。11/18 教育者 webinar 與指南用途不同，本文不把已過活動寫成未來邀請，也不另引入時區負擔。

### 恆星資料聲音化

- 主來源：[NASA／Megan Watzke](https://science.nasa.gov/missions/chandra/new-album-of-baby-star-sounds-shared-by-nasas-chandra/)，首發 2026-11-17，頁尾更新 11/18。web open 已讀公開全文，包括四個天體段落與製作團隊說明；支持四個作品、望遠鏡資料、M82 掃描的亮度與音量對應、X 射線資料對應最高頻率。
- 方法交叉查核：[Chandra 計畫頁 A Universe of Sound](https://chandra.cfa.harvard.edu/sound/)，由 NASA 提供連結並轉址。已讀說明與 FAQ：以真實觀測資料對應人耳能聽見的頻率，個別作品依資料採不同技術。這是同計畫的一手方法說明，並非獨立媒體調查；不擴大為全部作品一律採同一映射。
- `eventDate` 採 11/17 發表日，不是觀測日或恆星誕生日。聲音化不同於麥克風錄音是依上述製作方法的教學推論。未取用音檔、未聲稱實聽或實際參與製作；讀者無須聽音訊即可回答所有問題。

## 驗證

- Node 24.22.1，以 `npm exec --package=pnpm@12.0.0` 執行固定版本。`pnpm install --frozen-lockfile` 成功；初次 npm cache 路徑不可寫，改用本批可寫 cache，套件與 lockfile 未改。
- 初次 Astro telemetry 設定目錄不可寫；以 `ASTRO_TELEMETRY_DISABLED=1` 與可寫 XDG 設定目錄重跑，不改測試或程式。`verify:static` 通過：108 檔案型別檢查，0 errors／warnings／hints；202 項單元／內容測試全通過；24 篇文章驗證與 222 頁完整 build 成功。保留既有大型 chunk 提示。
- Playwright 官方 Chromium 1248、WebKit 2370 及 ffmpeg 已下載至本批可寫路徑。`install-deps chromium webkit` 嘗試使用 root，但 su authentication failure，沒有改用其他權限或弱化設定。WebKit 相依系統函式庫仍有缺項。
- 提交紀錄時完整 `test:browser --max-failures=1` 與 `test:extension` 正執行；Chromium 已成功開啟新文章與驗證收合行為。最終本機結果及精確 PR head CI 另記 PR，不能把局部測試或其他 head 成功視為本批完整通過。max-failures 僅停止後續執行，不移除任何測試。
- 雲端瀏覽器 API 回報無法讀取 requirements／無法載入分頁，未完成本批桌機與手機人工實頁目視。CI 與自動瀏覽器測試均不能代替人工目視、實機操作或理解評量。無新圖音，不聲稱實聽。

僅本批兩篇 JSON 與此必要紀錄，交付工作分支及 Draft PR。不推 main、不合併、不啟用 auto-merge、不部署。精確 head 的完整 CI 結果以 PR 上的核對紀錄為準。

## 2026-11-20 使用者要求修正異常

同步已合併 #30 的最新 main `37ea1333d14343efe98741a7e8805e7983540e5a`，保留該批文化教材。同步後 head `87ca14f96a1c3865bac088bc58c856c58d1e8e7c` 的 CI 44670651329，WebKit 第 1 分片已進入測試，但第 2 分片再次安裝逾時；新 job 136070915295 完整日誌證實 AWS 區域 Ubuntu archive 下載緩慢，現有 Azure 專用轉換漏掉此來源。依本次「修正異常」要求，交付範圍增加必要 CI 前置腳本、回歸測試與 CI 紀錄；詳見 docs/ci.md 的 AWS runner 小節。沒有修改網站 UI、schema、應用程式、依賴或教材正文，也未增加 timeout、retry、skip 或減少測試。最終新 head 與完整 CI 結果記於 PR。
