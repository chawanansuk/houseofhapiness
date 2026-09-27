# ร่างเนื้อหาเพิ่ม — รออนุมัติก่อนใส่ลงหน้าจริง

เขียนวันที่ 19 ก.ย. 2569 · ยังไม่ได้ใส่ลงเว็บสักตัวอักษรเดียว

**กติกาที่ใช้เขียนร่างนี้:** ทุกประโยคต้องมีที่มาจากข้อความที่อยู่บนเว็บเราอยู่แล้ว
ถ้าเป็นข้อมูลใหม่ที่เว็บยังไม่เคยพูด จะติดป้าย `[VERIFY]` ไว้ และเจ้าของต้องยืนยันก่อน
ผมไม่ได้ไปค้นราคาหรือเวลาจากที่อื่นมาเติมเอง

---

## สรุปก่อน: หน้าที่แผนบอกว่า "บาง" ตอนนี้เหลือ 2 หน้าจริง ๆ

แผนเดิมระบุ 7 หน้า ตรวจใหม่หลังทำเฟส 1–5 แล้วได้ตามนี้

| หน้า | ขนาด | หัวข้อ h2 | ถามบ่อย | ไกด์ที่เกี่ยวกัน | ต้องทำอะไรต่อ |
|---|---|---|---|---|---|
| attractions.html | 18 KB | 3 | ไม่มี | ✅ (เพิ่มในเฟส 4) | เพิ่มถามบ่อย |
| thonburi-one-day.html | 26 KB | 4 | ไม่มี | ✅ เดิม | เพิ่มถามบ่อย |
| near-chinatown.html | 23 KB | 4 | ✅ | ✅ | ครบแล้ว |
| near-iconsiam.html | 21 KB | 4 | ✅ | ✅ | ครบแล้ว |
| airport-guide.html | 27 KB | 6 | ✅ | ✅ (เพิ่มในเฟส 4) | ครบแล้ว |
| loy-krathong.html | 28 KB | 5 | ✅ | ✅ (เพิ่มในเฟส 4) | ครบแล้ว |
| new-year-countdown.html | 31 KB | 6 | ✅ | ✅ (เพิ่มในเฟส 4) | ครบแล้ว |

เหลือของที่ต้องเขียนจริงแค่ถามบ่อย 2 หน้า ข้างล่างนี้

---

## 1. attractions.html — ถามบ่อย 3 ข้อ

รูปแบบเดียวกับหน้าอื่น: หัวข้อ `ถามบ่อย` ที่มองเห็นในหน้า + schema FAQPage ที่ข้อความตรงกัน
(เว็บเราทำถูกอยู่แล้วทุกหน้า คือ schema ไม่ได้ซ่อนคำถามที่คนอ่านมองไม่เห็น)

**ข้อ 1**
- ไทย: **จุดไหนเดินไปเองได้บ้าง ไม่ต้องขึ้นรถ**
  4 จุดในหน้านี้อยู่ในระยะเดินหรือนั่ง BTS สายสีทองจากที่พัก ส่วนอีก 5 จุดอยู่ฝั่งเมืองเก่า
  ต้องข้ามแม่น้ำ ใช้แท็กซี่ราว 10–15 นาที หรือข้ามเรือแล้วเดินต่อ ทุกการ์ดในหน้านี้มีปุ่มนำทาง
  จากที่พักให้กดได้เลย
- EN: **Which of these can I reach on foot?**
  Four of the places on this page are within walking distance or one BTS Gold Line stop from us.
  The other five are across the river on the old-town side: about 10–15 minutes by taxi, or the
  ferry plus a short walk. Every card here has a directions button that starts from the hotel.
- ที่มา: ชิปในหน้านี้เขียนไว้แล้วว่า "4 จุด เดินถึง / BTS สายสีทอง" และ "5 จุด เมืองเก่า ~10–15 นาที"

**ข้อ 2**
- ไทย: **ข้ามไปฝั่งพระนครยังไงถูกที่สุด**
  เรือข้ามฟากที่ท่าดินแดงท้ายซอยเรา 5 บาท ข้ามราว 3 นาที ขึ้นท่าราชวงศ์ฝั่งไชน่าทาวน์
  ถ้าจะไปวัดโพธิ์หรือวัดอรุณต่อ อ่านวิธีเลือกเรือได้ในคู่มือเรือเจ้าพระยาของเรา
- EN: **What is the cheapest way across to the Phra Nakhon side?**
  The cross-river ferry from Tha Din Daeng pier at the end of our lane: ฿5, about three minutes,
  landing at Ratchawong pier on the Chinatown side. If you are carrying on to Wat Pho or Wat Arun,
  our Chao Phraya boat guide explains which boat does what.
- ที่มา: ตัวเลข 5 บาท / ~3 นาที / ท่าราชวงศ์ มีอยู่ในหลายหน้าตรงกัน

**ข้อ 3**
- ไทย: **ควรไปจุดไหนตอนเช้า จุดไหนตอนเย็น**
  วัดไปตอนเช้าดีที่สุด แดดยังไม่แรงและคนยังไม่แน่น ส่วนเยาวราชเป็นย่านกลางคืน ร้านรถเข็น
  เริ่มคึกหลังหัวค่ำ สวนลอยฟ้ากับริมน้ำฝั่งเราเหมาะช่วงบ่ายแก่ถึงพระอาทิตย์ตก
- EN: **What is worth doing in the morning, and what after dark?**
  Temples are best early, before the heat and the crowds. Yaowarat is a night street: the food
  carts get going after dusk. The Sky Park and our own riverside are at their best from late
  afternoon into sunset.
- ที่มา: three-temples-boat ("ไปเช้า อากาศเย็น วัดยังไม่แน่น"), yaowarat-night-walk ("ออก 18:30"),
  thonburi-riverside-evening ("ขึ้นสวนลอยฟ้าให้ทันแสงตอนเย็น")

---

## 2. thonburi-one-day.html — ถามบ่อย 3 ข้อ

**ข้อ 1**
- ไทย: **วันจันทร์เดินเส้นนี้ได้ไหม**
  ได้ แต่ไม่ใช่วันที่ดีที่สุด ร้านย่านเยาวราชหยุดวันจันทร์ค่อนข้างเยอะ ถ้าเลือกได้แนะนำ
  อังคารถึงอาทิตย์ ถ้าติดวันจันทร์จริง ๆ สลับช่วงเย็นไปเป็นริมน้ำฝั่งธนฯ แทนได้
- EN: **Does this route work on a Monday?**
  It works, but it is not the best day: a fair number of Yaowarat places close on Mondays.
  Tuesday to Sunday is easier. If Monday is your only day, swap the evening leg for the
  Thonburi riverside instead.
- ที่มา: หน้านี้เขียนไว้แล้วว่า "อังคาร-อาทิตย์ (วันจันทร์ร้านเยาวราชหยุดเยอะ)"

**ข้อ 2**
- ไทย: **วันนี้เดินเยอะแค่ไหน**
  รวมทั้งวันราว 6–8 กิโลเมตร กระจายเป็นช่วงสั้น ๆ ระหว่างจุด ไม่ได้เดินรวดเดียว
  รองเท้าที่เดินสบายสำคัญกว่าอย่างอื่น และเข้าวัดต้องคลุมไหล่-เข่า
- EN: **How much walking is this?**
  Roughly 6–8 km across the whole day, broken into short stretches between stops rather than
  one long march. Comfortable shoes matter more than anything else here, and the temples
  require covered shoulders and knees.
- ที่มา: หน้านี้เขียนไว้แล้วว่า "วันนี้เดินรวม 6-8 กม." และ "เข้าวัดต้องสุภาพ (คลุมไหล่-เข่า)"

**ข้อ 3**
- ไทย: **เหนื่อยกลางวันกลับมาพักก่อนได้ไหม**
  ได้ทุกจุด ทุกจุดในแผนนี้ห่างที่พักไม่เกิน 15 นาที กลับมางีบตอนบ่ายแล้วค่อยออกไปต่อ
  ตอนเย็นเป็นวิธีที่เราแนะนำกับแขกที่มากับเด็กหรือผู้สูงอายุ
- EN: **Can I come back to rest in the middle of the day?**
  From any stop. Nothing on this route is more than 15 minutes from the hotel, so an afternoon
  nap before the evening leg is easy. It is what we suggest to guests travelling with small
  children or older parents.
- ที่มา: หน้านี้เขียนไว้แล้วว่า "ทุกจุดในแพลนอยู่ห่างที่พักไม่เกิน 15 นาที กลับมาพักเที่ยง"

---

## 3. สิ่งที่ผมไม่เขียนให้ เพราะไม่มีข้อมูลบนเว็บรองรับ

| อยากได้ | ทำไมยังไม่เขียน |
|---|---|
| ค่าเข้าชมวัดต่าง ๆ | เว็บเราไม่เคยพิมพ์ตัวเลขนี้ และราคาเปลี่ยนได้ `[VERIFY]` ต้องไปดูหน้างาน |
| เวลาเปิด-ปิดของแต่ละวัด | เหมือนกัน — เขียนแล้วจะกลายเป็นข้อมูลที่ต้องคอยตามแก้ |
| ชื่อร้านอาหารเจาะจงในหน้าไกด์ | เป็นจุดยืนของเว็บอยู่แล้ว (หน้าทรงวาดอธิบายไว้ว่าไม่ระบุชื่อร้านเพราะร้านเปลี่ยนเร็ว) |
| เวลาเรือรอบสุดท้าย | เว็บบอกให้ "ถ่ายรูปป้ายเวลาเรือรอบสุดท้ายไว้" ซึ่งถูกแล้ว อย่าพิมพ์เวลาตายตัว |

---

# ร่างรอบ 2 (27 ก.ย. 2569) — ขยาย 5 หน้าที่บาง · รออนุมัติก่อนใส่หน้าจริง

ที่มาของทุกย่อหน้าอยู่ในวงเล็บท้ายข้อ ถ้าเจ้าของตอบ "ใช้ได้" ผมใส่ลงหน้าจริงทั้งไทย/อังกฤษได้ทันที
ข้อที่ต้องให้เจ้าของยืนยันก่อน อยู่ในตาราง **ก่อนใช้ร่าง: ข้อความเดิมที่ยังไม่มีหลักฐาน** ท้ายหมวดนี้

## 1. near-iconsiam.html — เพิ่มหัวข้อ "ไป ICONSIAM ให้ถูกจังหวะ"

- ไทย:
  **ไป ICONSIAM ให้ถูกจังหวะ**
  - **สาย–บ่าย: สายสีทองสถานีเดียว** ห้างเปิดแล้ว แดดแรง นั่งรถไฟฟ้าจากสถานีคลองสาน 1 สถานี ทางออกเชื่อมเข้าห้างตรง ๆ ไม่ต้องเดินกลางแดด
  - **เย็น: เดินไปทางสวนลอยฟ้า แล้วค่อยเข้าห้าง** แดดร่มแล้ว เดินเลียบฝั่งธนฯ ได้บรรยากาศชุมชนก่อน แล้วค่อยเข้าห้างตอนไฟเปิด
  - **กลับดึก หิ้วของเยอะ: เรียก Grab/แท็กซี่ ~5–10 นาที** ไม่ต้องลุ้นรอบรถไฟฟ้า ดูวิธีเรียกรถทีละขั้นในคู่มือ Grab และ Bolt ของเรา
- EN:
  **Getting to ICONSIAM at the right time**
  - **Late morning to afternoon: one Gold Line stop.** The mall is open and the sun is fierce — one stop from Khlong San station, with an exit that leads straight into the mall.
  - **Evening: walk via the Sky Park side, then go in.** Once the heat drops, walk along the Thonburi bank first and reach the mall as the lights come on.
  - **Late, with shopping bags: Grab or taxi, ~5–10 minutes.** No worrying about the last train — our Grab & Bolt guide shows how, step by step.
- ที่มา: สายสีทอง 1 สถานี/ทางออกเชื่อมห้าง (near-iconsiam `ni.go.1`), เดิน 25–30 นาที (`ni.go.3`, `ni.a2`), Grab 5–10 นาที (`ni.go.2`), สวนลอยฟ้า (getting-around-bangkok), คู่มือ Grab/Bolt (ride-hailing-guide)

## 2. near-chinatown.html — เพิ่มหัวข้อ "เลือกไกด์ไชน่าทาวน์ตามเวลาที่มี"

- ไทย:
  **มีเวลาเท่าไร เลือกเส้นไหน**
  - **2 ชั่วโมงตอนค่ำ** → เยาวราชกลางคืน: เรือ 3 นาที กิน 6 จุด กลับทันเรือรอบสุดท้าย 20:30
  - **เช้าก่อนเที่ยง** → สำเพ็งตอนเช้า: ตรอกค้าส่งช่วงคึกที่สุด กลับถึงที่พักก่อนเที่ยง
  - **บ่ายแก่–หัวค่ำ** → ถนนทรงวาด: ตึกเก่า โกดังจริง คาเฟ่ แกลเลอรี ขึ้นเรือจากท่าหัวถนน
  - **ครึ่งวันเต็ม** → เดินเที่ยวมรดกไชน่าทาวน์: 8 จุด ~4 กม. 4–5 ชั่วโมง
  - **มาช่วงเทศกาล** → เทศกาลไชน่าทาวน์: กินเจ ตรุษจีน และคืนที่คึกที่สุด
- EN:
  **How much time do you have?**
  - **2 hours in the evening** → Yaowarat night walk: 3-minute ferry, 6 food stops, back before the 8:30 PM last boat.
  - **A morning** → Sampeng in the morning: the wholesale lanes at their busiest, home before noon.
  - **Late afternoon** → Song Wat Road: old shophouses, working godowns, cafés and galleries, from the pier at the head of the street.
  - **Half a day** → Chinatown heritage walk: 8 stops, ~4 km, 4–5 hours.
  - **Festival season** → Chinatown festivals: Vegetarian Festival, Chinese New Year and the busiest nights.
- ที่มา: yaowarat-night-walk (2 ชม. 6 จุด เรือ 20:30), sampeng-morning (H1 "กลับที่พักก่อนเที่ยง"), song-wat-road, heritage-walk (`hw.f2` 4 กม. 4–5 ชม.), chinatown-festivals

## 3. thonburi-one-day.html — เพิ่มตารางสรุป + ทางเลือกวันฝนตก

- ไทย: ตารางใต้หัวข้อ "เส้นทางทั้งวัน"

  | เวลา | จุด | ไปยังไง |
  |---|---|---|
  | 08:00 | กาแฟ + ตลาดเช้าคลองสาน | เดินจากที่พัก |
  | 09:30 | วัดอรุณ | แท็กซี่/วิน ~10 นาทีถึงท่าเรือ แล้วข้ามฟาก |
  | 11:30 | ชุมชนกุฎีจีน | เรือ/รถกลับฝั่งธนฯ |
  | 13:00 | มื้อเที่ยง + สวนลอยฟ้า | เดิน |
  | 15:30 | ICONSIAM | สายสีทอง 1 สถานี |
  | 18:30 | เยาวราช | แท็กซี่ ~10 นาที |

  **ถ้าฝนตก:** สลับช่วงบ่ายเป็นห้างกับวิหารมีหลังคา ตามแผนวันฝนตกของเรา แล้วเก็บวัดอรุณกับกุฎีจีนไว้เช้าวันถัดไป
- EN: same table in English + "**If it rains:** swap the afternoon for the mall and covered temple halls from our rainy-day plan, and keep Wat Arun and Kudi Chin for the next morning."
- ที่มา: td.s1–s6 (เวลาและวิธีเดินทางทุกแถว), td.tip.1 ("หน้าฝนสลับแพลนเอาห้าง/ชุมชนไว้ช่วงบ่าย"), rainy-day-indoor

## 4. loy-krathong.html — เพิ่มหัวข้อ "ถ้ามาไม่ตรงคืนลอยกระทง"

- ไทย:
  **มาไม่ตรงวันก็ยังได้คืนริมน้ำ**
  คืนอื่นในเดือนพฤศจิกายน ริมเจ้าพระยาฝั่งเราก็ยังมีแสงไฟสองฝั่งแม่น้ำให้ดู ขึ้นสวนลอยฟ้าตอนหัวค่ำ (เดินจากที่พัก ~15 นาที) หรือตามแผนเย็นริมน้ำฝั่งธนฯ ของเรา ที่ต่อคาเฟ่ริมน้ำ สวนลอยฟ้า และล้ง 1919 ไว้ในเย็นเดียว
- EN:
  **Not here on the night itself?**
  Any evening in November the river still glows from both banks. Walk up to the Sky Park at dusk (~15 minutes from us), or follow our Thonburi riverside evening, which strings riverside cafés, the Sky Park and Lhong 1919 into one evening.
- ที่มา: `lk.spot.3` (สวนลอยฟ้า ~15 นาที), thonburi-riverside-evening (H1)
- หมายเหตุปีต่อไป: จุดที่ต้องแก้ทุกปีคือ `lk.h1`, `lk.sub`, `lk.f1`, `lk.q1`, `lk.a1`, title/og/Article headline และ `assets/festivals.json`

## 5. new-year-countdown.html — เพิ่มหัวข้อ "ถ้ามาช่วงปีใหม่แต่ไม่ใช่คืน 31"

- ไทย:
  **วันอื่นช่วงปีใหม่ ทำอะไรดี**
  1 มกราคมหลายคนไปทำบุญวัดโพธิ์หรือวัดอรุณ (ไปได้ครึ่งวันทางเรือจากท่าท้ายซอย) ส่วนค่ำ ๆ ริมน้ำฝั่งเราเงียบลงแล้ว เหมาะกับเย็นริมน้ำฝั่งธนฯ หรือเยาวราชกลางคืน ระวังว่าช่วงวันหยุดยาวร้านบางร้านปิด
- EN:
  **Around New Year but not on the 31st?**
  On 1 January many people make merit at Wat Pho or Wat Arun — half a day by boat from our pier. In the evenings our riverside is calm again: good for the Thonburi riverside evening or the Yaowarat night walk. Some places close over the long holiday.
- ที่มา: `ny.why.3` ("วัดโพธิ์-วัดอรุณ (ไปทำบุญปีใหม่)"), three-temples-boat, thonburi-riverside-evening, yaowarat-night-walk

## ก่อนใช้ร่าง: ข้อความเดิมที่ยังไม่มีหลักฐาน (อยู่บนหน้าจริงตอนนี้)

| หน้า | ข้อความ | ปัญหา | ทางเลือก |
|---|---|---|---|
| near-iconsiam `ni.sub` | "จ่ายค่าห้องไม่ถึงหนึ่งในสามของโรงแรมริมน้ำ" | ตัวเลขเปรียบเทียบไม่มีที่มา และเว็บตัดข้อความเคลมราคาไปแล้วตามนโยบาย rate parity | ตัดครึ่งหลังออก เหลือ "…แต่เที่ยวที่เดียวกัน" |
| near-iconsiam `ni.why.1` | "โรงแรมติด ICONSIAM เริ่มที่คืนละ 3,000–10,000 บาท — ห้องเราถูกกว่ากันหลายเท่า" | ราคาโรงแรมอื่นเปลี่ยนตลอด เช็กไม่ได้ | "ห้องเราประหยัดกว่าโรงแรมติดห้าง ส่วนต่างเอาไปช้อปได้" ไม่ใส่ตัวเลข |
| near-chinatown `nc.why.1` | "โรงแรมย่านเยาวราชคืนละ 1,500–4,000 บาท" "ถูกกว่าครึ่งต่อครึ่ง" | เหมือนกัน | ตัดตัวเลข |
| new-year `ny.why.2` | "โรงแรมริมน้ำ… ราคาพุ่ง 3–5 เท่า" | เหมือนกัน | "ราคาพุ่งและเต็มเร็ว" ไม่ใส่ตัวเลข |
| near-iconsiam `ni.a1` | "BTS สายสีทองให้บริการถึงประมาณเที่ยงคืน" | ไม่มีแหล่งในเว็บ | เจ้าของยืนยัน หรือเปลี่ยนเป็น "ดูเวลารอบสุดท้ายที่สถานี" |
| new-year `ny.spot.3` | "ดาดฟ้า/ระเบียงที่พัก: ห้องฝั่งวิวเมืองเห็นแสงพลุ" | ต้องรู้ว่าห้องไหนเห็นจริง | เจ้าของยืนยัน หรือตัดข้อนี้ |
| near-iconsiam `ni.go.2` | "ค่ารถ ~50–70 บาท" | หน้าอื่นไม่มีตัวเลขนี้ให้เทียบ | เจ้าของยืนยัน |
| near-chinatown `nc.f2`, `nc.go.3`, near-iconsiam `ni.why.2` | "สำเพ็ง ~900 ม." / "ตลาดสำเพ็งฝั่งธนฯ" | ขัดกับหน้าสำเพ็ง (P0 ข้อ 3) | รอเจ้าของ |
