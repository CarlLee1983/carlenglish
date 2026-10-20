# 從秋色的原因讀到模擬研究的限制

改寫與查核日期：2026-10-20。兩篇 N2 是原創教學改寫，中文對應本站英文，沒有轉載新聞全文、照片或音訊。級別描述材料設計，不是閱讀能力認證；沒有以日期或已發布篇數推定讀者進階。

## 建議閱讀順序與目標

1. [山坡變色了，原因是什麼？](/articles/poland-autumn-colors-2026/)：先說出主旨，再辨認「景象→原因→高處地景」的段落關係，利用 open areas、grasses、small bushes 猜 meadows。
2. [在地球練習火星生活](/articles/mars-practice-life-2026/)：辨認地球模擬與火星實際生活的差別，留意 could 與 ongoing research 的語氣，避免把研究目的當成已證實的成效。

兩篇各三段、五個關鍵詞、四題。先收起翻譯與答案，讀完用一句中文概括主旨；第二次閱讀再找支持答案的英文。只查影響理解的詞，不必先背完。若負荷偏高，可先讀秋色篇前兩段，只做第一題。翻譯與參考答案使用現有收合介面，不新增測驗、評分或學習紀錄功能。

## 來源、日期與查核

### 波蘭秋色

- 原始來源：NASA Earth Observatory，Lindsey Doermann，〈Autumn Paints Poland’s Bieszczady Mountains〉。
- 原文：https://science.nasa.gov/earth/earth-observatory/autumn-paints-polands-bieszczady-mountains/
- 已讀公開正文、影像拍攝日及 References & Resources。文章標頭發布日是 2026-10-19；頁尾另列 Last Updated 2026-10-16，不能用頁尾日期取代發布日。影像日期為 2026-10-08，eventDate 採此日，不是樹葉開始變色日。
- 第一段依正文開頭與拍攝資訊：波蘭東南部、國家公園、山坡森林、Landsat 9 與秋色。省略地名長詞、動物與歷史細節，讓讀者專注閱讀關係。
- 第二段依正文的葉綠素說明。另讀 National Park Service，〈Why Do Leaves Change Colors in the Fall〉（頁尾更新 2021-04-22）：https://www.nps.gov/articles/why-do-leaves-change-in-the-fall.htm ，交叉確認葉綠素與綠色、季節條件及色彩顯現的基本關係。此文是植物機制背景，不是另一份波蘭現場觀測。
- 不將所有紅色都說成原有色素顯現；本文只寫 some other colors，未宣稱各種色素形成機制相同。
- 第三段依正文 polonina 的 open grasslands、shrubby thickets 與 tan 色描述；meadows 在句內有解釋，無須圖片即可作答。
- 「一個時刻」與不能推知所有樹木起始變色日，是根據單次拍攝資訊設計的閱讀推論，不是額外的現場觀測。

### 地球上的火星生活模擬

- 原始來源：NASA，HRP Communications Team，〈NASA’s Simulated Mars Crew Marks One Year Inside Habitat〉，發布 2026-10-19。
- 原文：https://www.nasa.gov/humans-in-space/nasas-simulated-mars-crew-marks-one-year-inside-habitat/
- 已讀公開正文至 Human Research Program 說明。第一段依參與人數、休士頓地點與 2025-10-19 入艙資訊。eventDate 採滿一年 2026-10-19，未冒充研究開始日。
- 第二段依作物、有限資源、通訊延遲及與家人透過電子郵件往來的說明。未寫成身在火星或與家人完全斷聯。
- 第三段依預定 2026-10-31 出艙、後續評估與 NASA 認為資料可能協助未來任務的說明；保留 due to、could、ongoing。地球模擬不等於火星實測，不能從本報導推論所有難題已解決。
- 另核對 NASA 的任務介紹 https://www.nasa.gov/humans-in-space/chapea/chapea-mission-2/ 與計畫背景 https://www.nasa.gov/humans-in-space/chapea/about-chapea/ ，支持地面模擬、四人及有限資源等條件。它們同屬 NASA，並非獨立第三方驗證研究成果。
- 任務頁與新報導列出的延遲分鐘數不同；本篇不採用任何精確分鐘數，也不把它們強行合併。未採用人員個別健康資訊、成效量化或未獨立驗證的推廣性結論。

### 未採用來源與版權界線

原擬 Smithsonian 文化公告 https://www.si.edu/newsdesk/events/stories-field-exhibition-reception-and-viewing ，一般網頁開啟回報 404，雲端 HTTP 讀取回報 403。到此停止，未以搜尋摘要代替正文、未繞過拒絕，亦未收錄該題。兩篇選定來源均可直接讀取，不需登入或付費；不搬用原圖，不以替代存取方式繞過任何限制。

## 文字與技術驗收

- 基底 main：af0d2129672cbfe97a82c93f9bb9890d61aa2375。檢查全部八篇既有文章、遠端分支與 open PR，沒有 10/20 同批教材或重複來源；10/16 批次已合併，不重做。
- 最新 checkout 沒有 AGENTS.md 或 .agents/skills；已讀 README、CONTEXT、內容維護、新聞企劃、articles schema 與 CI workflow。
- 全文經第二位編輯審核；英文標題明示 on Earth，刪除無教學價值的填充句，調整部分色彩表述與猜字答案的位置指引。
- 只新增兩份文章 JSON 與本教學／查核紀錄。不改 schema、UI、依賴、測試或部署設定；沒有音訊與圖片新增，也沒有更新任何個人閱讀證據。
- 依賴使用 Node 24.19.0 與 pnpm 12.0.0、frozen lockfile 安裝。初次 npm 預設快取路徑無法建立，改用本次雲端工作區既有快取／暫存路徑後成功，未更動系統設定。
- 最終檔案的完整檢查結果與實頁目視限制將於驗證後記錄於下方；PR 精確 head 的 CI 結果以 PR 檢查為準。

### 本次雲端驗證結果

- 最終正文：秋色篇 138 字、平均句長 10.6；火星模擬篇 154 字、平均句長 11.8。兩篇皆無級別警告；JSON 格式、跨類型 ID、關鍵詞例句及來源欄位驗證通過。
- `check`：80 檔，0 errors、0 warnings、0 hints；`validate:content` 通過；`test:content`：158/158；`build`：97 頁，含兩篇新文章。
- 已啟動完整 `verify`，到瀏覽器階段時所有啟動均立即失敗，停止無效重複。正式要求的 Playwright Chromium 下載回傳不完整 ZIP（central directory signature not found）；下載器內建重試後仍失敗，指定 Chromium headless shell 不存在。診斷重跑確認同一問題，不能宣稱 E2E 通過；未修改測試、改用其他執行檔或降低既有驗收。
- `test:extension` 已另外執行，在 Chromium 啟動階段因同一缺檔失敗，不能宣稱擴充驗證完成。
- 雲端預覽伺服器回報 ready，但自有雲端瀏覽器實際開啟兩次均為 `ERR_CONNECTION_REFUSED`。尚未完成桌機／手機實頁目視，不能用 HTML、build 或 CI 取代目視聲明。
- `git diff --check` 通過。Repository 未設獨立 formatter／lint 指令，本批沿用既有格式與完整驗證契約。
- 以上未完成項目會在 draft PR 明列；自動測試交由該 PR 精確 head 的既有 CI 完整 `verify` 執行。CI 成功也不等於已完成人工實頁目視。不合併、不啟用 auto-merge、不部署。
