# 生活協商單元：製作與驗證

日期：2026-10-14。本批是工作分支與草稿 PR 的內容成果，不代表合併、部署、使用者程度提升或真人實聽驗收。

## 範圍與編輯查核

基底為 `89e55edb75cf6657536f3ee2a0d6619e326fe027`。核對當時全部 43 個場景、3 篇新聞／貼文文章與 open PR，新增三個不重複的生活協商情境：

- `returning-faulty-headphones`：釐清故障、詢問選項，區分要求與承諾。
- `rearranging-a-booking`：比較替代時段，保留名額、費用、回覆期限的條件。
- `agreeing-on-a-shared-budget`：表達優先順序、分攤方式與超支同意程序。

每篇 8 句、5 短句、7 單字，附逐句繁體中文、原文精確標註與英文例句。[學習說明](negotiation-study-guide.md) 提供 9 題理解／應用練習及分開的答案解析。角色、機構及規則均為原創虛構；預算金額是美元教學假設，不是臺灣物價或個人財務建議。難度為編輯標籤，沒有宣稱 CEFR 認證。

另一輪 AI 輔助編輯審查核對全部 36 個學習項目的標註文字、翻譯、角色代名詞、條件推論與練習答案，修正了預約期限不保證有名額、預算不保證避免突發開銷等語意。未冒稱人類教師審閱。

## 圖片與音訊

3 張內建 image_gen 原創插畫，各生成一次，1536 × 1024，WebP 保留全圖，檔案約 176–241 KB。逐張檢視全尺寸與 360 × 240 卡片，對照角色、場所與活動。完整提示見 [圖片紀錄](negotiation-image-prompts.md)，雜湊與大小見 `negotiation-image-manifest.json`。

39 段新 MP3（3 全文、15 短句、21 單字），共 180.9 秒。沿用既有 Kokoro 0.9.4、固定 model revision、af_heart 聲線、speed 1、24 kHz、CPU；generator 與 voice profile 不變。所有新音檔通過獨立 FFmpeg 解碼、單聲道、有限且非靜音 PCM、完整原文消耗，以及原文／檔案 SHA-256 核對。原有 516 個 MP3 資產逐檔雜湊不變；這是實體資產數，不等於 README 的引用數。詳見 [重製與驗證](audio-generation/negotiation-20261014/REPRODUCTION.md)。

本批未做真人實聽。成功解碼、非靜音、瀏覽器播放事件、正確雜湊均不能證明所有單字發音、節奏與停頓自然；仍須審閱者實聽，尤其 faulty、receptionist、availability、provided that 與全文數字。

## 工程驗證

本機使用 Node.js 24.19.0、pnpm 12.0.0，frozen-lockfile 安裝通過且 lockfile 不變。Astro check 為 0 errors／warnings／hints，內容驗證涵蓋 46 篇場景與 3 篇文章，內容測試 50／50，正式建置產出 54 頁。完整 verify 與精確 PR head 的 CI 結果見 PR 說明。

雲端另擷取三篇各四種畫面，共 12 張：1280px 亮色、1280px 暗色、390px 及 320px；中文翻譯皆展開。所有畫面無 page error、水平溢出或圖片載入失敗。逐篇檢視窄版段落與桌面閱讀呈現，沒有明顯遮擋、截字或圖文錯配。這是模擬 viewport，不是實體 iPhone 驗收。

瀏覽器使用 Playwright 1.64.0 固定版 Chromium 156.0.8078.4 與 WebKit 27.2。預設下載回傳不完整 ZIP，改由相同版本官方下載位置取得。WebKit 所需 Debian 程式庫核對官方套件索引簽章及 SHA-256，解至隔離目錄；以程序環境載入，未更動系統設定。系統 ldconfig 預檢看不到隔離程式庫，因此在實際瀏覽器已成功啟動及所有 linked libraries 可解析後，僅以程序環境略過該預檢；測試案例及斷言沒有刪減。未修改程式、測試、workflow、聲線設定、既有讀本或圖片音訊。

## 後續

本批停在草稿 PR，供內容與實聽審閱，不設定 auto-merge、不合併、不部署。一般生活中的維修描述、協調共同空間與禮貌拒絕額外任務可作後續候選，實作前須再查重。
