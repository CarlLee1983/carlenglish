# 2026-11-13 新聞閱讀教材查核

## 範圍與建議順序

本批兩篇 N2 原創教學改寫，各三段英文、繁體中文輔助、五個關鍵詞及四題理解題。中譯與參考答案沿用既有收合方式。先讀英文找主旨，按需開中譯，回答後再看解析；兩篇也可獨立閱讀。

1. `stamp-design-exhibition-2026`：一張郵票是怎麼設計出來的？139 字；練習導言主旨、例子與主張的關係，以及從 approved／rejected 對比猜字。
2. `native-cinema-online-2026`：線上影展，什麼時候能看？151 字；練習 on demand 的上下文解釋、公告與活動日期、except 的例外條件。

驗證器平均句長約 10.7／10.8 字，兩篇 stageWarnings 均為空；它把 p.m. 當成分句邊界，句數是工具量測，不當作實際句法分析。級別維持 N2，不因日期或累積篇數推定使用者升級，沒有使用者試讀或能力評量結果。

英中逐段覆核，題目均可由正文或來源日期回答；沒有要求觀賞影片、參觀展覽或先懂郵票史才能作答。不轉載來源全文、照片、影片、字幕或音訊，不修改 schema、UI、測試、套件或其他教材。

## 基準與去重

以 main `ca20f0d46f2e8316b88baa782adb82cbed0fdd3b` 建立雲端獨立 checkout 與 `content/news-reading-20261113`。讀取 README、CONTEXT、content-guide、news-social-reading-plan、articles schema、ArticleReader、CI 文件與 workflows。此 main 沒有 AGENTS.md 或 `.agents/skills`。

核對既有 20 篇文章、來源 URL、穩定 ID、歷次新聞紀錄、遠端分支及 open PR。11/10 批次已合併，open PR 空，沒有11/13同日稿件。兩個事件未出現；既有博物館排燈節篇是另一活動，不重寫其內容。

## 公開來源與日期

取用與改寫日期均為 2026-11-13。搜尋僅用於發現來源。一般網頁擷取工具開啟 Smithsonian 兩篇專頁回傳 404，雲端瀏覽器可正常顯示，已實際讀完整公告及活動頁；沒有登入、付費牆、存取拒絕或繞過限制。

### 郵票設計展

- 主來源：[Smithsonian 新聞稿，2026-10-26](https://www.si.edu/newsdesk/releases/national-postal-museum-open-exhibition-exploring-american-stories-through-stamp)，穩定通報 SI-322-2026。支持預定開展日、草圖及採用／未採用設計、日食郵票、十二主題、雙語呈現與輪替展品。
- 交叉核對：[National Postal Museum 展覽頁](https://postalmuseum.si.edu/american-stories-american-stamps)。支持2026-11-20至2029年10月、十二主題及設計過程。這是同一主辦機構的交叉頁面，不是獨立調查。
- `publishedAt` 為10/26；`eventDate` 為預定開展日11/20，晚於改寫日。保留 plans／will，不稱展覽已開幕。新聞教材不必都採最近24小時消息；本題是即將開始的文化活動。
- 日食郵票是展示設計方法的例子，未宣稱訪客可觸碰館藏；本文沒有複製郵票圖像。輪替展品不等於十二主題會全部更換。

### 原住民族線上影展

- 主來源：[Smithsonian 新聞稿，2026-11-09](https://www.si.edu/newsdesk/releases/national-museum-american-indian-presents-2026-native-cinema-showcase)，穩定通報 SI-340-2026。支持4長片、10短片、主辦機構、兩週隨選期間、全球觀看例外、題材及數部影片的英文字幕。
- 交叉核對：[主辦方影展首頁](https://americanindian.si.edu/native-cinema-showcase-2026/)。確認11/13至11/27、美東下午5點、on demand及原住民族電影工作者範圍。也是同主辦方資料，不當作獨立證據。
- `publishedAt` 為11/9；`eventDate` 使用主辦方所在地開展日11/13。美東已為標準時間，台北開始為11/14 06:00，結束為11/28 06:00；背景卡另行說明，不把台北11/13上午寫成已開放。
- Remaining Native 不在「全球可看」範圍內；本文不推測其完整地區限制，亦未測試台灣播放。未觀看任何影片，題材概述只來自主辦方介紹，不聲稱影評或親歷。部分影片有暴力、狩獵等提醒，背景明示，不把整個影展推薦為兒童教材。
- 英文不概括所有影片皆附英文字幕，也不以單一作品代表所有原住民族社群。

## 驗收

- Node 24.22.1、pnpm 12.0.0；frozen-lockfile 安裝成功，依賴與 lockfile 未變。工具的快取／設定放暫存目錄，未修改系統安全設定。
- 專案無獨立 format 指令；JSON 二空格、尾端換行，`git diff --check` 通過。
- `pnpm run verify:static` 通過：Astro check 0 errors／warnings，202項內容／單元測試通過，內容驗證及220頁完整 build 成功。兩篇出現在首頁、文章頁及 sitemap。既有大型 JavaScript chunk 提示仍存在。
- 官方 `pnpm exec playwright install chromium webkit` 因 Chromium ZIP 損毀／截斷失敗；WebKit 未完成安裝。未以其他版本替換、不削弱測試。
- 實際執行 `test:browser --max-failures=1`，因缺少 chromium_headless_shell-1248 executable 而停止：1 failed、3 interrupted、2817 did not run。這是啟動限制，不能稱完整 E2E 通過。`test:extension` 完成隔離副本建置後也因缺少相同 executable 失敗，未改測試條件。
- 另啟動正式 dist 預覽並用雲端瀏覽器開啟新文章，回傳 ERR_CONNECTION_REFUSED，未完成桌機／手機實頁視覺驗收。
- 精確 PR head 完整 CI 會另外記在 PR。CI 自動驗證不等於人工視覺或實機操作。本批無圖音，不需要也不聲稱實聽。

只提交兩份教材與本紀錄至工作分支及 draft PR，不推 main、不合併、不啟用 auto-merge、不部署。
