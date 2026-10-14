# CarlEnglish

看圖學生活英文的本地靜態網站，提供咖啡店買早餐、超市購物及街上問路三個場景。

讀本可播放完整短文、常用短句與重點單字的本地 MP3。42 段音檔（3 篇短文、15 個短句、24 個單字）使用同一個 Kokoro `af_heart` 美式女聲合成。播放不會呼叫線上語音服務；一次只播放一段，點選另一段會停止原播放。短文可暫停、續播、從頭播放及停止；不會自動播放。播放失敗時會在頁面提示。需要 JavaScript，文章本身仍可在停用 JavaScript 時閱讀。

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

`pnpm run verify` 依序執行上述完整檢查。瀏覽器測試讀取正式 `dist/`，用獨立的 4391 埠啟動前景預覽並在結束時關閉；不要先手動佔用該埠。`test:extension` 在暫存副本只新增第四個合法場景的 JSON 與圖片，再正常建置並以 Chromium 檢查列表、獨立網址、重新整理及完整閱讀內容；它也核對正式專案檔案雜湊沒有變動。測試結束會關閉自己的伺服器並移除副本，第四場景不會混入正式內容。正式建置後也能以 `pnpm run preview` 查看。

發音自動測試驗證播放切換、短文控制、舊事件與 Promise 隔離、失敗處理及本地音檔。使用者先接受代表性聲線樣本，再確認正式內容、全部音檔與手機操作驗收完成；完整工程檢查亦通過。人工驗收依使用者確認，媒體事件不能代替實聽。網站尚未建立離線快取或 PWA。

## 內容與呈現

- `pnpm-lock.yaml`：固定依賴與套件管理器版本，安裝使用 `--frozen-lockfile`。
- `pnpm-workspace.yaml`：指定原生工具的建置腳本政策；目前允許固定版本的 esbuild、workerd，fsevents 使用套件內附的可選 macOS binary。發布年齡例外只涵蓋遷移前已採用的 `wrangler@4.150.0` 與 `miniflare@5.20261006.2-beta`；其他套件及後續版本沿用 pnpm 的預設限制。升級相關依賴時需同步核對這些政策。
- `content/scenes/*.json`：每個場景一份資料。
- `public/images/scenes/`：網站直接使用的預先生成圖片。
- `public/audio/{words,phrases,stories}/`：網站直接播放的本地合成 MP3。
- `content/audio/voice-profile.json`：固定聲線與生成設定。
- `src/lib/scenes.ts`：集中發現、驗證與取得場景。
- `src/components/Reader.astro`：所有場景共用的閱讀版型。
- `src/scripts/pronunciation.ts`：頁內音訊控制與錯誤狀態。
- `src/pages/scenes/[id].astro`：從場景 ID 產生路由。
- `tests/`：內容入口與瀏覽器行為測試。

新增場景只要加入 JSON、圖片及所需音檔，執行內容驗證，再重新建置；完全相同的英文可重用既有音檔。不需修改版型、頁面、路由或清單。欄位與生成命令見 [內容維護說明](docs/content-guide.md)，聲線與舊錄音來源見 [audio-sources.md](docs/audio-sources.md)。

規格見 [docs/spec.md](docs/spec.md)，驗收與限制見 [docs/implementation.md](docs/implementation.md)，已完成工單見 [docs/issues/](docs/issues/README.md)。圖片生成工具、原始指令與成品路徑見 [docs/image-prompts.md](docs/image-prompts.md)。

後續內容與功能見 [場景與學習卡擴充企劃](docs/expansion-plan.md)：規劃 40 個兒童、國中、高中及親子生活新情境，分批擴充，再加入單字卡與短句卡複習模式。目前為企劃，尚未納入正式場景或功能。

## 發布

網站已發布於 [carlenglish.gravito.dev](https://carlenglish.gravito.dev)，原始碼位於公開的 [GitHub repository](https://github.com/CarlLee1983/carlenglish)。使用 Cloudflare Workers Static Assets，`wrangler.jsonc` 將 `dist/` 提供為靜態網站。首頁、三個場景的直接網址、圖片與音檔已在線上驗證；未知場景回傳自訂 404 頁。已有 Cloudflare 發布權限的環境可執行 `pnpm run deploy`，依序完成驗證與部署。

GitHub Actions 在 pull request 及 `main` 推送執行驗證；首筆提交的 [CI 已通過](https://github.com/CarlLee1983/carlenglish/actions/runs/38504543453)。首次上線使用本機既有的 Cloudflare 授權完成。GitHub 自動部署已啟用：repository secrets `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN` 與 variable `CLOUDFLARE_DEPLOY_ENABLED=true` 均已設定，`main` 推送或手動啟動 `Deploy` 會先執行 `pnpm run verify` 再部署；[首次 Actions 部署](https://github.com/CarlLee1983/carlenglish/actions/runs/38509015094)已成功。

部署 token 是專用 custom user token（`carlenglish-github-deploy`），權限為 Account 的 Workers Scripts Edit、Account Settings Read，以及 Zone 的 Workers Routes Edit、Zone Read；Account Resources 限定網站所屬帳號，Zone Resources 限定 `gravito.dev`，不設 IP 限制（GitHub Actions IP 不固定）。`cf` CLI 的登入無法管理 token（403，9109），須在 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) 建立。更換 token 時在自己的終端執行以下指令，於隱藏提示輸入新 token：

```sh
gh secret set CLOUDFLARE_API_TOKEN --repo CarlLee1983/carlenglish
```

不要將 token 貼入對話或寫入 repository。不要將本機 `.scratch/`、`docs/learning-progress.md` 加入 repository。`docs/learning-progress.md` 是個人閱讀紀錄，網站驗收與發布不會改變其學習進度。

目前正式內容為三篇 5–8 句短文。未來交辦 dot 每日製作教材是後續工作；長文格式、新聞來源呈現與每日發布流程尚未實作。
