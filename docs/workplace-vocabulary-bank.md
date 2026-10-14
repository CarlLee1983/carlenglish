# 職場與軟體工程核心單字詞庫 (Workplace & Tech Vocabulary Bank)

本詞庫為 Carl 設計，專為軟體工程、科技團隊敏捷協作與跨國/外商職場溝通打造。難度鎖定 **CEFR B1–B2（中級實用溝通）**，著重「能自然開口、能清楚表達技術意圖、能精準釐清邊界與問題」。

---

## 目錄

1. [軟體工程與架構開發 (Software Engineering & Architecture)](#一軟體工程與架構開發)
2. [敏捷日常與專案協作 (Agile & Team Dynamics)](#二敏捷日常與專案協作)
3. [除錯診斷與線上事故 (Troubleshooting & Incident Response)](#三除錯診斷與線上事故)
4. [跨部門溝通與郵件常用片語 (Professional & Asynchronous Communication)](#四跨部門溝通與郵件常用片語)
5. [實戰句型速查錦囊 (Speaking Templates & Patterns)](#五實戰句型速查錦囊)

---

## 一、軟體工程與架構開發

### 1. refactor /riːˈfæktər/ (v.) 重構
- **語境意義**：在不改變軟體外部行為的前提下，改善內部架構與可讀性。
- **高頻搭配詞 (Collocations)**：
  - *refactor legacy code*（重構既有/老舊代碼）
  - *refactoring effort*（重構工作量）
- **實務例句**：
  > "We should **refactor** this module before adding new features to avoid technical debt."  
  > （我們在新增功能前應該先重構這個模組，以避免累積技術債。）

### 2. regression /rɪˈɡreʃn/ (n.) 回歸缺陷 / 效能倒退
- **語境意義**：代碼修改後，導致原本正常運作的功能壞掉或效能下降。
- **高頻搭配詞**：
  - *introduce a regression*（引入回歸缺陷）
  - *catch regressions in CI*（在持續整合中捕捉回歸問題）
  - *regression test*（回歸測試）
- **實務例句**：
  > "The latest commit accidentally **introduced a regression** in the payment flow."  
  > （最新的提交不小心在付款流程中引發了回歸缺陷。）

### 3. bottleneck /ˈbɑːtlnek/ (n.) 效能瓶頸
- **語境意義**：系統中拖慢整體處理速度的關鍵環節（如資料庫連線、I/O）。
- **高頻搭配詞**：
  - *performance bottleneck*（效能瓶頸）
  - *identify / address a bottleneck*（找出 / 解決瓶頸）
- **實務例句**：
  > "Database queries turned out to be the primary **bottleneck** during peak traffic."  
  > （調查發現資料庫查詢是尖峰流量下的主要效能瓶頸。）

### 4. edge case /edʒ keɪs/ (n.) 邊界情況 / 極端狀況
- **語境意義**：在極少數特殊條件或邊界值下才會觸發的狀況。
- **高頻搭配詞**：
  - *cover all edge cases*（覆蓋所有邊界狀況）
  - *handle edge cases gracefully*（優雅地處理極端情況）
- **實務例句**：
  > "Have we tested the **edge case** where the user disconnects mid-transaction?"  
  > （我們是否有測試使用者在交易進行到一半斷線的邊界狀況？）

### 5. decouple /ˌdiːˈkʌpl/ (v.) 解耦 / 降低耦合度
- **語境意義**：將緊密相依的兩個系統或模組分開，使其能各自獨立演進。
- **高頻搭配詞**：
  - *decouple A from B*（將 A 與 B 解耦）
  - *loosely coupled*（低耦合的）
- **實務例句**：
  > "We need to **decouple** the reporting logic from the core billing service."  
  > （我們需要將報表邏輯從核心計費服務中解耦開來。）

### 6. payload /ˈpeɪloʊd/ (n.) 傳輸酬載 / 資料內容
- **語境意義**：API 請求或回應中實際攜帶的有效資料（不包含 Header）。
- **高頻搭配詞**：
  - *request / response payload*（請求 / 回應資料負載）
  - *payload size*（酬載大小）
- **實務例句**：
  > "Keep the **payload** small to reduce network latency on mobile devices."  
  > （盡量縮小傳輸酬載，以降低行動裝置上的網路延遲。）

### 7. technical debt /ˈteknɪkl det/ (n.) 技術債
- **語境意義**：為求快速交付而採取的暫時性妥協方案，後續需要花成本清償。
- **高頻搭配詞**：
  - *accumulate / pay down technical debt*（累積 / 償還技術債）
- **實務例句**：
  > "Taking this shortcut will save us time now, but it adds to our **technical debt**."  
  > （現在抄捷徑能省時間，但這會增加我們的技術債。）

---

## 二、敏捷日常與專案協作

### 1. blocker /ˈblɑːkər/ (n.) 阻礙 / 卡點
- **語境意義**：阻礙工作繼續進行、需要他人協助解決的障礙。
- **高頻搭配詞**：
  - *hit a blocker*（遇到阻礙）
  - *clear / remove blockers*（排除卡點）
- **實務例句**：
  > "I don't have any major **blockers** today, but I'm waiting on backend credentials."  
  > （我今天沒有重大卡點，但正在等待後端權限金鑰。）

### 2. bandwidth /ˈbændwɪdθ/ (n.) 人力餘裕 / 心力時間
- **語境意義**：（比喻）某人目前能否承接新任務的時間與心力。
- **高頻搭配詞**：
  - *have the bandwidth for...*（有餘裕處理...）
  - *lack of bandwidth*（缺乏心力/時間）
- **實務例句**：
  > "Do you have the **bandwidth** to review my pull request this afternoon?"  
  > （你今天下午有時間幫我看一眼 PR 嗎？）

### 3. trade-off /ˈtreɪd ɔːf/ (n.) 權衡 / 取捨
- **語境意義**：為了獲得某項好處（如速度），必須犧牲另一項特性（如可讀性或記憶體）。
- **高頻搭配詞**：
  - *make a trade-off between A and B*（在 A 與 B 之間做取捨）
  - *a fair trade-off*（合理的權衡）
- **實務例句**：
  > "Using an in-memory cache is fast, but the **trade-off** is higher RAM usage."  
  > （使用記憶體快取速度很快，但權衡代價是較高的 RAM 消耗。）

### 4. backlog /ˈbæk lɔːɡ/ (n.) 待辦清單 / 待處理項目
- **語境意義**：產品或團隊尚未排入當前 Sprint 的待辦需求與改善項目。
- **高頻搭配詞**：
  - *product / sprint backlog*（產品 / 衝刺待辦清單）
  - *groom / refine the backlog*（整理/審視待辦清單）
- **實務例句**：
  > "Let's put this non-urgent refactor into the **backlog** for now."  
  > （我們先把這個非緊急的重構放到待辦清單裡。）

### 5. scope creep /skoʊp kriːp/ (n.) 範疇蔓延 / 需求膨脹
- **語境意義**：在專案進行中，未經評估而持續塞入額外需求，導致時程延誤。
- **高頻搭配詞**：
  - *prevent / avoid scope creep*（防止範疇蔓延）
  - *out of scope*（不在本次範圍內）
- **實務例句**：
  > "Adding dark mode right now would be **scope creep**; let's stick to the MVP."  
  > （現在加上深色模式屬於需求膨脹；我們先專注在 MVP。）

### 6. alignment /əˈlaɪnmənt/ (n.) 共識 / 對齊
- **語境意義**：團隊成員對目標、規格、優先順序達成一致的理解。
- **高頻搭配詞**：
  - *get alignment on...*（就...達成共識）
  - *align with stakeholders*（與利害關係人對齊）
- **實務例句**：
  > "We need to get **alignment** on the database schema before writing migrations."  
  > （在寫資料庫遷移檔之前，我們需要對 schema 達成共識。）

---

## 三、除錯診斷與線上事故

### 1. reproduce /ˌriːprəˈduːs/ (v.) 重現（問題）
- **語境意義**：依照特定步驟再次觸發相同的錯誤。
- **高頻搭配詞**：
  - *steps to reproduce (STR)*（重現步驟）
  - *hard / easy to reproduce*（難以 / 容易重現）
  - *reproduce locally*（在本機重現）
- **實務例句**：
  > "I can't **reproduce** the issue on my machine; could you share the exact payload?"  
  > （我在本機無法重現這個問題；你能提供當下的確切 payload 嗎？）

### 2. root cause /ruːt kɔːz/ (n.) 根本原因
- **語境意義**：導致問題或故障的最核心源頭（而非表面症狀）。
- **高頻搭配詞**：
  - *identify / pinpoint the root cause*（查明根本原因）
  - *root cause analysis (RCA)*（根因分析）
- **實務例句**：
  > "The **root cause** was an unhandled null pointer when the user profile was empty."  
  > （根本原因是當使用者個人資料為空時，未處理 null 指標。）

### 3. workaround /ˈwɜːrkəraʊnd/ (n.) 暫時應急方案 / 融通做法
- **語境意義**：在真正根本修復前，先繞過問題讓系統能暫時繼續運作的方法。
- **高頻搭配詞**：
  - *temporary workaround*（權宜之計）
  - *provide a workaround*（提供應急解法）
- **實務例句**：
  > "Restarting the worker is just a **workaround**; we still need to fix the memory leak."  
  > （重啟 worker 只是權宜之計；我們仍然需要修復記憶體洩漏。）

### 4. mitigate /ˈmɪtɪɡeɪt/ (v.) 減輕 / 降低衝擊
- **語境意義**：降低事故或漏洞所造成的損害與風險。
- **高頻搭配詞**：
  - *mitigate the impact*（減輕衝擊）
  - *mitigation steps*（緩解措施）
- **實務例句**：
  > "We throttled incoming requests to **mitigate** the database load."  
  > （我們限制傳入請求的速率，以減輕資料庫的負擔。）

### 5. intermittent /ˌɪntərˈmɪtənt/ (adj.) 斷斷續續的 / 偶發性的
- **語境意義**：時好時壞、非百分之百發生的非確定性狀況（Flaky）。
- **高頻搭配詞**：
  - *intermittent failure / issue*（偶發性失敗 / 問題）
  - *intermittent network drops*（斷斷續續的網路掉線）
- **實務例句**：
  > "This **intermittent** test failure happens roughly one out of ten runs."  
  > （這個偶發性的測試失敗大約每跑十次會出現一次。）

### 6. hotfix /ˈhɑːtfɪks/ (n./v.) 熱修復 / 緊急線上修復
- **語境意義**：繞過一般常規發布排程，直接部署到生產環境的緊急修復。
- **高頻搭配詞**：
  - *deploy / push a hotfix*（部署緊急修復）
- **實務例句**：
  > "We deployed a **hotfix** to production within thirty minutes of the incident."  
  > （事故發生後 30 分鐘內，我們就將熱修復發布到了生產環境。）

---

## 四、跨部門溝通與郵件常用片語

### 1. loop in (phr v.) 把某人加入討論 / 知會某人
- **實務例句**：
  > "I'm **looping in** David from the DevOps team since this touches CI configurations."  
  > （我把 DevOps 團隊的 David 加進來討論，因為這牽涉到 CI 設定。）

### 2. touch base (phr v.) 簡短對齊 / 交流確認
- **實務例句**：
  > "Let's **touch base** for ten minutes before the sprint review."  
  > （在 Sprint Review 之前，我們花十分鐘快速對一下進度。）

### 3. take it offline (idiom) 會後再私下討論
- **實務例句**：
  > "This is a detailed technical point; let's **take it offline** to keep the meeting on track."  
  > （這是很細節的技術點；為了不耽誤會議時間，我們留到會後私下討論。）

### 4. follow up on... (phr v.) 跟進後續狀況
- **實務例句**：
  > "Just wanted to **follow up on** the pull request I sent yesterday."  
  > （只是想跟進確認一下我昨天發出的 PR 目前進度。）

### 5. heads-up (n.) 事先提醒 / 預先知會
- **實務例句**：
  > "Quick **heads-up**: the staging environment will be down for maintenance at 3 PM."  
  > （簡短提醒：Staging 測試環境今天下午 3 點會停機維護。）

### 6. action item (n.) 待執行事項
- **實務例句**：
  > "Here are the key **action items** from today's retrospective."  
  > （以下是今天 Retrospective 會議產出的核心待辦事項。）

---

## 五、實戰句型速查錦囊

### 1. 晨會三句經典模板 (Daily Standup)
- **昨日完成**：*"Yesterday, I finished the unit tests for the authentication endpoint."*
- **今日聚焦**：*"Today, I'm focusing on integrating the third-party payment gateway."*
- **卡點提問**：*"I'm currently blocked by missing API specifications from the partner team."*

### 2. Code Review 委婉建議 (Constructive Feedback)
- **提議替代方案**：*"Could we consider extracting this logic into a custom hook for better reusability?"*
- **詢問考量**：*"What's the rationale behind using a manual loop here instead of `Array.map`?"*
- **邊界確認**：*"How does this handle the case where the network drops before receiving the response?"*
- **單純讚賞**：*"LGTM (Looks good to me)! Clean implementation and great test coverage."*

### 3. 需求取捨與時間協商 (Pushing Back & Scoping)
- **說明限制**：*"Given our current timeline, implementing real-time sync might jeopardize the release date."*
- **提出折衷**：*"Can we ship polling first for MVP, and tackle WebSockets in the next phase?"*
- **確認優先級**：*"If this new request is urgent, which of the existing tasks should we de-prioritize?"*
