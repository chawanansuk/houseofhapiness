# House of Happiness — Bangkok

เว็บไซต์ทางการของ **House of Happiness** เซอร์วิสอพาร์ตเมนต์ 1 ห้องนอน ย่านคลองสาน กรุงเทพฯ
สองภาษา ไทย/อังกฤษ พร้อมระบบจองตรงผ่าน LINE — เป็น static site ล้วน ไม่ต้อง build ไม่มีค่าเซิร์ฟเวอร์

## โครงสร้าง

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | หน้าหลัก: ห้องพัก/ราคา แกลเลอรี แผนที่ FAQ (ไทย/อังกฤษ) |
| `booking.html` | หน้าจองตรง: เลือกห้อง/วัน คำนวณราคา ส่งคำขอจองทาง LINE หรืออีเมล |
| `assets/i18n.js` | ข้อความสองภาษาทั้งเว็บ — แก้คำแปลได้ที่ไฟล์เดียว |
| `images/` | วางรูปถ่ายจริงตามชื่อไฟล์ใน `images/README.md` |

## สิ่งที่ต้องตั้งค่าก่อนเปิดใช้จริง

แก้ในบล็อก `CONFIG` ท้ายไฟล์ `booking.html`:

1. `lineId` — LINE Official Account ID จริงของโรงแรม (ตอนนี้เป็นตัวอย่าง `@houseofhappiness`)
2. `email` — อีเมลรับคำขอจอง
3. `rooms[].price` — ราคาต่อคืนปัจจุบัน (ตอนนี้ตั้งไว้ ฿800 ตามราคาเริ่มต้นบน OTA)

และถ้าแก้ราคาที่ `booking.html` อย่าลืมแก้ตัวเลข `฿800` ในการ์ดห้องพักบน `index.html` ให้ตรงกัน

## การเปิดเว็บ (GitHub Pages)

1. Merge branch เข้า `main`
2. ไปที่ repo **Settings → Pages → Deploy from a branch** เลือก `main` และ `/ (root)`
3. ได้ URL ฟรีทันที — ถ้ามีโดเมนของตัวเองก็ชี้ CNAME มาที่ GitHub Pages ได้

## ลิงก์จองผ่าน OTA

- [Booking.com](https://www.booking.com/hotel/th/house-of-happiness-bangkok.html)
- [Agoda](https://www.agoda.com/house-of-happiness/hotel/bangkok-th.html)
