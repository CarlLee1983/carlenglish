# CarlEnglish

看圖學生活英文的本地靜態網站，提供咖啡店買早餐、超市購物及街上問路三個場景。

讀本可播放完整短文、常用短句與重點單字的本地 MP3。42 段音檔（3 篇短文、15 個短句、24 個單字）使用同一個 Kokoro `af_heart` 美式女聲合成。播放不會呼叫線上語音服務；一次只播放一段，點選另一段會停止原播放。短文可暫停、續播、從頭播放及停止；不會自動播放。播放失敗時會在頁面提示。需要 JavaScript，文章本身仍可在停用 JavaScript 時閱讀。

需要 Node.js 24。從本目錄執行：

```sh
npm ci
npx playwright install chromium webkit
npm run dev
```

開啟啟動命令顯示的 Local URL。Astro 在 agent 環境可能以背景程序啟動；可用 `npx astro dev status`、`npx astro dev logs`、`npx astro dev stop` 管理本專案的開發伺服器。需要保留前景程序時，使用 `npm run dev -- --ignore-lock`。

```sh
npm run check
npm run validate:content
npm run test:content
npm run build
npm run test:browser
npm run test:extension
```

`npm run verify` 依序執行上述完整檢查。瀏覽器測試讀取正式 `dist/`，用獨立的 4391 埠啟動前景預覽並在結束時關閉；不要先手動佔用該埠。`test:extension` 在暫存副本只新增第四個合法場景的 JSON 與圖片，再正常建置並以 Chromium 檢查列表、獨立網址、重新整理及完整閱讀內容；它也核對正式專案檔案雜湊沒有變動。測試結束會關閉自己的伺服器並移除副本，第四場景不會混入正式內容。正式建置後也能以 `npm run preview` 查看。

發音自動測試驗證播放切換、短文控制、舊事件與 Promise 隔離、失敗處理及本地音檔。使用者先接受代表性聲線樣本，再確認正式內容、全部音檔與手機操作驗收完成；完整工程檢查亦通過。人工驗收依使用者確認，媒體事件不能代替實聽。網站尚未建立離線快取或 PWA。

## 內容與呈現

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

## 發布

網站使用 Cloudflare Workers Static Assets；`wrangler.jsonc` 將 `dist/` 發布至 `carlenglish.gravito.dev`，使用目錄網址及自訂 404 頁。已有 Cloudflare 發布權限的環境可執行 `npm run deploy`，依序完成驗證與部署。部署後再檢查首頁、三個場景的直接網址及未知網址的 404 狀態。網站是否已上線，以實際部署和網址檢查結果為準。

GitHub Actions 在 pull request 及 `main` 推送執行驗證。部署流程需先在 repository 設定 `CLOUDFLARE_DEPLOY_ENABLED=true`，並加入 `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN` secrets；變數未啟用時，`main` 推送和手動啟動都會略過部署。不要將金鑰或本機 `.scratch/`、`docs/learning-progress.md` 加入 repository。`docs/learning-progress.md` 是個人閱讀紀錄，網站驗收與發布不會改變其學習進度。

目前正式內容為三篇 5–8 句短文。部署後由 dot 每日製作教材是後續工作；長文格式、新聞來源呈現與每日發布流程尚未實作。
