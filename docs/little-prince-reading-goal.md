# 第一個閱讀目標：讀懂《小王子》英文譯本

製作日期：2026-10-28（Asia/Taipei）。本批是使用者指定的第一個閱讀目標，不計入每日新聞教材；不宣稱讀者已通過任何能力測驗。

## 範圍與內容決策

首頁提供 `/goals/little-prince/` 入口。依使用者 2026-10-28 修正，主線是完整英文譯本第 1–27 章逐章閱讀，四篇原創短文只是按需補強，不必先讀完、通關或改讀另一部作品。進程表與通用記錄格式不是已完成的逐章精讀；譯本尚待使用者確認，章節專屬詞句、問題與答案仍需依合法可讀資料查核，不預填未知內容。沒有依日期自動升級或假設閱讀進度。

PR24 已於 2026-10-28 01:49:09Z 由外部合併（merge `c5014d2d910e7c7bbc2575fe3136a1841ffb2012`），本次因此從最新 main 開獨立後續分支／draft PR，不聲稱由本工作合併或部署。只調整既有目標頁、短文返回主線與已批准首頁入口的文案，不擴張其他 UI。

首批都是本站原創生活故事，使用獨立人物與情節，不是《小王子》的節選、翻譯或情節改寫，也沒有取用原作插畫或生成模仿插畫。未新增音訊或重製既有素材。給成人初學者短篇、單一策略、每篇三個提示詞；故事長度不是 CEFR 認證或測驗分數。

1. A Seat by the Window：人物、動作與位置；用一句中文說主旨，不能由下雨推斷走了很遠。
2. The Returned Notebook：兩個 she 分別指不同人物，it 指筆記本；分開觀察與情緒推論。
3. A Change of Plan：because 的理由、but 的限制、so 的結果；未完成上漆不等於什麼都沒做。
4. The Extra Cup：由兩項線索支持推論；沒有說缺席原因，不能斷言友誼結束。

中譯、詞彙與參考思路分開原生 details，預設收合，不保存成績。不強迫查字，也不把會翻譯等同理解。建議關掉解析後再回答，找出支持理解的英文字句；仍依賴中譯時可縮短範圍重讀。練習後回到正在閱讀的原書段落，以人物／事件／疑問／證據記錄閱讀，而非本站重製書中全文。

## 為什麼不使用現有內容 schema

`CONTEXT.md` 和 `docs/classics.md` 將 Classic 定義為公版文學完整故事；schema 要求真實 Gutenberg 電子書編號，L1/L2 強制 rewrite。原創銜接短文不能填入假原作或假編號。Scene 強制圖音資產，Article 具有新聞／貼文語意；本批不冒裝成既有類型，也不放寬其 schema。

最小新增 `src/data/little-prince-path.ts` 型別化內容、目標頁與靜態讀本頁，首頁一個入口，sitemap 五個新網址。使用既有 Layout、主題色與原生收合元素，不新增後端、依賴、帳號、學習成績儲存或自動評分。未修改 review、財務教材、timeout 或其他既有內容。新增 unit 與五種瀏覽器版型案例，接入既有測試清單。

## 來源核對與權利界線

2026-10-28 讀取下列公開全文／書目，不以搜尋摘要冒充全文。它們支持版本辨識與教學參考，不構成全文重製授權。

- PRH，The Little Prince，ISBN 9781101908280：明列 Antoine de Saint-Exupéry 與譯者 Richard Howard。本站稱「英文譯本」，不稱作者英文原作；沒有假定讀者已持有此版。
  https://www.penguinrandomhouse.com/books/639583/the-little-prince-by-antoine-de-saint-exupery-translated-by-richard-howard/
- Penguin，Penguin Readers Level 2: The Little Prince，ISBN 9780241463277：官方明標 Abridged Edition 與 A1+。只在可展開的版本說明中提供選項，不將此分級套到完整譯本、不要求購買。
  https://www.penguin.co.uk/books/319185/penguin-readers-level-2-the-little-prince-elt-graded-reader/9780241463277
- 作品官方站，The Little Prince turns 80：確認 1943 年紐約英法版本出版；本頁不增加與教學無關的細節或爭議。
  https://www.lepetitprince.com/en/events/the-little-prince-turns-80/
- British Council，A1 reading：參考熟悉題材與準備／閱讀／理解任務的低門檻結構，不複製教材或把自製內容標成官方 A1 認證。
  https://learnenglish.britishcouncil.org/free-resources/reading/a1

獨立來源審核的 Morgan Library 頁面回403，未換路重試；British Council A2 頁 timeout。內容不依賴兩頁或其搜尋摘要。未作司法管轄區的公版判斷；採不重製原著文字的方案。

## 驗收

- 來源／教學獨立審核修正 Notebook 中譯「找袋子」為「在袋子裡找筆記本」，並在英文明寫 older sister 以支持「姊姊」。
- frozen install：Node24.22.1、pnpm12.0.0；只將工具暫存位置設於可寫 `/tmp`，不更改依賴鎖或系統設定。
- 最後精確 PR head 的 check、內容、unit、build、全瀏覽器與 extension 結果見 PR。CI 不是人工目視，也不代表使用者已讀懂。
- 本機瀏覽器及桌機／手機人工目視結果將於交付補充；不沿用別批教材的驗收。

本機最後內容版本驗收：Astro check 103 檔 0 errors／0 warnings，197 項單元全通過，內容驗證與 production build 203 頁通過，含五個新網址。`git diff --check` 通過；repo 未設定獨立格式命令，未為格式化新增工具或重排無關檔案。

本機 Playwright 官方安裝程式的 Chromium 下載回傳損壞 ZIP，內建嘗試耗盡後停止。新入口的 focused browser test 因缺 Chromium executable 無法執行，非頁面斷言結果；完整瀏覽器與 extension 由精確 PR head CI 補驗。雲端預覽第一次連線時 server 尚未 ready；ready 後同一 tab 的觀測遭 browser URL policy 拒絕，停止未改途徑，桌機／手機人工目視未完成。沒有提升 timeout、跳過既有測試或把未驗項稱通過。

首次 PR CI `40611712291` 找出新增目標卡片擠壓首頁首屏的回歸（`browser.spec.ts:125`：mobile/narrow 的初級入口落在視窗下方）。修正為將目標卡片放在既有程度選單之後、新聞之前；保留原首頁首屏測試、viewport 與所有斷言，沒有放寬門檻。新 head 重新執行完整 CI。擴充驗證亦保持精確 sitemap 集合比對，只加入本批五條合法路由。


## 全書主線修正的來源與待辦

- 作品官方授權網站，2023-03-06，〈The Little Prince: Polyglot Edition, 27 Chapters, 27 Languages〉：兩位獨立研究者讀取原頁，明確支持全書 27 章。只用於進程表章數，不用於推定各章細節或某英譯本字句。
  https://www.lepetitprince.com/en/new-products-from-our-licensees/the-little-prince-polyglot-edition-27-chapters-27-languages/
- 仍待版本：完整英文譯本的譯者／ISBN 或書目連結，才能做對應的逐章精讀。可先使用通用方法從第一章開始；不要求上傳整章／全書。
- 分級刪節版只能作可選補強，不當作完成完整英文譯本的終點。公開書目／試讀不代表可轉載整本；未因法文公版狀態推定英譯可重製。
- 此次未新增原著全文、插畫、音檔、章節專屬問答或持久化進度；27 個章號明示專屬伴讀待製作，不製造空教材連結。
- 以下後續 PR 的驗收另行記錄；上文 197 項單元／203 頁與 PR24 CI 是上一版歷史，不冒稱是本次最後檔案結果。
