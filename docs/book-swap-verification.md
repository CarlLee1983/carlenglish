# 換書活動單元：製作與驗證紀錄

日期：2026-10-14。此批內容透過工作分支與草稿 PR 供審閱，不代表已合併或部署。原有四篇入門讀本及其媒體保留。

## 內容範圍

| 讀本 | 編輯難度 | 語言與理解重點 |
| --- | --- | --- |
| `respectful-disagreement` | 中級 | 回應別人的理由，說明顧慮，保留可能性與同意條件 |
| `checking-online-information` | 中級至中高級 | 分清來源、日期、現行資訊，避免過度推論 |
| `giving-short-presentation` | 中高級 | 建議、依據、好處、限制與應對、下一步 |

每篇 8 個英文句子、5 個短句、7 個單字，合計 24 個英文句子、15 個短句項目、21 個詞彙項目、3 張圖片及 39 段新音檔。這是場景內的項目數，不是去重後的全新單字量。配套 [學習說明](book-swap-study-guide.md) 含先備理解、每課目標與提示、9 題理解／應用練習，以及分開的參考答案和理由。

三篇使用虛構人物 Maya、Ben 及原創校園情境；公告內容是教學創作，沒有冒充真實新聞或真實學校公告。文本從共同規劃換書活動出發，條件前後一致：30 位學生，會議室可容納 20 人，提議兩場各 15 人；仍須安排時段與向館員預約。教學難度標籤不是 CEFR 認證、測驗成績或個人學習紀錄。

文字曾由另一輪內容審查核對英文、繁體中文、逐字標註、八句限制、推論範圍與答案；此為 AI 輔助編輯審查，不冒稱人類教師或使用者已驗收。本批依 repository 現有內容契約與選題準則製作。

## 圖片

三張皆為內建 image_gen 生成的原創插畫，1536 × 1024，轉為 WebP 時保留完整構圖。維持高中年紀人物及一致服裝、生活場景、低飽和暖色和畫筆紋理。第二張另修正筆電與人物視線方向。實際生成指令保留在 [圖片生成紀錄](image-prompts.md)。

## 聲線與可重製資訊

新音訊沿用 `content/audio/voice-profile.json`，沒有調整任何聲線設定：

- Kokoro 0.9.4，`af_heart`，speed 1，24 kHz，CPU
- 模型 revision：`f3ff3571791e39611d31c381e3a41a3af07b4987`
- 模型 SHA-256：`496dba118d1a58f5f3db2efc88dbdc216e0483fc89fe6e47ee1f2c53f18ad1e4`
- 聲線 SHA-256：`0ab5709b8ffab19bfd849cd11d98f75b60af7733253ad0d67b12382a102cb4ff`
- Python 3.12.14；Misaki 0.9.4；Torch 2.8.0+cpu；Transformers 4.51.3；NumPy 2.2.6；SoundFile 0.13.1；spaCy 3.8.7；en_core_web_sm 3.8.0；espeakng-loader 0.2.4；phonemizer-fork 3.3.2；Hugging Face Hub 0.30.2
- FFmpeg 7.1.5，`libmp3lame -q:a 2`；生成使用 seed 0、2 個 CPU threads

批次的 [輸入、生成 manifest、逐檔驗證與重製說明](audio-generation/book-swap-20261014/REPRODUCTION.md) 一併保留於 repository。

使用官方 [固定版本模型](https://huggingface.co/hexgrad/Kokoro-82M/tree/f3ff3571791e39611d31c381e3a41a3af07b4987) 與官方套件來源，下載後核對模型、聲線和 config 雜湊。模型標示 Apache-2.0，spaCy 英文模型標示 MIT；不把模型授權自動當成生成 MP3 的授權。既有生成環境沒有提交完整的舊版 transitive lock，因此本批符合公開聲線契約，不保證重製出與舊音檔逐 byte 相同的結果。

在隔離環境準備核對過的依賴及模型後，使用既有 `scripts/synthesize-audio.py` 對這三篇的文字建立獨立批次；不直接執行會重製所有場景的整批更新工具。生成環境設定 `HF_HUB_OFFLINE=1`、`HF_HUB_DISABLE_IMPLICIT_TOKEN=1`、`TRANSFORMERS_OFFLINE=1`，不使用隱含登入 token。全文以 `canonicalStoryText` 精確串接；每個場景、短句與單字的 JSON 記錄原文及 MP3 SHA-256。網站建置和播放不需要模型，也不呼叫線上語音服務。

## 工程檢查

最終七篇內容整合後執行 `pnpm run verify`，exit 0，完整流程約 123 秒：

- Node.js 24.19.0、pnpm 12.0.0，`pnpm install --frozen-lockfile`：已通過，lockfile 無變動
- Astro 檢查：0 errors／warnings／hints；完整內容驗證：7 篇；內容測試：15／15 通過；正式靜態建置：通過
- 全部場景與音檔的桌面／手機 Chromium、WebKit 瀏覽器回歸：182 通過、3 項既有的重複實音測試依設定跳過、0 失敗；涵蓋桌面亮／暗、390px 與 320px Chromium、390px WebKit
- 隔離副本新增一篇後，全部原有路由及新增路由的資料、圖片、翻譯、音訊繫結與重新整理，以及來源雜湊不變：1／1 通過，七篇擴充成八篇；測試副本已清理
- 所有 39 段新 MP3 的完整解碼、有限且非靜音 24 kHz 單聲道 PCM、完整文字輸入消耗、文字和檔案雜湊：已通過；總長 174.55 秒，三篇全文為 36.075／39.900／37.700 秒
- 既有四篇 JSON、4 張圖片、54 段 MP3、聲線 profile 與應用程式：逐檔與基底 commit 比對，全部不變

本次雲端 QA 使用固定 Playwright 1.64.0 的 Chromium 156.0.8078.4（headless-shell 1248）及 WebKit 27.2（2370）。預設下載站曾回傳不完整檔案，改用版本資訊核對過的官方 Chrome for Testing 儲存位置與 Playwright 官方 Microsoft 備援來源取得相同版本；缺少的 Debian 程式庫經簽章與 SHA-256 核對後解到隔離快取。WebKit 的 ldconfig 預檢看不到該快取，故本地以 `LD_LIBRARY_PATH` 載入經驗證的程式庫並設定 `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`；實際兩種瀏覽器啟動、播放與全部測試照常執行，repository 測試設定及 CI 未修改。

另保存 12 張三篇新讀本的桌面 1280px、手機 320／390px 畫面（含 320px 翻譯展開）。截圖流程無 page errors 或水平溢出；目視檢查標題、圖片、長句、翻譯與用語清單無明顯版面問題。截圖為驗證產物，沒有加入網站資產。

測試不再假設全站恰好四篇：從資料發現所有場景與音檔，同時保留原有四個穩定 ID 的檢查。既有缺欄位、引用、路徑、symlink、聲線、文字和檔案雜湊的錯誤攔截保留；補上 8 句、6 短句、8 單字的最大值與超限反例。

## 尚待使用者驗收

- 三篇讀本及全部 39 段新音檔的實際發音、停頓與自然度，尤其 fifteen／twenty／thirty、necessarily、courtyard、sessions
- 使用者實際手機的音訊和觸控體驗；模擬手機寬度及 WebKit 測試不等於真機驗收

程式能解碼、瀏覽器有播放事件、雜湊一致或畫面檢查通過，都不能冒充真人實聽。既有聲線樣本與舊批次曾經驗收，不代表本批已驗收；完成閱讀或開啟練習也不記為程度進階。
