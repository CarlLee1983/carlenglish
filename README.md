# CarlEnglish

看圖學生活英文的本地靜態網站。首頁先選初級、中級或高級，再從該級別的生活場景開始閱讀；目錄可搜尋中文、英文標題與主題，並依生活主題篩選。目前涵蓋兒童、國中、高中與家庭生活的 82 個場景，初級 63 篇、中級 12 篇、高級 7 篇。首頁另有新聞與貼文文章，以及依 L1–L4 分組的文學軌。首篇經典是 L1 教學改寫《麥琪的禮物》，分三節閱讀，提供原作資訊與讀後提問。

生活讀本使用同一個 Kokoro `af_heart` 美式女聲的本地 MP3，包含 537 段逐句正文及既有常用短句、重點單字。初級預設逐句跟讀與 `0.8×`；中／高級預設連續朗讀與 `1×`，可選 `0.7×／0.8×／0.9×／1×`，手動選擇的模式與語速會套用到後續教材。一般閱讀保留整篇正文，點「開始跟讀」或接續入口後進入獨立的專注畫面。目前句子、可開關的中文翻譯、語速與主要操作保持同屏；主按鈕依序處理播放、暫停、繼續、下一句與完成。重聽與上一句為次要操作，跳句、連續模式與從頭朗讀收在設定內。退出或按 Escape 會停止發聲，回到正文剛練習的句子；可再到短句／單字區試聽，之後手動返回原句。逐句與連續模式共用句子音檔，不會呼叫線上語音服務。

每篇最後聽到的句子與聽完狀態保存在同一瀏覽器；停止、離頁或切到背景後仍可從句首接續，重新開頁須點擊才播放。聽完不代表已學會。教材或錄音更新使位置失效時提示從頭開始；儲存不可用不影響播放，並另顯示保存失敗提示。沒有帳號或跨裝置同步，清除網站資料也會移除朗讀紀錄；經典的篇章續讀與複習資料各自獨立。需要 JavaScript 才能播放，停用時仍可閱讀正文與翻譯。

使用 Node.js 24 與 pnpm 12.0.0，`package.json` 的 `packageManager` 固定套件管理器版本。尚未安裝 pnpm 時，先依 [官方安裝說明](https://pnpm.io/installation/) 安裝對應版本。從本目錄執行：

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium webkit
pnpm run dev
```

開啟啟動命令顯示的 Local URL。Astro 在 agent 環境可能以背景程序啟動；可用 `pnpm exec astro dev status`、`pnpm exec astro dev logs`、`pnpm exec astro dev stop` 管理本專案的開發伺服器。需要保留前景程序時，使用 `pnpm run dev --ignore-lock`。

```sh
pnpm run check
pnpm run validate:content
pnpm run test:content
pnpm run build
pnpm run test:browser
pnpm run test:extension
```

製作場景期間先用 `pnpm run verify:content-change`：仍執行全站型別、內容與單元檢查、完整建置，再驗證變更場景及共用目錄、朗讀、SEO 與全場景音檔。它合併相對 `HEAD` 的已提交差異、暫存區、工作目錄與未追蹤檔案；共用素材會選中所有引用場景。可用 `--base origin/main` 改比較基準，`--plan` 只查看計畫、不算驗證。遇到程式、測試、設定、未知素材、刪除或不明基準，會回退完整 `verify`。內容作者檢查不代替整合或發布驗收；每次整合、PR 與發布仍須完整驗證。細節見 [CI 與教材驗證](docs/ci.md)。

`pnpm run verify` 保留完整檢查，`verify:static` 集中型別、單元測試與建置，內容驗證在建置前執行一次。瀏覽器測試讀取正式 `dist/`，預設用 4391 埠啟動前景預覽並在結束時關閉；不要先手動佔用該埠。同時執行其他 worktree 時，可用 `CARLENGLISH_TEST_PORT=4393 pnpm run verify` 指定另一個未使用的埠。`test:extension` 在暫存副本加入 42 篇合法測試教材，分布於三個級別並重用相同英文的圖片與音檔，再正常建置並以 Chromium 檢查分級、搜尋、主題、有限推薦與完整閱讀內容；它也核對正式專案檔案雜湊沒有變動。測試結束會關閉自己的伺服器並移除副本，測試教材不會混入正式內容。正式建置後也能以 `pnpm run preview` 查看。

發音自動測試涵蓋逐句／連續模式、語速與偏好、句子進度、播放切換、舊事件與 Promise 隔離、失敗處理及本地音檔解碼。新增逐句音檔、慢速與手機跟讀體驗仍須本次實聽驗收，見 [朗讀改善設計](docs/read-aloud-design.md)。既有內容曾由使用者接受代表性聲線樣本，再確認當時的內容、音檔與手機操作驗收完成。本批三篇與 39 段新音檔須另外驗收，不能沿用舊批次的結案結果。人工驗收依使用者確認，媒體事件不能代替實聽。網站尚未建立離線快取或 PWA。

## 內容與呈現

- `pnpm-lock.yaml`：固定依賴與套件管理器版本，安裝使用 `--frozen-lockfile`。
- `pnpm-workspace.yaml`：指定原生工具的建置腳本政策；目前允許固定版本的 esbuild、workerd，fsevents 使用套件內附的可選 macOS binary。發布年齡例外只涵蓋遷移前已採用的 `wrangler@4.150.0` 與 `miniflare@5.20261006.2-beta`；其他套件及後續版本沿用 pnpm 的預設限制。升級相關依賴時需同步核對這些政策。
- `content/scenes/*.json`：每個場景一份資料。
- `content/articles/*.json`：每篇新聞／貼文文章一份資料，與場景分開驗證。
- `content/classics/*.json`：每篇經典一份資料；新增合法資料檔即產生總覽、節頁、首頁卡片與 sitemap 項目。
- `public/images/scenes/`：網站直接使用的預先生成圖片。
- `public/audio/{words,phrases,sentences}/`：網站直接播放的本地合成 MP3。
- `content/audio/voice-profile.json`：固定聲線與生成設定。
- `src/lib/scenes.ts`、`src/lib/articles.ts`、`src/lib/classics.ts`：各自發現、驗證與取得場景、文章及經典；`src/lib/validation.ts` 提供共用欄位與跨類型 ID 檢查。
- `src/lib/catalog.ts`：統一初／中／高級分組、主題與最多三篇同級推薦。
- `src/lib/seo.ts`：分享圖片資訊、canonical、索引清單與 JSON-LD 安全輸出；`src/layouts/Layout.astro` 統一呈現中繼資料。
- `src/pages/{sitemap.xml,robots.txt}.ts`：依內容產生 crawler 檔案；分享圖靜態端點使用建置用的 `sharp@0.35.5`。
- `src/pages/levels/[level].astro`：各級別的靜態目錄；`src/scripts/catalog.ts` 提供搜尋、篩選與網址狀態。
- `src/components/Reader.astro`、`ArticleReader.astro`：場景與文章各自共用的閱讀版型。
- `src/scripts/pronunciation.ts`：逐句／連續朗讀、語速、播放互斥與錯誤狀態。
- `src/lib/reading-storage.ts`：朗讀偏好與每篇句子進度的瀏覽器儲存邊界。
- `src/scripts/reader-navigation.ts`：保留進入讀本前的搜尋與主題條件。
- `src/pages/scenes/[id].astro`、`src/pages/articles/[id].astro`：依各自內容 ID 產生穩定路由與分享／索引資料。
- `src/pages/classics/[id]/`：依經典資料產生總覽與每節的靜態頁面。
- `tests/`：內容入口與瀏覽器行為測試。

新增場景只要加入 JSON、圖片及所需音檔，執行內容驗證，再重新建置；完全相同的英文可重用既有音檔。不需修改版型、頁面、路由或清單。欄位與生成命令見 [內容維護說明](docs/content-guide.md)，分級與導覽行為見 [UI 導覽說明](docs/ui-navigation.md)，圖示、分享與搜尋資料見 [SEO／AEO 說明](docs/seo.md)，聲線與舊錄音來源見 [audio-sources.md](docs/audio-sources.md)。

規格見 [docs/spec.md](docs/spec.md)，驗收與限制見 [docs/implementation.md](docs/implementation.md)，已完成工單見 [docs/issues/](docs/issues/README.md)。圖片生成工具、原始指令與成品路徑見 [docs/image-prompts.md](docs/image-prompts.md)。

擴充歷史見 [場景與學習卡擴充企劃](docs/expansion-plan.md)：規劃的 40 個兒童、國中、高中及親子生活新情境已全數完成上線，包含完整場景圖繪、內容文案與 Kokoro 語音合成。分級詞彙、列印與手機字卡見下節。

## 獨立分級單字庫、列印與手機字卡

首頁與各級讀本目錄都有「單字庫」入口：`/vocabulary/beginner/`、`/vocabulary/intermediate/`、`/vocabulary/advanced/`。第一批每級 50 字，共 150 字，獨立於生活讀本編選，不依讀本篇數或詞頻排名切分。初級以具體生活與基本溝通為主，中級拓展工作、學習與生活任務，高級練習抽象判斷、語意細節與專門概念。這些是本站編選的學習分組，並非 CEFR 或檢定認證。

`content/vocabulary/banks.json` 只維護分級、編選說明，以及來源詞表的 `wordListId`／`entryId`。中文、例句、發音與授權沿用 NGSL-Spoken／TSL 既有詞條，同一來源提供完整內容，沒有複製另一份字典或修改詞頻排名。更新來源詞條會更新單字庫；刪除被引用詞條、重複分配或遺漏級別會讓驗證失敗。新增編選只需加入合法引用並重新建置；目前的 50 字數量驗收測試須隨正式擴充更新。出處、改作與 CC BY-SA 4.0 授權會顯示在網頁及列印版；完整說明見 [編選出處](content/vocabulary/NOTICE.md)。

可搜尋英文、中文與例句；「列印詞彙表」只列印目前結果，套用 A4 黑白表格、重複表頭並避免單筆跨頁，也可透過瀏覽器另存 PDF。從字卡模式列印時仍輸出篩選後的詞彙表。未啟用 JavaScript 時，可閱讀完整詞彙與出處，並使用瀏覽器選單列印。

「用字卡練習」會使用目前搜尋結果，也可從「練這個字」開始。練習採獨立的全視窗畫面，固定保留返回、進度與底部發音／換卡操作；長例句可在卡片內直向捲動。左右滑動使用瀏覽器原生捲動與卡片吸附，支援手指持續拖動、慣性與反向操作；桌面可用觸控板、方向鍵或上一張／下一張。點擊換卡按鈕會連續移動，連按會改往最新目標，不排隊播放多次動畫。進入練習時才載入 Three.js，以 WebGL 繪製有厚度、光照、陰影與後方疊卡的紙卡。入場抽卡為可中斷的 420ms 動作；觸控或滑鼠點卡片以 560ms 翻到中文與例句，翻轉時紙卡從牌堆拿起並略超過再落定，可在翻轉中再次點擊反向。文字仍是網頁內容，與 3D 紙面共用同一翻面角度；左右捲動會帶出傾斜和前後深度。鍵盤和「減少動態效果」即時切換，WebGL 不可用時保留原生字卡。滑動、取消的手勢與選取文字不翻面。場景在靜止、查看來源、列印及頁面隱藏時停止繪製；離開練習會釋放 GPU 資源。

發音採精簡播放／停止按鈕與既有本地音檔，失敗時可在同一張卡重試；換字、滑動開始、開啟資訊、退出、隱藏頁面或列印時停止。來源與授權在練習內另開資訊畫面，返回或按 Escape 會先回字卡，保留位置與解答；再退出練習會回到原入口。列印輸出搜尋後的詞彙表與授權，關閉列印後可回原練習。搜尋及模式保留在網址，練習位置不跨重新整理保存，也不影響既有複習排程。減少動態效果設定不增加換卡動畫；雙指縮放保留。瀏覽器模擬、注入觸控、音訊事件與 PDF 渲染不代替實機觸感、實聽及實體列印驗收。

資料驗證與載入在 `src/lib/vocabulary.ts`，呈現在 `src/pages/vocabulary/[level].astro`、`src/scripts/vocabulary.ts`（搜尋與網址）、`src/scripts/vocabulary-practice.ts`（練習互動），畫面與列印樣式在 `src/styles/vocabulary.css`。沒有新增套件、錄音、帳號、儲存格式或遠端服務。回復此功能時，一併回復編選資料、頁面／入口、驗證與索引變更即可，既有詞表及複習資料不需遷移。

## 中級至中高級閱讀單元

包含「禮貌表達不同意見」→「查證網路消息」→「提出有根據的活動方案」等進階情境。難度標籤是編輯描述，並非 CEFR 認證，也不代表使用者已完成初階練習。適合能理解簡短生活敘述，想進一步練習理由、條件、資訊來源及提案限制的讀者；每篇亦可獨立閱讀。

配套的 [閱讀目標、句型提示、練習與分開的參考解析](docs/book-swap-study-guide.md) 提供三步閱讀順序。這是可自行或共讀使用的文字練習，未加入網頁測驗、評分或學習紀錄。製作與驗證紀錄見 [本次內容驗收](docs/book-swap-verification.md)。

## 發布

網站已發布於 [carlenglish.gravito.dev](https://carlenglish.gravito.dev)，原始碼位於公開的 [GitHub repository](https://github.com/CarlLee1983/carlenglish)。使用 Cloudflare Workers Static Assets，`wrangler.jsonc` 將 `dist/` 提供為靜態網站。首頁、三個分級目錄與 43 個場景的直接網址、圖片及音檔已在線上驗證；未知場景回傳自訂 404 頁。已有 Cloudflare 發布權限的環境可執行 `pnpm run deploy`，依序完成驗證與部署。

2026-10-14 的 UI／favicon／SEO 版本 `701b6750-4874-47be-9895-340116532e5f` 從 `ui/level-entry-catalog` worktree 直接部署，整合的教材基底為 `354d919a`。程式已整理於 `ui/level-entry-catalog` 分支的 PR；合併前，`main` 自動部署會使用主分支版本。驗證與回復方式見 [發布紀錄](docs/implementation.md#2026-10-14-分級介面與-seo-整合發布)。

CI 與 Deploy 共用完整驗證 workflow：一次建置後，三個 Playwright 分片與擴充測試平行執行，所有必要工作成功才通過總閘門；原有五種瀏覽器設定與完整案例皆保留。PR 新提交會取消過期 CI，正式部署仍依序執行。`main` 推送時，若 `CLOUDFLARE_DEPLOY_ENABLED=true`，只由 Deploy 驗證，CI 跳過；停用時仍由 CI 驗證 `main`。部署下載同一 run 的精確 artifact ID，核對來源 SHA 與每個 `dist/` 檔案雜湊後發布，不重建，也不採用其他 run 的「最近成功」產物。相關 gates、版本固定與驗證狀態見 [CI 說明](docs/ci.md)。

首筆提交的 [CI 已通過](https://github.com/CarlLee1983/carlenglish/actions/runs/38504543453)。首次上線使用本機既有的 Cloudflare 授權完成。GitHub 自動部署已啟用：repository secrets `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN` 與 variable `CLOUDFLARE_DEPLOY_ENABLED=true` 均已設定，`main` 推送或手動啟動 `Deploy` 會先完成全部 gates 再部署；[首次 Actions 部署](https://github.com/CarlLee1983/carlenglish/actions/runs/38509015094)已成功。

部署 token 是專用 custom user token（`carlenglish-github-deploy`），權限為 Account 的 Workers Scripts Edit、Account Settings Read，以及 Zone 的 Workers Routes Edit、Zone Read；Account Resources 限定網站所屬帳號，Zone Resources 限定 `gravito.dev`，不設 IP 限制（GitHub Actions IP 不固定）。`cf` CLI 的登入無法管理 token（403，9109），須在 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) 建立。更換 token 時在自己的終端執行以下指令，於隱藏提示輸入新 token：

```sh
gh secret set CLOUDFLARE_API_TOKEN --repo CarlLee1983/carlenglish
```

不要將 token 貼入對話或寫入 repository。不要將本機 `.scratch/`、`docs/learning-progress.md` 加入 repository。`docs/learning-progress.md` 是個人閱讀紀錄，網站驗收與發布不會改變其學習進度。

目前內容為 82 篇 5–8 句生活短文，涵蓋日常生活、校園學習與思辨提案等場景。未來交辦 dot 每日製作教材是後續工作；長文格式、新聞來源呈現與每日發布流程尚未實作。

## 生活協商閱讀單元

新增三篇原創中級至中高級生活讀本：釐清故障耳機的退換方式、有條件地更改預約、協調共同預算與支出界線。沿用 8 句雙語短文、5 個短句、7 個單字及固定聲線；不新增頁面互動。建議順序、9 題練習與分開的參考答案見 [生活協商學習說明](docs/negotiation-study-guide.md)，[本批製作與驗證](docs/negotiation-verification.md) 記錄檢查範圍與限制。

經典的欄位、原文取用與切節、注釋字卡及續讀資料維護方式見 [經典內容維護](docs/classics.md)。

## 台灣小學生初級生活英文

新增六篇入門讀本：早餐店點餐、雨天上學、在家玩野餐、先休息一下、下課後一起打掃、夜市買水果。每篇 6 句、約 39–45 個英文字，搭配繁體中文、原創插畫、4 組常用語塊、6 個單字與本地朗讀，共新增 96 段音檔。教材會自動出現在初級目錄；分級不是學校年級。

[共讀學習說明](docs/elementary-beginners-study-guide.md) 提供建議順序、理解與口說練習、分開的答案，以及《妙妙犬布麗》（Bluey）的官方首頁觀看入口與原創觀察任務。六篇讀本使用獨立人物與故事，未收錄節目台詞、字幕、截圖、角色圖或音軌。圖音來源、檢查範圍及尚待實聽的項目見 [本批素材與驗證](docs/elementary-beginners-verification.md)。

## 小學生生活英文：動手做與觀察

新增三篇入門原創讀本：洗手準備點心、摺衣服找襪子、小種子發芽了。每篇 6 句、40–43 個英文字、4 組語塊、6 個單字，附原創插畫及相同固定聲線，共 48 段新音檔。延續上一批的共讀方式，可獨立閱讀，未新增互動功能或取用第三方節目素材。

[共讀順序、理解題與分開的參考答案](docs/elementary-everyday-study-guide.md)提供位置、動作順序與觀察的練習；素材及實際檢查見[本批驗證](docs/elementary-everyday-verification.md)。本批仍待使用者實聽與孩子試讀。

## 小學生生活英文：一起玩與分享

再新增三篇入門原創讀本：一起拼拼圖、和阿嬤視訊、睡前選書。每篇 6 句、42–44 個英文字、4 組語塊、6 個單字，附原創插畫與固定聲線，共 48 段新音檔。內容練習找物品、確認聽得到、展示畫作與提出請求。

[共讀練習與分開的參考答案](docs/elementary-family-study-guide.md)可獨立使用；[本批素材與驗證](docs/elementary-family-verification.md)記錄實際檢查及仍待使用者實聽、孩子試讀的項目。

## 小學生生活英文：生活小任務

再新增三篇入門原創讀本：做一份三明治、寄卡片給阿嬤、和爸爸搭電梯。每篇 6 句、40–42 個英文字、4 組語塊、6 個單字，附原創插畫與固定聲線，共 48 段新音檔，練習食材、動作順序及詢問樓層。

[共讀順序、練習與分開的答案](docs/elementary-outings-study-guide.md)可獨立使用；[本批素材與驗證](docs/elementary-outings-verification.md)記錄實際證據與待實聽、試讀的事項。

## 小學生生活英文：聽一聽，看一看

再新增三篇入門原創讀本：音樂課打節拍、池塘邊看一看、摺一艘紙船。每篇 6 句、40 個英文字、4 組語塊、6 個單字，附原創插畫與固定聲線，共 48 段新音檔。練習聽指令、描述觀察與提出問題；音樂課只朗讀故事，不收錄歌曲或樂譜。

[共讀練習與分開的答案](docs/elementary-discovery-study-guide.md)可獨立使用；素材、實際檢查與待實聽／試讀事項見[本批驗證](docs/elementary-discovery-verification.md)。

## 小學生生活英文：幫忙、試一試、看影子

新增三篇入門原創讀本：幫忙擺餐桌、試穿新鞋、和影子玩遊戲。每篇 6 句、38–42 個英文字、4 組語塊、6 個單字，附原創插畫及相同固定聲線，共 48 段新音檔。練習確認餐具、描述試穿感受，以及從代名詞理解人物與影子。

[共讀順序、理解與口說練習、參考答案](docs/elementary-help-observe-study-guide.md)可獨立使用；[本批素材與驗證](docs/elementary-help-observe-verification.md)記錄檢查範圍及仍待使用者實聽、孩子試讀的項目。

## 小學生生活英文：拍照、包禮物、吹泡泡

再新增三篇入門原創讀本：和阿公拍照、包裝小禮物、公園吹泡泡。每篇 6 句、38–41 個英文字、4 組語塊、6 個單字，搭配原創插畫及相同固定聲線，共 48 段新音檔。練習拍照時的位置指示、包裝禮物的動作順序，以及輪流試玩的請求與回應。

[共讀順序、理解與口說練習、參考答案](docs/elementary-play-make-study-guide.md)可獨立使用；[本批素材與驗證](docs/elementary-play-make-verification.md)記錄實際檢查及仍待使用者實聽、孩子試讀的項目。

## 小學生生活英文：剪頭髮、拌水果、放風箏

再新增三篇入門原創讀本：剪短一點點、拌一碗水果沙拉、公園放風箏。每篇 6 句、40–42 個英文字、4 組語塊、6 個單字，搭配原創插畫及相同固定聲線，共 48 段新音檔。練習表達想剪短一點的需求、請求參與拌水果，以及分清放風箏時誰放手、誰抓線。

[共讀順序、理解與口說練習、參考答案](docs/elementary-daily-adventures-study-guide.md)可獨立使用；[本批素材與驗證](docs/elementary-daily-adventures-verification.md)記錄實際檢查及仍待使用者實聽、孩子試讀的項目。

## 小學生生活英文：比較、求助與選擇

再新增三篇入門原創讀本：比一比鉛筆長短、平板需要充電、選口味買冰淇淋。每篇 6 句、39–41 個英文字、4 組語塊、6 個重點詞，搭配原創插畫及相同固定聲線，共 48 段新音檔。練習比較這兩支鉛筆的長短、請家人幫忙，以及分別回答口味和甜筒／杯裝的選擇題。

[共讀順序、理解與口說練習、參考答案](docs/elementary-choices-study-guide.md)可獨立使用；[本批素材與驗證](docs/elementary-choices-verification.md)記錄實際檢查及仍待使用者實聽、孩子試讀的項目。

## 小學生生活英文：輪流玩、幫忙裝水、準備明天

再新增三篇入門原創讀本：輪流玩棋盤遊戲、幫忙裝滿水壺、睡前設定鬧鐘。每篇 6 句、40–41 個英文字、4 組語塊、6 個重點詞，搭配原創插畫及相同固定聲線，共 48 段新音檔。練習分清骰子點數與移動格數、描述水壺從空到滿，以及確認鬧鐘已開啟。

[共讀順序、理解與口說練習、參考答案](docs/elementary-routines-study-guide.md)可獨立使用；[本批素材與驗證](docs/elementary-routines-verification.md)記錄實際檢查及仍待使用者實聽、孩子試讀的項目。

## 小學生生活英文：搭建、採買與收拾

再新增三篇入門原創讀本：一起搭積木塔、到麵包店買麵包、整理畫畫用品。每篇 6 句、38–42 個英文字、4 組語塊、6 個重點詞，搭配原創插畫及相同固定聲線，共 48 段新音檔。練習提出問題與觀察結果、接受店家的袋裝提議，以及詢問畫具的收納位置。

[共讀順序、理解與口說練習、參考答案](docs/elementary-building-study-guide.md)可獨立使用；[本批素材與驗證](docs/elementary-building-verification.md)記錄實際檢查及仍待使用者實聽、孩子試讀的項目。

## 第一個閱讀目標：《小王子》英文譯本

首頁新增 `/goals/little-prince/`，以完整英文譯本從第 1 章讀到第 27 章為主線，提供逐章進程表、通用閱讀方法與記錄格式；版本對應精讀尚待譯本確認及查核，不把進程表稱為已完成的 27 章教材。四篇原創短文僅按需補強人物／動作、代名詞、因果與推論，不是前置關卡；每篇三個提示詞，中譯與參考思路預設收合。這些不是原著節選、翻譯或改寫，不保存成績，也不因日期或瀏覽次數推定學會。

使用者準備好後再回到自己持有的英文譯本；不同譯本不共用頁碼答案。首批範圍、來源與權利界線見 [閱讀目標製作紀錄](docs/little-prince-reading-goal.md)。沒有修改現有場景／新聞／經典 schema 或圖音資產。

## 獨立文法區

`/grammar/` 由情境與對比例句練習閱讀中的小詞關係。首批六課涵蓋 in/on/by 位置、in/on/at 時間、in 一段時間、by 方法、by 施事與 with 工具、by/until。每課原創短段、三題及預設收合中譯／解析，可按需選課，不是全書閱讀先修。其他文法分類明標規劃，沒有空課程。

資料位於 `src/data/grammar.ts`，新增課程同步完整內容測試；路由與 sitemap 由同一資料衍生，不需要圖音或其他閱讀類型 schema。[來源、範圍與驗收限制](docs/grammar-foundations-20261028.md)。
