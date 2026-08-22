/* ระบบสองภาษา ไทย/อังกฤษ — ใช้ร่วมกันทั้ง index.html และ booking.html
   วิธีใช้: ใส่ data-i18n="key" บน element แล้วสคริปต์จะแทนข้อความให้ตามภาษาที่เลือก */

const I18N = {
  /* ── ส่วนกลาง ── */
  "nav.home":        { th: "หน้าหลัก", en: "Home" },
  "nav.book":        { th: "จองเลย", en: "Book Now" },
  "nav.rooms":       { th: "ห้องพัก", en: "Rooms" },
  "nav.gallery":     { th: "รูปภาพ", en: "Gallery" },
  "nav.location":    { th: "ที่ตั้ง", en: "Location" },
  "nav.faq":         { th: "คำถาม", en: "FAQ" },
  "nav.reviews":     { th: "รีวิว", en: "Reviews" },
  "bk.viewsummary":  { th: "ดูสรุปการจอง", en: "View summary" },
  "brand.sub":       { th: "เฮาส์ ออฟ แฮปปิเนส · คลองสาน กรุงเทพฯ", en: "Aparthotel · Khlong San, Bangkok" },
  "footer.addr":     { th: "558/1 ถนนท่าดินแดง 16 คลองสาน กรุงเทพฯ 10600",
                       en: "558/1 Tha Din Daeng 16, Khlong San, Bangkok 10600" },
  "footer.or":       { th: "หรือจองผ่าน", en: "Or book via" },
  "skip":            { th: "ข้ามไปยังเนื้อหา", en: "Skip to content" },
  "foot.desc":       { th: "เซอร์วิสอพาร์ตเมนต์ 15 ยูนิต 3 แบบ ใจกลางคลองสาน ใกล้แม่น้ำเจ้าพระยาและ ICONSIAM",
                       en: "15 serviced apartments in three styles in the heart of Khlong San, near the Chao Phraya River and ICONSIAM." },
  "foot.menu":       { th: "เมนู", en: "Menu" },
  "foot.booking":    { th: "การจอง", en: "Booking" },
  "loc.open":        { th: "เปิดใน Google Maps →", en: "Open in Google Maps →" },

  /* ── หน้าหลัก ── */
  "hero.tagline":    { th: "อพาร์ตโฮเทลอบอุ่นใจกลางคลองสาน ใกล้แม่น้ำเจ้าพระยา สำเพ็ง วัดโพธิ์ และ ICONSIAM",
                       en: "A cozy aparthotel in the heart of Khlong San — minutes from the Chao Phraya River, Sampeng Market, Wat Pho, and ICONSIAM." },
  "hero.direct":     { th: "จองตรงกับเรา — ราคาดีที่สุด", en: "Book Direct — Best Rate" },
  "hero.booking":    { th: "จองผ่าน Booking.com", en: "Book on Booking.com" },
  "hero.rating":     { th: "คะแนนรีวิว <strong>8.8 / 10</strong> จากผู้เข้าพักจริงกว่า 770 รีวิวบน Booking.com",
                       en: "Rated <strong>8.8 / 10</strong> from 770+ verified guest reviews on Booking.com" },
  "about.title":     { th: "เกี่ยวกับเรา", en: "About" },
  "about.body":      { th: "House of Happiness เป็นเซอร์วิสอพาร์ตเมนต์ 15 ยูนิต มีห้องให้เลือก 3 แบบ — Standard เตียงใหญ่, Studio 2 เตียงแยก และ Deluxe ที่มีห้องนั่งเล่นแยกเป็นสัดส่วน ทุกห้องมีระเบียงวิวเมือง แอร์ ตู้เย็น และทีวีจอแบน มีเครื่องซักผ้าหยอดเหรียญในอาคาร ฟรี Wi-Fi และน้ำดื่มทุกการเข้าพัก",
                       en: "House of Happiness offers 15 serviced apartments in three styles — Standard (double bed), Studio (twin beds) and Deluxe (separate living room). Every unit has a city-view balcony, air conditioning, a refrigerator, and a flat-screen TV. A coin-operated laundry is available on site. Free Wi-Fi and complimentary bottled water with every stay." },
  "rooms.title":     { th: "ห้องพักและราคา", en: "Rooms & Rates" },
  "rooms.std.name":  { th: "ห้อง Standard — เตียงใหญ่", en: "Standard Apartment — Double Bed" },
  "rooms.std.desc":  { th: "เตียงใหญ่ 1 เตียง · ระเบียงวิวเมือง · ตู้เย็น · แอร์ · ทีวี · ห้องน้ำในตัว (ฝักบัว) · พัก 2 ท่าน",
                       en: "1 double bed · city-view balcony · fridge · air-con · TV · en-suite bathroom (shower) · sleeps 2" },
  "rooms.stu.name":  { th: "ห้อง Studio — 2 เตียงแยก", en: "Studio Apartment — Twin Beds" },
  "rooms.stu.desc":  { th: "2 เตียงแยก เหมาะเพื่อน/พี่น้อง · ระเบียงวิวเมือง · ตู้เย็น · แอร์ · ทีวี · ห้องน้ำในตัว · พัก 2 ท่าน (สูงสุด 3)",
                       en: "2 single beds, great for friends · city-view balcony · fridge · air-con · TV · en-suite bathroom · sleeps 2 (max 3)" },
  "rooms.dlx.name":  { th: "ห้อง Deluxe — มีห้องนั่งเล่นแยก", en: "Deluxe Apartment — Separate Living Room" },
  "rooms.dlx.desc":  { th: "ห้องนอนแยก + ห้องนั่งเล่นแยกเป็นสัดส่วน · โซฟา · ระเบียงวิวเมือง · ตู้เย็น · แอร์ · ทีวี · ห้องน้ำในตัว · พัก 2 ท่าน (สูงสุด 3)",
                       en: "Separate bedroom + private living room with sofa · city-view balcony · fridge · air-con · TV · en-suite bathroom · sleeps 2 (max 3)" },
  "rooms.from":      { th: "เริ่มต้น", en: "From" },
  "rooms.night":     { th: "/ คืน", en: "/ night" },
  "rooms.cta":       { th: "เช็คห้องว่างและจอง", en: "Check availability & book" },
  "gallery.title":   { th: "รูปห้องพัก", en: "Gallery" },
  "gallery.bedroom": { th: "ห้องนอน", en: "Bedroom" },
  "gallery.living":  { th: "ห้องนั่งเล่น", en: "Living room" },
  "gallery.bath":    { th: "ห้องน้ำ", en: "Bathroom" },
  "gallery.balcony": { th: "ระเบียงส่วนตัว", en: "Private balcony" },
  "gallery.twin":    { th: "ห้อง Studio (2 เตียงแยก)", en: "Studio room (twin beds)" },
  "gallery.entrance":{ th: "ทางเข้าที่พัก", en: "The entrance" },
  "gallery.reception":{ th: "จุดต้อนรับ / เช็คอิน", en: "Reception / check-in" },
  "loc.handmap":     { th: "แผนที่ฉบับวาดมือของเรา — เรือ รถไฟฟ้า และจุดเที่ยวรอบที่พัก", en: "Our hand-drawn area map — boats, trains and sights around the hotel" },
  "gallery.building":{ th: "ตัวอาคาร", en: "The building" },
  "gallery.all":     { th: "ดูรูปทั้งหมด (30+ รูป) →", en: "See all photos (30+) →" },
  "amen.title":      { th: "สิ่งอำนวยความสะดวก", en: "Amenities" },
  "amen.1":  { th: "ฟรี Wi-Fi ทุกห้อง", en: "Free in-room Wi-Fi" },
  "amen.2":  { th: "เครื่องปรับอากาศ", en: "Air conditioning" },
  "amen.3":  { th: "ระเบียงวิวเมือง", en: "Balcony with city view" },
  "amen.4":  { th: "ตู้เย็นในห้อง", en: "In-room refrigerator" },
  "amen.5":  { th: "ทีวีจอแบน (เคเบิล)", en: "Flat-screen cable TV" },
  "amen.6":  { th: "เครื่องซักผ้าหยอดเหรียญ (เหรียญ 10)", en: "Coin-operated laundry (฿10)" },
  "amen.7":  { th: "เตารีดและโต๊ะรีดผ้า", en: "Iron & ironing board" },
  "amen.8":  { th: "น้ำดื่มฟรี", en: "Free bottled water" },
  "amen.9":  { th: "ห้องน้ำในตัว พร้อมไดร์เป่าผม", en: "En-suite bathroom with hairdryer" },
  "loc.title":       { th: "ที่ตั้งและการเดินทาง", en: "Location & Getting Here" },
  "loc.near":        { th: "ห่างจากสำเพ็งประมาณ 900 ม. · วัดโพธิ์ 1.8 กม. · ใกล้ River City และ ICONSIAM (รถ ~5 นาที)",
                       en: "About 900 m from Sampeng Market · 1.8 km from Wat Pho · a short drive (~5 min) from River City Bangkok and ICONSIAM." },
  "faq.title":       { th: "คำถามที่พบบ่อย", en: "FAQ" },
  "faq.q1":          { th: "เช็คอิน–เช็คเอาท์กี่โมง?", en: "What are the check-in / check-out times?" },
  "faq.a1":          { th: "เช็คอิน 14:00–22:00 น. (พนักงานอยู่ถึง 18:00 น. หลังจากนั้นเป็นระบบเช็คอินด้วยตัวเอง — กรุณาแจ้งเวลามาถึงล่วงหน้า) เช็คเอาท์ภายใน 12:00 น. หย่อนกุญแจลงกล่อง Check-out ที่จุดต้อนรับได้เลย",
                       en: "Check-in 14:00–22:00 (staff on duty until 18:00, self check-in after that — please tell us your arrival time). Check-out by 12:00 — just drop your key in the check-out box at reception." },
  "faq.q2":          { th: "มีค่ามัดจำไหม?", en: "Is there a deposit?" },
  "faq.a2":          { th: "มีมัดจำ 1,000 บาทตอนเช็คอิน และคืนเต็มจำนวนตอนเช็คเอาท์ (กรณีไม่มีความเสียหาย)",
                       en: "A ฿1,000 deposit is collected at check-in and fully refunded at check-out (assuming no damage)." },
  "faq.q3":          { th: "ชำระเงินอย่างไรได้บ้าง?", en: "How can I pay?" },
  "faq.a3":          { th: "รับเงินสดและโอนผ่านธนาคาร/พร้อมเพย์ รายละเอียดจะแจ้งตอนยืนยันการจอง",
                       en: "We accept cash and Thai bank transfer / PromptPay. Details are provided when we confirm your booking." },
  "faq.q4":          { th: "จองตรงต่างจากจองผ่าน Booking.com อย่างไร?", en: "Why book direct instead of Booking.com?" },
  "faq.a4":          { th: "จองตรงไม่มีค่าคอมมิชชั่นคนกลาง เราจึงให้ราคาดีกว่าและยืดหยุ่นเรื่องเวลาเช็คอิน/คำขอพิเศษได้มากกว่า",
                       en: "Direct bookings carry no middleman commission, so we can offer better rates and more flexibility on check-in times and special requests." },
  "faq.q5":          { th: "มีที่จอดรถไหม?", en: "Is there parking?" },
  "faq.a5":          { th: "ที่พักไม่มีที่จอดรถ แนะนำเดินทางด้วยแท็กซี่/Grab, รถไฟฟ้าสายสีทอง (สถานีคลองสาน) หรือเรือข้ามฟากมาลงท่าดินแดงจะสะดวกที่สุด",
                       en: "There is no on-site parking. We recommend taxi/Grab, the Gold Line (Khlong San station), or the cross-river ferry to Tha Din Daeng pier." },
  "cta.title":       { th: "พร้อมเข้าพักหรือยัง?", en: "Ready for your stay?" },
  "cta.body":        { th: "จองตรงกับเราได้ราคาดีที่สุด — หรือเช็คห้องว่างบน Booking.com",
                       en: "Book direct for our best rate — or check availability on Booking.com." },
  "cta.direct":      { th: "จองตรงกับเรา", en: "Book Direct" },
  "cta.booking":     { th: "ดูบน Booking.com", en: "Check on Booking.com" },

  /* ── แถบจุดเด่นใต้ hero ── */
  "hl.1":            { th: "คะแนนรีวิว 8.8/10", en: "Rated 8.8/10" },
  "hl.2":            { th: "จองตรงถูกกว่า", en: "Cheaper booked direct" },
  "hl.3":            { th: "ใกล้แม่น้ำเจ้าพระยา", en: "Near the Chao Phraya" },
  "hl.4":            { th: "ยืนยันภายใน 24 ชม.", en: "Confirmed within 24 h" },

  /* ── รีวิว ── */
  "rev.title":       { th: "เสียงจากผู้เข้าพัก", en: "What Guests Say" },
  "rev.outof":       { th: "จากคะแนนเต็ม 10", en: "out of 10" },
  "rev.count":       { th: "จากผู้เข้าพักจริงกว่า 770 รีวิว", en: "from 770+ verified guest reviews" },
  "rev.grade":       { th: "ระดับ “ยอดเยี่ยม”", en: "Rated “Fabulous”" },
  "rev.chips.title": { th: "สิ่งที่ผู้เข้าพักพูดถึงบ่อย", en: "Guests often mention" },
  "rev.chip1":       { th: "📍 ทำเลดี เดินทางสะดวก", en: "📍 Great location" },
  "rev.chip2":       { th: "🧹 ห้องกว้าง สะอาด", en: "🧹 Spacious & clean rooms" },
  "rev.chip3":       { th: "💛 เจ้าของเป็นกันเอง", en: "💛 Friendly hosts" },
  "rev.chip4":       { th: "💰 คุ้มค่าเกินราคา", en: "💰 Excellent value" },
  "rev.link":        { th: "อ่านรีวิวทั้งหมดบน Booking.com →", en: "Read all reviews on Booking.com →" },

  /* ── สถานที่ใกล้เคียง ── */
  "near.title":      { th: "สถานที่ใกล้เคียง", en: "Nearby Attractions" },
  "near.1":          { th: "ตลาดสำเพ็ง", en: "Sampeng Market" },
  "near.1.d":        { th: "~900 ม.", en: "~900 m" },
  "near.2":          { th: "สวนลอยฟ้าเจ้าพระยา", en: "Chao Phraya Sky Park" },
  "near.2.d":        { th: "~1.3 กม.", en: "~1.3 km" },
  "near.3":          { th: "วัดโพธิ์", en: "Wat Pho" },
  "near.3.d":        { th: "~1.8 กม.", en: "~1.8 km" },
  "near.4":          { th: "เยาวราช (ไชน่าทาวน์)", en: "Yaowarat (Chinatown)" },
  "near.4.d":        { th: "~2 กม.", en: "~2 km" },
  "near.5":          { th: "ICONSIAM", en: "ICONSIAM" },
  "near.5.d":        { th: "รถ ~5 นาที", en: "~5 min drive" },
  "near.6":          { th: "River City Bangkok", en: "River City Bangkok" },
  "near.6.d":        { th: "รถ ~5 นาที", en: "~5 min drive" },
  "near.more":       { th: "ดูแหล่งท่องเที่ยวใกล้ที่พักทั้งหมด →", en: "Explore all nearby attractions →" },

  /* ── กล่องเช็คห้องว่างใน hero ── */
  "hb.cta":          { th: "เช็คห้องว่าง →", en: "Check availability →" },

  /* ── แถบตัวเลข ── */
  "nb.l1":           { th: "ยูนิตทั้งหมด", en: "apartment units" },
  "nb.l2":           { th: "คะแนนจากผู้เข้าพักจริง", en: "verified guest score" },
  "nb.l3":           { th: "รีวิวบน Booking.com", en: "reviews on Booking.com" },
  "nb.l4":           { th: "ถึง ICONSIAM", en: "to ICONSIAM" },

  /* ── จุดเด่นห้องพัก (about) ── */
  "ab.f1":           { th: "ห้อง 3 แบบ: เตียงใหญ่ / 2 เตียง / มีห้องนั่งเล่น", en: "3 room styles: double / twin / with living room" },
  "ab.f2":           { th: "ตู้เย็นในห้อง + ซักผ้าหยอดเหรียญ", en: "In-room fridge + coin laundry on site" },
  "ab.f3":           { th: "ระเบียงส่วนตัววิวเมือง", en: "Private city-view balcony" },
  "ab.f4":           { th: "เช็คอินยืดหยุ่น แจ้งล่วงหน้าได้", en: "Flexible check-in on request" },

  /* ── เครดิตรูป footer ── */
  "foot.credit":     { th: "รูปสถานที่ท่องเที่ยวจาก Wikimedia Commons — ดูเครดิต", en: "Attraction photos from Wikimedia Commons — see credits" },

  /* ── เช็คห้องว่างเรียลไทม์ ── */
  "av.checking":     { th: "กำลังเช็คห้องว่าง…", en: "Checking availability…" },
  "av.unavailable":  { th: "ยังยืนยันห้องว่างไม่ได้ — กรุณาส่งคำขอเพื่อให้ทางที่พักตรวจสอบ", en: "Live availability is temporarily unavailable — send your request and the hotel will check for you." },
  "av.left.pre":     { th: "✓ วันที่เลือกว่าง — เหลือ ", en: "✓ Available — " },
  "av.left.post":    { th: " ห้อง", en: " room(s) left" },
  "av.low.pre":      { th: "⚡ ใกล้เต็ม! เหลือเพียง ", en: "⚡ Almost full! Only " },
  "av.low.post":     { th: " ห้องสุดท้าย", en: " room(s) left" },
  "av.full":         { th: "ขออภัย วันที่เลือกห้องเต็ม — ลองเลื่อนวันดูนะครับ", en: "Sorry, we're fully booked on those dates — try different dates" },
  "av.note":         { th: "ตามข้อมูลระบบ ยืนยันแน่นอนอีกครั้งเมื่อเราตอบกลับ", en: "Based on live data — final confirmation in our reply" },
  "av.uncertain":    { th: "ส่งคำขอมาได้เลย — เราจะเช็คห้องว่างและยืนยันให้ภายใน 24 ชม.", en: "Send your request — we'll check availability and confirm within 24 hrs" },

  /* ── ขั้นตอนการจอง 3 สเต็ป ── */
  "bs.t":            { th: "จองง่าย ๆ ใน 3 ขั้นตอน", en: "How booking works" },
  "bs.1":            { th: "ส่งคำขอจอง", en: "Send your request" },
  "bs.1.d":          { th: "เลือกวัน กรอกชื่อ แล้วส่ง — ฟรี ไม่ผูกมัด", en: "Pick your dates and send — free, no commitment" },
  "bs.2":            { th: "เรายืนยันภายใน 24 ชม.", en: "We confirm within 24 h" },
  "bs.2.d":          { th: "เช็คห้องว่างแล้วตอบกลับทางอีเมล/LINE", en: "We check availability and reply by email/LINE" },
  "bs.3":            { th: "จ่ายที่โรงแรม", en: "Pay at the hotel" },
  "bs.3.d":          { th: "เงินสด โอน พร้อมเพย์ หรือลิงก์ชำระเงินที่เราส่งให้", en: "Cash, transfer, PromptPay — or a payment link we send you" },

  /* ── ทำไมต้องจองตรง ── */
  "wbd.title":       { th: "ทำไมต้องจองตรงกับเรา", en: "Why Book Direct" },
  "wbd.direct":      { th: "จองตรงกับเรา", en: "Book direct" },
  "wbd.ota":         { th: "จองผ่านเว็บตัวกลาง", en: "Via OTA sites" },
  "wbd.r1":          { th: "ราคา", en: "Price" },
  "wbd.r1.a":        { th: "ไม่มีค่าคอมมิชชั่นคนกลาง — ได้ราคาดีที่สุด", en: "No middleman commission — best rate" },
  "wbd.r1.b":        { th: "รวมค่าคอมมิชชั่น ~15-18%", en: "Includes ~15-18% commission" },
  "wbd.r2":          { th: "การติดต่อ", en: "Communication" },
  "wbd.r2.a":        { th: "คุยกับเราตรง ตอบไว แก้ไขการจองง่าย", en: "Talk to us directly — fast replies, easy changes" },
  "wbd.r2.b":        { th: "ผ่านระบบกลาง ตอบช้ากว่า", en: "Through a middle platform" },
  "wbd.r3":          { th: "เวลาเช็คอิน", en: "Check-in time" },
  "wbd.r3.a":        { th: "ยืดหยุ่นได้ตามห้องว่าง แจ้งล่วงหน้าได้เลย", en: "Flexible when rooms allow — just ask" },
  "wbd.r3.b":        { th: "ตามเงื่อนไขมาตรฐาน", en: "Standard policy only" },
  "wbd.r4":          { th: "คำขอพิเศษ", en: "Special requests" },
  "wbd.r4.a":        { th: "แจ้งกับเราโดยตรง ไม่ตกหล่น", en: "Sent straight to us — never lost" },
  "wbd.r4.b":        { th: "ส่งผ่านระบบ อาจตกหล่น", en: "Relayed via system, can get lost" },
  "wbd.cta":         { th: "จองตรงเลย — ดีกว่าแน่นอน", en: "Book direct now" },

  /* ── การเดินทางมาที่พัก ── */
  "gh.title":        { th: "การเดินทางมาที่พัก", en: "Getting Here" },
  "gh.1.t":          { th: "จากสนามบินสุวรรณภูมิ", en: "From Suvarnabhumi Airport" },
  "gh.1.d":          { th: "แท็กซี่ ~45-60 นาที (~350-450 บาท รวมทางด่วน) หรือ Airport Rail Link → BTS มาลงสถานีคลองสาน", en: "Taxi ~45-60 min (~350-450 THB incl. tolls), or Airport Rail Link → BTS to Khlong San station" },
  "gh.2.t":          { th: "จากสนามบินดอนเมือง", en: "From Don Mueang Airport" },
  "gh.2.d":          { th: "แท็กซี่ ~40-60 นาที (~250-350 บาท) แนะนำใช้ทางด่วนช่วงเย็น", en: "Taxi ~40-60 min (~250-350 THB); take the expressway at rush hour" },
  "gh.3.t":          { th: "โดยรถไฟฟ้า BTS", en: "By BTS Skytrain" },
  "gh.3.d":          { th: "สายสีลม ลงสถานีกรุงธนบุรี → ต่อสายสีทอง ลงสถานีคลองสาน → เดิน/วินมอเตอร์ไซค์ถึงที่พัก", en: "Silom Line to Krung Thonburi → Gold Line to Khlong San station → short walk or motorbike taxi" },
  "gh.note":         { th: "* เวลาและค่าใช้จ่ายโดยประมาณ ขึ้นกับสภาพจราจร — ต้องการให้ช่วยเรียกรถ แจ้งเราได้เลย", en: "* Times and fares are approximate. Need help arranging a pickup? Just ask us" },

  /* ── ปุ่มติดต่อลอย ── */
  "fab.contact":     { th: "ติดต่อเรา", en: "Contact us" },
  "fab.email":       { th: "อีเมลหาเรา", en: "Email us" },
  "fab.map":         { th: "เปิดแผนที่", en: "Open map" },

  /* ── หน้าแหล่งท่องเที่ยว ── */
  "atr.title":       { th: "เที่ยวอะไรใกล้ House of Happiness", en: "Things to Do near House of Happiness" },
  "atr.sub":         { th: "ทำเลคลองสาน — ริมแม่น้ำเจ้าพระยา ใกล้ BTS สายสีทอง เดินทางง่ายทั้งฝั่งธนฯ และเกาะรัตนโกสินทร์", en: "Khlong San location — on the Chao Phraya riverside near the BTS Gold Line, easy access to both Thonburi and the Old Town" },
  "atr.g1":          { th: "ใกล้ที่พัก · เดินถึง / BTS สายสีทอง", en: "Near the hotel · walkable / BTS Gold Line" },
  "atr.g2":          { th: "ข้ามฝั่งเที่ยวเมืองเก่า · แท็กซี่ ~10-15 นาที", en: "Across the river · ~10-15 min by taxi" },
  "atr.dir":         { th: "เส้นทางจากที่พัก", en: "Directions from hotel" },
  "atr.note":        { th: "* ระยะทางและเวลาเป็นค่าโดยประมาณจากที่พัก", en: "* Distances and times are approximate from the hotel" },
  "atr.credits":     { th: "เครดิตรูปภาพ (Wikimedia Commons)", en: "Photo credits (Wikimedia Commons)" },
  "atr.book":        { th: "จองห้องพักกับเรา", en: "Book your stay" },

  "atr.skypark.n":   { th: "สวนลอยฟ้าเจ้าพระยา", en: "Chao Phraya Sky Park" },
  "atr.skypark.d":   { th: "สวนบนสะพานข้ามแม่น้ำแห่งแรกของโลก จุดชมพระอาทิตย์ตกสุดสวย", en: "The world's first park bridge across a river — a beautiful sunset spot" },
  "atr.skypark.go":  { th: "เดิน ~15 นาที · ~1.3 กม.", en: "~15 min walk · ~1.3 km" },
  "atr.iconsiam.n":  { th: "ICONSIAM (ไอคอนสยาม)", en: "ICONSIAM" },
  "atr.iconsiam.d":  { th: "ห้างริมน้ำระดับแลนด์มาร์ก พร้อมตลาดน้ำในร่มเมืองสุขสยาม", en: "Landmark riverside mall with the SookSiam indoor floating market" },
  "atr.iconsiam.go": { th: "BTS สายสีทอง สถานีคลองสาน → เจริญนคร · ~2 กม.", en: "BTS Gold Line, Khlong San → Charoen Nakhon · ~2 km" },
  "atr.riverboat.n": { th: "ล่องเรือแม่น้ำเจ้าพระยา", en: "Chao Phraya River Boats" },
  "atr.riverboat.d": { th: "นั่งเรือด่วน/เรือข้ามฟากชมวิวสองฝั่งน้ำแบบคนท้องถิ่น", en: "Ride the express and cross-river boats like a local" },
  "atr.riverboat.go":{ th: "ท่าเรือคลองสาน เดิน ~15 นาที", en: "Khlong San pier, ~15 min walk" },
  "atr.kudichin.n":  { th: "ชุมชนกุฎีจีน + โบสถ์ซางตาครู้ส", en: "Kudi Chin & Santa Cruz Church" },
  "atr.kudichin.d":  { th: "ย่านโปรตุเกสเก่าแก่ริมน้ำ ชิมขนมฝรั่งกุฎีจีนต้นตำรับ", en: "Historic riverside Portuguese quarter, home of Kudi Chin cakes" },
  "atr.kudichin.go": { th: "เดิน/วินมอเตอร์ไซค์ · ~2.3 กม.", en: "Walk or short ride · ~2.3 km" },
  "atr.yaowarat.n":  { th: "เยาวราช (ไชน่าทาวน์)", en: "Yaowarat (Chinatown)" },
  "atr.yaowarat.d":  { th: "ถนนสตรีทฟู้ดกลางคืนที่ดังที่สุดของกรุงเทพฯ", en: "Bangkok's most famous night street-food strip" },
  "atr.yaowarat.go": { th: "แท็กซี่ ~10 นาที · ~2.5 กม.", en: "~10 min taxi · ~2.5 km" },
  "atr.watpho.n":    { th: "วัดโพธิ์ (พระนอน)", en: "Wat Pho (Reclining Buddha)" },
  "atr.watpho.d":    { th: "พระนอนยาว 46 เมตร และต้นตำรับนวดแผนไทย", en: "The 46-metre Reclining Buddha and the home of Thai massage" },
  "atr.watpho.go":   { th: "แท็กซี่ ~10 นาที ข้ามสะพานพุทธ · ~3.5 กม.", en: "~10 min taxi via Memorial Bridge · ~3.5 km" },
  "atr.watarun.n":   { th: "วัดอรุณราชวราราม", en: "Wat Arun (Temple of Dawn)" },
  "atr.watarun.d":   { th: "พระปรางค์ริมน้ำสัญลักษณ์ของกรุงเทพฯ สวยที่สุดช่วงพลบค่ำ", en: "Bangkok's iconic riverside spire, most beautiful at dusk" },
  "atr.watarun.go":  { th: "แท็กซี่ ~12 นาที · ~4 กม.", en: "~12 min taxi · ~4 km" },
  "atr.grandpalace.n":  { th: "พระบรมมหาราชวัง + วัดพระแก้ว", en: "Grand Palace & Emerald Buddha" },
  "atr.grandpalace.d":  { th: "จุดหมายอันดับหนึ่งที่มาเยือนกรุงเทพฯ แล้วห้ามพลาด", en: "Bangkok's number-one must-see destination" },
  "atr.grandpalace.go": { th: "แท็กซี่ ~15 นาที · ~4.5 กม.", en: "~15 min taxi · ~4.5 km" },
  "atr.pakkhlong.n":  { th: "ปากคลองตลาด", en: "Pak Khlong Talat (Flower Market)" },
  "atr.pakkhlong.d":  { th: "ตลาดดอกไม้เปิด 24 ชั่วโมง สีสันและกลิ่นหอมเต็มถนน", en: "24-hour flower market bursting with colour" },
  "atr.pakkhlong.go": { th: "แท็กซี่ ~10 นาที · ~2.5 กม.", en: "~10 min taxi · ~2.5 km" },

  /* ── หน้ากิน-เที่ยวรอบซอย ── */
  "lc.title":        { th: "กิน-เที่ยวรอบซอย ท่าดินแดง", en: "Eat & Explore: Tha Din Daeng" },
  "lc.sub":          { th: "ไกด์ลับฉบับเจ้าของที่พัก — ร้านอร่อยหน้าปากซอยที่คนท้องถิ่นกินจริง และเส้นทางเดินเที่ยวคลองสานที่นักท่องเที่ยวส่วนใหญ่ไม่รู้จัก",
                       en: "Our insider guide — the street food locals actually eat, and a Khlong San walking route most tourists never find" },
  "lc.stat1":        { th: "🍜 13 ร้านเด็ด เดินถึงใน 1-10 นาที", en: "🍜 13 food gems, 1-10 min on foot" },
  "lc.stat2":        { th: "🚶 เส้นทางเดินเที่ยว 10 จุด", en: "🚶 10-stop walking route" },
  "lc.stat3":        { th: "🚌 วิธีเดินทาง 8 แบบ", en: "🚌 8 ways to get around" },
  "lc.map.t":        { th: "🗺️ แผนที่รวมทุกจุด", en: "🗺️ Everything on one map" },
  "lc.map.lf":       { th: "ร้านอาหาร", en: "Food spots" },
  "lc.map.lw":       { th: "เส้นทางเดินเที่ยว (ตามหมายเลข)", en: "Walking route (numbered)" },
  "lc.map.note":     { th: "* ตำแหน่งจาก OpenStreetMap โดยประมาณ — กดปุ่มนำทางของแต่ละจุดเพื่อเส้นทางแม่นยำ",
                       en: "* Positions are approximate (OpenStreetMap) — use each spot's Navigate button for precise directions" },
  "lc.food.t":       { th: "🍜 ของอร่อยรอบซอย 16", en: "🍜 Street food around Soi 16" },
  "lc.food.sub":     { th: "ทุกร้านคือร้านที่เราแนะนำแขกด้วยตัวเอง — ป้าย \"เปิดอยู่\" คำนวณจากเวลาไทยตอนนี้ ระยะเดินนับจากหน้าที่พัก",
                       en: "Every spot is one we personally recommend — the \"Open now\" badge follows Bangkok time, distances start at our door" },
  "lc.walk.t":       { th: "🚶 เส้นทางเดินเที่ยวคลองสาน 10 จุด", en: "🚶 The 10-stop Khlong San walk" },
  "lc.walk.sub":     { th: "เดินจากที่พักเลียบย่านเก่าริมเจ้าพระยา จบที่ท่าน้ำคลองสาน — เดินสบาย ๆ ครึ่งวัน แวะกิน แวะไหว้พระ แวะคาเฟ่",
                       en: "From your door through the old riverside quarter to Khlong San pier — an easy half-day of temples, snacks and cafes" },
  "lc.walkfull":     { th: "เปิดเส้นทางเดินทั้งหมดใน Google Maps", en: "Open the full route in Google Maps" },
  "lc.tr.t":         { th: "🚌 เดินทางในย่านนี้ยังไง", en: "🚌 Getting around the area" },
  "lc.note":         { th: "* เวลาเปิด-ปิดและระยะเวลาเดินเป็นค่าโดยประมาณ ร้านริมทางอาจหยุดตามสะดวก — ไม่แน่ใจถามเราได้เสมอ",
                       en: "* Hours and walking times are approximate; street stalls sometimes take days off — just ask us anytime" },
  "lc.cta.d":        { th: "อยากตื่นมามีของอร่อยทั้งซอยรออยู่หน้าบ้านไหม?", en: "Want to wake up with this whole street of food at your doorstep?" },
  "lc.cta.b":        { th: "จองห้องพักกับเรา", en: "Book your stay" },
  "near.local":      { th: "🍜 ไกด์ลับ: กิน-เที่ยวรอบซอย →", en: "🍜 Insider guide: eat & explore our soi →" },

  /* ── หน้าจอง ── */
  "bk.title":        { th: "จองตรงกับ House of Happiness", en: "Book Direct with House of Happiness" },
  "bk.sub":          { th: "ราคาดีกว่าจองผ่านเว็บตัวกลาง · ยืนยันไวทาง LINE/WhatsApp", en: "Better rates than OTA sites · fast confirmation via WhatsApp or LINE" },
  "bk.back":         { th: "← กลับหน้าหลัก", en: "← Back to home" },
  "bk.step1":        { th: "เลือกประเภทห้องพัก", en: "Choose your room" },
  "bk.step2":        { th: "เลือกวันเข้าพัก", en: "Choose your dates" },
  "bk.step3":        { th: "ข้อมูลผู้จอง", en: "Your details" },
  "bk.step4":        { th: "สรุปการจอง", en: "Booking summary" },
  "bk.checkin":      { th: "วันเช็คอิน", en: "Check-in date" },
  "bk.checkout":     { th: "วันเช็คเอาท์", en: "Check-out date" },
  "bk.guests":       { th: "จำนวนผู้เข้าพัก", en: "Guests" },
  "bk.guests.n":     { th: "ท่าน", en: "guest(s)" },
  "bk.rooms":        { th: "จำนวนห้อง", en: "Rooms" },
  "bk.rooms.n":      { th: "ห้อง", en: "room(s)" },
  "bk.name":         { th: "ชื่อ-นามสกุล", en: "Full name" },
  "bk.name.ph":      { th: "เช่น สมชาย ใจดี", en: "e.g. John Smith" },
  "bk.phone":        { th: "เบอร์โทรศัพท์", en: "Phone number" },
  "bk.note":         { th: "ความต้องการเพิ่มเติม (ถ้ามี)", en: "Special requests (optional)" },
  "bk.note.ph":      { th: "เช่น ขอห้องชั้นบน / เช็คอินดึก / ต้องการใบเสร็จ", en: "e.g. upper floor / late check-in / receipt needed" },
  "bk.night.per":    { th: "ต่อคืน", en: "per night" },
  "bk.empty":        { th: "กรุณาเลือกห้องและวันเข้าพักก่อน ระบบจะคำนวณราคาให้อัตโนมัติ",
                       en: "Choose a room and your dates — the price is calculated automatically." },
  "bk.baddates":     { th: "วันเช็คเอาท์ต้องอยู่หลังวันเช็คอิน", en: "Check-out must be after check-in." },
  "rooms.detail":    { th: "รายละเอียดห้อง + รูป →", en: "Room details & photos →" },
  "nav.guides":      { th: "ไกด์เที่ยว & บทความ", en: "Guides & articles" },
  "nav.iconsiam":    { th: "ที่พักใกล้ ICONSIAM", en: "Hotel near ICONSIAM" },
  "nav.chinatown":   { th: "ที่พักใกล้เยาวราช", en: "Hotel near Chinatown" },
  "nav.airport":     { th: "✈️ วิธีเดินทางจากสนามบิน →", en: "✈️ Getting here from the airport →" },
  "bk.minnights":    { th: "เข้าพักขั้นต่ำ 2 คืน", en: "Minimum stay: 2 nights" },
  "bk.nights":       { th: "คืน", en: "night(s)" },
  "bk.total":        { th: "รวม", en: "Total" },
  "bk.approx":       { th: "ราคาโดยประมาณ ยืนยันราคาสุดท้ายเมื่อโรงแรมตอบกลับ", en: "Estimated price — final rate confirmed by the hotel." },
  "bk.sendline":     { th: "จองผ่าน LINE", en: "Book via LINE" },
  "bk.sendwa":       { th: "จองผ่าน WhatsApp", en: "Book via WhatsApp" },
  "bk.oralt":        { th: "หรือช่องทางอื่น", en: "or other options" },
  "bk.sendmail":     { th: "ส่งคำขอจองทางอีเมล", en: "Send booking request via email" },
  "bk.copy":         { th: "คัดลอกข้อความจอง", en: "Copy booking message" },
  "bk.copied":       { th: "คัดลอกแล้ว ✓", en: "Copied ✓" },
  "bk.save.saving":  { th: "กำลังบันทึกคำขอเข้าระบบ…", en: "Saving your request…" },
  "bk.save.saved":   { th: "บันทึกคำขอเข้าระบบแล้ว · เลขที่", en: "Request saved · Reference" },
  "bk.save.failed":  { th: "ยังบันทึกคำขอไม่สำเร็จ กรุณาส่งข้อความผ่าน LINE, WhatsApp หรืออีเมล หรือลองกดอีกครั้ง", en: "We couldn\'t save your request. Please send the message via LINE, WhatsApp or email, or try again." },
  "bk.policy":       { th: "นี่คือ “คำขอจอง” — ทางโรงแรมจะตรวจสอบห้องว่างและยืนยันกลับภายใน 24 ชั่วโมง การจองสมบูรณ์เมื่อได้รับการยืนยันจากโรงแรม · เช็คอิน 14:00–22:00 น. (แจ้งเวลามาถึงล่วงหน้า) เช็คเอาท์ 12:00 น. · มัดจำ ฿1,000 คืนตอนเช็คเอาท์ · ชำระเงินสดหรือโอน",
                       en: "This is a booking request — we check availability and confirm within 24 hours. Your booking is complete once confirmed by the hotel. Check-in 14:00–22:00 (please tell us your arrival time), check-out by 12:00. ฿1,000 refundable deposit at check-in. Pay by cash or bank transfer." },
  "bk.quick":        { th: "เลือกไว:", en: "Quick pick:" },
  "bk.quick.n":      { th: "คืน", en: "night(s)" },
  "bk.hint.prefix":  { th: "อีกนิดเดียว! กรุณา", en: "Almost there! Please" },
  "bk.hint.room":    { th: "เลือกห้อง", en: "choose a room" },
  "bk.hint.dates":   { th: "เลือกวันเข้าพัก", en: "pick your dates" },
  "bk.hint.name":    { th: "กรอกชื่อ", en: "enter your name" },
  "bk.hint.phone":   { th: "กรอกเบอร์โทร", en: "enter your phone number" },
  "bk.trust.2":      { th: "ยืนยันการจองภายใน 24 ชั่วโมง", en: "Booking confirmed within 24 hours" },
  "bk.trust.3":      { th: "สอบถาม/แก้ไขการจองได้ทาง LINE, WhatsApp หรืออีเมล", en: "Questions or changes welcome via LINE, WhatsApp or email" },
};

/* ─── ตัวจัดการภาษา ─── */
function getLang() {
  const saved = localStorage.getItem("hoh-lang");
  if (saved === "th" || saved === "en") return saved;
  return (navigator.language || "th").toLowerCase().startsWith("th") ? "th" : "en";
}

function t(key) {
  const item = I18N[key];
  return item ? item[getLang()] : key;
}

function applyLang() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const item = I18N[el.dataset.i18n];
    if (!item) return;
    if (el.dataset.i18nAttr) el.setAttribute(el.dataset.i18nAttr, item[lang]);
    else el.innerHTML = item[lang];
  });
  document.querySelectorAll(".lang-toggle button").forEach((b) => {
    b.classList.toggle("active", b.dataset.lang === lang);
    b.setAttribute("aria-pressed", b.dataset.lang === lang ? "true" : "false");
  });
  document.dispatchEvent(new CustomEvent("langchange", { detail: lang }));
}

function setLang(lang) {
  localStorage.setItem("hoh-lang", lang);
  applyLang();
}

document.addEventListener("DOMContentLoaded", applyLang);
