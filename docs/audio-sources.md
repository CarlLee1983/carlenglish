# 統一聲線與音檔來源

目前分支包含 93 段本地 AI 合成 MP3：51 個單字、35 個短句及 7 篇完整短文。新換書活動單元新增 39 段，既有四篇的 54 段不變。全部由 [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) 的 `af_heart` 聲線產生，設定以 `content/audio/voice-profile.json` 為準：Kokoro 0.9.4、模型 revision `f3ff3571791e39611d31c381e3a41a3af07b4987`、速度 1、24 kHz、CPU。這是固定的美式女聲合成音訊，不是真人錄音。

模型來源標示 [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)；這是模型授權資訊，不表示生成 MP3 自動適用同一授權。模型檔與聲線檔的雜湊記於 profile。生成用的 Python 環境、模型、安裝鎖定與來源紀錄放在 `.scratch/illustrated-english/unified-voice/`，不進網站資產。離線生成時使用 `HF_HUB_OFFLINE=1 HF_HUB_DISABLE_IMPLICIT_TOKEN=1`，不讀取隱含 Hugging Face token；瀏覽網站播放時不需要 Python 或遠端語音服務。

使用者先試聽 coffee、aisle、短句及 22.1 秒咖啡店全文樣本，接受「自然且一致，可以用這個聲音」，之後於完整內容及手機操作驗收項目列明後確認「驗收完成」。工單 04 已結案；此結果依使用者確認，不由來源評級、雜湊或媒體 metadata 推論。音檔的文字、聲線與 SHA-256 契約及重製方式見 [內容維護說明](content-guide.md)。

## 已取代的 Commons 錄音

先前 24 個單字使用 Wikimedia Commons 真人錄音，來源有多位錄音者及不同口音。它們已由統一聲線音檔取代，不再作為網站正式音源，也不在介面提供逐檔錄音者署名。原始來源頁、授權、原音檔、SHA-256 與 FFmpeg 轉檔紀錄保留在 `.scratch/illustrated-english/audio-research/`，供歷史追溯；不將其授權歸於新的合成 MP3。

## 換書活動單元的新音檔

三篇新增讀本使用相同版本、revision、模型及聲線 SHA-256，沒有更換聲線或使用裝置語音。新音檔的來源、生成與驗證證據另記於 [本次內容驗收](book-swap-verification.md)。前述使用者接受樣本及舊工單結案是既有內容的歷史；不代表本批 39 段已由使用者實聽驗收。

## 詞表音檔

TSL（多益常用字）詞表 1,250 字的英文詞各有一段 MP3（1,250 段，約 13.1 MiB，合計約 31 分鐘），聲線、模型與生成流程同下；檔名用詞條 ID（`ice-cream`、`o-clock`、`ma-am`、`cafe`、`entree`、`resume-cv` 對應 `résumé`，`resume` 是另一個詞），重音字母 `é` 由合成器照原字念（`résumé` 念作 rez-oo-MAY，與 `resume` 不同）。批次紀錄在 [`audio-generation/wordlist-tsl-20261015/`](audio-generation/wordlist-tsl-20261015/)，尚未經使用者實聽驗收。

NGSL-Spoken 詞表共 716 字，英文詞各有一段 MP3（716 段，約 8.3 MiB），聲線、模型與生成流程與場景相同，只念英文詞、不念例句。分兩批生成：2026-10-14 的前 100 字（約 830 KB；排除三個逐字稿標記後遞補三個詞，批次紀錄含 `*-replacements.json`），紀錄在 [`audio-generation/wordlist-ngsl-spoken-20261014/`](audio-generation/wordlist-ngsl-spoken-20261014/)；2026-10-15 的其餘 616 字，紀錄在 [`audio-generation/wordlist-ngsl-spoken-remaining-20261015/`](audio-generation/wordlist-ngsl-spoken-remaining-20261015/)。兩批音檔都尚未經使用者實聽驗收。
