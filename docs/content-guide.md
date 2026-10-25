# 新增生活場景

## 資料與圖片

複製 `content/scenes/cafe-breakfast.json` 成為另一份獨立 JSON，將新圖片放在 `public/images/scenes/`，並為每句正文、短句及單字準備本地 MP3。完全相同的英文可重用既有音檔。不要在頁面或路由登記場景。檔名排序決定列表順序；以 ID 決定網址。

所有文字欄位皆須有內容。最小欄位：

| 欄位 | 用途 |
| --- | --- |
| `id` | 全站唯一的穩定 ID，僅用小寫英文、數字與單一連字號，例如 `cafe-breakfast` |
| `title`、`titleEn` | 繁體中文與英文場景標題 |
| `category`、`level` | 生活主題與難度；`level` 僅接受下方列出的分級標籤 |
| `image.src` | 本地 `/images/scenes/` 下的 PNG、JPEG 或 WebP 圖片路徑 |
| `image.alt` | 描述圖中主要活動的替代文字 |
| `image.width`、`image.height` | 圖片實際像素尺寸，用來預留比例 |
| `sentences` | 5–8 個有序句子，各有 `segments`、繁體中文 `translation` 與逐句 `audio` |
| `phrases` | 4–6 個短句，各有 `id`、`english`、`translation`、`audio` |
| `words` | 6–8 個單字，各有 `id`、`english`、`translation`、英文 `example` 與 `audio` |

分級目錄以 `level` 為唯一來源：`入門`、`初級`、`初級至初中級` 歸入初級；`中級`、`中級至中高級` 歸入中級；`中高級`、`進階`、`高級` 歸入高級。原始標籤仍顯示在讀本中。新同級教材只需加入資料及資產；引入新難度標籤時，須先更新 `src/lib/catalog.ts` 的明確對照與測試，未支援的標籤會讓 `validate:content` 及建置失敗。分類不是年齡或學校年級，主題選項由該級別的 `category` 自動產生。每篇會自動產生摘要、分享資料與索引入口；足夠大的插畫會在建置時產生 1200×630 PNG 分享圖，小插畫使用品牌圖。無需另外建立分享圖清單，詳見 [SEO／AEO 說明](seo.md)。

標題變動時保留 `id`，才能保持原本網址。每個短句 ID 在短句內唯一，每個單字 ID 在單字內唯一；兩種類型可使用相同 ID，引用類型會區分它們。

所有音訊均使用 `content/audio/voice-profile.json` 指定的 Kokoro `af_heart` 固定美式女聲。`sentences[].audio`、`phrases[].audio` 及 `words[].audio` 均必填，且恰好包含四個欄位：

| 欄位 | 用途 |
| --- | --- |
| `src` | 本地非空 MP3；正文句子、短句、單字分別位於 `/audio/sentences/`、`/audio/phrases/`、`/audio/words/`，不可使用遠端、目錄跳脫或越界 symlink |
| `voiceId` | 必須等於聲線設定的 `id`，三種音檔使用同一聲線 |
| `textSha256` | 對應英文原文的 UTF-8 SHA-256 |
| `sha256` | MP3 檔案本身的 SHA-256 |

單字與短句的雜湊分別對應 `english`；正文句子由 `src/lib/audio-text.ts` 的 `canonicalSentenceText` 產生：該句的 `segments[].text` 原樣串接，保留空格與標點。`textSha256` 用同檔的 `textSha256` 對這段 UTF-8 文字計算。文字更改後，須重製對應 MP3 並更新兩個雜湊；驗證會核對原文、檔案與聲線 ID，不能只改 JSON 通過。完整同文重用音檔時，保留相同 `src` 與雜湊，不額外加一句或改動來源文字。可解碼與雜湊正確仍不代表發音品質，須實聽。

網站建置只需要已納入 `public/audio/` 的 MP3，不會安裝或執行語音模型。下方是原工作機器的生成命令；`.scratch/` 已排除於 repository，另一台機器不能直接照抄路徑執行。日後要製作新音檔，須先在隔離環境自行取得並核對 `audio-sources.md` 記錄的模型版本及生成依賴，再將實際 Python 與模型路徑傳給工具：

```sh
node scripts/generate-audio.mjs .scratch/illustrated-english/unified-voice/.venv/bin/python .scratch/illustrated-english/unified-voice/model
```

上述工具生成短句與單字；逐句正文另用：

```sh
node scripts/generate-sentence-audio.mjs .scratch/illustrated-english/unified-voice/.venv/bin/python .scratch/illustrated-english/unified-voice/model
```

可在命令最後附上場景 ID，先生成代表篇；不附則處理全部生活讀本。逐句工具重用同文、同聲線且檔案雜湊正確的既有音檔，驗證整批結果並重新核對目前正文後才寫入資產與 JSON；新內容的中間 WAV 留在 `.scratch/`，輸入與製作記錄寫入 `docs/audio-generation/sentence-reading-20261025/`。兩種朗讀模式共用句子音檔，不再要求另製整篇音檔。句子文字、順序或錄音改變會讓該篇舊接續位置失效。

生成工具讀取場景與聲線設定，準備文字、呼叫固定的 Python 合成器，驗證後寫入資產及 JSON。模型版本、來源與授權見 [audio-sources.md](audio-sources.md)。

## 文章關鍵詞

文章的每個關鍵詞（`glossary`）必須完整落在同一個句子裡：建置時依序把段落與貼文切句，取第一個含有該詞的句子當作加入複習時的字卡例句。詞跨過句號或換行就找不到例句，字卡會沒有例句。關鍵詞比對詞首須是單字邊界、詞尾不限，所以 `eye` 對得上 `eyes`，`art` 對不上 `start`。

## 經典

經典以完整故事分節閱讀，資料獨立放在 `content/classics/`，不使用文章的雙語段落。L1–L2 是教學改寫，L3–L4 是公版原文；來源、注釋、提問、版本互連與續讀的契約見 [經典內容維護](classics.md)。新增合法 JSON 後，首頁、總覽、每節與 sitemap 會自動產生。

## 詞表

詞表是獨立於場景與文章的內容類型（ADR 0001 的做法），資料放在 `content/wordlists/<id>/`，每份一個目錄：`wordlist.json`、授權檔 `LICENSE`（CC BY-SA 4.0 全文）與出處說明 `NOTICE.md`。網站程式碼的授權不受影響。

| 欄位 | 用途 |
| --- | --- |
| `id` | 全站唯一的詞表 ID，小寫英文、數字與連字號 |
| `name`、`description` | 複習頁顯示的名稱與說明 |
| `source` | `name`、`authors`、`url`（HTTPS）與 `adaptation`（本站做了哪些改作）；缺任何一項都會驗證失敗 |
| `license` | `name` 與 `url`（HTTPS） |
| `excluded` | 選填。原詞表收錄、但不是真正常用字而不發出的詞（例如逐字稿標記 `[pause]`），每項有 `rank`、`english`、`reason`；可以先列出還沒收錄的排名，擴充詞表時自動適用 |
| `entries` | 依詞頻排序的詞條，至少一筆 |

每個詞條恰好有 `id`、`rank`、`english`、`meaning`、`example`、`audio`。`id` 同時是音檔檔名，所以必須是小寫連字號 ID；`rank` 是官方詞頻序號（保留原排名），必須從 1 起遞增，只能跳過 `excluded` 列出的排名，其他缺號、重複或亂序都會被擋下；排除清單裡的詞也不可以以別的排名收錄回來；同一份詞表內「英文詞＋中文意思」（比對前正規化大小寫與前後空白）不可重複，同一個英文詞的不同意思可以各有一筆。`audio` 的四個欄位與場景相同，音檔放在 `/audio/wordlists/<詞表 ID>/<詞條 ID>.mp3`，只念 `english`，例句不配音；驗證邏輯與場景共用（`src/lib/audio-validation.ts`）。

中文意思依常用義撰寫，不直譯官方的英文釋義。若同一個詞已經是場景單字或文章關鍵詞，且意思相同，要沿用完全相同的中文字串，字卡才會自然合併成一張。內容須經人工校對才算驗收。

只替還沒有音檔、或英文已改動的詞條合成音檔：

```sh
node scripts/generate-wordlist-audio.mjs <isolated-python> <local-model-directory> <word-list-id>
```

這支工具與場景用的 `generate-audio.mjs` 共用同一個合成器和聲線，但不會動到場景。中間檔（含 `.wav`）留在 `.scratch/wordlist-audio/<詞表 ID>/output/`，只有 MP3 會複製進 `public/audio/wordlists/`。每批的 `inputs.json` 與 `manifest.json` 存在 `docs/audio-generation/`。

建置時每份詞表輸出成 `/wordlists/<id>.json`，複習頁只在學習者訂閱後才載入。詞表目錄必須有非空的 `LICENSE`，否則驗證失敗。另外每一頁都帶一份極小的摘要（每份詞表的最後排名與被排除的排名，不含詞條），導覽列徽章靠它在不載入詞表的情況下，把訂閱今天會補上的新卡算進去。

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
  "translation": "她說：「我想要一杯咖啡。」",
  "audio": {
    "src": "/audio/sentences/cafe-breakfast/3.mp3",
    "voiceId": "kokoro-af-heart-v1",
    "textSha256": "以這句原文計算的 SHA-256，由生成工具填入",
    "sha256": "實際 MP3 的 SHA-256，由生成工具填入"
  }
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

`pnpm run test:extension` 會在暫存專案加入 42 篇測試教材，分布於初、中、高級，重用相同英文的現有圖片、正文句子、短句與單字音檔。正常建置後檢查自動分級入口、搜尋、主題篩選、最多三篇同級推薦、獨立網址、重新整理及共用閱讀版型。正式內容不受影響，來源程式、設定、內容、圖片與正式 `dist/` 在測試前後的雜湊須一致。

## 中級至中高級內容批次

換書活動單元使用相同的短篇資料與媒體契約，不增加句數上限或新互動。三篇依序練習不同意見與理由、查核資訊是否仍適用、有根據且承認限制的提案。閱讀順序與練習放在 [配套學習說明](book-swap-study-guide.md)，不把 JSON 檔名排序當成學習順序。

較進階內容也須保持可理解的具體情境；不能只靠拉長句子或堆疊生字提高難度。新批次沿用既有聲線，但仍須另外實聽與人工驗收，既有內容的驗收結果不自動延伸到新內容。
