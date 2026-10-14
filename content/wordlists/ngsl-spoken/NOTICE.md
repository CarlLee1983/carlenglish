# NGSL-Spoken 詞表：出處與授權

這個目錄的內容（`wordlist.json` 與 `public/audio/wordlists/ngsl-spoken/` 下的音檔）以 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 釋出，授權全文見同目錄的 `LICENSE`。網站程式碼的授權不受影響。

## 原詞表

New General Service List - Spoken（NGSL-Spoken）1.2，作者 Browne, C. & Culligan, B.，依 Creative Commons Attribution-ShareAlike 4.0 International License 授權。取自官方網站 <https://www.newgeneralservicelist.com/ngsl-spoken>（只採官方來源）。

官方建議的引用：Browne, C., Culligan, B. (2013). The New General Service List - Spoken. Retrieved from http://www.newgeneralservicelist.com.

## 本站的改作

- 取官方詞頻序號（`Rank`）最前面的 100 字，保留官方排名與排序；詞頭沿用官方拼法。
- 排除逐字稿標記：官方語料把 `[pause]`、`[unclear]`、`[laugh]`、`[laughter]`、`[cough]` 這類轉錄標記也算成「詞」（排名 24、26、80、131、438），它們不是常用字，所以不收錄。排除清單寫在 `wordlist.json` 的 `excluded`，驗證會要求詞頻序號只能跳過這些排名；擴充詞表時同樣適用。因此目前 100 筆的排名是 1–103 扣掉 24、26、80。
- 中文意思與例句為本站自行撰寫，依常用義，不是官方英文釋義的翻譯。
- 英文詞的發音為 Kokoro `af_heart` 合成音檔（聲線設定見 `content/audio/voice-profile.json`），例句沒有音檔。

原詞表未對本站內容背書。
