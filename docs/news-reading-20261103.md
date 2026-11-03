# 2026-11-03 新聞閱讀教材查核

## 範圍與閱讀順序

本批僅新增兩篇 N2 原創教學簡化版及本紀錄，不含圖片、音檔、場景教材、schema 或 UI 變更。保留既有翻譯與參考答案收合呈現。N2 是教材設計級別，不是讀者程度認證，也不假定已讀完其他批次。

1. `zoo-checkup-practice-2026`：動物健檢前，為什麼先用假機器練習？三段、161 英文字、五個關鍵詞、四題。目標是辨識問題、方法、限制，以及用對比句猜詞。
2. `museum-frog-mystery-2026`：舊青蛙標本能解開什麼謎團？三段、約 160 英文字、五個關鍵詞、四題。目標是比較不同年代的證據，區分未發現與已證明不存在。

可獨立閱讀；此順序只是本批建議。先讀英文判斷主旨，再按需展開翻譯；作答後才展開答案。沒有逐字翻譯新聞全文或虛構試讀結果。

## 去重與基準

以 2026-11-03 Asia/Taipei 核對 main `93450508ee21412cc57ce5733fa26d7d56498623`、14 篇現有文章、docs 來源紀錄、遠端分支及 open PR。前一批新聞 PR #21 已合併，open PR 查詢為空；未發現同日稿件或本批主題、來源 URL、DOI 重複。使用獨立分支 `content/news-reading-20261103`，只建立 draft PR，不合併、不部署。

已讀 README、CONTEXT、docs/content-guide.md、docs/news-social-reading-plan.md、src/lib/articles.ts、docs/ci.md、CI 與 verification workflow。此 main 無 AGENTS.md 或 .agents 目錄。遵守現有 Article schema；eventDate 必填 YYYY-MM-DD，不能自行設 null 或新增日期類型。

## 來源與段落對應

存取與改寫日期皆為 2026-11-03。以下公開原文經全文頁面開啟，未用搜尋摘要替代原文。

### 動物健檢訓練

- 主來源：[Smithsonian，2026-10-23](https://nationalzoo.si.edu/news/news/heres-how-veterinary-technicians-help-care-more-1700-animals-smithsonian)
- 補充核對：[Smithsonian，2026-06-18](https://nationalzoo.si.edu/animals/news/can-you-spot-fakes-these-handmade-vet-tools-help-animals-take-part-their-own-care)
- 第一段：主來源開頭說明保育員與獸醫技術人員合作，透過自願配合的訓練減少健檢壓力。
- 第二段：主來源 Jo Fujito 段落及六月原文 DIY 小節，支持仿製器材重外觀、不執行醫療功能，避免昂貴設備受損。
- 第三段：主來源指出訓練需數週到數月，保育員建立信任；未承諾所有動物、所有處置皆免麻醉。教材未搬用原文個別醫療參數，不提供操作指示。
- 日期限制：10 月 23 日是工作介紹發布日，並非訓練起始日。schema eventDate 以這次介紹公開日記錄，background 明確解釋，不捏造精確醫療事件日期；六月案例不冒充十月新事件。

### 青蛙標本

- 主來源：[Smithsonian，2026-10-14](https://nationalzoo.si.edu/news/museum-specimens-reveal-pathogen-behind-decades-old-mystery-disappearing-frogs)
- 交叉核對：[Boyette 等人，Molecular Ecology，2026-10-14](https://onlinelibrary.wiley.com/doi/full/10.1111/mec.70573)，穩定識別 DOI `10.1111/mec.70573`。DOI 轉址首次開啟回工具內部錯誤，直接開啟期刊公開全文成功；未繞過登入或付費牆。
- 第一段：新聞及論文 Introduction 支持 Boracéia 於 1979–1982 年的大幅減少，以及用歷史標本研究。保留站點範圍，不泛指全巴西。
- 第二段：論文 Methods 2.1、Results 3.1 與 Discussion 4.1 核對物種數、前後感染檢出與其他環境因素仍可能參與。新聞稱超過 370 件，論文 Methods 2.1 記錄 327 件蛙標本，兩者數字不一致且未找到解釋；教材因此只採雙方都支持的「數百件」，不猜測原因。論文結果為 1979 年前 230 件未檢出，1980 年代 97 件中 57 件檢出，故正文「超過一半」有直接支持。
- 第三段：論文 Methods 2.5 支持 2022–2024 年調查、17 種中找到 12 種，五種可能局部消失或數量低到未能檢出。因此沒有寫成五種已滅絕。
- 日期限制：eventDate 是研究公開發表的 2026-10-14；歷史減少與現地調查時間另在正文和背景說明。沒有把當代調查寫成 2026 年發生。
- 不確定性：感染未檢出不等於證明不存在；研究支持真菌的角色，不證明唯一原因。未將一處研究站結果外推整片大西洋森林，未聲稱重跑研究或親赴調查。

## 教學與來源審閱

另一次讀稿已核對英中對應、四題與答案可由本文支持，以及 N2 篇幅。依論文核對後將精確標本數改為數百件，保留來源差異紀錄。關鍵詞均出現在正文完整句子中。兩篇皆為重新組織的短篇教學文字，沒有使用新聞圖片、直接引言或全文譯本。

## 驗收

驗收結果隨本批實際執行更新；精確 PR head CI 狀態以 PR checks 為準，不能將 CI 稱為人工實頁目視。

- Node 24.22.1、pnpm 12.0.0；`pnpm install --frozen-lockfile` 成功，未更動 lockfile。工具快取改放可寫暫存目錄，沒有修改站台設定。
- 最終文章已通過 `pnpm run verify:static`：Astro check、202 個內容/單元測試、內容驗證及 214 頁建置。兩篇 stageWarnings 皆空；字數分別 161、158。無 format script，JSON 依現有雙空白縮排，`git diff --check` 通過。
- 已嘗試官方 Playwright Chromium/WebKit 安裝，下載的 Chromium ZIP 損毀，未取得可執行瀏覽器。`test:browser` 實際啟動後因缺 chromium_headless_shell-1248 而失敗；沒有削弱測試或替換測試瀏覽器。完整 Chromium/WebKit 與 extension 驗證交由精確 PR head 的既有 CI。
- 本機桌機/手機實頁人工目視未完成；靜態 HTML 或 CI 都不作為人工目視的替代聲稱。
