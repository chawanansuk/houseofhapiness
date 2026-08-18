/**
 * POST /api/book — บันทึกคำขอจองตรงจากหน้าเว็บลง Google Sheets (ผ่าน Apps Script)
 *
 * เรียกจาก booking.html แบบเงียบ ๆ ตอนลูกค้ากดปุ่มส่งคำขอจอง
 * ตอบว่าสำเร็จเฉพาะเมื่อ Apps Script ยืนยันว่าบันทึกและส่ง booking id กลับมาแล้ว
 */

// rate limit แบบเบา ๆ ต่ออินสแตนซ์ (กัน spam bot ยิงถี่ — ไม่ใช่กำแพงเหล็ก แต่พอกันมือบอน)
const RATE_MAX = 5, RATE_WINDOW_MS = 60 * 60 * 1000;
const SHEET_TIMEOUT_MS = 12000;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_MAX) { hits.set(ip, list); return true; }
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear(); // กันหน่วยความจำบวมในอินสแตนซ์อายุยาว
  return false;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method-not-allowed" });
  }

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    console.warn(JSON.stringify({ event: "booking_rate_limited" }));
    return res.status(429).json({ ok: false, error: "too-many-requests" });
  }

  const url = (process.env.SHEET_WEBAPP_URL || "").trim();
  const token = (process.env.SHEET_TOKEN || "").trim();
  if (!url || !token) {
    console.error(JSON.stringify({ event: "booking_storage_not_configured" }));
    return res.status(503).json({ ok: false, saved: false, error: "booking-service-not-configured" });
  }

  const b = (req.body && typeof req.body === "object") ? req.body : {};
  const clean = (v, max) => String(v == null ? "" : v).replace(/[\r\n]+/g, " ").trim().slice(0, max);
  const room = clean(b.room, 120);
  const note = clean(b.note, 500);
  const row = {
    action: "add",
    token,
    source: "เว็บไซต์ (จองตรง)",
    name: clean(b.name, 120),
    phone: clean(b.phone, 40),
    checkin: clean(b.checkin, 10),
    checkout: clean(b.checkout, 10),
    guests: clean(b.guests, 5),
    rooms: clean(b.rooms, 5),
    amount: clean(b.total, 20),
    note: [room ? `ประเภทห้อง: ${room}` : "", note].filter(Boolean).join(" · ").slice(0, 500),
    status: "รอยืนยัน",
  };

  const isYMD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (!row.name || !row.phone || !isYMD(row.checkin) || !isYMD(row.checkout) || row.checkout <= row.checkin) {
    return res.status(400).json({ ok: false, error: "invalid-input" });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SHEET_TIMEOUT_MS);
  try {
    // ส่งเป็น text/plain เพื่อให้ Apps Script อ่าน e.postData.contents ได้ตรง ๆ
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(row),
      redirect: "follow",
      signal: ctrl.signal,
    });
    const text = await r.text();
    let result;
    try { result = JSON.parse(text); } catch { result = null; }
    if (!r.ok || !result || result.ok !== true || !result.id) {
      console.error(JSON.stringify({
        event: "booking_storage_rejected",
        downstreamStatus: r.status || null,
        downstreamOk: r.ok,
        payloadOk: Boolean(result && result.ok === true),
        hasId: Boolean(result && result.id),
        downstreamError: result && result.error ? String(result.error).slice(0, 80) : null,
      }));
      return res.status(502).json({ ok: false, saved: false, error: "booking-storage-failed" });
    }
    console.info(JSON.stringify({ event: "booking_saved", bookingId: String(result.id) }));
    return res.status(201).json({ ok: true, saved: true, id: String(result.id) });
  } catch (e) {
    const timedOut = e && e.name === "AbortError";
    console.error(JSON.stringify({
      event: "booking_storage_unavailable",
      reason: timedOut ? "timeout" : String((e && e.message) || "unavailable").slice(0, 120),
    }));
    return res.status(timedOut ? 504 : 502).json({
      ok: false,
      saved: false,
      error: timedOut ? "booking-storage-timeout" : "booking-storage-unavailable",
    });
  } finally {
    clearTimeout(timer);
  }
};
