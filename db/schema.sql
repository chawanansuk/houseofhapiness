-- House of Happiness — ฐานข้อมูลหลังบ้าน (Postgres / Supabase)
-- คอลัมน์ตั้งใจให้ตรงกับชีตเดิมทุกตัว (เก็บเป็นข้อความ) เพื่อให้หน้า /admin และ Apps Script ใช้ต่อได้โดยไม่แก้รูปแบบ
-- รันซ้ำได้ (CREATE ... IF NOT EXISTS) — api/_store.js เรียกให้เองตอนเชื่อมต่อครั้งแรก
CREATE TABLE IF NOT EXISTS bookings (
  id         text PRIMARY KEY,
  source     text NOT NULL DEFAULT '',
  name       text NOT NULL DEFAULT '',
  checkin    text NOT NULL DEFAULT '',   -- YYYY-MM-DD หรือว่าง (อีเมล Booking ไม่บอกวัน)
  checkout   text NOT NULL DEFAULT '',
  nights     text NOT NULL DEFAULT '',
  guests     text NOT NULL DEFAULT '',
  rooms      text NOT NULL DEFAULT '1',
  phone      text NOT NULL DEFAULT '',
  amount     text NOT NULL DEFAULT '',
  status     text NOT NULL DEFAULT '',
  note       text NOT NULL DEFAULT '',
  created    text NOT NULL DEFAULT '',   -- yyyy-MM-dd HH:mm (เวลาไทย) ตามชีตเดิม
  room_no    text NOT NULL DEFAULT '',
  paid       text NOT NULL DEFAULT '',
  pay_status text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bookings_checkin_idx ON bookings (checkin);
CREATE INDEX IF NOT EXISTS bookings_room_idx ON bookings (room_no);

CREATE TABLE IF NOT EXISTS rooms (
  room       text PRIMARY KEY,
  clean      text NOT NULL DEFAULT 'สะอาด',
  note       text NOT NULL DEFAULT '',
  sort       integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id         text PRIMARY KEY,
  date       text NOT NULL DEFAULT '',
  category   text NOT NULL DEFAULT '',
  amount     text NOT NULL DEFAULT '',
  vendor     text NOT NULL DEFAULT '',
  method     text NOT NULL DEFAULT '',
  note       text NOT NULL DEFAULT '',
  created    text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS orders (
  id         text PRIMARY KEY,
  created    text NOT NULL DEFAULT '',
  name       text NOT NULL DEFAULT '',
  room       text NOT NULL DEFAULT '',
  date       text NOT NULL DEFAULT '',
  time       text NOT NULL DEFAULT '',
  items      text NOT NULL DEFAULT '',
  total      text NOT NULL DEFAULT '',
  note       text NOT NULL DEFAULT '',
  status     text NOT NULL DEFAULT 'รอยืนยัน',
  paid       text NOT NULL DEFAULT '',
  lang       text NOT NULL DEFAULT 'th',
  channel    text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key         text PRIMARY KEY,
  value       text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS rates (
  id     serial PRIMARY KEY,
  "from" text NOT NULL,
  "to"   text NOT NULL,
  room   text NOT NULL DEFAULT 'all',   -- std / stu / dlx / all
  price  text NOT NULL,
  note   text NOT NULL DEFAULT ''
);

-- ประวัติทุกการแก้ไขจากหลังบ้าน: ใครทำอะไรกับรายการไหนเมื่อไร (ชีตเดิมไม่มี)
CREATE TABLE IF NOT EXISTS audit_log (
  id     bigserial PRIMARY KEY,
  at     timestamptz NOT NULL DEFAULT now(),
  actor  text NOT NULL DEFAULT '',   -- admin / staff / web / script
  action text NOT NULL,
  target text NOT NULL DEFAULT '',
  fields jsonb
);
