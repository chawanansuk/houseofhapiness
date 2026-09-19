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
