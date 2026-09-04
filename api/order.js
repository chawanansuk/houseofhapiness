/**
 * POST /api/order — บันทึกออเดอร์รูมเซอร์วิสจากหน้า services.html ลง Google Sheets (แท็บ Orders)
 *
 * เว็บยิงมาแบบเงียบ ๆ ตอนแขกกด "ส่งออร์เดอร์ใน LINE / WhatsApp" — ข้อความในแชทยังเป็นช่องทางยืนยัน
 * แต่หลังบ้านจะเห็นออเดอร์ทันทีในการ์ด "รูมเซอร์วิส" หน้าวันนี้ ไม่ต้องเลื่อนแชทหา
 * ยอดคำนวณใหม่ฝั่งเซิร์ฟเวอร์จากรายการ (ไม่เชื่อ total ที่ส่งมา)
 */

const RATE_MAX = 10, RATE_WINDOW_MS = 60 * 60 * 1000;
const SHEET_TIMEOUT_MS = 12000;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_MAX) { hits.set(ip, list); return true; }
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return false;
}

const isYMD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const bangkokToday = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

// แปลงรายการจากเว็บเป็นแถวข้อความอ่านง่ายในชีต + คำนวณยอดใหม่
function normalizeItems(raw) {
  if (!Array.isArray(raw) || !raw.length || raw.length > 30) return null;
  const clean = (v, max) => String(v == null ? "" : v).replace(/[\r\n;]+/g, " ").trim().slice(0, max);
  const lines = [];
  let total = 0;
  for (const it of raw) {
    if (!it || typeof it !== "object") return null;
    const name = clean(it.th || it.name, 60);
    const variant = clean(it.variant, 30);
    const qty = Math.floor(Number(it.qty));
    const price = Math.round(Number(it.price));
    if (!name || !Number.isFinite(qty) || qty < 1 || qty > 20 || !Number.isFinite(price) || price < 0 || price > 5000) return null;
    total += price * qty;
    lines.push(`${name}${variant ? ` (${variant})` : ""} × ${qty} — ฿${price * qty}`);
  }
  return { text: lines.join("; ").slice(0, 1000), total };
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method-not-allowed" });

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    console.warn(JSON.stringify({ event: "order_rate_limited" }));
    return res.status(429).json({ ok: false, error: "too-many-requests" });
  }

  const b = (req.body && typeof req.body === "object") ? req.body : {};
  const clean = (v, max) => String(v == null ? "" : v).replace(/[\r\n]+/g, " ").trim().slice(0, max);
  const items = normalizeItems(b.items);
  const row = {
    action: "orderadd",
    name: clean(b.name, 80),
    room: clean(b.room, 20),
    date: clean(b.date, 10),
    time: clean(b.time, 5),
    note: clean(b.note, 300),
    lang: clean(b.lang, 2) === "en" ? "en" : "th",
    channel: clean(b.channel, 10) === "whatsapp" ? "whatsapp" : "line",
    status: "รอยืนยัน",
  };
  if (!row.name || !row.room || !isYMD(row.date) || row.date < bangkokToday() || !/^\d{2}:\d{2}$/.test(row.time) || !items) {
    return res.status(400).json({ ok: false, error: "invalid-input" });
  }
  row.items = items.text;
  row.total = String(items.total);

  const url = (process.env.SHEET_WEBAPP_URL || "").trim();
  const token = (process.env.SHEET_TOKEN || "").trim();
  if (!url || !token) {
    console.error(JSON.stringify({ event: "order_storage_not_configured" }));
    return res.status(503).json({ ok: false, saved: false, error: "order-service-not-configured" });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SHEET_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...row, token }),
      redirect: "follow",
      signal: ctrl.signal,
    });
    const text = await r.text();
    let result;
    try { result = JSON.parse(text); } catch { result = null; }
    if (!r.ok || !result || result.ok !== true || !result.id) {
      console.error(JSON.stringify({ event: "order_storage_rejected", downstreamStatus: r.status || null, downstreamError: result && result.error ? String(result.error).slice(0, 80) : null }));
      return res.status(502).json({ ok: false, saved: false, error: "order-storage-failed" });
    }
    console.info(JSON.stringify({ event: "order_saved", orderId: String(result.id), total: items.total }));
    return res.status(201).json({ ok: true, saved: true, id: String(result.id) });
  } catch (e) {
    const timedOut = e && e.name === "AbortError";
    console.error(JSON.stringify({ event: "order_storage_unavailable", reason: timedOut ? "timeout" : String((e && e.message) || "unavailable").slice(0, 120) }));
    return res.status(timedOut ? 504 : 502).json({ ok: false, saved: false, error: timedOut ? "order-storage-timeout" : "order-storage-unavailable" });
  } finally {
    clearTimeout(timer);
  }
};
