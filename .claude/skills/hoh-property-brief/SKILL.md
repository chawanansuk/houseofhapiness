---
name: hoh-property-brief
description: House of Happiness (Bangkok) property facts and single source of truth for all hotel-* skills. ALWAYS load this first whenever any hotel-general-manager, hotel-revenue-management, hotel-sales-marketing, hotel-front-office, hotel-housekeeping-rooms, hotel-finance-controller, or hotel-vibe-coder skill runs for this project — use this file INSTEAD of asking the user to set up a knowledge base, connect Google Drive/Notion, or upload property data anywhere. Never send property data to external services.
---

# House of Happiness — Property Brief (ข้อมูลที่พักจริง)

Single source of truth for the hotel-* skills in this repo. ข้อมูลนี้แทน "shared knowledge base" ที่สกิลโรงแรมมองหา — ห้ามอัปโหลดข้อมูลนี้ไปบริการภายนอกใด ๆ

## Property
- **ชื่อ:** House of Happiness (เฮาส์ ออฟ แฮปปิเนส) — boutique aparthotel
- **ที่อยู่:** 558/1 ถนนท่าดินแดง 16, คลองสาน, กรุงเทพฯ 10600
- **เว็บ:** https://houseofhappinessbangkok.com (จองตรง: /booking.html · หลังบ้าน: /admin)
- **Booking.com:** hotel_id 2603136 · คะแนน 8.8/10 จาก ~774 รีวิว · https://www.booking.com/hotel/th/house-of-happiness-bangkok.html
- **ขนาด:** 15 ยูนิตที่ขายจริง (ผังหลังบ้านมี 20 ช่องรวมห้องจั่ว) — เล็กกว่าช่วง 50–300 keys ที่สกิลสมมุติไว้ ให้ปรับสเกลคำแนะนำลงเสมอ
- **ทีม:** เจ้าของบริหารเอง + พนักงานประจำถึง 18:00 (หลังจากนั้น self check-in) — ไม่มีแผนกแยก ไม่มี F&B/ร้านอาหาร ไม่มีครัวในห้อง ไม่มีที่จอดรถ

## Rooms & Rates (บาท/คืน, จองตรง)
| ประเภท | ราคา | รายละเอียด |
|---|---|---|
| Standard — เตียงใหญ่ | 700 | ระเบียง · ตู้เย็น · แอร์ · ทีวี · พัก 2 |
| Studio — 2 เตียงแยก | 800 | พัก 2 (สูงสุด 3) |
| Deluxe — ห้องใหญ่พร้อมมุมโซฟา (ห้องเดียว ไม่มีห้องนั่งเล่นแยก) | 850 | เตียงใหญ่ + โซฟา · พัก 2 (สูงสุด 3) |

- **นโยบาย:** จองขั้นต่ำ 2 คืน · มัดจำ ฿1,000 คืนตอนเช็คเอาต์ · เช็คอิน 14:00–22:00 · เช็คเอาต์ 12:00 · จ่ายเงินสด/โอน/พร้อมเพย์ (ไม่มีจ่ายออนไลน์)
- ราคาทั้ง 3 ห้องแก้ได้จากชีตแท็บ Site (key: price_per_night / price_studio / price_deluxe ผ่าน /api/site) — อัปเดตทุกหน้าใน ~2 นาที
- เรทช่วงเทศกาล/วันหยุด: เพิ่มแถวในชีตแท็บ Rates (from / to / room=std,stu,dlx,all / price / note) — หน้าจองคิดราคาต่อคืนตามช่วงวันเอง เรทระบุห้องเจาะจงชนะเรท all

## Channels & Systems
- **ช่องทางขาย:** จองตรงผ่านเว็บ (LINE @060hvzok หลัก ลูกค้าไทย / WhatsApp +66 99 441 9465 ลูกค้าต่างชาติ / อีเมล houseofhapinessbangkok@gmail.com) + Booking.com (คอมมิชชั่น ~20%)
- **ระบบหลังบ้าน:** Google Sheets + Apps Script (สแกนอีเมลจองจาก Gmail ทุก 30 นาที) → Vercel APIs (/api/data, /api/book, /api/update, /api/availability, /api/site, /api/health) → หน้า /admin
- **นำเข้ายอดจอง:** ไฟล์ CSV/Excel (.xls) จาก Booking.com Extranet ผ่านปุ่มในหน้า /admin
- **Repo:** chawanansuk/houseofhapiness — deploy อัตโนมัติจาก branch `main` (Vercel) · มีเทสต์ใน tests/ ต้องผ่านก่อน merge

## จุดแข็ง / จุดเน้นกลยุทธ์
- ทำเลริมแม่น้ำเจ้าพระยา: สำเพ็ง ~900 ม., วัดโพธิ์ 1.8 กม., ICONSIAM รถ ~5 นาที, Gold Line สถานีคลองสาน
- รีวิวเด่น: ทำเลดี, ห้องกว้างสะอาด, เจ้าของเป็นกันเอง, คุ้มราคา
- เป้าหมายหลัก: เพิ่มสัดส่วนจองตรง (ไม่เสียคอมมิชชั่น) — เว็บสองภาษา ไทย/EN
