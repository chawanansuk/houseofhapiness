# House of Happiness — Bangkok

เว็บไซต์ทางการและระบบหลังบ้านของ **House of Happiness** เซอร์วิสอพาร์ตเมนต์ย่านคลองสาน กรุงเทพฯ

## เทคโนโลยี

- Static HTML/CSS/JavaScript บน Vercel
- Vercel Functions ใน `api/`
- Google Sheets ผ่าน Apps Script สำหรับข้อมูลการจอง ห้อง รายจ่าย และค่าตั้งค่าเว็บ
- Google Sheets และตัวอ่านอีเมล Booking.com เป็นแหล่งข้อมูลการจอง; บัญชีนี้ไม่รองรับ iCal เพราะแต่ละประเภทห้องมีหลายยูนิต
- Vercel Web Analytics สำหรับสถิติ page view แบบไม่ใช้ tracking cookie
- PWA สำหรับหน้า `/admin/`

ไม่มี build framework และไม่มีฐานข้อมูลที่อยู่ใน repository นี้

## หน้าหลัก

| Path | หน้าที่ |
|---|---|
| `/` | หน้าโรงแรม ห้องพัก ราคา รีวิว แผนที่ FAQ |
| `/booking.html` | ตรวจห้องว่างและส่งคำขอจองตรง |
| `/gallery.html` | แกลเลอรีรูป |
| `/attractions.html` | สถานที่เที่ยวใกล้ที่พัก |
| `/local.html` | ร้านอาหารและเส้นทางเดินรอบท่าดินแดง |
| `/admin/` | หลังบ้าน ผังห้อง งานวันนี้ ปฏิทิน รายการจอง และรายรับรายจ่าย |

## Environment variables บน Vercel

| Variable | Required | ใช้สำหรับ |
|---|---:|---|
| `ADMIN_PASSWORD` | Production | รหัสเจ้าของหลังบ้าน |
| `STAFF_PASSWORD` | ไม่บังคับ | รหัสพนักงานที่ไม่เห็นข้อมูลการเงิน |
| `SHEET_WEBAPP_URL` | Production | URL Apps Script Web App ที่ลงท้าย `/exec` |
| `SHEET_TOKEN` | Production | shared secret ระหว่าง Vercel Functions กับ Apps Script |
| `BOOKING_ICAL_URLS` | ไม่ใช้ใน Production นี้ | รองรับในโค้ดสำหรับที่พักที่ Booking.com เปิด Export iCal ให้เท่านั้น |
| `SAFETY_BUFFER` | ไม่บังคับ | จำนวนห้องกันสำรอง ค่าเริ่มต้น 1 |

ห้าม commit ค่า secret หรือ URL ส่วนตัวลง repository

## การทดสอบ

```bash
node tests/availability.test.js
node tests/update.test.js
node tests/deployment.test.js
node tests/site.test.js
```

ชุดทดสอบใช้ fixture และไม่เขียนข้อมูลลง Production

## Deployment

- GitHub repository: `chawanansuk/houseofhapiness`
- Production branch: `main`
- Vercel deploy อัตโนมัติเมื่อ merge เข้า `main`
- Pull request ทุกอันควรตรวจ Vercel Preview ก่อน merge

## Analytics และความเป็นส่วนตัว

Analytics ทำงานเฉพาะหน้าสาธารณะที่โหลด `assets/ui.js` ไม่ทำงานใน `/admin/` และไม่มี custom events จึงไม่ส่งชื่อ เบอร์โทร หรือรายละเอียดคำขอจอง ระบบใช้ Vercel Web Analytics ซึ่งแสดงข้อมูลแบบรวมและไม่ใช้ tracking cookie

## เอกสาร Apps Script

ดูขั้นตอนตั้งค่าและ deploy ที่ [backoffice/SETUP.md](backoffice/SETUP.md)

## Booking.com iCal

บัญชี House of Happiness ไม่มีเมนู `Sync calendars` เพราะห้องแต่ละประเภทมีหลายยูนิต (Deluxe 3, Standard 10 และ Twin 3) จึงไม่มี Export calendar URL สำหรับตั้งค่า `BOOKING_ICAL_URLS` ค่า Production นี้ต้องปล่อยว่าง และ `/api/health` จะรายงาน `checks.ical` เป็น `not-configured` ซึ่งถือว่าปกติ

การตรวจข้อมูล Booking.com ใช้ข้อมูลใน Google Sheets และตัวอ่านอีเมลแทน ห้ามลดจำนวนยูนิตใน Booking.com เพียงเพื่อเปิดใช้ iCal เพราะจะกระทบจำนวนห้องที่ขายได้

## Deployment safety

- Production build จะผ่านเมื่อ Vercel ระบุว่าแหล่งที่มาคือ GitHub repository `chawanansuk/houseofhapiness` branch `main` เท่านั้น
- `/api/deployment` เปิดเผยเฉพาะ provider, repository, branch และ commit SHA เพื่อให้ Production smoke test ตรวจว่าโดเมนหลักกำลังเสิร์ฟ commit ล่าสุดจาก `main`
- ต้องเปิด **Automatically expose System Environment Variables** ใน Vercel Project Settings เพื่อให้ Build Guard และ Monitoring อ่าน `VERCEL_GIT_*` ได้
- ห้ามใช้ `vercel --prod` จากเครื่องนักพัฒนา ให้ merge Pull Request เข้า `main` และรอ GitHub integration deploy อัตโนมัติ
