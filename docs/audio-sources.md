# 統一聲線與音檔來源

網站使用 42 段本地 AI 合成 MP3：24 個單字、15 個短句及 3 篇完整短文。全部由 [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) 的 `af_heart` 聲線產生，設定以 `content/audio/voice-profile.json` 為準：Kokoro 0.9.4、模型 revision `f3ff3571791e39611d31c381e3a41a3af07b4987`、速度 1、24 kHz、CPU。這是固定的美式女聲合成音訊，不是真人錄音。

模型來源標示 [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)；這是模型授權資訊，不表示生成 MP3 自動適用同一授權。模型檔與聲線檔的雜湊記於 profile。生成用的 Python 環境、模型、安裝鎖定與來源紀錄放在 `.scratch/illustrated-english/unified-voice/`，不進網站資產。離線生成時使用 `HF_HUB_OFFLINE=1 HF_HUB_DISABLE_IMPLICIT_TOKEN=1`，不讀取隱含 Hugging Face token；瀏覽網站播放時不需要 Python 或遠端語音服務。

使用者先試聽 coffee、aisle、短句及 22.1 秒咖啡店全文樣本，接受「自然且一致，可以用這個聲音」，之後於完整內容及手機操作驗收項目列明後確認「驗收完成」。工單 04 已結案；此結果依使用者確認，不由來源評級、雜湊或媒體 metadata 推論。音檔的文字、聲線與 SHA-256 契約及重製方式見 [內容維護說明](content-guide.md)。

## 已取代的 Commons 錄音

先前 24 個單字使用 Wikimedia Commons 真人錄音，來源有多位錄音者及不同口音。它們已由統一聲線音檔取代，不再作為網站正式音源，也不在介面提供逐檔錄音者署名。原始來源頁、授權、原音檔、SHA-256 與 FFmpeg 轉檔紀錄保留在 `.scratch/illustrated-english/audio-research/`，供歷史追溯；不將其授權歸於新的合成 MP3。
