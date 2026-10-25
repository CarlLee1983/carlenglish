# 台灣小學生初級單元：音訊製作

日期：2026-10-25。六篇原創場景各有 6 段句子、4 段短句、6 段單字，共 96 段本地 MP3；聲線為 `content/audio/voice-profile.json` 的 Kokoro 0.9.4 / `af_heart`，24 kHz、原始速度 1、CPU。網站初級的 0.8× 是播放設定。

`inputs.json` 保存實際英文與文字 SHA-256；`manifest.json` 另有合成器消耗的 graphemes、phonemes、音檔 SHA-256 與時長。模型與聲線的版本及雜湊在每份紀錄的 profile 中，合成器會先核對 Kokoro 版本、模型、聲線與 config，再合成。只用本機已驗證模型，設定 `HF_HUB_OFFLINE=1 HF_HUB_DISABLE_IMPLICIT_TOKEN=1`。

使用既有 `scripts/synthesize-audio.py` 配合本批獨立輸入製作，不執行會重製全部場景短句／單字的 `generate-audio.mjs`。中間 WAV 與生成環境留在忽略的 `.scratch/elementary-beginners-20261025/`，網站僅取用正式 MP3。

重製時先依 [音源說明](../../audio-sources.md) 在隔離環境準備相同版本的 Python 依賴與模型，將以下兩個佔位路徑換成已核對的本機路徑：

```sh
HF_HUB_OFFLINE=1 HF_HUB_DISABLE_IMPLICIT_TOKEN=1 <isolated-python> scripts/synthesize-audio.py docs/audio-generation/elementary-beginners-20261025/inputs.json <verified-model-directory> .scratch/elementary-beginners-reproduction
```

合成器會核對完整英文消耗與輸入雜湊；整批成功後，才核對目前 JSON 的文字、聲線及生成檔案雜湊，複製本批 MP3 並填入各項目的四欄 audio。最後執行 `pnpm run validate:content` 與 `pnpm run verify`。重製輸出的雜湊以實際產物為準，不假設跨環境位元完全相同。此批未更改既有場景、聲線設定或錄音。

96 段合計 1,463,688 bytes、182.525 秒，均通過文字／檔案雜湊、聲線、完整文字消耗與 FFmpeg 解碼檢查；完整 `pnpm run verify` 通過。統計見 `validation.json` 及 [本批驗證](../../elementary-beginners-verification.md)。技術檢查不能代替使用者對新內容的實聽驗收。
