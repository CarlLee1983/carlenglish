# 03: 在讀本內直接聽單字發音

**What to build:** 手機使用者遇到不會念的重點單字時，能在原讀本點「聽發音」，重播、換字或停止，繼續閱讀。

**Status:** superseded by issue 04 — historical human-recording implementation evidence

使用者追加統一聲線、短句與全文朗讀後，本票的單字播放需求已併入 [04-unified-reading-audio.md](04-unified-reading-audio.md)。以下保留真人錄音版本的工程及試聽紀錄；目前正式讀本使用固定 Kokoro af_heart 女聲，完整手機驗收依第四票追蹤。

**Dependency order:** 原裝置語音品質遭拒絕 → 真人錄音樣本獲使用者接受 → 24 個音檔與播放替換完成 → 完整回歸通過、獨立審閱 clean → 待手機完整聲音與操作驗收。

- [x] 所有場景共用單字發音控制，依當前單字的 audio.src 播放真人錄音；保留既有圖文、翻譯、導覽及透過資料/資產新增場景的方式。
- [x] 24 個單字的真人 MP3 全部到齊；來源、作者、授權與轉換變更有明確證據及頁內署名。
- [x] 同字再點重播，換字中止前一個，不累積佇列；提供停止控制，離開或隱藏頁面取消播放。
- [x] 準備、開始、完成和錯誤有清楚狀態；舊回呼不能覆蓋新播放，長時間沒有開始/結束能解除等待。
- [x] 按鈕至少 44px 高，提供鍵盤操作、輔助名稱與狀態提示；沒有 JavaScript 仍可閱讀。
- [x] 正式建置的瀏覽器測試驗證三場景的固定音檔、重播、換字、停止、Promise/事件、錯誤及生命週期；桌面亮暗、390px/320px Chromium、390px WebKit 版面正常，真實 Chromium/WebKit 可播放並載入全部錄音。
- [x] 真人錄音版本完整品質檢查與獨立審閱通過，維護說明及驗收證據更新。
- [x] 使用者的實際手機聽到正確英文；換字沒有重疊，停止有效，不需另開網站。（由第四票的統一聲線版本完成，使用者已確認驗收完成。）

2026-10-14 使用者拒絕裝置語音品質，明確指出「聲音太機械、不自然」。原自動檢查只驗證播放操作，不能證明聲音自然度。此票重新進行品質修正，尋找具明確授權的真人錄音、提供試聽樣本並確認全部來源後，已完成播放替換與新的工程驗證；仍保留完整手機人工驗收。原裝置語音的控制證據只作歷史紀錄。

同日使用者已試聽 coffee、café、toast 的真人錄音並確認「這種自然度可以，適合跟讀」。24 個字的來源與逐檔授權已確認，全部轉換 MP3 已到齊，共 324,625 bytes；來源曾回覆 Retry-After 600 秒，遵守等待後下載成功。固定播放與內容契約已改成 audio，不保留裝置語音作為回退。樣本回覆尚不當作全部單字或手機停止操作已完成人工驗收。

2026-10-14 使用者反映手機另開發音網站不方便，新增此範圍。第一版採裝置語音，之後因機械感遭拒絕；目前改用固定真人錄音。音檔可有不同錄音者及口音，來源與授權需如實標示。沒有新增套件、金鑰或資料庫；不含整篇朗讀、語音辨識、發音評分、部署或 Git 發布。

變更檔案：`src/components/Reader.astro`、`src/styles/global.css`、`src/scripts/pronunciation.ts`、`src/lib/scenes.ts`、三份 `content/scenes/*.json` 的 audio 欄位、24 個 `public/audio/words/*.mp3`、`tests/pronunciation.spec.ts`、`tests/content.test.mjs`、`tests/browser.spec.ts`、`tests/extension.test.mjs`、`playwright.config.ts`、`README.md`、`docs/spec.md`、`docs/content-guide.md`、`docs/implementation.md`、新增 `docs/audio-sources.md` 及本工單。場景原文、翻譯、用語、圖片、套件與鎖檔未修改。真人錄音版截圖為 `.scratch/illustrated-english/qa/recorded-audio-mobile.png`；完整驗證、獨立審閱與暫時保留的本地/手機預覽資訊見 `docs/implementation.md`。
