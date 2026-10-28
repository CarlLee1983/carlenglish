export interface GrammarLesson {
  id: string; title: string; category: string; focus: string; rule: string;
  examples: { english: string; translation: string; note: string }[];
  caution: string; story: string; translation: string;
  questions: { question: string; answer: string }[];
  check: string; sources: { title: string; url: string }[];
}
export const grammarLessons: GrammarLesson[] = [
  {
    "id": "in-on-by-place",
    "title": "物品在哪裡：in、on、by",
    "category": "介系詞",
    "focus": "讀出容器內、表面上與附近三種位置關係。",
    "rule": "先找介系詞後面的地點。這組具體物品例句中，in 說東西位於某個範圍內，on 表示在表面上，by 表示靠近；不要只背成同一個「在」。",
    "examples": [
      {
        "english": "The key is in the box.",
        "translation": "鑰匙在盒子裡。",
        "note": "看的是盒子內部。"
      },
      {
        "english": "The key is on the box.",
        "translation": "鑰匙在盒子上。",
        "note": "看的是盒子表面，不是裡面。"
      },
      {
        "english": "The key is by the box.",
        "translation": "鑰匙在盒子旁邊。",
        "note": "只說靠近盒子，沒有說接觸它。"
      }
    ],
    "caution": "這是具體位置的入門對比，不是所有用法的公式。in a photo、on a bus 等搭配不能只靠「內部／表面」判斷，後續會另練。",
    "story": "Mei opens a small box. Her key is not in it. A note is on the box. The note says, “Look by the lamp.” Mei finds the key there.",
    "translation": "美打開一個小盒子，鑰匙不在裡面。盒子上有張紙條，寫著「看看檯燈旁邊」。美在那裡找到鑰匙。",
    "questions": [
      {
        "question": "鑰匙最後在哪裡？哪個短語提供位置？",
        "answer": "在檯燈旁邊；by the lamp 指出附近的位置。不是盒子裡。"
      },
      {
        "question": "紙條在盒子裡，還是盒子上？",
        "answer": "盒子上。on the box 與 in the box 的關係不同。"
      },
      {
        "question": "只讀 by the lamp，能確定鑰匙碰到檯燈嗎？",
        "answer": "不能。by 只說靠近；接觸與否沒有交代。"
      }
    ],
    "check": "遮住解釋，分別用自己的話說出 in the box、on the box、by the box 的差別。",
    "sources": [
      {
        "title": "British Council：Prepositions of place",
        "url": "https://learnenglish.britishcouncil.org/free-resources/grammar/a1-a2/prepositions-place?page=4"
      },
      {
        "title": "Oxford：by（位置）",
        "url": "https://www.oxfordlearnersdictionaries.com/us/definition/english/by_1"
      }
    ]
  },
  {
    "id": "in-on-at-time",
    "title": "時間的範圍：in、on、at",
    "category": "介系詞",
    "focus": "讀懂月份、日期與鐘點，不把它們都當成同一種時間。",
    "rule": "先看後面是哪一種時間：本課的月份與一天中的時段用 in，特定日子用 on，鐘點用 at。這是常見搭配，不是「長的一定 in、短的一定 at」的萬用規則。",
    "examples": [
      {
        "english": "The course starts in November.",
        "translation": "課程在十一月開始。",
        "note": "月份用 in。"
      },
      {
        "english": "We meet on Tuesday.",
        "translation": "我們星期二見面。",
        "note": "日子用 on。"
      },
      {
        "english": "The door opens at nine.",
        "translation": "門九點開。",
        "note": "鐘點用 at。"
      },
      {
        "english": "I read in the morning, but we meet on Tuesday morning.",
        "translation": "我早上閱讀，但我們約星期二早上見。",
        "note": "一般時段 in the morning；指定某日早上 on Tuesday morning。"
      }
    ],
    "caution": "next Tuesday、last week、this morning 前面通常不再加 in/on/at；at night 也是常見搭配。不要只依時間長短猜。",
    "story": "Our course begins in November. The first class is on Tuesday morning. It starts at nine. Lin comes at eight thirty and waits outside the classroom.",
    "translation": "我們的課程在十一月開始。第一堂課在星期二早上，九點開始。林八點半就來了，在教室外等候。",
    "questions": [
      {
        "question": "哪個短語告訴你月份，而不是上課鐘點？",
        "answer": "in November 表示月份；at nine 才是上課鐘點。"
      },
      {
        "question": "第一堂課在任意一個早上嗎？",
        "answer": "不是。on Tuesday morning 指定星期二早上。"
      },
      {
        "question": "林比上課時間早了多久？",
        "answer": "半小時。課九點開始，林八點半到；要連結兩個時間，不能只看介系詞。"
      }
    ],
    "check": "重讀短文，把月份、日子與鐘點分成三組。",
    "sources": [
      {
        "title": "British Council：Prepositions of time",
        "url": "https://learnenglish.britishcouncil.org/free-resources/grammar/a1-a2-grammar/prepositions-of-time-at-in-on"
      },
      {
        "title": "BBC：時間介系詞說明",
        "url": "https://downloads.bbc.co.uk/worldservice/learningenglish/grammarchallenge/pdfs/gc_16_timepreps_explanation.pdf"
      }
    ]
  },
  {
    "id": "in-a-period",
    "title": "in ten minutes：多久以後，不一定花多久",
    "category": "介系詞",
    "focus": "在將來語境中辨識「再過一段時間」，並與完成所花時間區分。",
    "rule": "in 加一段時間常在將來語境中表示從現在起再過多久。先看動詞與上下文；同樣 in ten minutes，也可能描述完成某事所用的時間。",
    "examples": [
      {
        "english": "The bus will leave in ten minutes.",
        "translation": "公車再過十分鐘就開。",
        "note": "現在還沒開；從現在往後算。"
      },
      {
        "english": "She finished the form in ten minutes.",
        "translation": "她花十分鐘填完表格。",
        "note": "已完成的工作；這裡說花了多久。"
      },
      {
        "english": "Ten minutes after the call, he left.",
        "translation": "通話後十分鐘，他離開了。",
        "note": "after 明確指出從哪件事往後算，不是固定從現在。"
      }
    ],
    "caution": "不要把所有 in＋時間翻成「以後」。本課不把 in ten minutes 當作準時保證，也不靠單一介系詞判斷過去或將來。",
    "story": "It is nine now. The bus will leave in ten minutes. Ava checks her bag. Yesterday, she packed it in five minutes. Today, everything is ready.",
    "translation": "現在九點。公車再過十分鐘就開。艾娃檢查背包。昨天她花五分鐘收拾好它，今天一切都準備好了。",
    "questions": [
      {
        "question": "依這段安排，公車預計幾點開？",
        "answer": "九點十分。It is nine now 提供起點，in ten minutes 表示再過十分鐘。"
      },
      {
        "question": "in five minutes 在說昨天五分鐘以後才開始收拾嗎？",
        "answer": "不是。packed it 說已完成的收拾；in five minutes 在這裡說完成花了五分鐘。"
      },
      {
        "question": "如果只有 in ten minutes 四個字，能斷定一定是「以後」嗎？",
        "answer": "不能。需要看完整句子的動詞與時間背景。"
      }
    ],
    "check": "找出兩個 in＋時間，說明各自回答「何時發生」還是「花多久完成」。",
    "sources": [
      {
        "title": "British Council：When（未來時間）",
        "url": "https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/when-time-dates"
      },
      {
        "title": "Oxford：in（時間）",
        "url": "https://www.oxfordlearnersdictionaries.com/definition/english/in_1"
      }
    ]
  },
  {
    "id": "by-method",
    "title": "by bus、by checking：怎麼做到",
    "category": "介系詞",
    "focus": "把 by 後的交通方式或動作讀成方法，而不是位置。",
    "rule": "by 可以引出交通方式，也可用 by＋動詞-ing 說明怎麼做到。閱讀時先看後面接的是交通工具名稱，還是一個動作。",
    "examples": [
      {
        "english": "We travel by bus.",
        "translation": "我們搭公車旅行。",
        "note": "常見交通方式 by bus，不加 a/the。"
      },
      {
        "english": "She goes to work on foot.",
        "translation": "她走路上班。",
        "note": "步行採慣用的 on foot，不機械套用 by＋交通工具。"
      },
      {
        "english": "I found the address by checking the email.",
        "translation": "我查看電子郵件，找到了地址。",
        "note": "by checking 說明找到的方法。"
      }
    ],
    "caution": "by bus 是交通方式；on the bus 可以說人在那班公車上，焦點不同。by＋-ing 的語塊不是另一個主詞，例如 checking 的執行者在本課例句就是 I。",
    "story": "Leo goes to the office by bus. Mina goes on foot. They find the meeting room by checking a map. They do not ask anyone for directions.",
    "translation": "里歐搭公車到辦公室，米娜走路去。他們查看地圖，找到了會議室，沒有向任何人問路。",
    "questions": [
      {
        "question": "誰搭公車？誰走路？",
        "answer": "里歐搭公車，米娜走路；by bus 與 on foot 指兩種交通方式。"
      },
      {
        "question": "by checking a map 回答「在哪裡」還是「用什麼方法」？",
        "answer": "用什麼方法。他們藉由查看地圖找到會議室。"
      },
      {
        "question": "能從末句推論他們不需要地圖嗎？",
        "answer": "不能。末句只說沒有問人；前句明說查看地圖。"
      }
    ],
    "check": "在下次閱讀中遇到 by，先問它是在說「附近」，還是在說「怎麼做」。",
    "sources": [
      {
        "title": "Oxford：by（方式與動作）",
        "url": "https://www.oxfordlearnersdictionaries.com/us/definition/english/by_1"
      },
      {
        "title": "VOA：By train or with train",
        "url": "https://learningenglish.voanews.com/a/is-it-by-train-or-with-train-/6221417.html"
      }
    ]
  },
  {
    "id": "by-agent-with-tool",
    "title": "誰做的：by 與 with",
    "category": "介系詞",
    "focus": "辨識簡單被動句中的執行者，不把工具當成人。",
    "rule": "當句子先說受到動作的東西，be＋過去分詞可以把焦點放在它身上。by 常引出執行動作的人；with 常引出使用的工具。本課只練這一種辨識，不展開所有被動時態。",
    "examples": [
      {
        "english": "The box was opened by Nora.",
        "translation": "盒子是諾拉打開的。",
        "note": "by Nora 回答誰做了打開這個動作。"
      },
      {
        "english": "The box was opened with a key.",
        "translation": "盒子是用鑰匙打開的。",
        "note": "with a key 回答使用什麼工具，沒有交代人。"
      },
      {
        "english": "Nora opened the box with a key.",
        "translation": "諾拉用鑰匙打開盒子。",
        "note": "改回先說人的句子，工具仍是鑰匙。"
      }
    ],
    "caution": "不是看到 by 就代表被動。by the door 仍可表示位置；本課要一起看 was opened 等動詞結構。執行者也可能是事物，但本課先用人和工具的清楚對比。",
    "story": "The locked box was opened by Nora. It was opened with a small key, not with a knife. Tom watched her. He did not open the box.",
    "translation": "上鎖的盒子由諾拉打開。她用的是一把小鑰匙，不是刀。湯姆看著她，沒有打開盒子。",
    "questions": [
      {
        "question": "誰打開盒子？你根據哪個語塊？",
        "answer": "諾拉。was opened by Nora 指出執行者，不是湯姆。"
      },
      {
        "question": "工具是什麼？with a small key 有沒有指另一個人？",
        "answer": "工具是小鑰匙；with a small key 說工具，不是另一個人。"
      },
      {
        "question": "把第一句改成先說諾拉，核心事實會變嗎？",
        "answer": "Nora opened the locked box. 核心事實不變，仍是諾拉打開盒子，只是句子焦點改變。"
      }
    ],
    "check": "把短文中的人、動作與工具分開標記，再說誰對什麼做了什麼。",
    "sources": [
      {
        "title": "BBC：Present and past passive",
        "url": "https://downloads.bbc.co.uk/learningenglish/tgg/unit_16/le_tgg_ep16_present_past_passive.pdf"
      },
      {
        "title": "British Council：Active and passive voice",
        "url": "https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/active-passive-voice"
      }
    ]
  },
  {
    "id": "by-until-deadline",
    "title": "by five 與 until five：截止還是持續",
    "category": "介系詞",
    "focus": "分清最晚完成時間與動作持續到何時。",
    "rule": "by 加時間點常指不晚於該時間完成；until 表示某個動作或狀態持續到那個時間。看動詞是在說交件、抵達等完成點，還是等待、停留等持續過程。",
    "examples": [
      {
        "english": "Please send the file by five.",
        "translation": "請最晚五點把檔案寄出。",
        "note": "五點是截止；可以更早寄。"
      },
      {
        "english": "I will stay here until five.",
        "translation": "我會待在這裡到五點。",
        "note": "待著的狀態持續到五點。"
      }
    ],
    "caution": "不要把 by five 和 until five 都翻成模糊的「到五點」。先看是在說完成期限，還是狀態持續；本課不把時間說法當成契約的秒級精度。",
    "story": "It is four. Please send the file by five. I will wait here until five. You can send it now. I will check it before I leave.",
    "translation": "現在四點。請最晚五點寄出檔案，我會在這裡等到五點。你現在就可以寄，我會在離開前確認它。",
    "questions": [
      {
        "question": "現在四點就寄出，符合 by five 嗎？",
        "answer": "符合。by five 是最晚五點，可以提早完成。"
      },
      {
        "question": "哪個語塊說等待會持續到何時？",
        "answer": "wait here until five，表示在這裡等到五點。"
      },
      {
        "question": "如果把 send the file by five 換成 stay here until five，兩者都只是同一種「到五點」嗎？",
        "answer": "不是。前者要求最晚五點完成寄送；後者描述停留持續到五點。動詞與介系詞要一起讀。"
      }
    ],
    "check": "不用翻成中文，先把 by 畫成「完成期限」、until 畫成「延續到端點」，再回原句確認。",
    "sources": [
      {
        "title": "BBC：Until vs by",
        "url": "https://downloads.bbc.co.uk/learningenglish/eiam/unit-1/190118_until_vs_by.pdf"
      },
      {
        "title": "加拿大政府：by（期限）",
        "url": "https://our-languages.canada.ca/en/writing-tips-plus/by-near"
      }
    ]
  }
];
export const grammarPaths = ['/grammar/', ...grammarLessons.map(({ id }) => `/grammar/${id}/`)];
