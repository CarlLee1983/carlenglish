# 幫忙、試一試、看影子：音訊製作

日期：2026-10-26。三篇入門場景各有 6 段句子、4 段語塊、6 段單字，共 48 段新 MP3，693,792 bytes、87.4 秒。沿用 `content/audio/voice-profile.json` 的 Kokoro 0.9.4、`af_heart`、24 kHz、原始速度 1、CPU；頁面 0.8× 是播放設定。

`inputs.json` 保存實際英文及 UTF-8 SHA-256；`manifest.json` 保存聲線、合成器完整消耗的 graphemes、phonemes、文字與 MP3 雜湊及時長。既有合成器會先核對套件版本、模型、config 和聲線檔案雜湊，再處理輸入。本批使用已驗證的隔離 Python 與本機模型，設定 `HF_HUB_OFFLINE=1 HF_HUB_DISABLE_IMPLICIT_TOKEN=1`，沒有讀取隱含 Hugging Face token。

本批以獨立輸入呼叫 `scripts/synthesize-audio.py`，只將三個新 ID 的 MP3 複製到 `public/audio/` 並填入四欄 audio；沒有執行重製全部場景的工具，沒有修改既有聲線或錄音。中間 WAV 與整合助手留在忽略的 `.scratch/elementary-help-observe-20261026/`。

重製時依[音源說明](../../audio-sources.md)準備相同版本與雜湊的隔離依賴、模型，將下列佔位路徑替換為實際已核對路徑：

```sh
HF_HUB_OFFLINE=1 HF_HUB_DISABLE_IMPLICIT_TOKEN=1 <isolated-python> scripts/synthesize-audio.py docs/audio-generation/elementary-help-observe-20261026/inputs.json <verified-model-directory> .scratch/elementary-help-observe-reproduction
```

整批成功後，核對目前 JSON 英文、文字 SHA-256、聲線 ID、完整 graphemes 與 MP3 SHA-256，通過 FFmpeg 解碼才複製正式資產並填入 audio。雜湊依實際輸出，不假設跨環境位元完全相同。然後執行 `pnpm run verify`。

技術結果見 `validation.json`；工程及瀏覽器檢查見[本批驗證](../../elementary-help-observe-verification.md)。文字、解碼與播放事件檢查不代替本批發音、0.8× 節奏及難度的實聽、試讀驗收。
