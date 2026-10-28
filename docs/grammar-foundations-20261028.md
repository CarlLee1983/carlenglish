# 獨立文法區：首批閱讀基礎

## 範圍與教學決策

2026-10-28 使用者要求製作 by、in 等基本用法，並明確指定另外開文法區。主線仍是完整原書閱讀；文法課可依卡點選，不是先修通關。新區 `/grammar/` 不隸屬《小王子》，從首頁原程度選單之後進入，保留既有首屏契約。原有生活場景、新聞、經典與閱讀目標不改 schema 或內容；未生成音訊／圖片，也沒有新增外部套件、追蹤、成績或儲存格式。

目前六課均有完整說明、對比例句、原創情境短段、中譯、三題與分開解析：

1. `in-on-by-place`：內部、表面、附近；不是三個「在」的同義詞。
2. `in-on-at-time`：月份／日子／鐘點，附少量不宜硬套的常見時間搭配。
3. `in-a-period`：將來多久後與完成耗時，用完整上下文判斷。
4. `by-method`：交通方式與 by＋動作-ing，不把方法誤讀成位置。
5. `by-agent-with-tool`：最小被動閱讀辨識，分清執行者與工具，不展開所有時態。
6. `by-until-deadline`：最晚完成與持續到端點；暫不加入 not…until 否定範圍。

後續版圖為句子結構、時態與動詞、代詞與限定詞、連接詞、常見搭配。這些僅明示規劃，沒有空課頁或假完成數。每課可獨立使用，繁中輔助及答案預設收合；原創短文不是《小王子》節選／改寫。

## 一手來源與段落對應

以下由獨立研究者於 2026-10-28 讀取官方全文／PDF，非僅搜尋摘要。教學句子、中文及題目原創，不搬用來源練習。

| 課程／語法點 | 來源 | 查核範圍 |
| --- | --- | --- |
| 位置 in/on/by | [British Council：Prepositions of place](https://learnenglish.britishcouncil.org/free-resources/grammar/a1-a2/prepositions-place?page=4)、[Oxford：by](https://www.oxfordlearnersdictionaries.com/us/definition/english/by_1) | BC 正文 in 範圍內／on 表面；官方教學留言與 Oxford 義項支持 by 旁邊，不保證接觸。 |
| 時間 in/on/at | [British Council](https://learnenglish.britishcouncil.org/free-resources/grammar/a1-a2-grammar/prepositions-of-time-at-in-on)、[BBC 說明 PDF](https://downloads.bbc.co.uk/worldservice/learningenglish/grammarchallenge/pdfs/gc_16_timepreps_explanation.pdf) | 月份、日子、鐘點；BBC 第1–2頁支持 on 指定某日早上、next/last 表達常不用介系詞。 |
| in＋時間 | [British Council：When](https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/when-time-dates)、[Oxford：in](https://www.oxfordlearnersdictionaries.com/definition/english/in_1) | 未來距說話時多久後；Oxford 義項6涵蓋多久之後與經過一段時間達成結果。不是僅憑in判時態。 |
| by 方法／交通 | [Oxford：by](https://www.oxfordlearnersdictionaries.com/us/definition/english/by_1)、[VOA](https://learningenglish.voanews.com/a/is-it-by-train-or-with-train-/6221417.html)、[BBC quiz PDF](https://downloads.bbc.co.uk/worldservice/learningenglish/flatmates/episode17/quiz.pdf) | Oxford 方法與動作-ing；VOA by交通、on foot與特定車輛on/in；BBC第4頁支持by bus無冠詞。 |
| by 施事／with工具 | [British Council：Passive](https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/active-passive-voice)、[BBC PDF](https://downloads.bbc.co.uk/learningenglish/tgg/unit_16/le_tgg_ep16_present_past_passive.pdf) | be＋過去分詞、by施事者可人或物；BBC第4頁明確區分with工具。 |
| by/until | [BBC PDF](https://downloads.bbc.co.uk/learningenglish/eiam/unit-1/190118_until_vs_by.pdf)、[加拿大政府語言資源](https://our-languages.canada.ca/en/writing-tips-plus/by-near) | 完成期限與持續到端點；by包含該時間或之前，答案用「最晚五點」。 |

Cambridge by、at/on/in-time 及相關交通 PDF 讀取403，停止未換路；沒有把那些頁面列為已讀依據。BC 另一 location 頁 timeout，採已讀獨立來源而非假稱全文讀過。

獨立教學覆核未發現阻擋語法錯誤，已採四項精確化：in 描述位置不說成移動、on foot 說慣用不絕對否定 by foot、移除 not…until 負荷、by five 一致用最晚五點。未進行真人試讀，不宣稱學習成效。

## 最小實作與驗收

- 型別化 `src/data/grammar.ts` 管理六課；原生 Astro 總覽與課頁，原生 details 可無 JavaScript 使用。
- 首頁獨立入口、七個 sitemap 路由；擴充測試仍精確比對完整 sitemap，新增新區路由而非移除斷言。
- 新 unit 檢查完整內容、唯一網址、來源、收合邊界與獨立入口。
- 新 browser 覆蓋六課英文、翻譯／答案鍵盤開關、reload重置、返回選課、320px等既有projects溢出與無JavaScript。
- 使用 Node24.22.1／pnpm12.0.0，frozen install通過。未提供formatter script，保持原生Astro/TS風格並執行diff whitespace檢查。
- 最終型別／全部單元／build／browser／extension及精確PR head CI以交付收據為準，未跑完前不稱通過。
- 本機既有 Playwright Chromium 下載損壞 ZIP，瀏覽器未安裝；不重試已被拒的雲端預覽觀測。人工桌機／手機目視未完成，CI不能代替人工。保持draft PR，不合併、不部署。
