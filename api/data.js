/**
 * GET /api/data — ข้อมูลหลังบ้าน House of Happiness (สำหรับหน้า /admin)
 *
 * รวมข้อมูล 2 แหล่ง:
 *   1) Google Sheets (ผ่าน Apps Script Web App) — การจองจากอีเมล Booking.com + จองตรงจากเว็บ
 *   2) ปฏิทิน iCal ของ Booking.com (ตัวเสริม เปิดใช้เมื่อใส่ลิงก์)
 *
 * Environment variables (ตั้งใน Vercel → Project → Settings → Environment Variables):
 *   ADMIN_PASSWORD     รหัสผ่านเข้าหน้า /admin  (ยังไม่ตั้ง = โหมดตัวอย่าง ใช้รหัส demo1234)
 *   STAFF_PASSWORD     รหัสสำหรับพนักงาน (ไม่บังคับ) — เข้าได้เหมือนกันแต่มองไม่เห็นตัวเลขเงิน
 *   SHEET_WEBAPP_URL   URL ของ Apps Script Web App (ลงท้าย /exec)
 *   SHEET_TOKEN        รหัสลับ ต้องตรงกับค่า TOKEN ในสคริปต์
 *   BOOKING_ICAL_URLS  ลิงก์ iCal จาก Booking.com Extranet คั่นด้วยจุลภาค (ใส่ชื่อห้องได้: "ห้อง A|https://...")
 *
 * การยืนยันตัวตน: header "x-admin-key" เท่านั้น (ไม่รับ query string — กันรหัสรั่วเข้า log/referrer)
 * รหัสเจ้าของ → role "admin" / รหัสพนักงาน → role "staff" (ยอดเงินถูกตัดออกฝั่งเซิร์ฟเวอร์)
 */

const DEMO_KEY = "demo1234";
const DEMO_STAFF_KEY = "staff1234";

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method-not-allowed" });
  }

  const adminPass = (process.env.ADMIN_PASSWORD || "").trim();
  const staffPass = (process.env.STAFF_PASSWORD || "").trim();
  const demoMode = !adminPass;
  const key = String(req.headers["x-admin-key"] || "");

  const role = demoMode
    ? (key === DEMO_KEY ? "admin" : key === DEMO_STAFF_KEY ? "staff" : null)
    : (key === adminPass ? "admin" : staffPass && key === staffPass ? "staff" : null);

  if (!role) {
    // demo: true บอกหน้า login ว่ายังไม่ได้ตั้งรหัสจริง จะได้แสดงคำใบ้โหมดตัวอย่าง
    return res.status(401).json({ ok: false, error: "unauthorized", demo: demoMode });
  }

  const today = bangkokToday();
  // พนักงานไม่เห็นยอดเงิน — ตัดออกตั้งแต่ฝั่งเซิร์ฟเวอร์ ไม่ใช่แค่ซ่อนใน UI
  const forRole = (rows) => role === "staff" ? rows.map((b) => ({ ...b, amount: "" })) : rows;

  if (demoMode) {
    return res.status(200).json({
      ok: true, demo: true, today, role,
      bookings: forRole(demoBookings(today)),
      rooms: demoRooms(),
      ical: demoIcal(today),
      sources: { sheet: false, ical: false },
    });
  }

  const [sheet, ical] = await Promise.all([fetchSheet(), fetchIcal()]);
  return res.status(200).json({
    ok: true, demo: false, today, role,
    bookings: forRole(sheet.rows),
    rooms: sheet.rooms,
    ical: ical.events,
    sources: { sheet: sheet.ok, ical: ical.ok, sheetError: sheet.error, icalError: ical.error },
  });
};

/* ───────── เวลาไทย ───────── */

function bangkokToday() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

/* ───────── Google Sheets (ผ่าน Apps Script) ───────── */

async function fetchSheet() {
  const url = (process.env.SHEET_WEBAPP_URL || "").trim();
  const token = (process.env.SHEET_TOKEN || "").trim();
  if (!url) return { ok: false, rows: [], rooms: [], error: "ยังไม่ได้ตั้ง SHEET_WEBAPP_URL" };
  try {
    const sep = url.includes("?") ? "&" : "?";
    const r = await fetch(`${url}${sep}action=list&token=${encodeURIComponent(token)}`, {
      redirect: "follow",
    });
    if (!r.ok) return { ok: false, rows: [], rooms: [], error: `ชีตตอบ HTTP ${r.status}` };
    const j = await r.json();
    if (j && j.error) return { ok: false, rows: [], rooms: [], error: String(j.error) };
    return {
      ok: true,
      rows: Array.isArray(j && j.bookings) ? j.bookings : [],
      rooms: Array.isArray(j && j.rooms) ? j.rooms : [],
    };
  } catch (e) {
    return { ok: false, rows: [], rooms: [], error: String((e && e.message) || e) };
  }
}

/* ───────── iCal ของ Booking.com ───────── */

async function fetchIcal() {
  const raw = (process.env.BOOKING_ICAL_URLS || "").trim();
  if (!raw) return { ok: false, events: [], error: "ยังไม่ได้ตั้ง BOOKING_ICAL_URLS" };
  const entries = raw.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
    const bar = s.indexOf("|");
    return bar > 0
      ? { label: s.slice(0, bar).trim(), url: s.slice(bar + 1).trim() }
      : { label: "", url: s };
  });
  const events = [];
  const errors = [];
  await Promise.all(entries.map(async ({ label, url }) => {
    try {
      const r = await fetch(url, { redirect: "follow" });
      if (!r.ok) { errors.push(`${label || url}: HTTP ${r.status}`); return; }
      const text = await r.text();
      for (const ev of parseICS(text)) events.push({ ...ev, room: label });
    } catch (e) {
      errors.push(`${label || url}: ${String((e && e.message) || e)}`);
    }
  }));
  events.sort((a, b) => (a.start < b.start ? -1 : 1));
  return { ok: errors.length === 0, events, error: errors.join(" / ") || undefined };
}

// พาร์ส .ics แบบเบา ๆ — คลี่บรรทัดต่อเนื่อง (ขึ้นต้นด้วยช่องว่าง) ก่อน แล้วเก็บ DTSTART/DTEND/SUMMARY/UID
function parseICS(text) {
  const lines = String(text).replace(/\r\n[ \t]/g, "").split(/\r?\n/);
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") {
      if (cur && cur.start && cur.end) events.push(cur);
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).split(";")[0].toUpperCase();
    const val = line.slice(idx + 1).trim();
    if (key === "DTSTART") cur.start = icsDate(val);
    else if (key === "DTEND") cur.end = icsDate(val);
    else if (key === "SUMMARY") cur.summary = val;
    else if (key === "UID") cur.uid = val;
  }
  return events;
}

function icsDate(v) {
  const m = String(v).match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/* ───────── ข้อมูลตัวอย่าง (โหมด demo — ยังไม่ตั้ง ADMIN_PASSWORD) ───────── */

function shiftDate(ymd, days) {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function demoBookings(today) {
  const mk = (name, inOff, outOff, source, status, guests, phone, amount, room_no) => ({
    id: "DEMO-" + name.replace(/\s+/g, ""),
    source, name,
    checkin: shiftDate(today, inOff),
    checkout: shiftDate(today, outOff),
    guests, rooms: 1, phone, amount,
    status, note: "ข้อมูลตัวอย่าง", created: "", room_no: room_no || "",
  });
  return [
    mk("คุณสมชาย ใจดี", -2, 1, "Booking.com", "ยืนยันแล้ว", 2, "081-111-2233", "2,400", "101"),
    mk("Ms. Emma Wilson", -1, 3, "Booking.com", "ยืนยันแล้ว", 2, "", "3,200", "103"),
    mk("คุณวราภรณ์ ศรีสุข", 0, 2, "Booking.com", "ยืนยันแล้ว", 1, "089-555-6677", "1,600", "105"),
    mk("Mr. Kenji Tanaka", 0, 4, "Booking.com", "ยืนยันแล้ว", 2, "", "3,200"),
    mk("คุณอนันต์ พูนสุข", 1, 2, "เว็บไซต์ (จองตรง)", "รอยืนยัน", 2, "086-999-0011", "800"),
    mk("Mr. Liam O'Connor", 2, 5, "Booking.com", "ยืนยันแล้ว", 3, "", "2,400"),
    mk("คุณพิมพ์ชนก แก้วใส", 3, 6, "เว็บไซต์ (จองตรง)", "รอยืนยัน", 2, "092-333-4455", "2,400"),
    mk("Ms. Sofia Rossi", 5, 8, "Booking.com", "ยืนยันแล้ว", 2, "", "2,400", "110"),
    mk("คุณธนา รุ่งเรือง", -6, -4, "Booking.com", "เช็คเอาต์แล้ว", 2, "084-777-8899", "1,600", "102"),
    mk("Mr. David Chen", 7, 9, "Booking.com", "ยกเลิก", 2, "", "1,600"),
  ];
}

function demoRooms() {
  const rooms = [];
  for (let i = 1; i <= 15; i++) {
    const no = "1" + String(i).padStart(2, "0");
    rooms.push({ room: no, clean: (no === "102" || no === "108") ? "รอทำความสะอาด" : "สะอาด", note: "" });
  }
  return rooms;
}

function demoIcal(today) {
  return [
    { start: shiftDate(today, -2), end: shiftDate(today, 1), summary: "CLOSED - Not available", room: "ห้อง 101" },
    { start: shiftDate(today, 0), end: shiftDate(today, 4), summary: "CLOSED - Not available", room: "ห้อง 102" },
    { start: shiftDate(today, 2), end: shiftDate(today, 5), summary: "CLOSED - Not available", room: "ห้อง 103" },
  ];
}
