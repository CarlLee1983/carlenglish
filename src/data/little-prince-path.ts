/** Original bridge readings, not quotations, adaptations, or translations of The Little Prince. */
export interface BridgeReading {
  id: string; title: string; titleEn: string; focus: string; connection: string;
  paragraphs: string[]; translations: string[];
  words: { english: string; meaning: string }[];
  questions: { question: string; answer: string }[];
  check: string;
}
export const princePath = '/goals/little-prince/';
export const bridgeReadings: BridgeReading[] = [
  {
    id: 'a-seat-by-the-window', title: '窗邊的位子', titleEn: 'A Seat by the Window',
    focus: '先找誰做了什麼，再加上位置與時間。',
    connection: '讀故事時，先辨認人物與動作，才不會把每個不熟的形容詞都當成理解障礙。',
    paragraphs: [
      'Mina works in a small shop. At noon, she sits by the window with a cup of tea. A man comes in. He puts a wet bag on the floor and looks at the empty chair.',
      'Mina moves her cup. “You can sit here,” she says. The man smiles and sits down. Outside, the rain continues.'
    ],
    translations: [
      'Mina 在一間小店工作。中午，她端著一杯茶坐在窗邊。一名男子走進來。他把濕袋子放在地上，看著那張空椅子。',
      'Mina 把杯子移開。她說：「你可以坐這裡。」男子微笑，坐了下來。外面的雨仍在下。'
    ],
    words: [{english:'wet',meaning:'濕的'},{english:'empty',meaning:'空的'},{english:'continues',meaning:'繼續'}],
    questions: [
      {question:'這段主要在寫哪件事？請用一句中文說明，不必逐句翻譯。',answer:'Mina 邀請走進店裡的男子坐在空椅子上。故事重點不是她的工作內容。'},
      {question:'在 “He puts a wet bag on the floor” 中，誰做了什麼？on the floor 補充什麼？',answer:'男子把濕袋子放下。on the floor 補充放在哪裡，不是另一個動作。'},
      {question:'能確定男子剛走了很遠的路嗎？指出文本的界線。',answer:'不能。袋子濕了，外面在下雨，但沒有說他的路程長短。'}
    ],
    check:'不看中譯，能說出 Mina、男子各做一件什麼事，並指出句子裡的動作。'
  },
  {
    id: 'the-returned-notebook', title: '送回來的筆記本', titleEn: 'The Returned Notebook',
    focus: '讓 he、she、it 找得到對應的人或物。',
    connection: '故事不會一直重複全名。跟得上代名詞，才能知道誰在說話、誰的想法改變了。',
    paragraphs: [
      'Leo leaves his notebook on a bus. When he gets home, he cannot find it. His older sister, Nora, helps him look in his bag. “It is not here,” she says.',
      'That evening, the bus driver calls Leo. She has the notebook. Leo goes to the station, and the driver gives it back to him. He opens it and finds his drawings inside. Nora waits outside the station. When Leo comes out, she sees the notebook and smiles.'
    ],
    translations: [
      'Leo 把筆記本留在公車上。他回到家時，找不到它。他的姊姊 Nora 幫他在袋子裡找筆記本。她說：「它不在這裡。」',
      '那天傍晚，公車司機打電話給 Leo。筆記本在她那裡。Leo 到車站，司機把它還給他。他打開筆記本，發現自己的畫還在裡面。Nora 在車站外等候。Leo 出來時，她看到筆記本，露出微笑。'
    ],
    words: [{english:'notebook',meaning:'筆記本'},{english:'driver',meaning:'司機'},{english:'inside',meaning:'在裡面'}],
    questions: [
      {question:'“She has the notebook” 與最後一句的 she 分別是誰？用附近的句子支持答案。',answer:'第一個 She 是剛打電話的公車司機；最後的 she 是上一句在車站外等待的 Nora。不能只因同樣用 she 就認為是同一人。'},
      {question:'“the driver gives it back to him” 的 it 與 him 是什麼、誰？',answer:'it 是筆記本；him 是到車站拿回筆記本的 Leo。'},
      {question:'最後 Nora 為什麼可能微笑？這是明說還是推論？',answer:'她可能因為 Leo 找回筆記本而高興；文中只明說她看見筆記本並微笑，情緒原因是有根據的推論。'}
    ],
    check:'能在題目指定的兩個 she 下方寫出不同人物，並把 it 換成 notebook 讀一次。'
  },
  {
    id: 'a-change-of-plan', title: '換一個做法', titleEn: 'A Change of Plan',
    focus: '用 because、but、so 串起理由、轉折與結果。',
    connection: '人物的行動常與期待不同。分清理由和轉折，能比逐字翻譯更快抓到段落關係。',
    paragraphs: [
      'On Saturday, Arun plans to paint a table outside. He carries the table into the yard because the room is too small. He opens the paint can and finds a clean brush. Then he feels a drop of rain on his hand.',
      'He wants to finish the table today, but the wood must stay dry. So he closes the paint can and takes the table back inside. He cannot paint in the small room. Instead, he cleans his tools and makes a list of things to buy. The table is still brown that evening, but Arun is ready to paint on a dry day.'
    ],
    translations: [
      '星期六，Arun 打算在外面替一張桌子上漆。因為房間太小，他把桌子搬到院子。他打開油漆罐，找了一把乾淨的刷子。接著，他感覺一滴雨落在手上。',
      '他想今天完成桌子，但木頭必須保持乾燥。因此他蓋上油漆罐，把桌子搬回屋內。他不能在小房間裡上漆，於是改為清理工具，列出要買的東西。那天傍晚桌子仍是棕色，但 Arun 已準備好在乾燥的一天上漆。'
    ],
    words: [{english:'yard',meaning:'院子'},{english:'dry',meaning:'乾燥的'},{english:'instead',meaning:'改為'}],
    questions: [
      {question:'他為什麼先搬出去，又搬回來？這兩次行動的理由一樣嗎？',answer:'搬出去是因為房間太小；搬回來是因為開始下雨，木頭要保持乾燥。兩次行動的原因不同。'},
      {question:'第二段第一句的 but 連接哪兩個互相牴觸的情況？',answer:'他想今天完成，卻必須讓木頭保持乾燥；在下雨的情況下，兩者難以兼顧。'},
      {question:'只說「Arun 今天什麼都沒做」準確嗎？用兩個細節支持回答。',answer:'不準確。他沒有完成上漆，但清理了工具、列了購物清單，為下次做準備。'}
    ],
    check:'能不用中文翻譯，從英文各指出一個理由、一個轉折與一個結果。'
  },
  {
    id: 'the-extra-cup', title: '多放的一個杯子', titleEn: 'The Extra Cup',
    focus: '分開文本明說的事、有證據的推論與不知道的事。',
    connection: '文學常不直接說出人物的感受。保留不確定性，才能讀出暗示，而不是把自己的想像當成原文。',
    paragraphs: [
      'Every Thursday, Hana and Mei drink tea after work. One Thursday, Mei sends a message: “I cannot come today.” She does not say why. Hana reads the message twice. Then she puts two cups on the kitchen table, as she always does.',
      'After a moment, Hana takes one cup back to the shelf. She makes tea and sits beside the window. Her phone stays on the table. When it lights up, she picks it up quickly. The message is from a shop, not from Mei. Hana puts the phone down and takes a slow sip of tea.',
      'Later, she writes to Mei: “Would you like to meet next Thursday?” She leaves the second cup on the shelf.'
    ],
    translations: [
      '每個星期四，Hana 和 Mei 都在下班後喝茶。某個星期四，Mei 傳來訊息：「我今天不能來。」她沒有說原因。Hana 把訊息讀了兩次。接著，她像平常一樣，把兩個杯子放在廚房桌上。',
      '過了一會兒，Hana 把其中一個杯子放回架上。她泡茶，坐在窗邊。手機留在桌上。手機亮起時，她很快拿起來。訊息是店家傳的，不是 Mei。Hana 放下手機，慢慢喝了一口茶。',
      '後來，她寫訊息給 Mei：「下個星期四要不要見面？」她把第二個杯子留在架上。'
    ],
    words: [{english:'shelf',meaning:'架子'},{english:'quickly',meaning:'很快地'},{english:'sip',meaning:'一小口（飲料）'}],
    questions: [
      {question:'Hana 可能在等誰的訊息？找兩個細節，不要只猜感情。',answer:'她可能在等 Mei。線索包括反覆讀 Mei 的訊息，以及手機亮起就很快拿起來，敘述還特別指出訊息不是 Mei 傳的。這些支持推論，但沒有直接說她在等誰。'},
      {question:'能判定 Mei 不再想當 Hana 的朋友嗎？',answer:'不能。Mei 只說今天不能來，沒有說原因。不可把一次缺席推成友誼結束。'},
      {question:'最後一段如何改變你對 Hana 的理解？',answer:'她仍邀請 Mei 下週見面，顯示她願意延續見面安排。可以推論她在意這次相聚，但不能斷言她一定生氣或非常難過。'}
    ],
    check:'能把一項明說事實、一項有兩個線索的推論、一項無法知道的事分開說。'
  }
];
export const princeGoalPaths = [princePath, ...bridgeReadings.map(({id}) => `${princePath}${id}/`)];
