# 04: 單字、短句與整篇短文使用同一個聲音

**What to build:** 三篇讀本的單字、常用短句及整篇英文短文都能在頁內播放。所有音檔使用同一個固定聲線、性別及口音，避免不同錄音者交替。

**Status:** completed — real-phone acceptance confirmed

**Dependency order:** 使用者需求與音源可行性 → 固定聲線樣本實聽已接受 → 42 段音檔已生成 → 共用播放器與內容驗證已整合 → 完整回歸及獨立審閱通過 → 使用者實機驗收完成。

- [x] 確認三場景包含 24 個單字、15 個短句及 3 篇完整短文；完整短文依可見句子及文字片段順序組合。
- [x] 提供相同聲線的單字、短句與整篇短文試聽；明確標示音源種類，並由使用者確認自然度及一致性。
- [x] 三種音檔全部使用同一個固定聲線與口音；記錄生成版本、參數、來源與輸入內容，修改文字時可發現錄音過期。
- [x] 短句與文章加入頁內播放，文章可暫停、繼續、重播及停止；不同層級的新播放會中止上一段，沒有重疊或自動播放。
- [x] 長文播放不被既有單字的 15 秒等待限制截斷；停止/暫停/切換/離開頁面及過期回呼有正確狀態。
- [x] 原有圖文、翻譯、導覽、鍵盤與 320px/390px 版面保留；新增場景只需資料與必要資產，不需要人工路由清單。
- [x] 完整品質檢查、真實 Chromium/WebKit 媒體操作與獨立審閱通過，更新維護與音源說明。
- [x] 使用者實際手機確認全部聲音一致且自然、短文完整、暫停/繼續/停止有效。

2026-10-14 使用者要求短句發音、統一聲音，並追加整篇短文發音。現有 Commons 真人音檔由不同人錄製，不能補齊原創短句及文章的同一位講者。先試用 Kokoro af_heart 固定美式女聲，在本地預先生成；此候選是 AI 合成語音，不能標示為真人錄音。原已接受的真人讀本在候選聲音確認前保留。沒有授權付費服務、金鑰、真人人聲複製、遠端部署或 Git 發布。

樣本在 `.scratch/illustrated-english/unified-voice/listen/`：coffee 1.475 秒、aisle 1.325 秒、I'd like a coffee 1.775 秒、咖啡店完整英文短文 22.1 秒。全部使用固定 af_heart 向量與 speed=1；模型版本 v1.0、library 0.9.4、repo revision f3ff3571791e39611d31c381e3a41a3af07b4987。模型 SHA-256 496dba118d1a58f5f3db2efc88dbdc216e0483fc89fe6e47ee1f2c53f18ad1e4，聲線 SHA-256 0ab5709b8ffab19bfd849cd11d98f75b60af7733253ad0d67b12382a102cb4ff；兩者與官方公佈的完整/前綴摘要一致。原文與 phonemes/輸入摘要保留在 samples.json，生成程式與工具版本在相鄰目錄。

樣本由暫時 HTTP server 工具 session 83035 提供，只服務樣本目錄，不包含模型或 Python 環境。使用者已回覆「自然且一致，可以用這個聲音」，依此確認統一使用 af_heart。42 段正式音檔已生成，三篇全文分別為咖啡店 22.1 秒、問路 19.975 秒、超市 23.45 秒；原文、phonemes、時長與摘要保存在 `.scratch/illustrated-english/unified-voice/output/manifest.json`。原 Commons 生產音檔已封存於 `audio-research/superseded-public/`，正式資產只保留新的 42 段。

聲線樣本已通過實聽；使用者於剩餘驗收項目列明後明確回覆「驗收完成」，全部音檔及手機操作驗收完成，本票 8/8 結案。人工驗收依使用者確認記錄，不由媒體 metadata 推論。

完整 `npm run verify` exit code 0：內容 13/13、瀏覽器 122 passed / 3 skipped（重複媒體測試）、擴充 1/1，Astro 無診斷並建置 5 頁。獨立審閱提出的兩項已修正且 delta clean。詳見 `docs/implementation.md` 與 `.scratch/illustrated-english/qa/unified-audio-verify.log`；正式手機讀本 http://192.168.0.101:4323/ ，樣本 4324 服務已停止。
