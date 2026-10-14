# 新增生活場景

## 資料與圖片

複製 `content/scenes/cafe-breakfast.json` 成為另一份獨立 JSON，將新圖片放在 `public/images/scenes/`，並為短文、短句及單字準備本地 MP3。完全相同的英文可重用既有音檔。不要在頁面或路由登記場景。檔名排序決定列表順序；以 ID 決定網址。

所有文字欄位皆須有內容。最小欄位：

| 欄位 | 用途 |
| --- | --- |
| `id` | 全站唯一的穩定 ID，僅用小寫英文、數字與單一連字號，例如 `cafe-breakfast` |
| `title`、`titleEn` | 繁體中文與英文場景標題 |
| `category`、`level` | 場景分類與難度描述 |
| `image.src` | 本地 `/images/scenes/` 下的 PNG、JPEG 或 WebP 圖片路徑 |
| `image.alt` | 描述圖中主要活動的替代文字 |
| `image.width`、`image.height` | 圖片實際像素尺寸，用來預留比例 |
| `sentences` | 5–8 個有序句子，各有 `segments` 與繁體中文 `translation` |
| `audio` | 整篇短文的必填音檔資訊 |
| `phrases` | 4–6 個短句，各有 `id`、`english`、`translation`、`audio` |
| `words` | 6–8 個單字，各有 `id`、`english`、`translation`、英文 `example` 與 `audio` |

標題變動時保留 `id`，才能保持原本網址。每個短句 ID 在短句內唯一，每個單字 ID 在單字內唯一；兩種類型可使用相同 ID，引用類型會區分它們。

所有音訊均使用 `content/audio/voice-profile.json` 指定的 Kokoro `af_heart` 固定美式女聲。場景 `audio`、`phrases[].audio` 及 `words[].audio` 均必填，且恰好包含四個欄位：

| 欄位 | 用途 |
| --- | --- |
| `src` | 本地非空 MP3；短文、短句、單字分別位於 `/audio/stories/`、`/audio/phrases/`、`/audio/words/`，不可使用遠端、目錄跳脫或越界 symlink |
| `voiceId` | 必須等於聲線設定的 `id`，三種音檔使用同一聲線 |
| `textSha256` | 對應英文原文的 UTF-8 SHA-256 |
| `sha256` | MP3 檔案本身的 SHA-256 |

單字與短句的雜湊分別對應 `english`；短文的英文由 `src/lib/audio-text.ts` 的 `canonicalStoryText` 產生：每句的 `segments[].text` 原樣串接，句與句之間只加一個空格。`textSha256` 用同檔的 `textSha256` 對這段 UTF-8 文字計算。文字更改後，須重製對應 MP3 並更新兩個雜湊；驗證會核對原文、檔案與聲線 ID，不能只改 JSON 通過。完整同文重用音檔時，保留相同 `src` 與雜湊，不額外加一句或改動來源文字。可解碼與雜湊正確仍不代表發音品質，須實聽。

網站建置只需要已納入 `public/audio/` 的 MP3，不會安裝或執行語音模型。下方是原工作機器的生成命令；`.scratch/` 已排除於 repository，另一台機器不能直接照抄路徑執行。日後要製作新音檔，須先在隔離環境自行取得並核對 `audio-sources.md` 記錄的模型版本及生成依賴，再將實際 Python 與模型路徑傳給工具：

```sh
node scripts/generate-audio.mjs .scratch/illustrated-english/unified-voice/.venv/bin/python .scratch/illustrated-english/unified-voice/model
```

生成工具讀取場景與聲線設定，準備文字、呼叫固定的 Python 合成器，驗證後寫入資產及 JSON。模型版本、來源與授權見 [audio-sources.md](audio-sources.md)。

## 文中標註

一句英文按原文順序拆成片段。保留全部空格、引號與標點，不會自動補上或搜尋替換。片段可以同時指向短句與單字：

```json
{
  "segments": [
    { "text": "She says, “" },
    { "text": "I'd like a ", "phraseIds": ["id-like"] },
    { "text": "coffee", "phraseIds": ["id-like"], "wordIds": ["coffee"] },
    { "text": ".”" }
  ],
  "translation": "她說：「我想要一杯咖啡。」"
}
```

每個引用都須存在於同一場景的對應清單。下方列出的每個學習項目都須至少被文中引用一次；同一用語可以重複出現並標註。引用要指向實際有文字的片段，不能掛在空白上。

## 驗證與建置

```sh
pnpm run validate:content
pnpm run verify
```

錯誤會指出檔案與欄位，例如 `cafe-breakfast.json.sentences[0].translation`，表示第一句缺少翻譯；陣列索引從 0 開始。`unknown word ID` 表示片段引用不存在的單字，`unreferenced phrase` 表示清單短句沒有文中對應，`duplicate scene ID` 表示兩份資料使用相同場景 ID。

通過格式驗證後，仍需人工核對英文自然度、難度、翻譯及圖文一致性。建置會自動發現新增 JSON，產生 `/scenes/<id>/`，並在列表使用相同版型。重新整理網址也應保留該場景。

只有內容及相關圖片/音檔新增屬於這個流程；新的學習活動或資料來源需要另外評估。測試用擴充場景應放在隔離的測試目錄，不能混入正式 `content/scenes/`。

`pnpm run test:extension` 會在暫存專案加入第四個測試場景、圖片及所需音訊欄位，重用相同英文的現有短文、短句與單字音檔，再以正常建置和瀏覽器驗證自動列表入口、獨立網址、重新整理及共用閱讀版型。它保留正式三場景，並核對來源程式、設定、內容、圖片與正式 `dist/` 在測試前後的雜湊一致。
