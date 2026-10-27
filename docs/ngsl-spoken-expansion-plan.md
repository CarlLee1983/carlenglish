# CarlEnglish 初級生活自理擴充企劃：NGSL-Spoken 716 口語核心覆蓋

日期：2026-10-26。狀態：已定案架構企劃，供後續分批實作。

## 一、 企劃背景與目標

CarlEnglish 目前的生活讀本中，初級目錄（`beginner`）涵蓋了 63 篇場景（入門 52 篇、初級 10 篇、初級至初中級 1 篇）。
經語料庫分析，現有初級教材偏重「小學生具象名詞認讀」（名詞豐富），但在真實生活自理情境中不可或缺的「情態動詞、思考意見、原因邏輯、請求與協商語塊」出現率極低。

### 核心指標與完備標準
- **目標受眾**：貫通小學生高年級、國中生至零基礎成人之「日常獨立生活自理」。
- **完備基準**：以 **NGSL-Spoken（New General Service List - Spoken 1.2）716 個口語核心詞表** 為檢驗基準。
- **現況覆蓋**：目前初級教材內文覆蓋 **274 字（38.3%）**，重點單字覆蓋 **79 字（27.1%）**。
- **擴充目標**：系統性補齊剩餘 **442 個口語核心字**，達成初級內文對 NGSL-Spoken 的 **100% 完全覆蓋**。

---

## 二、 總體架構與規格

1. **規模規劃**：新增 **40 篇** 生活自理場景。
   - 每篇引導約 **10～12 個** 尚未覆蓋的 NGSL 核心字（其中 6–8 個設為重點單字 Key Words，其餘自然融入對話與短句）。
   - 擴充完成後，初級目錄將由現有 63 篇擴大至 **103 篇**。
2. **難度分級**：
   - **入門（52 篇）**：維持現況，保留國小低年級具象看圖認讀優勢。
   - **初級（擴充 32 篇，合計 42 篇）**：以第一人稱、雙向生活自理任務對話為主。
   - **初級至初中級（擴充 8 篇，合計 9 篇）**：加入簡單理由說明、多步驟溝通與協商。
3. **單篇標準規格**（嚴格遵從 [內容維護規範](content-guide.md)）：
   - 1 張 16:9 插圖（`public/images/scenes/`）
   - 5–8 句有序雙語正文（具 `segments` 與繁體中文翻譯）
   - 4–6 個實用短句或語塊（`phrases`）
   - 6–8 個重點單字（`words`，含英文例句與中文翻譯）
   - Kokoro `af_heart` 美式女聲本地 MP3（正文、短句、單字共約 16–22 段音檔）

---

## 三、 八大生活自理主題與 40 篇候選場景清單

### 單元一：飲食與餐飲自理（6 篇）
聚焦外食點餐、客製化需求、過敏詢問與結帳，擺脫單純物品辨識。

| 場景標題 | 候選 ID | 生活自理任務 | 難度 | 核心融入之 NGSL-Spoken 詞彙 |
| :--- | :--- | :--- | :---: | :--- |
| 1. 客製化飲料甜度冰塊 | `ordering-custom-drink` | 說明甜度、冰塊與加料要求 | 初級 | `not`, `less`, `more`, `ice`, `sweet`, `type`, `actually`, `instead` |
| 2. 確認餐點成分與過敏 | `checking-food-allergens` | 詢問是否含花生/乳製品 | 初級 | `contain`, `sure`, `if`, `because`, `bad`, `mean`, `kind`, `safe` |
| 3. 外帶打包與分開結帳 | `split-bill-takeout` | 要求各自結帳並打包剩菜 | 初級 | `split`, `bill`, `separate`, `box`, `pay`, `together`, `each`, `card` |
| 4. 送錯餐點時的反應 | `wrong-order-at-restaurant` | 禮貌向店員反映餐點錯誤 | 初級至初中級 | `think`, `sorry`, `mistake`, `ordered`, `wrong`, `bring`, `check`, `minute` |
| 5. 點速食套餐選配餐 | `fast-food-combo` | 選擇主餐、配餐與升級 | 初級 | `combo`, `side`, `change`, `fries`, `drink`, `size`, `large`, `cost` |
| 6. 麵包店詢問出爐時間 | `bakery-fresh-batch` | 詢問剛出爐的麵包種類 | 初級 | `fresh`, `hot`, `ready`, `bake`, `smell`, `wait`, `another`, `minute` |

### 單元二：交通與外出移動（5 篇）
聚焦大眾運輸轉乘、購票、延誤與求助。

| 場景標題 | 候選 ID | 生活自理任務 | 難度 | 核心融入之 NGSL-Spoken 詞彙 |
| :--- | :--- | :--- | :---: | :--- |
| 7. 搭乘捷運詢問轉乘 | `mrt-transfer-help` | 確認在何站轉乘與月台方向 | 初級 | `line`, `transfer`, `which`, `way`, `direction`, `next`, `station`, `follow` |
| 8. 趕時間搭計程車 | `taking-a-taxi` | 告知司機目的地並請求避開塞車 | 初級 | `hurry`, `late`, `traffic`, `turn`, `ahead`, `drive`, `fast`, `drop` |
| 9. 公車誤點向站務詢問 | `bus-delay-inquiry` | 確認公車時刻與等候時間 | 初級 | `late`, `miss`, `schedule`, `happen`, `still`, `probably`, `twenty`, `arrive` |
| 10. 租借公共自行車 | `renting-public-bike` | 扣款註冊與確認胎壓座高 | 初級 | `rent`, `lock`, `tire`, `seat`, `adjust`, `screen`, `tap`, `ride` |
| 11. 在不熟悉的路口問路 | `lost-at-intersection` | 詢問具體地標與步行距離 | 初級至初中級 | `lost`, `excuse`, `far`, `walk`, `past`, `building`, `cross`, `straight` |

### 單元三：健康醫療與身體照顧（4 篇）
自我照顧、向藥師或診所說明症狀、請求協助。

| 場景標題 | 候選 ID | 生活自理任務 | 難度 | 核心融入之 NGSL-Spoken 詞彙 |
| :--- | :--- | :--- | :---: | :--- |
| 12. 藥局購買成藥 | `pharmacy-medicine-buy` | 描述頭痛/喉嚨痛並詢問用法 | 初級 | `pain`, `hurt`, `headache`, `throat`, `medicine`, `take`, `day`, `after` |
| 13. 診所掛號與候診 | `clinic-check-in` | 出示健保卡並等待叫號 | 初級 | `fever`, `clinic`, `number`, `wait`, `call`, `fill`, `form`, `doctor` |
| 14. 身體不適向學校/公司請假 | `calling-in-sick` | 電話告知症狀並說明就醫請假 | 初級至初中級 | `sick`, `rest`, `stay`, `home`, `able`, `tomorrow`, `reason`, `feel` |
| 15. 運動扭傷尋求冰敷 | `ice-pack-for-sprain` | 說明受傷部位並索取冰塊包紮 | 初級 | `ankle`, `fall`, `ice`, `cold`, `swollen`, `wrap`, `careful`, `help` |

### 單元四：購物、尺寸與售後服務（5 篇）
實體店挑選、試穿、詢問折扣與退換。

| 場景標題 | 候選 ID | 生活自理任務 | 難度 | 核心融入之 NGSL-Spoken 詞彙 |
| :--- | :--- | :--- | :---: | :--- |
| 16. 服飾店試穿與換尺寸 | `clothing-fitting-room` | 詢問試衣間並要求更換大一號 | 初級 | `fit`, `size`, `try`, `room`, `bigger`, `tight`, `color`, `look` |
| 17. 詢問特價與會員折扣 | `asking-store-discount` | 確認標籤價格是否已含折扣 | 初級 | `sale`, `price`, `discount`, `member`, `special`, `cheap`, `save`, `total` |
| 18. 商品瑕疵要求換貨 | `exchanging-damaged-item` | 攜帶發票要求更換新品 | 初級至初中級 | `broken`, `receipt`, `exchange`, `bring`, `problem`, `working`, `replace`, `new` |
| 19. 超商尋找生活日用品 | `convenience-store-items` | 詢問電池、雨傘擺放貨架 | 初級 | `battery`, `shelf`, `behind`, `top`, `bottom`, `item`, `find`, `need` |
| 20. 結帳時載具與自備袋 | `checkout-carrier-bag` | 說明自備購物袋與不需要明細 | 初級 | `bring`, `own`, `paper`, `plastic`, `bag`, `keep`, `receipt`, `thanks` |

### 單元五：公共服務與生活辦事（5 篇）
超商、郵局、銀行與失物招領處辦理實質事務。

| 場景標題 | 候選 ID | 生活自理任務 | 難度 | 核心融入之 NGSL-Spoken 詞彙 |
| :--- | :--- | :--- | :---: | :--- |
| 21. 超商寄送與領取包裹 | `pickup-delivery-parcel` | 報手機末三碼核對姓名取件 | 初級 | `package`, `name`, `code`, `sign`, `phone`, `last`, `number`, `pick` |
| 22. 郵局秤重寄掛號信 | `mailing-registered-letter` | 詢問郵資與一般/快捷抵達時間 | 初級 | `weight`, `post`, `send`, `air`, `fast`, `stamp`, `address`, `cost` |
| 23. 圖書館借書逾期繳費 | `library-overdue-fee` | 處理借閱逾期並補繳工本費 | 初級至初中級 | `overdue`, `fee`, `borrow`, `date`, `return`, `pay`, `lost`, `card` |
| 24. 公共場所遺失隨身包 | `lost-bag-inquiry` | 描述皮夾外觀與遺失時間地點 | 初級至初中級 | `leave`, `remember`, `black`, `leather`, `inside`, `key`, `contact`, `found` |
| 25. 服務台索取地圖與簡介 | `information-desk-map` | 詢問洗手間位置與導覽摺頁 | 初級 | `guide`, `map`, `restroom`, `floor`, `elevator`, `free`, `show`, `desk` |

### 單元六：校園與團隊協作（5 篇，針對中學生與進階學習者）
討論進度、表達立場、協商分工。

| 場景標題 | 候選 ID | 生活自理任務 | 難度 | 核心融入之 NGSL-Spoken 詞彙 |
| :--- | :--- | :--- | :---: | :--- |
| 26. 分組專案討論分工 | `project-role-sharing` | 主動認領工作並詢問他人意願 | 初級 | `part`, `role`, `share`, `choose`, `slide`, `report`, `agree`, `start` |
| 27. 協商作業繳交期限 | `discussing-due-deadline` | 討論何時完工並約定檢查時間 | 初級 | `deadline`, `finish`, `tomorrow`, `tonight`, `ready`, `send`, `together`, `time` |
| 28. 表達不同想法並尋求共識 | `sharing-alternative-idea` | 禮貌提出另一種做法並解釋原因 | 初級至初中級 | `maybe`, `idea`, `better`, `reason`, `though`, `differ`, `point`, `think` |
| 29. 課堂上請老師再講一次 | `asking-teacher-clarification` | 表示剛才沒聽清楚並請求舉例 | 初級 | `pardon`, `repeat`, `hear`, `example`, `slowly`, `understand`, `again`, `mean` |
| 30. 借用學校運動器材 | `borrowing-sports-gear` | 登記球具並確認歸還時間 | 初級 | `ball`, `borrow`, `sign`, `court`, `gym`, `return`, `before`, `bell` |

### 單元七：日常生活與社交應對（5 篇）
約定碰面、遲到道歉、婉拒邀請、說明日常事由。

| 場景標題 | 候選 ID | 生活自理任務 | 難度 | 核心融入之 NGSL-Spoken 詞彙 |
| :--- | :--- | :--- | :---: | :--- |
| 31. 約定碰面時間與地點 | `setting-meeting-time` | 協調彼此有空的時間（週末/下班） | 初級 | `free`, `busy`, `meet`, `clock`, `early`, `convenient`, `suit`, `plan` |
| 32. 因塞車遲到電話道歉 | `apologizing-for-being-late` | 告知預計抵達時間並致歉 | 初級 | `sorry`, `late`, `traffic`, `stuck`, `minute`, `wait`, `arrive`, `soon` |
| 33. 婉拒朋友週末聚會 | `declining-an-invitation` | 說明已有其他安排並感謝邀請 | 初級至初中級 | `invite`, `wish`, `could`, `busy`, `already`, `plan`, `next`, `time` |
| 34. 與鄰居打招呼寒暄 | `neighbor-elevator-chat` | 寒暄天氣與週末作息 | 初級 | `weather`, `sunny`, `weekend`, `heading`, `work`, `nice`, `day`, `see` |
| 35. 借生活用具用畢歸還 | `returning-borrowed-tool` | 歸還剪刀/起子並表達謝意 | 初級 | `tool`, `borrow`, `thank`, `use`, `done`, `help`, `keep`, `much` |

### 單元八：數位與日常通訊（5 篇）
日常設備、Wi-Fi、通訊與連線問題解決。

| 場景標題 | 候選 ID | 生活自理任務 | 難度 | 核心融入之 NGSL-Spoken 詞彙 |
| :--- | :--- | :--- | :---: | :--- |
| 36. 咖啡店詢問 Wi-Fi 密碼 | `cafe-wifi-password` | 詢問連線名稱與密碼 | 初級 | `network`, `wifi`, `password`, `connect`, `signal`, `work`, `type`, `enter` |
| 37. 手機電量不足借行動電源 | `borrowing-power-bank` | 借用充電線並詢問插座位置 | 初級 | `battery`, `low`, `charge`, `plug`, `cable`, `borrow`, `percent`, `dead` |
| 38. 沒收到驗證簡訊請求重發 | `resending-verification-code` | 告知未收到簡訊並重新點擊 | 初級 | `message`, `receive`, `code`, `click`, `send`, `again`, `wait`, `check` |
| 39. 設備無法連線請教店員 | `device-connection-trouble` | 說明螢幕卡住並嘗試重新開機 | 初級至初中級 | `screen`, `freeze`, `restart`, `button`, `turn`, `off`, `try`, `happen` |
| 40. 確認線上預約編號 | `confirming-online-booking` | 出示手機預約條碼並完成核對 | 初級 | `booking`, `confirm`, `screen`, `show`, `number`, `system`, `ready`, `order` |

---

## 四、 分批實作與驗收規劃

為確保每批內容的高品質、音檔一致性與無回歸缺陷，規劃分為 **8 個批次**（每批 5 篇）：

- **第 1 批**：單元一（飲食自理 1～5 篇）
- **第 2 批**：單元一完結 + 單元二（飲食第 6 篇 + 交通 7～10 篇）
- **第 3 批**：單元二完結 + 單元三（交通第 11 篇 + 醫療健康 12～15 篇）
- **第 4 批**：單元四（購物與退換 16～20 篇）
- **第 5 批**：單元五（公共服務辦事 21～25 篇）
- **第 6 批**：單元六（校園與團隊協作 26～30 篇）
- **第 7 批**：單元七（社交與人際應對 31～35 篇）
- **第 8 批**：單元八（數位與生活通訊 36～40 篇）+ **NGSL-Spoken 100% 覆蓋總驗證**

### 驗收標準
每批交付皆必須通過：
1. `node scripts/validate-content.mjs` 靜態欄位與連結契約檢查。
2. Kokoro `af_heart` 美式女聲 MP3 生成及 SHA-256 驗證。
3. `pnpm run build` 與 `pnpm run test`（含 Playwright 端對端測試）全綠。
4. 追蹤詞彙覆蓋率報告，確認該批承諾之 NGSL 詞條確實消解。
