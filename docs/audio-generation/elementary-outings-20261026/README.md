# 生活小任務：音訊製作

日期：2026-10-26。三篇入門場景各有 6 段句子、4 段語塊、6 段單字，共 48 段新 MP3。沿用 `content/audio/voice-profile.json` 的 Kokoro 0.9.4、`af_heart`、24 kHz、原始速度 1、CPU；頁面 0.8× 是播放設定。

`inputs.json` 保存實際英文及 UTF-8 SHA-256；`manifest.json` 保存合成器完整消耗的 graphemes、phonemes、文字與 MP3 雜湊及時長。合成器先核對套件版本、模型、config 和聲線檔案雜湊，再處理輸入。只使用已驗證的隔離環境及本機模型，設定 `HF_HUB_OFFLINE=1 HF_HUB_DISABLE_IMPLICIT_TOKEN=1`。

本批以獨立輸入呼叫既有 `scripts/synthesize-audio.py`，沒有執行會重製全部場景短句／單字的 `generate-audio.mjs`。只將三個新 ID 的 MP3 複製到 `public/audio/`，填入 JSON 的四欄 audio；未修改既有聲線、場景或錄音。中間 WAV、生成環境與整合助手保留於忽略的 `.scratch/elementary-outings-20261026/`。

重製時先依[音源說明](../../audio-sources.md)準備相同版本與雜湊的模型／隔離依賴，將下列佔位路徑替換為實際已核對路徑：

```sh
HF_HUB_OFFLINE=1 HF_HUB_DISABLE_IMPLICIT_TOKEN=1 <isolated-python> scripts/synthesize-audio.py docs/audio-generation/elementary-outings-20261026/inputs.json <verified-model-directory> .scratch/elementary-outings-reproduction
```

整批成功後，核對目前 JSON 的英文、文字 SHA-256、聲線 ID、完整文字消耗及實際 MP3 雜湊，通過 FFmpeg 解碼才複製正式資產並填入 audio。重製雜湊依實際輸出，不假設跨環境位元完全相同。之後執行 `pnpm run verify`。

技術檢查結果及總量見 `validation.json`；專案驗證見[本批驗證](../../elementary-outings-verification.md)。文字對應、解碼及瀏覽器播放不能代替使用者對發音、0.8× 節奏與難度的實聽驗收。
