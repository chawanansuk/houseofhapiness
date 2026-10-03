# หลังบ้าน 2.0 — โครงสร้างหน้า /admin

ดีไซน์ตามต้นแบบ `design/hoh-admin-redesign.html` (ไม่ deploy — อยู่ใน .vercelignore)

## ไฟล์
- `index.html` — โครงหน้า: login + shell (sidebar / header / 7 views / tabbar มือถือ / sheet / toast)
- `app.css` — design tokens + สไตล์ทั้งหมด (light บน `:root`, dark ซ้ำสองที่: media query + `[data-theme="dark"]`)
- `app.js` — logic ทั้งหมด: อ่าน `GET /api/data` · เขียน `POST /api/update` (payload เดิมทุก action)
- (ลบ `legacy.html` หลังบ้านรุ่นเก่าออกแล้ว 3 ต.ค. 2569 — ถ้าต้องการดูโค้ดเดิม ดูประวัติ git)
- `sw.js`, `manifest.webmanifest` — PWA เดิม (network-first)

## แนวคิด
- **Routing:** `location.hash` (#today #timeline #rooms #calendar #bookings #money) แสดงทีละ view · `#clean` เก่าเด้งไป #today (แม่บ้านเป็นการ์ดข้างในหน้าวันนี้แล้ว)
- **ข้อมูล:** `adopt(json)` แปลง payload → ROOMS/CLEAN/ROOM_NOTES แล้วทุก view อ่านจาก derived
  helpers (`roomState`, `roomFreeFor`, `todayQueue`, `coversNight`) ที่เดียว
- **สถานะการจอง** ใช้ regex เดิม (`isCancelled/isInhouse/...`) ทนสตริงที่พิมพ์เพี้ยนในชีต
- **ทุกปุ่ม** ผ่าน event delegation `data-act` — ไม่มี inline onclick / confirm() (ใช้กดสองครั้งยืนยัน)
- **โหมดจัดห้อง:** เลือกชื่อจากถาด "รอจัดห้อง" → ห้องว่างขึ้นเส้นประ → แตะเพื่อจัด (ผังห้อง + ไทม์ไลน์)
- **ลากบนไทม์ไลน์ (คอม):** ลากแถบขึ้น-ลง = ย้ายห้อง · ลากขอบขวา = เลื่อนวันออก
- storage keys: `hoh-admin-key` (localStorage เมื่อติ๊ก "จำเครื่องนี้ไว้" · sessionStorage ถ้าไม่ติ๊ก), `hoh-admin-data`, `hoh-last-import`, `hoh-admin-theme`
- **ฐานข้อมูล:** `/api/data` ตอบ `sources.db: true` เมื่อใช้ Postgres (ดู backoffice/SETUP.md) — หน้าบ้านไม่ต้องแก้ รูปแบบข้อมูลเดิมทุกฟิลด์
- **ความเสถียรของการบันทึก:** `apiUpdate` กันกดซ้ำ (INFLIGHT ต่อ action+id) · จำค่าที่บันทึกสำเร็จ 2 นาที (PENDING) แล้วทับข้อมูลชีตที่ยังเก่าใน `adopt()` · `afterAction` เปลี่ยนหน้าจอทันทีแล้ว reload ตามหลัง · auto-refresh หยุดขณะจัดห้อง/เปิดแผง/เพิ่งบันทึกไม่ถึง 15 วิ
- **รูมเซอร์วิส:** แขกสั่งจาก services.html → `POST /api/order` → แท็บ Orders · หน้าวันนี้มีการ์ด "รูมเซอร์วิส" (วันนี้แยกรอบเช้า/บ่าย + พรุ่งนี้) เช็คชื่อ/ห้องกับการจองอัตโนมัติ · ปุ่ม ยืนยัน → ส่งแล้ว·รับเงินสด (`action:'orderupdate'`) · รายรับเดือนรวมรูมเซอร์วิสที่ส่งแล้ว
- **ชำระเงิน:** คอลัมน์ `paid` + `pay_status` ในชีต Bookings · tile "ค้างชำระ" (เจ้าของ) · ปุ่ม "รับเงินครบแล้ว" ใน sheet การจอง · ป้ายสถานะใต้ยอดในรายการจอง
- **ข้อมูลสดอัตโนมัติ:** ดึงใหม่เมื่อกลับมาเปิดแท็บ (ถ้าเกิน 90 วิ) + ทุก 5 นาทีขณะเปิดอยู่ · ตัดเน็ตขึ้นแถบออฟไลน์และบล็อกการบันทึก
- **สรุปส่ง LINE:** ปุ่มบนการ์ดคิวงานวันนี้ (และเมนู "เพิ่มเติม" บนมือถือ) → ข้อความสรุปเช็คอิน/เช็คเอาต์/ห้องสกปรก คัดลอก/แชร์/พิมพ์ได้
- **ติดต่อแขก:** sheet การจองมีปุ่มโทร / WhatsApp (แปลง 08x → 668x) / คัดลอกเบอร์
- **คีย์ลัด (คอม):** `/` ค้นหา · `N` จองใหม่ · `T` วันนี้ · `R` รีเฟรช · `[` `]` เลื่อนช่วง · `?` ดูรายการ
- **กันห้องซ้อน (ฝั่งเซิร์ฟเวอร์):** `api/_store.js roomConflict()` ปฏิเสธการจัด/ย้ายห้องหรือเลื่อนวันที่ทับการจองอื่นในห้องเดียวกัน (ไม่นับยกเลิก/เช็คเอาต์) → `/api/update` ตอบ 409 `room-taken` พร้อม `conflict` · หน้าบ้าน toast บอกชื่อ/ช่วงที่ชนแล้วรีโหลด
- **ประวัติการแก้:** `/api/data` ส่ง `audit` (400 แถวล่าสุดจาก audit_log) ให้บทบาทเจ้าของ → แผงการจองแสดง "ประวัติการแก้" (เวลา · ใคร · ทำอะไร) ผ่าน `auditFor()/auditLine()`
- **ล็อกอิน:** `api/_auth.js` เทียบรหัสแบบ timing-safe · ผิด 8 ครั้ง/10 นาทีจาก IP เดียวบล็อก 10 นาที (429 → toast บอกให้รอ)
- **ค้างชำระ:** แถว Booking.com มีปุ่ม "ผ่าน Booking" (`pay-ota`) และปุ่มตั้งทั้งหมด (`pay-ota-all` กดสองครั้ง) · ตัวนำเข้าไฟล์ Extranet อ่านคอลัมน์ Payment status แล้วตั้ง "จ่ายผ่าน Booking" ให้เองเมื่อไฟล์บอกว่าจ่ายแล้ว
- **หน้ารายรับ:** tile "จองตรง" = สัดส่วน/จำนวน/ยอดจองตรงของเดือน + ค่าคอมฯ ที่ไม่ต้องจ่าย (ค่าคงที่ `OTA_COMMISSION`)
- **สำรองข้อมูล:** Apps Script `monthlyBackup()` (v10) ดึง `/api/data` ด้วย ADMIN_KEY ทุกวันที่ 1 → CSV 3 ไฟล์ลง Drive "HOH Backups" + อีเมล (ดู backoffice/SETUP.md)
- เปลี่ยน app.js/app.css แล้วต้องบัมป์ `?v=` ใน index.html และ `CACHE` ใน sw.js คู่กัน

## ทดสอบ
`tests/e2e/admin.e2e.js` — จำลอง backend ที่ apply การแก้จริง + ตรวจ payload ของทุก action ให้ตรงกับของเดิม
