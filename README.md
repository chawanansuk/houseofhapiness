# House of Happiness — Bangkok

Landing page for **House of Happiness**, a cozy aparthotel in Khlong San, Bangkok.

- **Book now:** [House of Happiness on Booking.com](https://www.booking.com/hotel/th/house-of-happiness-bangkok.html)
- **Site:** `index.html` — landing page (static, no build step required)
- **Direct booking:** `booking.html` — จองตรง: เลือกห้อง/วันเข้าพัก คำนวณราคา แล้วส่งคำขอจองผ่าน LINE หรืออีเมล

## การตั้งค่าหน้าจองตรง (`booking.html`)

แก้ค่าในบล็อก `CONFIG` ท้ายไฟล์ `booking.html`:

- `lineId` — LINE Official Account ID ของโรงแรม (เช่น `@houseofhappiness`)
- `email` — อีเมลที่ใช้รับคำขอจอง
- `rooms` — ชื่อห้อง คำอธิบาย และราคาต่อคืน (บาท)

## Hosting

The page can be served from any static host. To publish with GitHub Pages:
repo **Settings → Pages → Deploy from a branch**, then pick the branch and `/ (root)`.
