# 實作與驗收紀錄

## 2026-10-14 PR #3 文章整合與衝突修正

依使用者回報 PR #3 衝突，將最新 `origin/main`（`330bb61ad1bc16ef450e7a2bf89748662deba335`，已合併新聞與貼文的 PR #2）整合至 `ui/level-entry-catalog`。八個衝突位於 package／Playwright 設定、內容驗證、Layout、首頁、404 及瀏覽器／擴充測試；以 merge 保留兩邊歷史，沒有重寫分支。此次只更新 PR 分支，未合併 `main` 或再次部署。

保留 43 篇生活讀本的初／中／高級入口、搜尋、篩選與同級推薦，並保留三篇文章的獨立首頁區塊、新聞軌／貼文軌與原閱讀版型。文章取得依可見內容產生的摘要、canonical、品牌分享圖、一般 WebPage 及麵包屑；來源日期不當作本站頁面發布日期，貼文發文者不當作整篇作者。sitemap 包含 50 個網址。內容验证同時保留場景難度對照、文章契約與跨類型重複 ID 檢查；兩套測試全部納入現行命令。

`CARLENGLISH_TEST_PORT=4393 pnpm run verify` exit code 0：Astro 34 個檔案無 errors／warnings／hints，43 篇場景與 3 篇文章有效，內容／分級／文章／SEO 41/41，建置 51 個 HTML 頁面，瀏覽器 892 passed／3 刻意 skipped，隔離擴充 1/1。隔離副本加入 42 篇混合級別場景與一篇文章，驗證自動入口、文章 SEO／索引、小圖分享回退及全部原正式場景；正式來源與 dist 雜湊不變。完整輸出在本機 `.scratch/pr/merge-verify.log`。

獨立整合審閱 clean，`git diff --check HEAD` 通過。桌機及 320px／390px 手機的合併版首頁、文章入口、貼文頁均無水平溢出；前後截圖更新為同樣 43 篇場景、3 篇文章的主分支與合併介面，見 `docs/review/ui-entry-before.png` 及 `ui-entry-after.png`。場景 JSON、原插畫與音檔沒有變更。下方的 Cloudflare 版本與 657 個檔案遠端驗證屬於前次 43 篇場景的發布，本次文章整合尚未發布。

## 2026-10-14 分級介面與 SEO 整合發布

依使用者「佈署」授權，從 `ui/level-entry-catalog` worktree 直接部署至 [carlenglish.gravito.dev](https://carlenglish.gravito.dev)。部署版本 `701b6750-4874-47be-9895-340116532e5f`，Cloudflare 建立時間 2026-10-14 06:37:08 UTC（臺北 14:37）。發布當時未提交、推送或合併 GitHub；後續依使用者 PR 請求整理至 `ui/level-entry-catalog` 分支。合併前，`main` 自動部署仍會使用主分支原始碼。

發布前發現主分支已新增教材，先保留完整 UI／SEO stash 與 binary diff，將 worktree fast-forward 至 `354d919a14ff034825e463a9a1771acc038a4bef`，再還原 UI 並整合文件與測試衝突。最新主分支 43 篇教材、插畫、489 段音檔、內容驗證與新版發音批次測試均保留，原 checkout 及其其他工作未修改。新增難度對照後，初級 27 篇、中級 10 篇、高級 6 篇，仍顯示原始難度文字。既有 [主分支部署](https://github.com/CarlLee1983/carlenglish/actions/runs/38521560075)成功結束且無待部署 run 後，才執行本次 Wrangler 發布。

`CARLENGLISH_TEST_PORT=4393 pnpm run verify` exit code 0：Astro 28 個檔案無診斷、正式 43 篇有效、內容／分級／SEO 23/23、建置 48 個 HTML 頁面、瀏覽器 762 passed／3 刻意 skipped、隔離擴充 1/1。擴充副本保留 43 篇正式教材，再加入 42 篇測試教材，包含小圖回退與混合級別；正式檔案雜湊不變。Wrangler dry-run 與 `git diff --check HEAD` 通過。整合 delta 獨立審閱指出的難度對照文件已修正，最後審閱 clean。

發布後 2026-10-14T06:38:05.019Z，657 個正式頁面與資產 HTTP 200，SHA-256 全部等於本次 `dist/`；包含所有讀本、原插畫、MP3、分享圖片、圖示與前端 JS／CSS。各頁 canonical／OG／JSON-LD 由相同建置輸出，47 個 sitemap 網址完整符合首頁、三個有教材的級別與 43 篇讀本；分享 PNG 格式與宣告尺寸符合。4 個未知場景、缺音檔、私人 scratch 及學習紀錄路徑均回傳 noindex 的 404 且沒有 canonical。Chrome 正式網站另確認新版入口、中級搜尋、新教材閱讀及返回條件；桌機與手機截圖在本機 `.scratch/deploy/`。實際手機觸控／實聽、社群快取與 Search Console 收錄尚未重新驗收。

發布前版本為 `0373ac97-4098-4e14-931e-97e262f8ada6`；必要時可用 `pnpm exec wrangler rollback 0373ac97-4098-4e14-931e-97e262f8ada6` 恢復發布前網站。程式、部署輸出、前後版本、資產 manifest、驗證與可重現的 source overlay 均保存在 worktree 與 `.scratch/deploy/`，不得將私人 scratch／學習紀錄納入 repository。本次沒有內容資料遷移或新增讀者端服務。

## 2026-10-14 favicon、社群分享與 SEO／AEO

沿用 `ui/level-entry-catalog` 的獨立 worktree，保留前一輪 UI。新增書本 SVG／ICO／96px PNG／Apple 180px 圖示，內建 imagegen 製作並匯出 1200×630 品牌 JPEG，各讀本從原插畫自動建置 1200×630 PNG 分享圖。主題人物採靠上裁切；較小插畫使用品牌圖。新增各頁摘要、canonical、Open Graph／X 卡片、JSON-LD、內容產生的 sitemap 與 robots。空級別及 404 設 noindex，既有學習與返回篩選流程保留。細節、來源與回復見 [SEO／AEO 說明](seo.md)。

讀本 PNG 使用獨立靜態端點及直接建置依賴 `sharp@0.35.5`；原版本已在鎖檔中。`pnpm add` 首次產生的 importer 沒有連到既有 optional-peer snapshot，已改為鎖檔中現有的 `0.35.5(@types/node@24.19.2)`。fresh 暫存目錄執行 `pnpm install --frozen-lockfile --offline` 成功，Sharp 可實際產生 PNG，鎖檔雜湊不變；沒有更新其他套件版本或放寬供應鏈／native-build 政策。

原 checkout 的另一組測試正在使用 4391，因此本輪以 `CARLENGLISH_TEST_PORT=4393 pnpm run verify` 執行，未停止或重用該程序。exit code 0：Astro 28 個檔案無 errors／warnings／hints，正式四篇內容有效，內容／分級／SEO 測試 20/20，建置九個 HTML 頁面及四個 PNG／robots／sitemap 端點，瀏覽器 177 passed／3 刻意 skipped，隔離擴充 1/1。42 篇擴充 fixture 包含一張實際 320×180 插畫，PNG 與品牌 JPEG 回退、索引及 JSON-LD 均通過；正式檔案雜湊未變。`git diff --check` 通過。

人工視覺檢查品牌中文字、四張讀本裁切、圖示與尺寸。獨立審閱指出的 public WebP 被誤宣告為 PNG、以及小圖回退測試假設，均已修正，delta review clean。本機證據在 `.scratch/seo/verify.log` 與圖片預覽；沒有提交、推送、部署或設定 Search Console／社群平台。AEO 已完成技術與內容結構，搜尋收錄及實際分享平台快取需發布後驗證，不宣稱排名或 AI 引用已生效。

## 2026-10-14 分級入口與 UI／UX 調整

在獨立 worktree `/Users/carl/.codex/worktrees/7879/CarlEnglish`、分支 `ui/level-entry-catalog`，以最新 `origin/main` 的 `a909bc9` 為基礎完成。原 checkout 的未提交教材、音檔及測試工作沒有搬入本分支；本次沒有修改正式內容或資產、提交、推送或部署。

首頁先選初級、中級或高級，各級別有獨立靜態目錄、較精簡的圖文排列、關鍵字搜尋與生活主題篩選。`src/lib/catalog.ts` 以明確標籤對照統一分組，未知難度由內容驗證及建置攔截。閱讀頁新增段落入口、所屬級別返回與最多三篇同級推薦。搜尋條件透過 `q`／`category` 參數保留，包含進入讀本、重新整理、同級推薦及上／下返回連結；無 JavaScript 仍可閱讀完整靜態目錄與內容。沒有增加依賴套件、資料庫或遠端服務。

Node.js v24.21.0、pnpm 12.0.0 的 `pnpm run verify` exit code 0：Astro 22 個檔案無 errors／warnings／hints，4 篇正式內容有效，內容與分級測試 16/16、建置 9 頁、瀏覽器 157 passed／3 刻意 skipped、隔離擴充 1/1。擴充副本新增 42 篇混合級別教材，正式內容與資產雜湊在測試前後一致。包含網址參數的直接斷言，以及搜尋與主題控制項至少 44px 的回歸檢查。`git diff --check` 通過。

WebKit 原生選單外觀會覆蓋觸控高度，初次量測主題選單僅 27.7px；改為保留原生 `select` 互動、以 `appearance: none` 與 `height: 3rem` 控制外觀，補上不攔截點擊的箭頭及高度回歸檢查；修正後 Chromium 與 WebKit 的實際選單高度均為 48px。

完成桌機、390px 與 320px 手機、亮暗色、手機 WebKit 的截圖檢查，包含預設目錄、空級別、搜尋無結果、主題選取、鍵盤焦點與閱讀頁。最終截圖在本機 `.scratch/ui-review/`，截圖中的頁面網址均回傳 200；完整驗證輸出在 `verify-final.log`。獨立審閱指出的返回篩選條件、讀本導覽的 current 狀態與 404 文案已修正，delta review 為 clean。

本分支四篇教材均屬初級，中高級保留清楚的準備中頁面；原 checkout 的追加內容仍需在整合時加入。既有 `/scenes/<id>/` 網址與音訊控制繼續有效。實際手機觸控與實聽未重新驗收，瀏覽器模擬不代替實機確認。若回復本次功能，一併回復分級模組、目錄與導覽程式／測試即可，沒有資料遷移。現行行為與維護規則見 [UI 導覽說明](ui-navigation.md)。

## 2026-10-14 遷移至 pnpm 12

`package.json` 固定 `packageManager: pnpm@12.0.0`，Node.js 維持 24。以 `pnpm import` 從原 npm 鎖檔建立 `pnpm-lock.yaml`，移除 `package-lock.json`。匯入保留原有 394 組套件名稱與版本，另外解析可選的 `@napi-rs/wasm-runtime@1.2.5`；直接依賴與其版本範圍未變。pnpm 12 的鎖檔包含套件管理器與應用依賴兩份 YAML 文件。

`pnpm-workspace.yaml` 明確允許 `esbuild@0.28.2` 與 `workerd@1.20261006.1` 的平台執行檔檢查腳本，停用可選的 `fsevents@2.3.3` 建置。所有專案執行指令、Playwright 預覽、README、內容維護說明、規格與擴充企劃改用 pnpm；第四場景隔離測試也改為複製與核對新的鎖檔及建置政策。較早的 npm 執行紀錄保留原樣。

CI 與 Deploy 改用固定 commit 的 `pnpm/setup` v1，從 manifest 取得 pnpm 版本、安裝 Node.js 24、快取 pnpm store，再執行 `pnpm install --frozen-lockfile`、Playwright 安裝與 `pnpm run verify`；部署命令為 `pnpm exec wrangler deploy`。本節記錄的是推送前的本機遷移驗收；推送後的 CI 與自動部署結果以 GitHub Actions 紀錄為準。

本機 Node.js v24.21.0、pnpm 12.0.0：`pnpm install --frozen-lockfile` 與 `pnpm exec playwright install chromium webkit` 成功，`pnpm run verify` exit code 0。Astro 檢查 17 個檔案無診斷、正式三場景內容有效、內容測試 13/13、建置 5 頁、瀏覽器 122 passed / 3 刻意 skipped、第四場景隔離擴充 1/1。獨立審閱 clean，`git diff --check` 通過。

另在只含 manifest、pnpm 鎖檔與建置政策的乾淨暫存目錄執行 `pnpm install --frozen-lockfile --offline`，成功建立全新的 `node_modules`，鎖檔雜湊不變。確認 Astro 7.3.8、Wrangler 4.150.0、TypeScript 6.0.3、esbuild 0.28.2 及 workerd 平台執行檔版本；macOS 的 fsevents 內附 addon 可載入。兩份 workflow 與鎖檔的 YAML 解析檢查也通過，暫存目錄已清理。

首次推送 `960ed49` 的 [CI](https://github.com/CarlLee1983/carlenglish/actions/runs/38511363060) 與 [Deploy](https://github.com/CarlLee1983/carlenglish/actions/runs/38511362968) 在安裝時遭 `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` 攔截：既有 `wrangler@4.150.0` 與 `miniflare@5.20261006.2-beta` 發布未滿 pnpm 預設的 24 小時。本機與離線安裝重用的政策驗證快取未暴露此限制。使用隔離的快取、store 與 state 執行線上 frozen 鎖檔驗證，重現相同兩筆錯誤；在 `pnpm-workspace.yaml` 加入這兩個[精確版本的排除項](https://pnpm.io/settings/dependency-resolution#minimumreleaseageexclude)後，同一驗證通過且鎖檔未變。其他套件與後續版本保留預設限制，未設定 `trustLockfile` 或全域停用發布年齡檢查。修正後的完整 `pnpm run verify` 再次通過，結果仍為內容 13/13、瀏覽器 122 passed / 3 skipped、擴充 1/1；政策變更的獨立審閱 clean。

若需回復套件管理器，需一併回復 manifest、鎖檔、建置政策、workflow、測試啟動指令與現行文件，並重新安裝原 npm 依賴；場景內容、圖片與音檔沒有改動。

## 2026-10-14 發布驗證

首筆發布提交為 `eacac86b102fad38d2f15fe1f2e1993c908893dd`，已推送到公開 [GitHub repository](https://github.com/CarlLee1983/carlenglish) 的 `main`。網站以 Cloudflare Workers Static Assets 發布於 [carlenglish.gravito.dev](https://carlenglish.gravito.dev)，首次部署版本 `e2d9169d-3984-4887-9561-5e1f7147103a`。Wrangler 更新至 4.150.0 後，`npm` 稽核為 0 vulnerabilities。

此次發布的本地 `npm run verify` exit code 0：內容測試 13/13、瀏覽器 122 passed / 3 刻意 skipped、第四場景擴充 1/1、Astro 0 diagnostics 且建置 5 頁。獨立發布審閱 clean；Wrangler dry-run 與本機 workerd 驗證場景網址、補尾斜線導向及自訂 404。首次提交的 [GitHub CI](https://github.com/CarlLee1983/carlenglish/actions/runs/38504543453) 通過。

線上共檢查 54 個 HTTP 回應：首頁與三個場景、42 個 MP3、3 張 WebP 均為 200，資產位元組與本地一致；未知場景回傳自訂 404，缺少的 MP3 與私人 `.scratch/` 模型、學習紀錄路徑均回傳 404；場景未加尾斜線時回傳 307 並導向正確目錄網址。證據保留於本機 `.scratch/illustrated-english/qa/production-http-checks.json`、`cloudflare-deploy.log`、`publication-verify.log` 及 `production-home-mobile.png`。

首次上線使用本機既有 Cloudflare 授權。GitHub [部署工作流程](https://github.com/CarlLee1983/carlenglish/actions/runs/38504543479) 因 `CLOUDFLARE_DEPLOY_ENABLED` 未設定而依設計略過。後續透過 `cf` CLI 確認帳號與 `gravito.dev` 範圍，並已用 `gh` 設定 repository 的 `CLOUDFLARE_ACCOUNT_ID` secret；但帳號 token 介面及個人 token metadata 清單均回傳 403（9109）。個人 token 建立前的檢查因此停止，未嘗試建立 token，未讀取或搬用本機登入憑證。

其後使用者在 Cloudflare 建立專用 custom token 並以 `gh secret set` 隱藏提示寫入 `CLOUDFLARE_API_TOKEN`，再設定 `CLOUDFLARE_DEPLOY_ENABLED=true`。手動啟動的 [部署工作流程](https://github.com/CarlLee1983/carlenglish/actions/runs/38509015094) 通過 `npm run verify` 並完成部署，版本 `baf0e67f-147b-48d8-97da-127f98614209`，custom domain 維持 `carlenglish.gravito.dev`；部署後首頁與三個場景回傳 200，未知場景回傳 404。之後 `main` 推送會自動更新網站，權限設定見 [README](../README.md)。先前 CLI 失敗與 secret 名稱的非機密證據保留於 `.scratch/illustrated-english/ci-setup/result.json`；沒有 token 值或原始 CLI 憑證輸出。

公開工單見 [issues/](issues/README.md)。`.scratch/`、本機模型與 Python 環境、憑證，以及 `docs/learning-progress.md` 不進入 repository；網站只需要已封裝的圖片及 MP3。此次發布只涵蓋現有三篇短文。每日產製、長文與新聞來源呈現仍未實作，也不將產品驗收記為閱讀能力進階。

## 執行順序

- 已實作：第一票的咖啡店內容契約、圖文與本地閱讀流程。
- 已通過：內容入口測試、正式建置、桌面與手機寬度瀏覽器流程、獨立審閱。
- 已完成：2026-10-14 使用者明確確認第一票人工驗收完成；咖啡店 12/12 項驗收結案。
- 已實作：第二票的超市與問路資料及圖片；共用網站程式未改動。
- 已通過：三場景瀏覽器流程、第四場景隔離建置/瀏覽及獨立審閱。
- 已完成：2026-10-14 使用者確認剩餘驗收完成，超市與問路內容接受，第二票 10/10 結案。
- 第三票原裝置語音已通過操作測試，但使用者實聽後拒絕其機械感；原測試結果僅作歷史證據。
- 真人錄音版本曾通過完整 `npm run verify`；以下保留當時的工程證據，不作為目前合成音訊版本的驗收結果。
- 使用者已試聽新的 coffee、aisle、短句及 22.1 秒咖啡店全文樣本，接受自然且一致的 Kokoro `af_heart` 美式女聲。
- 目前為 42 段本地合成 MP3（24 單字、15 短句、3 全文）；新版本完整工程驗收通過，結果見下方統一聲線版本。
- 已完成：使用者確認全部音檔及手機播放操作驗收完成，第四票 8/8 結案；第三票單字功能併入第四票完成。

## 技術決策

採 Astro 靜態頁面與原生 CSS；翻譯以原生 details/summary 控制，不需要瀏覽器端應用框架。集中內容入口發現獨立 JSON，驗證後供列表及共用閱讀頁使用。路由從穩定場景 ID 產生，不維護人工場景清單。

依 architect 分析選擇 Astro：它提供靜態路由、共用版型及 404，避免自行維護模板跳脫與路由伺服器。Node 24 測試同一個內容入口，Playwright 驗證正式建置的可見行為。沒有增加資料庫、遠端 API 或平台整合。

設計定位為成人初級英文圖文讀本，採原生 CSS、清楚的 sans-serif 排版與低密度留白。DESIGN_VARIANCE 4、MOTION_INTENSITY 2、VISUAL_DENSITY 3；只保留操作回饋，不添加自動動畫。介面採一致的綠色重點與中性色、12px 圖片圓角及 8px 控制圓角，跟隨系統亮暗色。

以下技術決策及驗收段落保留當時的實作紀錄；現行 Git 與發布狀態見文件開頭。

## 驗收證據

2026-10-13，在 Node v24.21.0 執行：

| 命令 | 結果 |
| --- | --- |
| `npm install` | 安裝成功；產生 package-lock.json；npm 回報 0 vulnerabilities |
| `npx playwright install chromium webkit` | Chromium 與 WebKit 安裝成功 |
| `npm run check` | 10 個檔案，0 errors / 0 warnings / 0 hints |
| `npm run validate:content` | cafe-breakfast 通過，1 個正式場景 |
| `npm run test:content` | 7/7 通過 |
| `npm run build` | 靜態建置成功：列表、咖啡店獨立網址與 404.html |
| `npm run test:browser` | 20/20 通過，正式 dist 預覽 |

瀏覽器組合：桌面 Chromium 1280×800（亮、暗各一組）、手機 Chromium 390×844、窄寬 Chromium 320×700、手機 WebKit 390×844。每組驗證列表進入閱讀頁、8 句原文的文字順序/空格/標點、圖片尺寸及比例、全部短句與單字、預設收合翻譯與鍵盤 Enter/Space 操作、返回列表、直接開啟及重新整理、未知網址 404、翻譯收合/展開時沒有水平溢出。原生翻譯控制在實際瀏覽器輔助樹中顯示 collapsed/expanded 狀態。

內容測試涵蓋必要文字與翻譯、圖片路徑/存在/尺寸、場景與同類學習項目 ID 重複、懸空引用、未被引用的項目、數量不符、JSON 發現/解析、重疊與重複標註，以及空白片段不能假裝引用學習項目。沒有使用全域字串替換。獨立 reviewer 對第一票程式與規格對照結果為 clean，無重大待修發現。

第一票本地預覽曾回傳 HTTP 200，原開發伺服器已停止。第二票使用下方記錄的新正式建置預覽；測試專用伺服器均已關閉。正式建置的視覺檢查截圖位於 `.scratch/illustrated-english/qa/`，包含亮暗列表及手機/桌面閱讀頁。正式圖片位於 `public/images/scenes/cafe-breakfast.webp`，1536×1024、292,992 bytes；使用內建 image_gen 生成，指令記錄在 image-prompts.md。

## 內容檢查與剩餘邊界

咖啡店內容為 8 句短文、5 個短句、8 個單字；所有學習項目皆有文中引用。「I'd like a coffee」同時標註其中的 coffee，barista/toast 重複出現仍保留原文。英中逐句及例句已整理供人工核對。插畫呈現咖啡店櫃檯、客人與咖啡師，以及外帶咖啡與裝吐司的紙袋；agent 與獨立 reviewer 已作視覺/語言檢查，這些檢查不記為人工驗收。

2026-10-14 使用者明確回覆 `.scratch/illustrated-english/issues/01-cafe-reading.md 人工驗收完成`。咖啡店人工內容驗收已通過，第一票結案；這是網站內容驗收，不等於學習者已完成閱讀理解評量。

未接觸真實手機硬體；目前手機寬度與 WebKit 結果是瀏覽器模擬，不能聲稱已驗證實機觸感或安全區行為。規格要求的代表性手機寬度檢查已通過。

第四場景只加入資料與圖片後建置/瀏覽的第二票驗收已通過，詳見下方。部署仍未執行，未來主機要檢查目錄網址與 404 行為。

測試伺服器採隔離 4391 埠與前景程序，結束後不保留 listener。初次測試設定遇到 4321 埠上的既有 Astro 預覽，子代理曾用 `astro preview stop` 關閉 PID 28659，未先保留其完整啟動資訊，因此無法證實來源；之後改為獨立埠，不重用或關閉不明服務。


## 2026-10-14 第二票驗收

完整執行 `npm run verify`，exit code 0；所有適用檢查通過：

| 檢查 | 結果 |
| --- | --- |
| `npm run check` | 13 個檔案，0 errors / 0 warnings / 0 hints |
| `npm run validate:content` | 正式三場景全部通過 |
| `npm run test:content` | 7/7 通過 |
| `npm run build` | 5 個靜態頁面：列表、三場景、404 |
| `npm run test:browser` | 45/45 通過 |
| `npm run test:extension` | 1/1 通過 |

沿用桌面亮暗 Chromium、390px 與 320px Chromium、390px WebKit 組合。三場景逐一檢查完整英文、翻譯、短句、單字與例句、圖片實際尺寸與顯示比例、導覽、直接網址/重新整理及水平溢出。跨場景測試先展開上一場景的翻譯，再以鍵盤切換，確認新場景的所有內容及預設收合狀態，且沒有殘留上一篇的圖文或翻譯。

第四場景測試將既有程式、設定、三份資料及圖片複製至暫存專案；只新增 `another-cafe-breakfast.json` 及對應圖片。正常 Astro 建置後，以獨立前景預覽與 Chromium 檢查第四個列表入口、獨立網址、重新整理、圖片、完整短文、翻譯及全部學習項目。正式專案 src/config/content/public/dist/package 在測試前後雜湊一致；暫存伺服器與副本清理，正式內容與建置沒有第四場景。

本票只新增場景 JSON/WebP、擴充測試與命令，以及維護/驗收說明。對照開始時 13 個既有檔案的 SHA-256，src/、Astro/TypeScript 設定、已驗收咖啡店 JSON/圖片及兩個 ignore 檔案均未改動。未加入套件依賴、資料來源、人工場景登記或個別場景路由。

新圖片採相同手繪風格，均為 1536×1024：超市 250,488 bytes、問路 336,142 bytes；成品與完整內建 image_gen 指令見 image-prompts.md。圖片納入本地 public/images/scenes/，讀者不觸發生成。

內容與圖片經 primary 及獨立 reviewer 檢查，沒有重大發現。超市店員人稱已對齊插畫中的女性；三篇均有 8 句短文、5 個短句與 8 個單字。模型檢查不記為人工驗收；第一票咖啡店人工驗收已由使用者於 2026-10-14 完成，新超市與問路兩篇待使用者確認。

本次正式建置預覽為 http://127.0.0.1:4322 ，由 `npm run preview -- --port 4322 --ignore-lock` 啟動（本次工具 session 12109，PID 6876），暫時保留供人工驗收；它是前景程序，不使用 Astro 背景鎖。截圖在 `.scratch/illustrated-english/qa/ticket02-*.png`。自動測試伺服器已清理。

## 2026-10-14 第三票：原裝置語音版本（已被真人錄音取代）

使用者反映手機另開發音網站不方便，追加頁內單字發音。共用 Reader 為每個 `words[].english` 加上原生按鈕及停止控制；播放邏輯集中於 `src/scripts/pronunciation.ts`，沒有改動場景 JSON、圖片、資料驗證契約或套件依賴。

architect 比較裝置語音、本地音檔與遠端字典後，選用 Web Speech API：在點擊處同步取消舊請求並啟動新單字，優先本地美式英文，其次其他美式/英文；語音清單初始為空時仍在該次點擊以 `en-US` 嘗試播放。`voiceschanged` 只更新下一次點擊選擇，不重播。API 行為參考 [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) 與 [voiceschanged](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/voiceschanged_event)。沒有將裝置語音描述成固定音色、真人錄音或保證離線。

每次播放以請求物件識別當前所有者；先解除所有權再取消，防止舊回呼覆寫新字。只有 `start` 後才顯示播放中，沒有開始事件的 `end` 會提示重試。啟動 8 秒或開始後 15 秒未完成會取消並顯示提示；停止、pagehide 與 document.hidden 也會取消。無支援、無英文語音、權限拒絕、網路/音訊錯誤及 API 例外有可見說明。按鈕至少 44px 高，支援鍵盤、觸控回饋與禮貌狀態提示；原文仍可選取、縮放及在沒有 JavaScript 時閱讀。

完整 `npm run verify` exit code 0：

| 檢查 | 結果 |
| --- | --- |
| 型別與 Astro 檢查 | 15 個檔案，0 errors / 0 warnings / 0 hints |
| 內容格式與入口測試 | 三場景有效，7/7 通過 |
| 正式建置 | 5 個靜態頁面成功 |
| 瀏覽器測試 | 100/100 通過，原閱讀流程 45 + 發音 55 |
| 第四場景隔離擴充 | 1/1 通過，正式專案雜湊不變 |

發音測試含 11 種行為，在桌面亮暗 Chromium、390px/320px 手機 Chromium、390px WebKit 各跑一組。以可控制 API 驗證正確單字、英文語音選擇、初始空清單、重播與換字取消、停止、舊回呼隔離、未開始就結束、錯誤/例外、兩種等待逾時、離開/隱藏頁面，以及按鈕觸控尺寸和寬度。沒有用模擬 API 通過結果宣稱真實音訊成功。

獨立 reviewer 對播放狀態、取消/回呼、語音與手勢、可及性、版面及規格對照結果為 clean，無重大待修發現。發音狀態測試使用咖啡店詞彙；三場景版面與全文檢查全部通過，但沒有逐一模擬三篇所有單字的聲音品質。實際 Chrome 在超市讀本點選 aisle 後，介面收到開始/結束事件並顯示「已播放 aisle 的發音。」；這是原生 API 事件證據，未驗證耳朵聽到的聲音或發音正確性。手機寬度截圖在 `.scratch/illustrated-english/qa/pronunciation-mobile.png`。

上述工程結果只驗證裝置語音的操作。使用者後續回報聲音「太機械、不自然」，此版本未通過聲音品質驗收。依 [mobile-native SKILL.md](/Users/carl/.agents/skills/mobile-native/SKILL.md) 的「Test on hardware before calling it done.」，實際手機聲音與操作不能由 WebKit 模擬或 API 事件代替。

本機預覽仍在 127.0.0.1:4322。另為同一 Wi-Fi 的手機暫時啟動正式 dist 預覽，以 `node node_modules/astro/bin/astro.mjs preview --host 192.168.50.231 --port 4323 --ignore-lock` 綁定這台電腦的私有網路位址；工具 session 2116、PID 14779，HTTP 200，供手機實聽後再停止本次擁有的程序。未設定防火牆、路由器、公網隧道或正式部署。IP 隨網路可能改變，重新啟動時應使用當時的本機 LAN IPv4。不要以 `npm run preview -- --host ...` 重複傳入 host：package 的預覽命令已固定 localhost，重複旗標不會按預期取得指定介面。

## 2026-10-14 第三票品質修正：固定真人錄音（歷史版本，已被統一聲線取代）

使用者實聽後回報「聲音太機械、不自然」。這是聲音品質驗收失敗；原來的語音操作測試沒有覆蓋自然度。此次以使用者實聽作為品質回饋邊界：提供 coffee、café、toast 的真人錄音樣本後，使用者確認「這種自然度可以，適合跟讀」。依此方向整合目前全部 24 個重點單字。

architect 比較裝置語音、可重用真人錄音與本地神經語音，選擇具明確授權的真人錄音。每個音檔來源、錄音者與授權經 Wikimedia Commons 官方 imageinfo/revision API 核對；aisle 的作者從檔案原文確認為 Dvortygirl。19 個來源標示美式，supermarket 標示英式，4 個 Lingua Libre 英文錄音未確認地區口音，頁面如實標示。舊版來源、授權與轉換紀錄現保留在 `.scratch/illustrated-english/audio-research/`；現行來源說明見 [audio-sources.md](audio-sources.md)。

原始 OGG/WAV 以 FFmpeg 轉成 MP3，不調整音色、速度或音量；24 個正式 MP3 共 324,625 bytes。來源下載遇到 Retry-After 600 秒後，遵守等待再下載成功。全部正式音檔與已記錄的轉換候選 SHA-256 一致；MP3 沿用選定的原授權，讀本提供可展開的逐檔署名、來源、授權連結及變更說明。

內容契約增加必填 `words[].audio`，包含本地 MP3、口音、錄音者、來源、授權與變更說明。集中驗證會攔截缺少欄位、非 HTTPS/含憑證的來源網址、缺音檔/空檔案、非 MP3 路徑、目錄跳脫與 symlink 越界。新增場景需要資料、圖片及新單字的錄音；相同單字可重用現有音檔，仍不需要修改頁面、路由或人工清單。此次三份 JSON 只增加 audio 欄位，場景原文、翻譯、用語及圖片保留。

原 speechSynthesis 播放程式與測試已替換。每次點擊建立新的 Audio，在同一 click 內呼叫 play；先解除舊請求所有權，再 pause/歸零，隔離舊事件與 Promise。playing 才顯示播放中，ended 沒有先 playing 則提示重試；失敗、停止、頁面隱藏/離開及 8 秒啟動/15 秒完成等待均有處理。沒有裝置語音回退、即時第三方音源或新套件。

最終 `npm run verify` exit code 0，完整輸出在 `.scratch/illustrated-english/qa/recorded-audio-verify.log`：

| 檢查 | 結果 |
| --- | --- |
| Astro/型別檢查 | 15 個檔案，0 errors / 0 warnings / 0 hints |
| 正式內容驗證 | 三場景、24 筆 audio 有效 |
| 內容入口測試 | 10/10 通過 |
| 正式建置 | 5 個靜態頁面與 24 個 MP3 |
| 瀏覽器流程 | 112 通過、3 刻意跳過重複的真實媒體檢查、0 失敗 |
| 第四場景隔離擴充 | 1/1 通過，正式專案雜湊不變 |

瀏覽器原閱讀流程 45 項全部保留；錄音新增 65 項模擬行為檢查與 2 項真實媒體檢查。五種桌面亮暗/手機寬度組合驗證三篇全部按鈕、固定檔案、44px 觸控尺寸、鍵盤來源展開、來源/授權、展開後寬度、重播/換字/停止、舊事件/Promise、失敗及生命週期。真實 Chromium 與 WebKit 各驗證 24 檔 HTTP/媒體 metadata 和正時間長度，並從原生按鈕播放第一個字至完成；其餘三個 Chromium 專案刻意跳過這個重複媒體檢查。

初次 WebKit 模擬測試有四個假失敗：測試以 capture 事件中的 microtask 清除手勢旗標，WebKit 在 target listener 前執行該 microtask。將測試旗標在事件 bubble 階段清除後，14/14 focused 檢查與最終完整檢查皆通過；正式播放邏輯沒有為測試更改。新增來源 details 後，原翻譯測試均改為在英文短文區域內定位，避免誤操作另一個 disclosure。

獨立 reviewer 檢查新播放狀態、競態、內容邊界、來源署名、全部正式音檔雜湊及測試，無重大發現；兩項文件的舊數量/變更範圍紀錄已修正。實際 Chrome 讀本點選 supermarket 收到 playing/ended，介面顯示已播放；同樣不把媒體事件當作耳朵已驗證聲音品質。正式手機寬度截圖為 `.scratch/illustrated-english/qa/recorded-audio-mobile.png`。

真人錄音樣本的自然度已有使用者回覆；全部 24 個詞的實聽、發音/口音與實際手機重播/換字/停止仍待確認。沒有實際手機硬體供 agent 操作，依 mobile-native 的實機要求保留人工驗收。此變更只更新音檔、內容 audio、共用呈現/控制、驗證/測試與文件，未變更套件、帳號或部署。

目前網路已從原 192.168.50.231 改為 192.168.0.101；本次擁有的舊 LAN 預覽 PID 14779 已停止。新版預覽以相同 Astro 命令綁定 192.168.0.101:4323，工具 session 60029、PID 60355，頁面及 MP3 HTTP 200；本機 127.0.0.1:4322 預覽保留。試聽原型只位於 `.scratch/illustrated-english/audio-research/listen/`，不納入正式 dist；其暫時 HTTP server 在工程交付後停止。自動測試的 4391 listener 已清理。若需回復此品質修正，應一併回復 audio 必填契約、三份 audio 資料、Reader/播放程式/測試及移除新音檔；不應只刪音檔讓建置或按鈕失效。

## 2026-10-14 統一聲線版本

使用者試聽 coffee、aisle、短句及 22.1 秒咖啡店全文樣本後，確認聲音「自然且一致，可以用這個聲音」。正式方向改為 Kokoro `af_heart` 固定美式女聲合成，取代 Commons 真人單字錄音。目標為 24 個單字、15 個短句及 3 篇全文，共 42 段本地 MP3。來源、模型設定與舊錄音歷史見 [audio-sources.md](audio-sources.md)；樣本接受不代表全部音檔或手機操作已通過人工驗收。

`content/audio/voice-profile.json` 是唯一聲線設定。每筆音檔 `audio` 恰有 `src`、`voiceId`、`textSha256`、`sha256`；場景全文、每個短句及每個單字均必填。全文英文由 `src/lib/audio-text.ts` 的 `canonicalStoryText` 將每句片段串接並在句間加一個空格，文字雜湊對其 UTF-8 bytes 計算。內容驗證核對精確英文、相同 `voiceId`、MP3 檔案 SHA-256 及所屬 `/audio/{stories,phrases,words}/` 路徑。改動英文須重製相應音檔，不能沿用舊雜湊。

生成入口為 `node scripts/generate-audio.mjs .scratch/illustrated-english/unified-voice/.venv/bin/python .scratch/illustrated-english/unified-voice/model`；隔離 Python 環境、模型、安裝鎖定及 provenance 留在 `.scratch/illustrated-english/unified-voice/`。離線生成使用 `HF_HUB_OFFLINE=1 HF_HUB_DISABLE_IMPLICIT_TOKEN=1`；網站播放不呼叫模型或第三方語音服務。

每頁共用同一套播放器，同一時間最多播放一段；切換單字、短句或全文時停止前一段並建立新的 Audio，全文續播則保留原 Audio 與位置。全文可暫停、續播、從頭及停止。不自動播放。啟動逾時 8 秒、停滯逾時 15 秒；有正常進度的長全文不因總長超過 15 秒被切斷，暫停不計停滯。頁面隱藏或離開時停止；舊事件與 Promise 不得覆蓋當前狀態。

完整 `npm run verify` exit code 0，輸出在 `.scratch/illustrated-english/qa/unified-audio-verify.log`：Astro 17 個檔案無錯誤/警告/提示，3 場景內容合法，內容測試 13/13，建置 5 頁，瀏覽器 122 passed / 3 skipped，隔離第四場景擴充 1/1。三個 skip 是重複媒體檢查；Chromium 與 WebKit 都驗證 42 段 MP3 可解碼，原生單字播放完成，22.1 秒全文暫停、續播及完成。模擬測試覆蓋長時間進度、暫停期間停滯計時、跨層級切換、續播後舊 pause/ended 事件及舊 Promise。首次整合只有 Chromium 真實短字完成的 5 秒測試等待不足；調整為涵蓋 8 秒啟動與音檔長度的等待後，完整重跑通過，首次輸出保留為 `unified-audio-first-verify.log`。

獨立 reviewer 指出的續播舊 ended 事件與額外 audio 欄位兩項已修正，delta review clean。實際 Chrome 超市讀本亦確認全文播放、暫停、續播後完成；這些是媒體操作證據，不代替實聽。390px 畫面在 `.scratch/illustrated-english/qa/unified-audio-mobile.png`。42 段正式 MP3 共 1,058,232 bytes；全文長度咖啡店 22.1 秒、問路 19.975 秒、超市 23.45 秒。生成 manifest、原文、phonemes、時長與摘要在 `.scratch/illustrated-english/unified-voice/output/manifest.json`。原 Commons 24 段已封存到 `audio-research/superseded-public/`，不留在正式資產。

本次本機預覽維持 127.0.0.1:4322（session 12109 / PID 6876），同一 Wi-Fi 預覽 192.168.0.101:4323（session 60029 / PID 60355），正式讀本及全文 MP3 HTTP 200。樣本 4324 服務在整合後停止；測試 4391 服務已清理。未發布、部署或改動套件與鎖檔。

2026-10-14 使用者於剩餘內容與實際手機音訊驗收項目列明後，明確回覆「驗收完成」。第二票與第四票據此結案，第三票由第四票取代並完成單字播放驗收。此紀錄以使用者實機確認為依據，不以模擬或媒體事件推論聲音品質。產品驗收不記為 CNN 原文閱讀能力進度；尚未部署。
