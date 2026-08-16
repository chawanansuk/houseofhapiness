/**
 * POST /api/book — บันทึกคำขอจองตรงจากหน้าเว็บลง Google Sheets (ผ่าน Apps Script)
 *
 * เรียกจาก booking.html แบบเงียบ ๆ ตอนลูกค้ากดปุ่มส่งคำขอจอง
 * ถ้ายังไม่ได้ตั้งค่า SHEET_WEBAPP_URL จะตอบ ok โดยไม่บันทึก (ไม่กระทบลูกค้า)
 */

// rate limit แบบเบา ๆ ต่ออินสแตนซ์ (กัน spam bot ยิงถี่ — ไม่ใช่กำแพงเหล็ก แต่พอกันมือบอน)
const RATE_MAX = 5, RATE_WINDOW_MS = 60 * 60 * 1000;
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
    return res.status(429).json({ ok: false, error: "too-many-requests" });
  }

  const url = (process.env.SHEET_WEBAPP_URL || "").trim();
  const token = (process.env.SHEET_TOKEN || "").trim();
  if (!url) return res.status(200).json({ ok: true, saved: false, reason: "not-configured" });

  const b = (req.body && typeof req.body === "object") ? req.body : {};
  const clean = (v, max) => String(v == null ? "" : v).replace(/[\r\n]+/g, " ").trim().slice(0, max);
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
    note: clean(b.note, 500),
    status: "รอยืนยัน",
  };

  const isYMD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  // ที่พักรับจองขั้นต่ำ 2 คืน
  const nights = (isYMD(row.checkin) && isYMD(row.checkout))
    ? Math.round((Date.parse(row.checkout) - Date.parse(row.checkin)) / 86400000) : 0;
  if (!row.name || !isYMD(row.checkin) || !isYMD(row.checkout) || nights < 2) {
    return res.status(400).json({ ok: false, error: "invalid-input" });
  }

  try {
    // ส่งเป็น text/plain เพื่อให้ Apps Script อ่าน e.postData.contents ได้ตรง ๆ
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(row),
      redirect: "follow",
    });
    return res.status(200).json({ ok: true, saved: r.ok });
  } catch (e) {
    return res.status(200).json({ ok: true, saved: false, reason: String((e && e.message) || e) });
  }
};
