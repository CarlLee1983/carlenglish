# 從活動公告讀到觀測限制：兩篇 N2 閱讀練習

改寫與查核日期：2026-10-16。這批沿用 N2 新聞簡報，不表示讀者已完成前一批或已具備某種能力。兩篇皆是原創教學改寫，繁體中文對應本站英文，不轉載新聞全文、圖片或音訊。

## 建議閱讀順序

1. [博物館的夜晚，從看展到一起跳舞](/articles/museum-diwali-evening-2026/)：先找活動主旨，再追蹤第二段 They 的指涉，最後辨認參加條件與費用。只需記住五個影響理解的關鍵詞。
2. [衛星沒標出火，森林就沒在燒嗎？](/articles/satellite-fire-blind-spots-2026/)：用 However 追蹤段落轉折，再區分觀察紀錄與現場情況。空白紀錄不能單獨支持「一定有火」或「一定沒有火」。

第一次閱讀先收起翻譯與答案，用中文說一句主旨。第二次回到英文，指出支持答案的句子；卡住時只查阻礙理解的詞。若整篇吃力，可先做博物館篇第一、二題。讀者無須先記熟所有生字，也不因日期或篇數自動升級。

代名詞指涉、轉折與推論界線也會出現在小說，但新聞閱讀不等於已能理解小說角色的動機、暗示與敘事觀點。本批不收錄小說或受版權保護的小說翻譯。

## 來源、日期與逐段查核

### 博物館夜間活動

- 原始來源：Smithsonian National Museum of Asian Art，〈National Museum of Asian Art Opens After Hours To Celebrate 2026 Diwali〉，2026-10-15。
- 精確連結：https://asia.si.edu/about/press/releases/diwali-2026/
- 已讀官方 HTML 全文，包括活動內容、報名條件、館方介紹與頁尾。一般網頁讀取工具回報 500；雲端命令列正常取得公開 HTML，沒有登入、付費牆或存取拒絕。未嘗試 CNN 先前被取消的瀏覽動作。
- 第一段：公告首段支持館名、華盛頓、11 月 6 日 17:00–21:30 與晚間活動。10 月 15 日是發布日，11 月 6 日是預定活動日，兩者分開記錄。
- 第二段：首段、活動清單與 19:30 廣場段落支持展廳、手作圖案、現場音樂、舞蹈及 DJ／燈光。省略演出者姓名與樂器專名，以免背景詞彙壓過閱讀目標。
- 第三段：報名段落明定建議登記但不強制；館方介紹明定免費入館，活動清單明定餐飲可購買。最後一句額外餐飲預算是從這兩項資訊導出的日常推論，並非館方直接引述。
- 只描述這個館的活動，不把館方對節慶的簡化說明當成所有地區、宗教或家庭的共同習俗。沒有宣稱活動已舉行或親自參加。

### 衛星火災觀測

- 原始來源：NASA Earth Observatory，Adam Voiland，〈Fires Arrive in the Amazon Rainforest〉，2026-10-15。
- 精確連結：https://science.nasa.gov/earth/earth-observatory/fires-arrive-in-the-amazon-rainforest/
- 公開網頁工具已讀正文至末段與參考資料，不以搜尋摘要代替全文。
- 第一段：正文開頭至影像段落支持 9 月起中／東亞馬遜火災增加、10 月 12 日衛星影像及煙霧。eventDate 採影像日期，不冒充各火災的起火日。
- 第二段：正文末段明確說濃煙、雲與樹冠遮住感測器所需的紅外訊號，尤其容易漏掉林下低強度火災。本文以 heat signal 降低專有詞負荷。
- 第三段：Coffield 分析額外 VIIRS 資訊、尋找未達標準偵測門檻的 candidate fires，並計畫分享位置給 MapBiomas 研究網絡。教材保留 possible，不寫成每個候選位置都已證實有火。最後一句是結合前段遮蔽條件的閱讀推論，不是逐字引述。
- 交叉查核：University of Maryland，Cazzy Medley，〈Improving Wildfire Tracking with Satellite Detection〉，2025-12-05，https://cmns.umd.edu/news-events/news/improving-wildfire-tracking-satellite-detection 。已讀全文。它支持煙、雲、樹冠遮蔽，以及 candidate pixels 不在標準偵測資料中的方法說明。這是較早的方法背景，不能當作 2026 年亞馬遜災情的另一份獨立現場報告。
- 不採用未另行交叉核實的空污數字、傷亡、停課、預測火季終止日或現場安全判準；本教材不是即時防災資訊。

## 文字審稿

兩篇英文各約 140–160 詞、三段、五個關鍵詞及四題。已完成第二位編輯的全文與題答審閱，並將 admission 改為小寫、修正答案標點，以及把衛星空白區的推論限定為有無火災，而非泛指安全。參考答案與翻譯沿現有收合介面，不改頁面、schema 或程式。

## 驗收狀態

- 基底：main f18d586da48423146885b23606def19ab6da03c7。已檢查既有六篇文章、遠端分支與 open PR；沒有本批相同來源／題目，昨天兩篇 NASA 教材不重做。
- 最新 main 無 AGENTS.md 或 .agents/skills；已讀 README、CONTEXT、內容維護說明、新聞企劃、articles schema 與 CI workflow。
- 雲端 Node 24.19.0；本批 pnpm 12.0.0 已取得。初次 /tmp 容量不足後，僅將本批工作區與暫存移到有空間的雲端工作目錄，未刪除其他任務檔案。
- 恢復後確認舊安裝程序已不存在、未有可用依賴，再執行 pnpm 12.0.0 install --frozen-lockfile 成功；使用本工作區的 XDG 暫存／設定路徑，未變更系統設定。
- astro check：61 個檔案，0 errors、0 warnings；內容驗證：46 場景、8 文章、2 字表；內容單元：142/142 通過；build：60 頁完成，包含本批兩篇。
- 本機瀏覽器 E2E 已嘗試，但 Playwright Chromium 下載取得不完整 ZIP，缺少指定執行檔，不能宣稱測試通過。未改測試或替換瀏覽器來規避，交由精確 PR head 的既有 CI 執行完整 verify。
- extension 擴充測試及 PR CI 的最終狀態另見 PR 檢查結果；此紀錄不預先宣稱通過。
- 雲端 Chrome 可列出，但綁定發生 Emulation timeout，native AX provider 亦不可用；尚未用瀏覽器完成來源閱讀或桌機／手機實頁目視。以上來源閱讀實際來自公開網頁工具與雲端 HTTP 取文。
- 工作範圍只有兩篇 JSON 與本查核紀錄；建立 draft PR 供審閱，不合併或部署。PR 描述將記錄精確 head 的 CI 結果與未完成目視限制。
