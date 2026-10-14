# CarlEnglish

看圖學生活英文的本地靜態網站。首頁先選初級、中級或高級，再從該級別的生活場景開始閱讀；目錄可搜尋中文、英文標題與主題，並依生活主題篩選。目前涵蓋兒童、國中、高中與家庭生活的 43 個場景，初級 27 篇、中級 10 篇、高級 6 篇。 首頁另有「新聞與貼文」文章入口，目前收錄 3 篇文章，沿用新聞軌／貼文軌與各自級別，提供翻譯、關鍵詞、來源標示與可展開的讀後提問參考答案。

讀本可播放完整短文、常用短句與重點單字的本地 MP3。489 段音檔（43 篇短文、179 個短句、267 個單字）使用同一個 Kokoro `af_heart` 美式女聲合成。播放不會呼叫線上語音服務；一次只播放一段，點選另一段會停止原播放。短文可暫停、續播、從頭播放及停止；不會自動播放。播放失敗時會在頁面提示。需要 JavaScript，文章本身仍可在停用 JavaScript 時閱讀。

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

`pnpm run verify` 依序執行上述完整檢查。瀏覽器測試讀取正式 `dist/`，預設用 4391 埠啟動前景預覽並在結束時關閉；不要先手動佔用該埠。同時執行其他 worktree 時，可用 `CARLENGLISH_TEST_PORT=4393 pnpm run verify` 指定另一個未使用的埠。`test:extension` 在暫存副本加入 42 篇合法測試教材，分布於三個級別並重用相同英文的圖片與音檔，再正常建置並以 Chromium 檢查分級、搜尋、主題、有限推薦與完整閱讀內容；它也核對正式專案檔案雜湊沒有變動。測試結束會關閉自己的伺服器並移除副本，測試教材不會混入正式內容。正式建置後也能以 `pnpm run preview` 查看。

發音自動測試驗證播放切換、短文控制、舊事件與 Promise 隔離、失敗處理及本地音檔。既有內容曾由使用者接受代表性聲線樣本，再確認當時的內容、音檔與手機操作驗收完成。本批三篇與 39 段新音檔須另外驗收，不能沿用舊批次的結案結果。人工驗收依使用者確認，媒體事件不能代替實聽。網站尚未建立離線快取或 PWA。

## 內容與呈現

- `pnpm-lock.yaml`：固定依賴與套件管理器版本，安裝使用 `--frozen-lockfile`。
- `pnpm-workspace.yaml`：指定原生工具的建置腳本政策；目前允許固定版本的 esbuild、workerd，fsevents 使用套件內附的可選 macOS binary。發布年齡例外只涵蓋遷移前已採用的 `wrangler@4.150.0` 與 `miniflare@5.20261006.2-beta`；其他套件及後續版本沿用 pnpm 的預設限制。升級相關依賴時需同步核對這些政策。
- `content/scenes/*.json`：每個場景一份資料。
- `content/articles/*.json`：每篇新聞／貼文文章一份資料，與場景分開驗證。
- `public/images/scenes/`：網站直接使用的預先生成圖片。
- `public/audio/{words,phrases,stories}/`：網站直接播放的本地合成 MP3。
- `content/audio/voice-profile.json`：固定聲線與生成設定。
- `src/lib/scenes.ts`、`src/lib/articles.ts`：各自發現、驗證與取得場景及文章；`src/lib/validation.ts` 提供共用欄位檢查。
- `src/lib/catalog.ts`：統一初／中／高級分組、主題與最多三篇同級推薦。
- `src/lib/seo.ts`：分享圖片資訊、canonical、索引清單與 JSON-LD 安全輸出；`src/layouts/Layout.astro` 統一呈現中繼資料。
- `src/pages/{sitemap.xml,robots.txt}.ts`：依內容產生 crawler 檔案；分享圖靜態端點使用建置用的 `sharp@0.35.5`。
- `src/pages/levels/[level].astro`：各級別的靜態目錄；`src/scripts/catalog.ts` 提供搜尋、篩選與網址狀態。
- `src/components/Reader.astro`、`ArticleReader.astro`：場景與文章各自共用的閱讀版型。
- `src/scripts/pronunciation.ts`：頁內音訊控制與錯誤狀態。
- `src/scripts/reader-navigation.ts`：保留進入讀本前的搜尋與主題條件。
- `src/pages/scenes/[id].astro`、`src/pages/articles/[id].astro`：依各自內容 ID 產生穩定路由與分享／索引資料。
- `tests/`：內容入口與瀏覽器行為測試。

新增場景只要加入 JSON、圖片及所需音檔，執行內容驗證，再重新建置；完全相同的英文可重用既有音檔。不需修改版型、頁面、路由或清單。欄位與生成命令見 [內容維護說明](docs/content-guide.md)，分級與導覽行為見 [UI 導覽說明](docs/ui-navigation.md)，圖示、分享與搜尋資料見 [SEO／AEO 說明](docs/seo.md)，聲線與舊錄音來源見 [audio-sources.md](docs/audio-sources.md)。

規格見 [docs/spec.md](docs/spec.md)，驗收與限制見 [docs/implementation.md](docs/implementation.md)，已完成工單見 [docs/issues/](docs/issues/README.md)。圖片生成工具、原始指令與成品路徑見 [docs/image-prompts.md](docs/image-prompts.md)。

擴充歷史見 [場景與學習卡擴充企劃](docs/expansion-plan.md)：規劃的 40 個兒童、國中、高中及親子生活新情境已全數完成上線，包含完整場景圖繪、內容文案與 Kokoro 語音合成。後續可規劃單字卡與短句卡複習模式。

## 中級至中高級閱讀單元

包含「禮貌表達不同意見」→「查證網路消息」→「提出有根據的活動方案」等進階情境。難度標籤是編輯描述，並非 CEFR 認證，也不代表使用者已完成初階練習。適合能理解簡短生活敘述，想進一步練習理由、條件、資訊來源及提案限制的讀者；每篇亦可獨立閱讀。

配套的 [閱讀目標、句型提示、練習與分開的參考解析](docs/book-swap-study-guide.md) 提供三步閱讀順序。這是可自行或共讀使用的文字練習，未加入網頁測驗、評分或學習紀錄。製作與驗證紀錄見 [本次內容驗收](docs/book-swap-verification.md)。

## 發布

網站已發布於 [carlenglish.gravito.dev](https://carlenglish.gravito.dev)，原始碼位於公開的 [GitHub repository](https://github.com/CarlLee1983/carlenglish)。使用 Cloudflare Workers Static Assets，`wrangler.jsonc` 將 `dist/` 提供為靜態網站。首頁、三個分級目錄與 43 個場景的直接網址、圖片及音檔已在線上驗證；未知場景回傳自訂 404 頁。已有 Cloudflare 發布權限的環境可執行 `pnpm run deploy`，依序完成驗證與部署。

2026-10-14 的 UI／favicon／SEO 版本 `701b6750-4874-47be-9895-340116532e5f` 從 `ui/level-entry-catalog` worktree 直接部署，整合的教材基底為 `354d919a`。程式已整理於 `ui/level-entry-catalog` 分支的 PR；合併前，`main` 自動部署會使用主分支版本。驗證與回復方式見 [發布紀錄](docs/implementation.md#2026-10-14-分級介面與-seo-整合發布)。

GitHub Actions 在 pull request 及 `main` 推送執行驗證；首筆提交的 [CI 已通過](https://github.com/CarlLee1983/carlenglish/actions/runs/38504543453)。首次上線使用本機既有的 Cloudflare 授權完成。GitHub 自動部署已啟用：repository secrets `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN` 與 variable `CLOUDFLARE_DEPLOY_ENABLED=true` 均已設定，`main` 推送或手動啟動 `Deploy` 會先執行 `pnpm run verify` 再部署；[首次 Actions 部署](https://github.com/CarlLee1983/carlenglish/actions/runs/38509015094)已成功。

部署 token 是專用 custom user token（`carlenglish-github-deploy`），權限為 Account 的 Workers Scripts Edit、Account Settings Read，以及 Zone 的 Workers Routes Edit、Zone Read；Account Resources 限定網站所屬帳號，Zone Resources 限定 `gravito.dev`，不設 IP 限制（GitHub Actions IP 不固定）。`cf` CLI 的登入無法管理 token（403，9109），須在 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) 建立。更換 token 時在自己的終端執行以下指令，於隱藏提示輸入新 token：

```sh
gh secret set CLOUDFLARE_API_TOKEN --repo CarlLee1983/carlenglish
```

不要將 token 貼入對話或寫入 repository。不要將本機 `.scratch/`、`docs/learning-progress.md` 加入 repository。`docs/learning-progress.md` 是個人閱讀紀錄，網站驗收與發布不會改變其學習進度。

目前內容為 43 篇 5–8 句生活短文，涵蓋日常生活、校園學習與思辨提案等場景。未來交辦 dot 每日製作教材是後續工作；長文格式、新聞來源呈現與每日發布流程尚未實作。
