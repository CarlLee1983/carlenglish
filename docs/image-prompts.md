# 場景圖片生成紀錄

使用內建 image_gen 工具生成，再將成品轉為 WebP 納入本地資產。讀者開啟網站不呼叫生成服務。保留完整構圖，沒有裁切。

## 和新同學打招呼（2026-10-14）

成品：`public/images/scenes/school-greeting.webp`，1536 × 1024。

```text
Use case: illustration-story
Asset type: finished local scene illustration for beginner English reading.
Primary request: In a bright, welcoming elementary school classroom on the first day of school, a young boy named Leo with a backpack smiles and greets a friendly girl named Emma. Emma smiles back and waves gently. Show exactly two main children, Leo and Emma, standing near their wooden classroom desks with backpacks. A bright window in the background brings in gentle morning sunlight. Keep the scene calm, warm, and inviting, conveying a friendly first-day greeting.
Style/medium: refined editorial picture-book illustration for children and young learners, hand-painted gouache textures and delicate pencil edges, clear readable shapes, natural human proportions and understated expressive faces.
Composition: landscape 3:2, 1536 by 1024 framing, medium-wide eye level, edge-to-edge scene readable on mobile.
Palette: subdued peach and terracotta, muted sage green, ivory, charcoal details. Gentle natural morning daylight.
Constraints: exactly two main children, Leo and Emma, no extra limbs, natural fingers, no legible text, no typography, no letters or numbers on blackboards or walls, no logos, no watermarks, no website elements, no decorative borders, no 3D render style, not overly cartoonish.
```

## 超市購物（2026-10-14）

成品：`public/images/scenes/supermarket-shopping.webp`，1536 × 1024。

```text
Use case: illustration-story
Asset type: finished local scene illustration for beginner English reading.
Primary request: In a welcoming neighborhood supermarket, a young adult woman Nora carrying a handbasket asks a friendly store employee where the milk is. The employee stands beside the chilled dairy shelf and gestures toward the milk cartons. Nora has a loaf of bread and a few red apples in her basket. Show exactly two main people, the shopper and employee, a clear supermarket aisle with grocery shelves, milk cartons, a handbasket, bread and apples. The exchange is calm and easy to understand, conveying asking for help finding an item.
Style/medium: refined editorial picture-book illustration for adults, hand-painted gouache textures and delicate pencil edges, clear readable shapes, natural human proportions and understated expressive faces. Composition: landscape 3:2, 1536 by 1024 framing, medium-wide eye level, edge-to-edge scene readable on mobile. Palette: subdued peach and terracotta, muted sage, ivory, charcoal details. Gentle natural daylight. No legible lettering, typography, logos, watermarks, website elements, decorative borders, extra limbs, or childish cartoon/3D style.
```

## 街上問路（2026-10-14）

成品：`public/images/scenes/street-directions.webp`，1536 × 1024。

```text
Use case: illustration-story
Asset type: finished local scene illustration for beginner English reading.
Primary request: On a sunny neighborhood sidewalk, a young adult man Leo holds a phone at waist height and asks a friendly woman how to reach the train station. She points straight down the street while he listens. In the background show the street continuing, a pedestrian traffic light near an intersection, and a small station building beside a modest bank-like building, both without any lettering. Exactly two main people. Clearly depict asking and explaining directions on a street, rather than crossing dangerously or looking at the phone. Keep the two faces and pointing gesture easy to read.
Style/medium: refined editorial picture-book illustration for adults, hand-painted gouache textures and delicate pencil edges, clear readable shapes, natural human proportions and understated expressive faces. Composition: landscape 3:2, 1536 by 1024 framing, medium-wide eye level, edge-to-edge scene readable on mobile. Palette: subdued peach and terracotta, muted sage, ivory, charcoal details. Gentle natural daylight. No legible lettering, typography, logos, watermarks, website elements, decorative borders, extra limbs, or childish cartoon/3D style.
```

## 咖啡店買早餐

成品：`public/images/scenes/cafe-breakfast.webp`，1536 × 1024。

原始生成指令：

```text
Use case: illustration-story
Asset type: one finished horizontal illustration for an illustrated beginner English reading website, not a website screenshot.
Primary request: A clear everyday café breakfast scene. A young adult customer named Mia stands at the café counter ordering takeaway coffee and toast from a friendly barista. There is one takeaway paper coffee cup and a small kraft paper bag with toast visibly peeking out, a simple menu board in the background, and warm morning daylight through a window. Show the exchange between customer and barista, with an obvious counter and café setting.
Style/medium: refined editorial picture-book illustration, hand-painted gouache texture and delicate pencil edges, simple readable shapes, natural human proportions, expressive but understated faces, appealing to adults, not childish cartoons or 3D.
Composition/framing: landscape 3:2, medium-wide eye-level view, customer and barista occupy the middle of the image, café counter and breakfast items clearly visible, comfortably balanced scene that also reads at a small mobile width. Entire illustration edge to edge.
Lighting/mood: gentle sunny morning, welcoming quiet neighborhood café.
Color palette: subdued peach and terracotta, muted sage green, ivory, charcoal details. Use rich but restrained handmade surface textures.
Constraints: exactly two main people, one customer and one barista, no extra arms or hands, breakfast is toast not pastry, takeaway coffee not a ceramic mug, no legible signage text, no typography, no logos, no watermark, no website elements, no borders.
```

## 中級連續情境插圖（2026-10-14）

三張圖均使用內建 `image_gen.imagegen` 生成，沒有使用外部 API、CLI 或佔位圖。每張成品為 1536 × 1024 RGB WebP，使用 Pillow quality=90、method=6 轉檔，完整保留構圖，沒有裁切或縮放。角色皆為高中年齡的 Maya 與 Ben；Maya 穿鼠尾草綠外套，Ben 穿赤陶色襯衫。畫風延續既有水粉與鉛筆質感。圖中不呈現可讀文字、數字或預約完成標記。

### 有禮貌地表達不同意見

成品：`public/images/scenes/respectful-disagreement.webp`，1536 × 1024。

建議替代文字：Maya 和 Ben 在學校桌邊討論換書活動的地點；Ben 指向窗外庭院，Maya 指著手機上的雨雲圖示，桌上放著書本和兩種場地的草圖。

原始生成指令（完整）：

```text
Use case: illustration-story
Asset type: one finished local scene illustration for a Traditional Chinese intermediate English reader, not a website screenshot.
Style/medium: refined editorial picture-book illustration appealing to older teenagers and adults, hand-painted gouache texture and delicate pencil edges, rich handmade surface texture, clear readable shapes, natural human proportions and understated expressive faces, softly realistic rather than caricature.
Recurring characters in this three-scene series: Maya is an older teenage girl about seventeen, medium brown skin, dark brown chin-length straight bob, sage-green open cardigan over an ivory T-shirt and dark indigo jeans. Ben is an older teenage boy about seventeen, warm light tan skin, short loose wavy brown hair, terracotta open overshirt over an ivory T-shirt and charcoal trousers. They look like mature high-school students, not small children. Keep these exact visual identities and outfits consistent.
Composition/framing: horizontal landscape 3:2, 1536 by 1024 image, medium-wide eye-level view, edge-to-edge scene, clear primary gestures and large uncluttered focal objects readable at small mobile width, balanced breathing room.
Lighting/mood: gentle natural daytime window light, warm, thoughtful, cooperative school setting.
Color palette: subdued peach and terracotta, muted sage green, ivory, charcoal details, warm light wood.
Constraints: no legible text anywhere, no readable writing, letters, numbers, dates, logos, or watermarks. No website elements, decorative borders, speech balloons, angry expressions, infantilized faces, 3D render look, extra limbs, or malformed hands. Book covers and notebooks use only quiet abstract shapes.
Primary request: Show Maya and Ben respectfully comparing possible locations for their upcoming school book swap. They sit at a warm wooden planning table in a school room beside broad windows looking onto an open courtyard. Ben gestures calmly with one open hand toward the spacious courtyard visible through the windows. Maya is listening thoughtfully and indicating a smartphone on the tabletop with a simple large rain-cloud icon and raindrop shapes on its screen. Make the weather concern visible without words. A small stack of four books and one shared open notebook are on the table; the notebook shows two spare nonverbal location sketches, an outdoor courtyard and an indoor bookcase-lined room. The two students make friendly eye contact, consider each other’s viewpoint, and show a cooperative discussion rather than an argument. Exactly these two people. Courtyard stays empty and secondary. Compose the smartphone and notebook prominently but naturally between them.
```

### 查核網路資訊

成品：`public/images/scenes/checking-online-information.webp`，1536 × 1024。

建議替代文字：Maya 和 Ben 在圖書館比較筆電上的兩份網路資訊；Maya 指著日期區域，Ben 查看筆記，後方可見獨立的玻璃隔間會議室。

原始生成指令（完整）：

```text
Use case: illustration-story
Asset type: one finished local scene illustration for a Traditional Chinese intermediate English reader, not a website screenshot.
Style/medium: refined editorial picture-book illustration appealing to older teenagers and adults, hand-painted gouache texture and delicate pencil edges, rich handmade surface texture, clear readable shapes, natural human proportions and understated expressive faces, softly realistic rather than caricature.
Recurring characters in this three-scene series: Maya is an older teenage girl about seventeen, medium brown skin, dark brown chin-length straight bob, sage-green open cardigan over an ivory T-shirt and dark indigo jeans. Ben is an older teenage boy about seventeen, warm light tan skin, short loose wavy brown hair, terracotta open overshirt over an ivory T-shirt and charcoal trousers. They look like mature high-school students, not small children. Keep these exact visual identities and outfits consistent.
Composition/framing: horizontal landscape 3:2, 1536 by 1024 image, medium-wide eye-level view, edge-to-edge scene, clear primary gestures and large uncluttered focal objects readable at small mobile width, balanced breathing room.
Lighting/mood: gentle natural daytime window light, warm, thoughtful, cooperative school setting.
Color palette: subdued peach and terracotta, muted sage green, ivory, charcoal details, warm light wood.
Constraints: no legible text anywhere, no readable writing, letters, numbers, dates, logos, or watermarks. No website elements, decorative borders, speech balloons, angry expressions, infantilized faces, 3D render look, extra limbs, or malformed hands. Book covers and notebooks use only quiet abstract shapes.
Primary request: Show Maya and Ben carefully checking information for the same school book swap in a quiet school library. They sit together at a warm wooden table with an open laptop turned partly toward the viewer. The screen shows two generic visual document panels side by side: one looks like a forwarded screenshot thumbnail, the other a plain current school notice page; use only geometric blocks, small blank image shapes and nonverbal page layout, absolutely no readable claims or glyph-like fake text. Maya points thoughtfully at a simple blank calendar-grid/date area on the current notice panel, with no numerals. Ben looks at the laptop while checking their open notebook. A small stack of books links the planning story. Behind them, school library bookcases and a clearly separate glass-walled small meeting room with a closed glass door are recognizable. The background meeting room is empty, with a table and chairs; no sign, booking confirmation, or indication it is already reserved. Exactly these two people. Make the act of comparing two sources clear, quiet, and cooperative.
```

### 做一段簡短報告

成品：`public/images/scenes/giving-short-presentation.webp`，1536 × 1024。

建議替代文字：Maya 向同學簡報換書活動提案，展示板用圖像說明圖書館空間、防雨和分成兩組；Ben 站在放有書本與筆記的桌旁。

原始生成指令（完整）：

```text
Use case: illustration-story
Asset type: one finished local scene illustration for a Traditional Chinese intermediate English reader, not a website screenshot.
Style/medium: refined editorial picture-book illustration appealing to older teenagers and adults, hand-painted gouache texture and delicate pencil edges, rich handmade surface texture, clear readable shapes, natural human proportions and understated expressive faces, softly realistic rather than caricature.
Recurring characters in this three-scene series: Maya is an older teenage girl about seventeen, medium brown skin, dark brown chin-length straight bob, sage-green open cardigan over an ivory T-shirt and dark indigo jeans. Ben is an older teenage boy about seventeen, warm light tan skin, short loose wavy brown hair, terracotta open overshirt over an ivory T-shirt and charcoal trousers. They look like mature high-school students, not small children. Keep these exact visual identities and outfits consistent.
Composition/framing: horizontal landscape 3:2, 1536 by 1024 image, medium-wide eye-level view, edge-to-edge scene, clear primary gestures and large uncluttered focal objects readable at small mobile width, balanced breathing room.
Lighting/mood: gentle natural daytime window light, warm, thoughtful, cooperative school setting.
Color palette: subdued peach and terracotta, muted sage green, ivory, charcoal details, warm light wood.
Constraints: no legible text anywhere, no readable writing, letters, numbers, dates, logos, or watermarks. No website elements, decorative borders, speech balloons, angry expressions, infantilized faces, 3D render look, extra limbs, or malformed hands. Book covers and notebooks use only quiet abstract shapes.
Primary request: Show Maya and Ben presenting their proposed school book-swap plan at a small classroom planning meeting. Maya stands beside a simple presentation board and speaks with one calm open-hand gesture toward the board. The board contains three clear large nonverbal graphics: a library meeting room suggested by a small room-and-bookshelf icon, rain protection suggested by an umbrella sheltering a book, and two separate compact groups of simplified people symbols indicating two sessions. Do not use words, numerals, dates, captions or glyph-like marks. This is a proposal, so no reservation badge, stamp, ticket, checkmark or booking-confirmed symbol. Ben stands beside a nearby wooden table with a small stack of books and their shared open notebook, listening supportively. Three older teenage classmates sit in the foreground and midground, seen mainly from behind or three-quarter view, attentively listening. Five people in total including Maya and Ben. Do not draw a crowd of thirty. Make Maya the main focal point and keep Ben, the table, the visual board, and listeners clearly readable at mobile scale. The warm classroom connects visually to the library and school planning scenes.
```


### 查核網路資訊：視線角度修正

採用版本：`checking-online-information-v2.webp`，整合進網站時檔名維持 `public/images/scenes/checking-online-information.webp`。初版的筆電畫面朝向觀者、與人物視線不一致，因此以內建工具做一次定向編修，改為兩位學生實際看得到螢幕的三分之四角度。保留人物、圖書館、玻璃會議室、兩份來源資訊與無可讀文字的設計。1536 × 1024 RGB；沒有裁切或縮放。

編修輸入：初版 `checking-online-information.png`。

完整編修指令：

```text
Use case: precise-object-edit
Asset type: corrected finished editorial illustration for the CarlEnglish intermediate reader.
Input image: edit target, the generated school-library illustration of Maya and Ben comparing online information.
Primary request: Correct only the physically impossible laptop viewing geometry. Recompose this same moment from a three-quarter side angle, with both students seated on the same side of the table and the laptop screen actually facing toward both of them. Put the camera just to the side and a little behind their shoulder line, so the viewer sees their faces in partial profile and also sees the front surface of the angled laptop display. Their gazes and Maya's pointing finger must meet the front, illuminated screen, never the back of the laptop lid. Use the normal physical arrangement: laptop keyboard between the students and the screen; screen hinge farther away from the students; display facing back toward their faces. The screen can be smaller and noticeably foreshortened. Full-frontal screen readability is not needed. Do not simply turn the screen toward the viewer while leaving students behind it.
Preserve: exact two older-teen characters and their identity, Maya with dark chin-length bob, medium-brown skin, sage cardigan and ivory T-shirt; Ben with short wavy brown hair, light tan skin, terracotta overshirt and ivory T-shirt. Preserve the warm school library, wood table, book stack, shared notebook, glass-walled empty meeting room in the background, gouache/pencil handmade editorial style, warm muted peach/terracotta/sage/ivory palette, natural daylight, and cooperative source-checking activity. Maya indicates a blank calendar/date area on the display; Ben checks his notebook.
Screen content: two simple generic source-page panels side by side, expressed only as quiet geometric blocks and a blank calendar grid. No legible text, numbers, claims or dates. The classroom/library room remains unreserved; no booking confirmation or sign.
Composition: landscape 3:2, 1536 by 1024, full edge-to-edge scene, clear gestures at mobile size. Exactly two main people. Natural anatomy and hands. No logos, watermark, borders, speech bubbles, or extra limbs.
```

## 社群品牌分享圖

日期：2026-10-14。使用內建 `image_gen.imagegen`，非 CLI／API fallback。生成輸出為 1732×908 PNG；保留生成原檔，將選定成品匯出為 1200×630 JPEG：`public/images/social/carlenglish.jpg`（290,141 bytes）。生成原檔位於 `/Users/carl/.codex/generated_images/01a138cb-ff21-7291-9651-12e6f7d2ff90/exec-acf29789-c43c-4968-aa0d-086a8f76f764.png`，網站只使用 repo 內的成品。

最終提示：

```text
Create one finished horizontal social-sharing cover image for CarlEnglish, a Traditional Chinese website for learning English through illustrated daily-life short readings. This is a branded Open Graph banner, not a website screenshot. Wide 1.91:1 composition, ideally 1200 by 630 pixels. Warm off-white #f8faf7 background, forest green #253a2e and #305a3c typography, restrained pale sage details, generous readable spacing. Editorial and friendly, suitable for children and adult beginners. On the left, precise large typography with exact text 'CarlEnglish' near top, then the main Traditional Chinese headline on two lines: '生活裡的英文，' and '一篇一篇讀。'. Small readable line below: '看圖 · 閱讀 · 聽英文'. On the right, a single beautifully composed watercolor / gouache storybook illustration of an open illustrated book whose page contains a warm neighborhood café scene, two people talking naturally with a takeaway coffee; a small second page hint of a classroom greeting. Soft natural textures matching educational storybook illustrations, no 3D, no glossy effects. One cohesive scene; illustration must not look like a grid of cards. All text and key illustration should stay within a generous 70-pixel safe margin and remain readable as a small shared-link thumbnail. Minimal, crafted, calm and distinctive. No extra logos, badges, fake UI, ratings, CEFR levels, certification claims, photos, watermark, purple/blue gradients, or additional text.
```

Favicon 是原生 SVG 書本圖示，來源 `public/favicon.svg`；以 Playwright 渲染來源再匯出 ICO、96px PNG 與 180px Apple 圖示。讀本分享圖從原插畫以 Sharp 自動產生 PNG，不重新生成或修改教材原圖。
