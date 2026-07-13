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
  "footer.addr":     { th: "558/1 หมู่บ้านมั่งมีทวีสุข ซอย 16 ถ.ท่าดินแดง คลองสาน กรุงเทพฯ 10600",
                       en: "558/1 Mung Me Tawee Suk, Soi 16, Tha Din Daeng Rd, Khlong San, Bangkok 10600" },
  "footer.or":       { th: "หรือจองผ่าน", en: "Or book via" },
  "skip":            { th: "ข้ามไปยังเนื้อหา", en: "Skip to content" },
  "foot.desc":       { th: "เซอร์วิสอพาร์ตเมนต์ 1 ห้องนอน 15 ยูนิต ใจกลางคลองสาน ใกล้แม่น้ำเจ้าพระยาและ ICONSIAM",
                       en: "15 serviced one-bedroom apartments in the heart of Khlong San, near the Chao Phraya River and ICONSIAM." },
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
  "about.body":      { th: "House of Happiness เป็นเซอร์วิสอพาร์ตเมนต์ 15 ยูนิต ทุกห้องเป็นแบบ 1 ห้องนอน มีห้องนั่งเล่นแยก ระเบียงวิวเมือง แอร์ ครัวเล็กพร้อมตู้เย็น เครื่องซักผ้า และทีวีจอแบน ฟรี Wi-Fi และน้ำดื่มทุกการเข้าพัก",
                       en: "House of Happiness offers 15 serviced one-bedroom apartments, each with a separate living room, a city-view balcony, air conditioning, a kitchenette with refrigerator, a washing machine, and a flat-screen TV. Free Wi-Fi and complimentary bottled water with every stay." },
  "rooms.title":     { th: "ห้องพักและราคา", en: "Rooms & Rates" },
  "rooms.apt.name":  { th: "อพาร์ตเมนต์ 1 ห้องนอน", en: "One-Bedroom Apartment" },
  "rooms.apt.desc":  { th: "ห้องนอนแยก + ห้องนั่งเล่น · ระเบียงวิวเมือง · ครัวเล็ก ตู้เย็น · เครื่องซักผ้า · แอร์ · ทีวี · ห้องน้ำในตัว (ฝักบัว) · พัก 2 ท่าน (สูงสุด 3)",
                       en: "Separate bedroom + living room · city-view balcony · kitchenette & fridge · washing machine · air-con · TV · en-suite bathroom (shower) · sleeps 2 (max 3)" },
  "rooms.from":      { th: "เริ่มต้น", en: "From" },
  "rooms.night":     { th: "/ คืน", en: "/ night" },
  "rooms.cta":       { th: "เช็คห้องว่างและจอง", en: "Check availability & book" },
  "gallery.title":   { th: "รูปห้องพัก", en: "Gallery" },
  "gallery.bedroom": { th: "ห้องนอน", en: "Bedroom" },
  "gallery.living":  { th: "ห้องนั่งเล่น", en: "Living room" },
  "gallery.bath":    { th: "ห้องน้ำ", en: "Bathroom" },
  "gallery.balcony": { th: "ระเบียงวิวเมือง", en: "Balcony view" },
  "gallery.kitchen": { th: "ครัวเล็ก", en: "Kitchenette" },
  "gallery.building":{ th: "ตัวอาคาร", en: "The building" },
  "amen.title":      { th: "สิ่งอำนวยความสะดวก", en: "Amenities" },
  "amen.1":  { th: "ฟรี Wi-Fi ทุกห้อง", en: "Free in-room Wi-Fi" },
  "amen.2":  { th: "เครื่องปรับอากาศ", en: "Air conditioning" },
  "amen.3":  { th: "ระเบียงวิวเมือง", en: "Balcony with city view" },
  "amen.4":  { th: "ครัวเล็กและตู้เย็น", en: "Kitchenette & refrigerator" },
  "amen.5":  { th: "ทีวีจอแบน (เคเบิล)", en: "Flat-screen cable TV" },
  "amen.6":  { th: "เครื่องซักผ้าในห้อง", en: "In-room washing machine" },
  "amen.7":  { th: "เตารีดและโต๊ะรีดผ้า", en: "Iron & ironing board" },
  "amen.8":  { th: "น้ำดื่มฟรี", en: "Free bottled water" },
  "amen.9":  { th: "ห้องน้ำในตัว พร้อมไดร์เป่าผม", en: "En-suite bathroom with hairdryer" },
  "loc.title":       { th: "ที่ตั้งและการเดินทาง", en: "Location & Getting Here" },
  "loc.near":        { th: "ห่างจากสำเพ็งประมาณ 900 ม. · วัดโพธิ์ 1.8 กม. · ใกล้ River City และ ICONSIAM (รถ ~5 นาที)",
                       en: "About 900 m from Sampeng Market · 1.8 km from Wat Pho · a short drive (~5 min) from River City Bangkok and ICONSIAM." },
  "faq.title":       { th: "คำถามที่พบบ่อย", en: "FAQ" },
  "faq.q1":          { th: "เช็คอิน–เช็คเอาท์กี่โมง?", en: "What are the check-in / check-out times?" },
  "faq.a1":          { th: "เช็คอิน 14:00–18:00 น. และเช็คเอาท์ภายใน 12:00 น. หากมาถึงนอกเวลานี้กรุณาแจ้งล่วงหน้าทาง LINE",
                       en: "Check-in is 14:00–18:00 and check-out is by 12:00. Arriving outside these hours? Please let us know in advance via LINE." },
  "faq.q2":          { th: "มีค่ามัดจำไหม?", en: "Is there a deposit?" },
  "faq.a2":          { th: "มีมัดจำ 1,000 บาทตอนเช็คอิน และคืนเต็มจำนวนตอนเช็คเอาท์ (กรณีไม่มีความเสียหาย)",
                       en: "A ฿1,000 deposit is collected at check-in and fully refunded at check-out (assuming no damage)." },
  "faq.q3":          { th: "ชำระเงินอย่างไรได้บ้าง?", en: "How can I pay?" },
  "faq.a3":          { th: "รับเงินสดและโอนผ่านธนาคาร/พร้อมเพย์ รายละเอียดจะแจ้งตอนยืนยันการจอง",
                       en: "We accept cash and Thai bank transfer / PromptPay. Details are provided when we confirm your booking." },
  "faq.q4":          { th: "จองตรงต่างจากจองผ่าน Booking.com อย่างไร?", en: "Why book direct instead of Booking.com?" },
  "faq.a4":          { th: "จองตรงไม่มีค่าคอมมิชชั่นคนกลาง เราจึงให้ราคาดีกว่าและยืดหยุ่นเรื่องเวลาเช็คอิน/คำขอพิเศษได้มากกว่า",
                       en: "Direct bookings carry no middleman commission, so we can offer better rates and more flexibility on check-in times and special requests." },
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
  "near.2":          { th: "ล้ง 1919 ริมแม่น้ำ", en: "Lhong 1919 Riverside" },
  "near.2.d":        { th: "~1 กม.", en: "~1 km" },
  "near.3":          { th: "วัดโพธิ์", en: "Wat Pho" },
  "near.3.d":        { th: "~1.8 กม.", en: "~1.8 km" },
  "near.4":          { th: "เยาวราช (ไชน่าทาวน์)", en: "Yaowarat (Chinatown)" },
  "near.4.d":        { th: "~2 กม.", en: "~2 km" },
  "near.5":          { th: "ICONSIAM", en: "ICONSIAM" },
  "near.5.d":        { th: "รถ ~5 นาที", en: "~5 min drive" },
  "near.6":          { th: "River City Bangkok", en: "River City Bangkok" },
  "near.6.d":        { th: "รถ ~5 นาที", en: "~5 min drive" },

  /* ── หน้าจอง ── */
  "bk.title":        { th: "จองตรงกับ House of Happiness", en: "Book Direct with House of Happiness" },
  "bk.sub":          { th: "ราคาดีกว่าจองผ่านเว็บตัวกลาง · ยืนยันไวทาง LINE", en: "Better rates than OTA sites · fast confirmation via LINE" },
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
  "bk.nights":       { th: "คืน", en: "night(s)" },
  "bk.total":        { th: "รวม", en: "Total" },
  "bk.approx":       { th: "ราคาโดยประมาณ ยืนยันราคาสุดท้ายเมื่อโรงแรมตอบกลับ", en: "Estimated price — final rate confirmed by the hotel." },
  "bk.sendline":     { th: "ส่งคำขอจองทาง LINE", en: "Send booking request via LINE" },
  "bk.sendmail":     { th: "ส่งคำขอจองทางอีเมล", en: "Send booking request via email" },
  "bk.copy":         { th: "คัดลอกข้อความจอง", en: "Copy booking message" },
  "bk.copied":       { th: "คัดลอกแล้ว ✓", en: "Copied ✓" },
  "bk.policy":       { th: "นี่คือ “คำขอจอง” — ทางโรงแรมจะตรวจสอบห้องว่างและยืนยันกลับภายใน 24 ชั่วโมง การจองสมบูรณ์เมื่อได้รับการยืนยันจากโรงแรม · เช็คอิน 14:00–18:00 น. เช็คเอาท์ 12:00 น. · มัดจำ ฿1,000 คืนตอนเช็คเอาท์ · ชำระเงินสดหรือโอน",
                       en: "This is a booking request — we check availability and confirm within 24 hours. Your booking is complete once confirmed by the hotel. Check-in 14:00–18:00, check-out by 12:00. ฿1,000 refundable deposit at check-in. Pay by cash or bank transfer." },
  "bk.quick":        { th: "เลือกไว:", en: "Quick pick:" },
  "bk.quick.n":      { th: "คืน", en: "night(s)" },
  "bk.hint.prefix":  { th: "อีกนิดเดียว! กรุณา", en: "Almost there! Please" },
  "bk.hint.room":    { th: "เลือกห้อง", en: "choose a room" },
  "bk.hint.dates":   { th: "เลือกวันเข้าพัก", en: "pick your dates" },
  "bk.hint.name":    { th: "กรอกชื่อ", en: "enter your name" },
  "bk.hint.phone":   { th: "กรอกเบอร์โทร", en: "enter your phone number" },
  "bk.trust.1":      { th: "ไม่ต้องชำระเงินออนไลน์ — จ่ายที่โรงแรม", en: "No online payment — pay at the hotel" },
  "bk.trust.2":      { th: "ยืนยันการจองภายใน 24 ชั่วโมง", en: "Booking confirmed within 24 hours" },
  "bk.trust.3":      { th: "สอบถาม/แก้ไขการจองได้ทางอีเมลหรือ LINE", en: "Questions or changes welcome via email or LINE" },
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
