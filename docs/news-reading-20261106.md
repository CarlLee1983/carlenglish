# 2026-11-06 新聞閱讀教材查核

## 範圍與教學

本批新增兩篇 N2 教學改寫，均為三段雙語正文、五個關鍵詞及四題中文理解題，參考答案沿用既有預設收合呈現。只有 JSON 與本紀錄，不修改 schema、UI、圖音、學習紀錄或發布流程。N2 是設計級別，不是使用者能力認證。

建議先讀 `solar-flare-launch-alert-2026`，練習問題／解法與 could 的不確定語氣；再讀 `fossil-insect-timeline-2026`，練習原有看法／新證據，以及「分類不確定」和「證明是另一類」的區別。也可獨立閱讀。先找主旨，再按需展開中譯，作答後查看答案。

獨立讀稿核對英中對應、題目答案與來源。依審閱將 “a flare over Alaska” 改為明確表示火箭從 Alaska 發射，避免誤以為閃焰在阿拉斯加上空；把 arrives 改為 reaches space，並同步中文。未聲稱使用者已試讀或通過評量。

## 基準及去重

2026-11-06 以最新 main `08f46ab4b3b5cfb759d3e58f47594b114949937c` 建立獨立雲端 checkout、分支 `content/news-reading-20261106`。環境清單沒有已連線電腦或 saved coding environment，使用現有雲端電腦完成工作，未用使用者電腦。

已讀 README、CONTEXT、docs/content-guide.md、docs/news-social-reading-plan.md、src/lib/articles.ts、ArticleReader、docs/ci.md 及現行 CI/verify workflow。此 checkout 沒有 AGENTS.md 或 .agents/skills。檢查全部 16 篇現有文章、過往查核文件、遠端分支及 open PR（結果為空），沒有同日稿件、同事件或來源 URL 重複。近期青蛙標本題與本批化石題對象及研究不同；本篇改練不確定分類與定年證據，而非感染與局部消失。

## 公開來源及日期

全部存取與改寫日期為 2026-11-06。以下均實際開啟公開原文，不僅採搜尋摘要。沒有取用新聞圖片、長篇引文、音訊或全文翻譯。

### 太陽閃焰

- 主來源：[NASA，2026-11-04](https://science.nasa.gov/blogs/science-news/2026/11/04/solar-flare-alert-system-helps-nasa-rocket-team-decide-when-to-launch/)。第一段支持短暫觀測窗口；第二段支持定位、持續時間估計與兩次飛行；第三段將未來用途保留為可能。
- 交叉核對：[University of Minnesota，FOXSI-4](https://foxsi.umn.edu/launches/foxsi-4) 的 Solar Flare Campaign 支持 2024 年 4 月、Alaska 及雙火箭觀測。
- 交叉核對：[University of Alaska Fairbanks，2026-05-15](https://www.gi.alaska.edu/news/mission-study-solar-flares-launches-poker-flat) 支持 2026 年 5 月 14 日飛行及實際取得觀測資料。這是任務參與機構的資訊，不宣稱為完全獨立調查。
- NASA 連結的 IOP 論文 `10.3847/1538-4357/ae95fd` 開啟回 restricted URL；未重試該限制或繞過付費牆。因此警示系統機制依 NASA 歸屬撰寫，不聲稱讀過論文全文或驗證預測精度。
- eventDate 2026-11-04 是研究介紹公開日期，背景明確區分 2024／2026 年實際發射，不把舊發射寫成當天事件。

### 化石與昆蟲年代

- 主來源：[Natural History Museum，2026-10-29](https://www.nhm.ac.uk/press-office/press-releases/flying-insects-are-80-million-years-younger-than-first-thought.html)。支持蘇格蘭標本、舊用途、雷射顯微鏡與分類疑問。
- 交叉核對：[Long 等，Scientific Reports，2026-09-18](https://www.nature.com/articles/s41598-026-70516-3)，DOI `10.1038/s41598-026-70516-3`。公開頁面 Abstract、Introduction 支持不適合用作昆蟲演化 calibration fossil，並非已明確改判為蜈蚣。
- eventDate 用論文公開日 2026-09-18，publishedAt 用博物館報導日 2026-10-29。未將論文寫成十月發表，也沒有把 1926 年發現寫成本次新發現。
- 不直接沿用新聞標題的「年輕八千萬年」；論文談的是 winged insects 的 minimum age 改變，不等於找到第一隻昆蟲飛行的確切時間。正文保留此限制，問題也要求分辨。

## 驗證紀錄

CI 僅代表自動驗證，不代表桌機／手機人工目視、實聽或使用者理解測驗。只建立 draft PR，不推 main、不合併、不部署。

- Node 24.22.1、pnpm 12.0.0；最初系統 pnpm 是 11.25.0，已於可寫暫存目錄安裝指定的 12.0.0，重新 frozen-lockfile 安裝成功，lockfile 未變。Astro／pnpm 快取與設定使用暫存目錄，沒有修改專案或系統安全設定。
- 最終 `pnpm run verify:static` 成功：108 個檔案 Astro check 無錯誤／警告；202 個單元／內容測試通過；內容驗證及 216 頁建置成功。建置有既有 JavaScript chunk 大小提示，非內容錯誤。
- 最終字數：太陽閃焰 134 字／13 句（平均 10.3）；化石 140 字／14 句（平均 10.0）。兩篇 `stageWarnings` 均為空，關鍵詞在完整句子中，`git diff --check` 通過。
- 已執行完整 `pnpm run verify`；瀏覽器階段因缺 Chromium executable 持續失敗，確認同一環境阻塞後中止，不能稱完整通過。官方 Playwright 安裝取得的 ZIP 損毀；環境下載顯示 Chromium v1234，但專案測試要求 headless shell 1248，未取得相符可執行檔，也未替換設定掩蓋差異。
- 最終稿另執行 `pnpm run test:browser --max-failures=1`，第一個案例在啟動瀏覽器失敗，3 interrupted、2733 did not run；這是環境阻塞證據，非瀏覽器完整驗收。`pnpm run test:extension` 亦實際執行，暫存擴充建置後因缺同一 Chromium executable 失敗。
- 桌機／手機人工實頁目視未完成。精確 PR head 的既有完整 CI 另行監看；不把 CI、HTML 檢查或建置稱為人工目視。
