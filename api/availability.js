/**
 * GET /api/availability?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD
 *
 * เอนด์พอยต์สาธารณะสำหรับหน้าจอง — ตอบแค่ "เหลือกี่ห้อง" (ตัวเลขรวม)
 * ไม่มีข้อมูลแขกหลุดออกไปเด็ดขาด
 *
 * วิธีนับ: ต่อคืน occupied = จองตรง(ชีต) + max(จอง Booking.com ในชีต, ปฏิทิน iCal)
 * (กันนับซ้ำกรณีการจองเดียวกันโผล่ทั้งในชีตและ iCal)
 * available = ค่าต่ำสุดของ (ห้องทั้งหมด - occupied) ตลอดช่วงที่เลือก แล้วหัก SAFETY_BUFFER
 *
 * การจองที่ "ไม่รู้วันที่" (อีเมล Booking.com ไม่บอกวัน — checkin/checkout ว่าง)
 * นับแยกเป็น unknown และตอบ warning:"uncertain" ให้หน้าเว็บเปลี่ยนข้อความ
 * เป็น "ขอเช็คห้องว่างก่อน" แทนการยืนยันจำนวนห้องที่อาจไม่จริง
 *
 * env เสริม: SAFETY_BUFFER = จำนวนห้องที่กันไว้ไม่ขายผ่านเว็บ (ค่าเริ่มต้น 1)
 */

module.exports = async (req, res) => {
  // error ห้ามแคช; จะตั้ง edge cache เฉพาะก่อนตอบสำเร็จ
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method-not-allowed" });
  }

  const isYMD = (s) => {
    const value = String(s || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day;
  };
  const ci = String((req.query && req.query.checkin) || "");
  const co = String((req.query && req.query.checkout) || "");
  if (!isYMD(ci) || !isYMD(co) || co <= ci) {
    return res.status(400).json({ ok: false, error: "invalid-dates" });
  }
  const nights = Math.round((Date.parse(co) - Date.parse(ci)) / 86400000);
  if (nights > 30) return res.status(400).json({ ok: false, error: "range-too-long" });

  const demoMode = !(process.env.ADMIN_PASSWORD || "").trim();
  let bookings = [], rooms = [], ical = [];

  if (demoMode) {
    const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    bookings = demoBookings(today);
    rooms = Array.from({ length: 20 }, (_, i) => ({ room: "R" + i })); // ผังจริงมี 20 ห้อง
  } else {
    const [sheet, ic] = await Promise.all([fetchSheet(), fetchIcal()]);
    if (!sheet.ok || !ic.ok) {
      console.error(JSON.stringify({
        event: "availability_upstream_failed",
        sheet: sheet.error || "ok",
        ical: ic.error || "ok",
      }));
      return res.status(503).json({ ok: false, error: "availability-unavailable", retryable: true });
    }
    bookings = sheet.rows;
    rooms = sheet.rooms;
    ical = ic.events;
  }

  const total = rooms.length || 15;
  const notCancelled = bookings.filter((b) => !/ยกเลิก|cancel/i.test(String(b.status || "")));
  const active = notCancelled.filter((b) => isYMD(b.checkin) && isYMD(b.checkout));
  // การจองที่ยังไม่รู้วันที่ = กันห้องอยู่ที่ไหนสักวันแต่ระบุไม่ได้ — ห้ามการันตีเลขห้องว่าง
  const unknown = notCancelled.length - active.length;
  const isBdc = (b) => /booking\.com/i.test(String(b.source || ""));
  const roomCount = (b) => {
    const count = Number(b && b.rooms);
    return Number.isFinite(count) && count >= 1 ? Math.floor(count) : 1;
  };
  const countRooms = (entries) => entries.reduce((sum, booking) => sum + roomCount(booking), 0);

  let minAvail = total;
  for (let d = ci; d < co; d = shiftDate(d, 1)) {
    const stay = active.filter((b) => b.checkin <= d && d < b.checkout);
    const direct = countRooms(stay.filter((b) => !isBdc(b)));
    const bdcSheet = countRooms(stay.filter(isBdc));
    const bdcIcal = ical.filter((e) => e.start <= d && d < e.end).length;
    const occupied = direct + Math.max(bdcSheet, bdcIcal);
    minAvail = Math.min(minAvail, Math.max(0, total - occupied));
  }

  const rawStr = (process.env.SAFETY_BUFFER || "").trim();
  const rawBuffer = rawStr === "" ? NaN : Number(rawStr); // ระวัง: Number("") = 0 ไม่ใช่ NaN
  const buffer = Number.isFinite(rawBuffer) && rawBuffer >= 0 ? Math.floor(rawBuffer) : 1;
  const available = Math.max(0, minAvail - (demoMode ? 0 : buffer));

  const out = {
    ok: true, demo: demoMode, total, nights,
    available,
    full: available <= 0 && unknown === 0,
  };
  if (unknown > 0) { out.unknown = unknown; out.warning = "uncertain"; }
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
  return res.status(200).json(out);
};

/* ── helpers (สำเนาย่อจาก data.js — แต่ละ function ต้อง standalone) ── */

function shiftDate(ymd, days) {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function fetchSheet() {
  const url = (process.env.SHEET_WEBAPP_URL || "").trim();
  const token = (process.env.SHEET_TOKEN || "").trim();
  if (!url || !token) return { ok: false, rows: [], rooms: [], error: "not-configured" };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const sep = url.includes("?") ? "&" : "?";
    const r = await fetch(`${url}${sep}action=list&token=${encodeURIComponent(token)}`, {
      redirect: "follow", signal: ctrl.signal,
    });
    if (!r.ok) return { ok: false, rows: [], rooms: [], error: `http-${r.status || "error"}` };
    const j = await r.json();
    if (!Array.isArray(j && j.bookings) || !Array.isArray(j && j.rooms)) {
      return { ok: false, rows: [], rooms: [], error: "invalid-response" };
    }
    return {
      ok: true,
      rows: j.bookings,
      rooms: j.rooms,
    };
  } catch (e) {
    return { ok: false, rows: [], rooms: [], error: e && e.name === "AbortError" ? "timeout" : "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchIcal() {
  const raw = (process.env.BOOKING_ICAL_URLS || "").trim();
  if (!raw) return { ok: true, events: [] };
  const entries = raw.split(",").map((s) => s.trim()).filter(Boolean)
    .map((s) => { const i = s.indexOf("|"); return i > 0 ? s.slice(i + 1).trim() : s; });
  const events = [];
  let failures = 0;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    await Promise.all(entries.map(async (url) => {
      try {
        const r = await fetch(url, { redirect: "follow", signal: ctrl.signal });
      if (!r.ok) { failures++; return; }
      const lines = String(await r.text()).replace(/\r\n[ \t]/g, "").split(/\r?\n/);
      let cur = null;
      for (const line of lines) {
        if (line === "BEGIN:VEVENT") { cur = {}; continue; }
        if (line === "END:VEVENT") { if (cur && cur.start && cur.end) events.push(cur); cur = null; continue; }
        if (!cur) continue;
        const idx = line.indexOf(":");
        if (idx < 0) continue;
        const key = line.slice(0, idx).split(";")[0].toUpperCase();
        const m = line.slice(idx + 1).trim().match(/^(\d{4})(\d{2})(\d{2})/);
        if (key === "DTSTART" && m) cur.start = `${m[1]}-${m[2]}-${m[3]}`;
        else if (key === "DTEND" && m) cur.end = `${m[1]}-${m[2]}-${m[3]}`;
      }
      } catch { failures++; }
    }));
  } finally {
    clearTimeout(timer);
  }
  return failures > 0
    ? { ok: false, events, error: "feed-unavailable" }
    : { ok: true, events };
}

function demoBookings(today) {
  const mk = (inOff, outOff, source) => ({
    source, status: "ยืนยันแล้ว",
    checkin: shiftDate(today, inOff), checkout: shiftDate(today, outOff),
  });
  return [
    mk(-2, 1, "Booking.com"), mk(-1, 3, "Booking.com"), mk(0, 2, "Booking.com"),
    mk(0, 4, "Booking.com"), mk(1, 2, "เว็บไซต์ (จองตรง)"), mk(2, 5, "Booking.com"),
    mk(3, 6, "เว็บไซต์ (จองตรง)"), mk(5, 8, "Booking.com"),
  ];
}
