# Favicon、分享與 SEO／AEO

正式網址以 `astro.config.mjs` 的 `site` 為唯一來源，目前為 `https://carlenglish.gravito.dev`。本次於 2026-10-14 從 `ui/level-entry-catalog` worktree 部署至 Cloudflare，版本 `701b6750-4874-47be-9895-340116532e5f`。正式頁面、圖示、分享圖與 crawler 檔案已核對；社群平台快取、搜尋收錄與 Search Console 尚未設定或確認。

## 頁面與搜尋資料

`src/layouts/Layout.astro` 統一輸出標題、description、canonical、robots、Open Graph、X 卡片與 JSON-LD。頁面前置程式從既有場景資料產生對應資訊，讀本摘要包含實際主題、難度與學習項目數量。

| 頁面 | 結構化資料 | 索引行為 |
| --- | --- | --- |
| 首頁 | WebSite、WebPage | 可索引 |
| 有教材的級別 | CollectionPage、ItemList、BreadcrumbList | 可索引 |
| 空級別 | 相同目錄結構，項目數為 0 | noindex, follow |
| 讀本 | WebPage、LearningResource、BreadcrumbList | 可索引 |
| 404 | 不輸出內容結構化資料或 canonical | noindex, follow |

canonical 與 `og:url` 使用沒有搜尋參數或片段的正式頁面網址；`q`／`category` 的閱讀返回功能繼續運作。JSON-LD 由原始內容產生，使用真實難度、短句、插畫與本地朗讀資訊。序列化會跳脫 `<`，避免內容中的 `</script>` 結束 JSON-LD 元素。網站沒有可供聲明的作者、出版日期、評價或 CEFR 對照，因此沒有加入這些欄位。

`src/pages/sitemap.xml.ts` 從實際資料列出首頁、有教材的級別及所有讀本，沒有日期來源時不產生 `lastmod`。空級別新增第一篇教材後，重新建置會自動變成可索引並加入 sitemap。`src/pages/robots.txt.ts` 允許爬取並提供正式 sitemap 網址，讓爬蟲能讀取頁面的 noindex。

AEO 採伺服器輸出的可閱讀圖文、清楚的標題與內部導覽，以及與實際頁面一致的結構化資料。依 [Google 的 AI 搜尋指南](https://developers.google.com/search/docs/appearance/ai-features)，AI 搜尋沿用 SEO 基礎原則，沒有額外的專用結構化資料要求；技術完成不保證搜尋收錄、排名、AI 引用或社群預覽結果。

## 圖示與分享圖片

- `public/favicon.svg`：書本圖示的向量來源，固定森林綠、米白與淺綠色。
- `public/favicon.ico`：16、32、48、96px 的相容圖示。
- `public/favicon-96x96.png`：搜尋與 PNG 圖示來源。
- `public/apple-touch-icon.png`：180×180、實色背景的 iOS 圖示。
- `public/images/social/carlenglish.jpg`：1200×630 品牌分享圖，供首頁、級別與小尺寸插畫的讀本使用。以內建 imagegen 生成，再匯出為 JPEG；原始提示見 [圖片製作紀錄](image-prompts.md#社群品牌分享圖)。
- `/images/social/scenes/<id>.png`：各讀本的 1200×630 分享圖，由靜態端點在建置時產生，實際檔案位於 `dist/images/social/scenes/`。

讀本分享圖保留原始 `public/images/scenes/` 插畫，在建置時旋轉校正並以靠上方的 cover 裁切保留人物頭部。內容來源仍只有原 JSON 與插畫，不必另登記分享圖。JSON 宣告的插畫尺寸不足 1200×630 時，分享中繼資料使用品牌圖，避免放大並錯報尺寸；JSON-LD 仍描述原本可見的插畫。產生的 PNG 格式與尺寸會檢查是否符合該頁的分享中繼資料。

`sharp@0.35.5` 原已存在於 Astro／Wrangler 的傳遞依賴；現在明確列為建置用 devDependency，供 `src/pages/images/social/scenes/[id].png.ts` 使用。這讓 prerender 程式可正常解析圖片處理套件，沒有更換既有套件版本，也不增加讀者端服務。更新 SVG 時需同步重新匯出 ICO、96px PNG 與 180px Apple 圖示；品牌圖保持 1200×630，若路徑或尺寸變動，須同步更新 `src/lib/seo.ts` 與測試。

## 驗證與發布後檢查

`pnpm run verify` 包含 JSON-LD 安全序列化、canonical、索引清單、小插畫回退、正式頁面中繼資料、圖片實際格式／尺寸、無 JavaScript、404 與隔離擴充測試。隔離副本的 42 篇測試教材包含一張實際 320×180 小插畫，確認新增內容仍能取得正確分享與索引資料。

同時開啟其他 worktree 測試時，可用 `CARLENGLISH_TEST_PORT=4393 pnpm run verify` 選擇未使用的埠。預設仍為 4391，測試會啟動及關閉自己的預覽，不重用或停止其他工作目錄的伺服器。

本次部署後已比對 657 個正式頁面／資產的 HTTP 200 與本地建置 SHA-256，包含全部 43 篇讀本、插畫、音檔、分享圖與 crawler 檔案；47 個 sitemap 網址符合實際內容，4 個不存在或私人路徑回傳無 canonical 的 noindex 404。尚未操作社群平台預覽工具或 Search Console；這些平台的快取與收錄結果仍須另外確認。完整發布紀錄見 [實作與驗收](implementation.md#2026-10-14-分級介面與-seo-整合發布)。

## 參考與回復

- [Google favicon 指南](https://developers.google.com/search/docs/appearance/favicon-in-search)
- [Google canonical 指南](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google 結構化資料政策](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Schema.org LearningResource](https://schema.org/LearningResource)
- [Open Graph protocol](https://ogp.me/)
- [Astro 靜態端點](https://docs.astro.build/en/guides/endpoints/)
- [Sharp 圖片裁切](https://sharp.pixelplumbing.com/api-resize/)

回復時一併撤回中繼資料、SEO helper、crawler／分享圖端點、品牌圖示、相關測試與 Sharp 的直接依賴；保留原有 UI、讀本網址、JSON、插畫及音檔。沒有內容資料遷移。
