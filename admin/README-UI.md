# หลังบ้าน 2.0 — โครงสร้างหน้า /admin

ดีไซน์ตามต้นแบบ `design/hoh-admin-redesign.html` (ไม่ deploy — อยู่ใน .vercelignore)

## ไฟล์
- `index.html` — โครงหน้า: login + shell (sidebar / header / 7 views / tabbar มือถือ / sheet / toast)
- `app.css` — design tokens + สไตล์ทั้งหมด (light บน `:root`, dark ซ้ำสองที่: media query + `[data-theme="dark"]`)
- `app.js` — logic ทั้งหมด: อ่าน `GET /api/data` · เขียน `POST /api/update` (payload เดิมทุก action)
- `legacy.html` — หลังบ้านเวอร์ชันเก่าทั้งหน้า เผื่อกลับไปใช้ชั่วคราว (เปิด /admin/legacy.html)
- `sw.js`, `manifest.webmanifest` — PWA เดิม (network-first)

## แนวคิด
- **Routing:** `location.hash` (#today #timeline #rooms #clean #calendar #bookings #money) แสดงทีละ view
- **ข้อมูล:** `adopt(json)` แปลง payload → ROOMS/CLEAN/ROOM_NOTES แล้วทุก view อ่านจาก derived
  helpers (`roomState`, `roomFreeFor`, `todayQueue`, `coversNight`) ที่เดียว
- **สถานะการจอง** ใช้ regex เดิม (`isCancelled/isInhouse/...`) ทนสตริงที่พิมพ์เพี้ยนในชีต
- **ทุกปุ่ม** ผ่าน event delegation `data-act` — ไม่มี inline onclick / confirm() (ใช้กดสองครั้งยืนยัน)
- **โหมดจัดห้อง:** เลือกชื่อจากถาด "รอจัดห้อง" → ห้องว่างขึ้นเส้นประ → แตะเพื่อจัด (ผังห้อง + ไทม์ไลน์)
- **ลากบนไทม์ไลน์ (คอม):** ลากแถบขึ้น-ลง = ย้ายห้อง · ลากขอบขวา = เลื่อนวันออก
- storage keys เดิมทั้งหมด: `hoh-admin-key`, `hoh-admin-data`, `hoh-last-import`, `hoh-admin-theme`

## ทดสอบ
`tests/e2e/admin.e2e.js` — จำลอง backend ที่ apply การแก้จริง + ตรวจ payload ของทุก action ให้ตรงกับของเดิม
