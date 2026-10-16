# 文學軌與經典：2026-10-16 驗收紀錄

網站實作完成於 `feat/classics`，本機工單存放在 `.scratch/classics/`。首批六篇共 29 節，產生 6 個總覽與 29 個節頁。功能完成與學習者讀懂分開記錄；L1 人工試讀延後，沒有實際作答或通過評量的紀錄。

## 首批內容

| 經典 | 級別／版本 | 節數 | 英文字數 | 取用版本 |
| --- | --- | ---: | ---: | --- |
| The Gift of the Magi | L1 教學改寫 | 3 | 663 | [Gutenberg 7256](https://www.gutenberg.org/ebooks/7256) |
| The Gift of the Magi | L3 原文 | 3 | 2,061 | [Gutenberg 2776](https://www.gutenberg.org/ebooks/2776) |
| The Happy Prince | L1 教學改寫 | 5 | 1,137 | [Gutenberg 902](https://www.gutenberg.org/ebooks/902) |
| The Happy Prince | L3 原文 | 4 | 3,471 | [Gutenberg 902](https://www.gutenberg.org/ebooks/902) |
| The Monkey’s Paw | L2 教學改寫 | 6 | 2,441 | [Gutenberg 12122](https://www.gutenberg.org/ebooks/12122) |
| A Scandal in Bohemia | L4 原文 | 8 | 8,521 | [Gutenberg 1661](https://www.gutenberg.org/ebooks/1661) |

字數以空白分詞計算；全部節都在各級別建議範圍內。取用日期為 2026-10-16。三篇原文的段落陣列已與保存的來源抽取結果逐字比對：Magi 44 段、Happy Prince 85 段、Scandal 259 個正文區塊。只移除 Gutenberg 頁首頁尾、HTML 標記並整理排版空白，保留用字、標點、順序、Scandal 原始 I／II／III 標記與信件換行。沒有刪節或加入全文翻譯。

## 實作與驗證邊界

- `content/classics/`、`src/lib/classics.ts` 與 `src/pages/classics/` 提供獨立資料契約及靜態路由；首頁依 L1–L4 分組，同原作版本互連，所有頁面納入 sitemap。
- 共用 `src/lib/sentences.ts` 保持文章既有比對行為，供注釋驗證及字卡例句使用。注釋只標第一次出現，支援重疊詞組的獨立入口與返回連結，正文文字不重複。
- 經典注釋沿用既有字卡與備份流程。相同英文詞與意思合併，保留既有例句、音檔與排程；來源以經典 ID 與節頁 URL 區分。
- `src/lib/classic-resume.ts` 與對應腳本使用獨立的每篇儲存鍵，處理無效資料、讀寫失敗與頁面快取還原；續讀不進字卡備份。作答不保存，沒有完成率。
- 未新增套件、資料庫、帳號、音檔或圖片。內容維護與舊版回復的來源解析相容性見 [經典內容維護](../classics.md)。

## 檢查結果

程式審查基準為 `f18d586...4856d77`，最後測試修正為 `7abc7ce`；正式功能程式在該修正中沒有變動。

| 檢查 | 結果 |
| --- | --- |
| Astro check | 0 errors、0 warnings、0 hints；測試修正後再次通過 |
| 內容驗證／內容測試 | 六篇通過；158 個測試通過 |
| 正式建置 | 93 頁，包含全部 35 個經典頁面 |
| 瀏覽器完整批次 | 1,493 通過、12 略過；5 個新驗收測試因讀取隱藏 `<title>` 的方式錯誤而失敗 |
| 修正後針對性重測 | 改用 `page.title()`；上述 5 個案例於全部瀏覽器設定通過，涵蓋每個經典頁面的 320px、標題、描述、canonical 與 sitemap |
| 擴充測試 | 1 通過，正式專案內容未被測試副本改動 |
| 最終 diff | `git diff --check` 通過 |

沿用未受單行測試修正影響的通過結果，共 1,498 個瀏覽器案例已通過、12 個原有案例略過。完整批次日誌與來源快照保留在本機 `.scratch/classics/`。

## Standards

獨立 reviewer 審查無實質問題。內容類型維持獨立契約與自動發現，句子比對及字卡流程共用，續讀與備份分開；沒有需要修改的基準 code smell。最後單行測試修正的 delta 審查亦通過。

## Spec

獨立 reviewer 審查無實質問題，已追蹤來源資料、加入／移除、逐節來源身分、儲存解析、備份匯出／匯入及複習來源連結。既有字卡內容與排程保留，新增卡使用經典原句。最後單行測試修正的 delta 審查亦通過。

尚待人工的是已延後的 L1 試讀，不宣稱學習者已讀懂。此次只完成本機整合，沒有推送或部署。
