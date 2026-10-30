# CI 與教材驗證

## 範圍

服務為 `CarlLee1983/carlenglish`，本次基底 `886f8593b2f62915f36b6a9aac6f5a0a64b3a8a9`，本地分支 `content/elementary-help-observe-20261026`。內容包含十八篇未提交入門場景，合計 82 篇場景、初級 63 篇、537 段正文。本次改善驗證流程，保留內容、既有五種瀏覽器設定及完整測試。沒有更改應用程式、依賴版本、Cloudflare 帳號、權限、密鑰或讀者資料。

以下 workflow 是本次準備的版本；本機結果綁定目前工作目錄，尚未綁定新的提交 SHA。遠端 CI 成功、合併、部署及線上服務驗證各自需要實際執行證據，不能由本機結果推論。

## 判斷與證據

**Verified：** [CI run 40267896680](https://github.com/CarlLee1983/carlenglish/actions/runs/40267896680) 的 `verify` 步驟用了 18 分 32 秒；[Deploy run 40270154178](https://github.com/CarlLee1983/carlenglish/actions/runs/40270154178) 的相同步驟用了 28 分 30 秒，瀏覽器安裝分別為 39、53 秒。主要改善對象是測試臨界路徑。既有流程在啟用部署的 main 跳過 CI，本次沒有把它誤算為同次 push 的雙重驗證。

**Verified：** 修改前 82 篇共有 2,225 個 Playwright 案例，每篇三個逐篇測試乘五種 projects，另有全目錄、SEO 與共用互動測試。最終清單為 2,535 個案例：原本 2,220 個非轉場案例完全不變，五個整批翻譯切頁案例拆成 63 個來源各五種 projects，共 315 個獨立轉場案例，全部原有斷言保留。音檔解碼原已只在 Chromium、WebKit 執行；不改 `fullyParallel`，維持檔案內執行順序。（此兩點已由下方「縮短瀏覽器測試」取代。）

**Inferred：** 三個獨立 runner 可縮短完整套件的等待時間，但分片按檔案分配，耗時不一定等分；安裝與產物傳輸會有額外工作量。實際遠端加速比例要由新 SHA 的 Actions 量測，本機舊紀錄在 6.1–19.6 分鐘間波動，不能當成精確預測。

GitHub 唯讀查詢確認 `CLOUDFLARE_DEPLOY_ENABLED=true`；main 的 branch protection 回傳 404，repository rulesets 為空。本次未更改這些設定；日後設定 required checks 時，應從實際新 run 選取總驗證閘門的 check 名稱。

## 操作與流程

```text
verify:static → 同 run 的 dist + SHA／檔案 manifest
                    ├─ Playwright Chromium 分片 1/2（四 projects）
                    ├─ Playwright Chromium 分片 2/2（四 projects）
                    ├─ Playwright WebKit 分片 1/2（mobile-webkit）
                    ├─ Playwright WebKit 分片 2/2（mobile-webkit）
                    └─ 隔離擴充測試
                             ↓ 全部成功
                     Complete verification
                             ↓ 僅 Deploy
                 精確 artifact ID → manifest 核對 → 發布
```

`.github/workflows/verify.yml` 由 CI 與 Deploy 共用。建置只執行一次，內容驗證由 `build` 執行一次；每個測試 job 下載相同 run 的精確 artifact ID，核對 checkout SHA 與全部輸出檔案雜湊。manifest 的建立與驗證要求乾淨 checkout，拒絕空輸出、symlink、錯誤 SHA、增減或改動檔案。產物與失敗 trace 保留七天；MP3／WebP 已壓縮，產物不再花時間重壓縮。

總閘門以 `always()` 檢查 build、browser matrix、extension 三種結果，只有每個都為 `success` 才成功。失敗、取消、略過或缺失結果都不能放行。Deploy 只在 main 且部署 variable 啟用時驗證；發布依賴整個驗證 workflow 成功，下載同一 artifact，核對後才把既有專用 Cloudflare secrets 注入發布步驟。驗證 jobs 不繼承這些 secrets。main 合併後仍重新驗證自己的 SHA，不跨 PR/main 搬用舊產物。

PR 更新會取消同一 PR 過期的 CI；正式部署沿用不取消進行中工作的序列。第三方 actions 以完整 commit 固定，新增官方 upload-artifact v7.0.2／download-artifact v8.0.2 使用 Node 24；沒有新增專案套件。

首次遠端 [CI 40341588134](https://github.com/CarlLee1983/carlenglish/actions/runs/40341588134) 的一個 browser runner 在安裝步驟等待超過十五分鐘，另外兩個相同步驟約一分鐘。取消過期 run 後取得日誌，確認等待發生在 Azure Ubuntu apt 鏡像下載套件，未更換系統鏡像。共用流程的 browser／extension 瀏覽器安裝各設五分鐘步驟上限，避免安裝停滯耗盡整個 job 的驗證預算；逾時即失敗，不自動重試或跳過。這個防護不改測試覆蓋，不能被描述成已修復安裝服務。

其後 PR #18 的候選完整 CI 已通過，main 合併為 `f7eb2d9`；但 [Deploy 40351900312](https://github.com/CarlLee1983/carlenglish/actions/runs/40351900312) 的 extension 安裝及一次同 SHA 補跑，都在 `azure.archive.ubuntu.com` 的套件下載超過五分鐘。三個完整 browser 分片均通過，發布 job 兩次略過，未發布；不繼續以重試掩蓋同點失敗。

因此 browser／extension 固定使用已驗證的 `ubuntu-24.04`。安裝前由 `scripts/use-ubuntu-archive.mjs` 精確改寫 runner 的 `/etc/apt/apt-mirrors.txt`，只將完整 Azure Ubuntu archive URL token 換成 `https://archive.ubuntu.com/ubuntu`。保留其他 mirrors、priority、空白／換行、APT suites、components、keyring 與簽章驗證；不刪依賴、不改原 Playwright 安裝指令或五分鐘期限。已是指定官方 URL 時可重入；缺檔或沒有預期的有效 URL 時明確失敗。Node 純轉換函式有五項回歸測試；實際 host 設定與下載結果仍須由新 SHA 的完整 CI 證明。

該 run 的 mobile-webkit 亦重現整批翻譯切頁測試的 120 秒 deadline。最終改為每個來源一個獨立案例，各自使用預設 30 秒，保留來源翻譯、鍵盤切頁、完整目的內容／圖片、目的翻譯收起及舊標題消失等斷言。這是將整批共享期限改為每個完整轉場的期限，整體允許時間增加，並非總預算不變；不增加 retry。來源可在作者階段選取，目的仍從完整級別集合產生。少於兩個同級來源時直接失敗，避免沒有有效目的仍空跑成功。

### 場景作者的本機檢查

```sh
pnpm run verify:content-change
pnpm run verify:content-change --base origin/main --plan
pnpm run verify
```

預設 base 為 HEAD，會解析成固定 commit，合併 base 到 HEAD、暫存區、工作目錄與未追蹤檔案。被暫存區和工作目錄互相抵銷的變更仍保守納入。場景 JSON 選到自己的 ID；共用圖片、句子、短句或單字 MP3 反查所有引用它的場景。配套文件可隨場景同行。

只在可辨識的場景／素材變更下，執行全站 `verify:static`，再跑 `browser.spec.ts`、`pronunciation.spec.ts`、`seo.spec.ts`：逐篇案例只選變更場景，目錄、推薦、SEO、共用朗讀行為與全場景音檔仍使用完整內容集合。文章、經典及複習互動等其他 spec 留待整合時的完整套件。全域 `scenes` 不縮小，不會讓目錄預期或推薦結果漏算。

刪除、改名、未知或未引用素材、不合法 JSON／ID、文章／經典／詞表／voice profile、程式／測試／設定／依賴變更、無法解析 base，或沒有可選場景時，一律回退完整 `verify` 並說明原因。CI 入口永遠完整執行；在 CI 注入場景選擇器會直接失敗。`--plan` 明示沒有執行檢查，只供檢視；沒有快取舊綠燈，也不替代完整 CI 或發布閘門。

本次正在修改 CI 與測試程式，因此目前在此工作目錄執行內容檢查會回退完整套件，這是預期行為。改動整合後，後續純場景批次才適用縮小的作者檢查。

## 本機驗證

以下先記錄第一版提交前的準備結果；遠端重現整批轉場逾時後，不能以舊版本本機補驗取代最終候選的完整 CI。

`pnpm run verify:static` 通過：Astro 檢查 89 檔無 errors／warnings／hints、183 項單元測試、82 篇內容有效，建置 133 頁。Actionlint v1.7.12 檢查三個 workflow 通過。三分片清單為 820／760／645，聯集與修改前 2,225 個 `(project, file, title)` 完全相同，且無重複。從實際 YAML 擷取的總閘門 shell，遍歷三項結果各五種值的 125 個組合，只有全部 `success` 放行。

三分片在同一台 macOS 各以兩個 workers 同時實跑，分別為 816 通過／3 略過／1 失敗（19.9 分）、754 通過／5 略過／1 失敗（20.0 分）、641 通過／4 略過（20.3 分）。兩個失敗均為既有共用翻譯切頁測試超過原本的 120 秒限制，出現在 desktop-chromium 與 mobile-chromium；trace 和初次失敗日誌保留。這輪不是全綠結果，也不能作為獨立 GitHub runners 的加速量測。

同時執行的擴充測試在隔離建置的原有 90 秒 deadline 失敗；停止分片後單獨執行通過（1 項，總計 81.2 秒）。**Inferred：** 本機多套瀏覽器與建置競爭資源可能導致逾時，不能僅由重跑通過斷言根因。沒有放寬 timeout、增加 retry 或刪除案例。

最後三篇（block-tower、bakery-rolls、art-tools-away）的作者瀏覽器組合，以兩個 workers 單獨實跑，247 通過／3 項既有略過，耗時 5.7 分鐘，exit 0。共 250 案例，比完整清單少 88.8%；此為案例數差異，不是遠端耗時的加速保證。這次直接執行選擇器下的三份 spec，以驗證作者瀏覽器路徑；目前含 CI 程式改動的工作目錄，完整 CLI 仍會如預期回退全部檢查。

作者組合中的共用翻譯切頁案例仍遍歷全部 63 篇初級場景。原失敗的相同 project／test identity 於 desktop-chromium 36.9 秒、mobile-chromium 40.5 秒補驗通過，其餘三個 projects 亦通過；正式內容、被測程式、建置輸出、斷言及 timeout 沒有改動。完整分片與失敗案例補驗共同完成本機覆蓋驗證，不將初次兩個失敗改寫成「三分片全綠」。獨立程式審查無未解決的重要發現；交付說明中發布結果不明的處理已依 delta review 修正。

最終逐來源版本重新通過 `verify:static`（183 項單元測試、89 個 Astro 檔案無診斷、82 篇有效、133 頁建置）。新清單 2,535，三分片 944／884／707 的聯集完全相同且不重複；全部 63 個初級來源各五個 projects 正好出現一次。其餘 2,220 個 `(project, file, title)` 與修改前完全相同。三篇作者組合為 260 個案例，其中轉場 15 個；全目錄、SEO 及全 MP3 的集合不縮小。315 個轉場案例以兩個 workers 實跑全部通過，3.3 分鐘、exit 0；沒有 skip 或 retry。獨立 delta review 確認沒有減少原有轉場斷言或污染目的場景集合。

新增測試涵蓋變更偵測、共用素材、Git 各狀態聚合、未知 base、刪改名、程式變更、無效選擇器、CI 拒絕選擇器、子程序失敗，以及 artifact 的錯誤 SHA／檔案變更／遺漏／額外檔案／symlink。Actionlint v1.7.12 的下載 archive 已依官方 release checksums 核對，只放在忽略的 `.scratch/ci-improvement-20261026/`。

證據、案例清單、日誌與收尾草稿保存於 `.scratch/ci-improvement-20261026/`。包含 `static.log`、`shard-audit.json`、`gate-check.json`、`shard-{1,2,3}.log`、失敗 traces、`extension.log`、`extension-solo.log` 及 `author.log`；305 個先前批次內容／素材／紀錄的雜湊與 CI 修改前一致，十八張圖與 288 段 MP3 均符合原始 manifests。`source-manifest.json` 記錄交付工作目錄相對基底 SHA 的變更檔案雜湊；它只綁定本機未提交版本，不代替新提交的 CI。遠端 workflow 尚未執行，不能宣稱新 CI 已在 GitHub 通過或已有量測加速。

## 縮短瀏覽器測試（2026-10-27）

**Verified：** 改動前 CI 總時間 13–31 分鐘，瓶頸是瀏覽器分片的測試步驟：[Deploy 40361182775](https://github.com/CarlLee1983/carlenglish/actions/runs/40361182775) 三片為 614／528／938 秒，build 僅約 1 分鐘。原因為 2,535 個案例中，逐篇內容檢查在五個 projects 重複；未開 `fullyParallel` 時分片按「檔案 × project」切，耗時不均。

使用者決定縮小重複範圍，這是刻意的取捨：

- 與視窗無關的逐篇內容檢查標記 `@content`（場景旅程與翻譯切頁、句子資產、文章 lang／關鍵詞／導覽，以及單字庫的搜尋、發音、列印、來源與翻卡／換卡動態），`desktop-dark`、`mobile-chromium`、`narrow-chromium` 以 `grepInvert` 排除；`desktop-chromium` 與 `mobile-webkit` 照跑，與既有音檔解碼的引擎組合相同。版面、溢出、點擊尺寸等檢查五個 projects 照舊。代價：只在深色或窄版 Chromium 出現、且不造成溢出的內容錯誤，不再由內容檢查攔截。
- `fullyParallel: true`，CI `workers: 4`（ubuntu-latest 4 vCPU，預設僅 2）。
- `fullyParallel` 下分片依 project 順序切，WebKit 全落在最後一片；workflow 改為 Chromium、WebKit 各自兩片，Chromium job 不再安裝 WebKit。
- 首頁級別目錄測試按級別拆成獨立案例，各保留 120 秒期限；整批版本在 4 workers 的 WebKit 分片逾時（[CI 40417658295](https://github.com/CarlLee1983/carlenglish/actions/runs/40417658295)）。初級仍在單一案例檢查全部卡片圖片，場景持續增加時是下一個期限風險。

案例數 2,535 → 1,779。單字庫新增 60 個案例，三個 layout-only projects 各只保留入口溢出、換卡與短螢幕、放大文字、原生捲動四項。`vocabulary.spec.ts` 在 CI 以軟體算繪 WebGL，檔內依序執行；平行時翻頁動態測試取不到中間幀（[CI 40491831522](https://github.com/CarlLee1983/carlenglish/actions/runs/40491831522)）。回復方式：移除 `@content` 的 `grepInvert`、`fullyParallel`、`workers` 及 matrix 的引擎拆分。遠端耗時以 [PR #20](https://github.com/CarlLee1983/carlenglish/pull/20) 新 SHA 的 run 為準。

## 後續與回復

使用者在完整提案後明確授權「devops 收尾上線」，由 [PR #18](https://github.com/CarlLee1983/carlenglish/pull/18) 交付；最終候選完整 CI 通過後才合併，main 新 SHA 仍須完成完整 Deploy 驗證、產物核對及正式服務驗證。發布前平台版本為 `1ac02f6d-15dd-42a0-9332-b7378c039680`、100% 流量；必要回復須另有授權。現有十八篇的素材與共讀紀錄保留；實聽、實機觸控與孩子試讀尚未由使用者確認。其他開啟中的新聞 PR #14 及十份並行新增的教材規劃文件不在本次範圍。

若回復本次 CI 改動，還原 workflow、驗證 scripts、測試選擇器及文件，即回到單 job 完整 `verify`；內容及讀者資料不需要回復。任一 artifact／SHA／gate 不符就停止發布，保留現行線上版本，不以跳過檢查來恢復。

依據：[Playwright sharding](https://playwright.dev/docs/test-sharding)、[GitHub reusable workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)、[同 workflow 傳遞 artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data)。
