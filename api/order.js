/**
 * POST /api/order — บันทึกออเดอร์รูมเซอร์วิสจากหน้า services.html ลง Google Sheets (แท็บ Orders)
 *
 * เว็บยิงมาแบบเงียบ ๆ ตอนแขกกด "ส่งออร์เดอร์ใน LINE / WhatsApp" — ข้อความในแชทยังเป็นช่องทางยืนยัน
 * แต่หลังบ้านจะเห็นออเดอร์ทันทีในการ์ด "รูมเซอร์วิส" หน้าวันนี้ ไม่ต้องเลื่อนแชทหา
 * และส่ง LINE แจ้งเจ้าของทันทีที่บันทึกสำเร็จ (ตั้งค่าใน api/_notify.js — ไม่ได้ตั้ง = ข้าม)
 * ยอดคำนวณใหม่ฝั่งเซิร์ฟเวอร์จากรายการ (ไม่เชื่อ total ที่ส่งมา)
 */

// แขกทุกห้องใช้ไวไฟของที่พัก = IP เดียวกันทั้งตึก ลิมิตจึงต้องรองรับทั้ง 15 ห้องในรอบส่งเดียว
const RATE_MAX = 40, RATE_WINDOW_MS = 60 * 60 * 1000;
const SHEET_TIMEOUT_MS = 12000;
const hits = new Map();
const { dbEnabled, getStore } = require("./_store.js");
const { notifyLine, thaiDate } = require("./_notify.js");

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

/** ข้อความ LINE ถึงเจ้าของ — อ่านจบในจอเดียว: ห้อง ชื่อ เวลาส่ง รายการ ยอด */
function orderMessage(row, id) {
  const slot = String(row.time) < "12:30" ? "รอบเช้า" : "รอบบ่าย";
  const lines = [
    "🛎 ออเดอร์รูมเซอร์วิสใหม่",
    `ห้อง ${row.room} · ${row.name}`,
    `ส่ง ${thaiDate(row.date)} เวลา ${row.time} (${slot})`,
    "",
    ...String(row.items || "").split(/;\s*/).filter(Boolean).map((x) => `• ${x}`),
    `รวม ฿${Number(row.total).toLocaleString("en-US")} · เก็บเงินสดตอนส่ง`,
  ];
  if (row.note) lines.push("", `หมายเหตุ: ${row.note}`);
  lines.push(
    "",
    `แขกส่งทาง ${row.channel === "whatsapp" ? "WhatsApp" : "LINE"}${row.lang === "en" ? " · แขกใช้ภาษาอังกฤษ" : ""} · #${id}`,
    "กดยืนยันใน /admin: https://houseofhappinessbangkok.com/admin/"
  );
  return lines.join("\n");
}

/** ห้ามโยน error ออกไปเด็ดขาด — ในทางฐานข้อมูลคำสั่งนี้อยู่ใน try ที่ถ้าพังจะไปบันทึกลงชีตซ้ำ = ออเดอร์เบิ้ล */
async function notifyOrder(row, id) {
  try { await notifyLine(orderMessage(row, id)); }
  catch (e) { console.error(JSON.stringify({ event: "line_notify_failed", reason: "message-build", detail: String((e && e.message) || e).slice(0, 120) })); }
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

  if (dbEnabled()) {
    try {
      const id = await getStore().addOrder(row);
      console.info(JSON.stringify({ event: "order_saved", orderId: String(id), total: items.total }));
      await notifyOrder(row, String(id));
      return res.status(201).json({ ok: true, saved: true, id: String(id) });
    } catch (e) {
      console.error(JSON.stringify({ event: "order_db_failed_fallback_sheet", reason: String((e && e.message) || "db").slice(0, 120) }));
    }
  }

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
    await notifyOrder(row, String(result.id));
    return res.status(201).json({ ok: true, saved: true, id: String(result.id) });
  } catch (e) {
    const timedOut = e && e.name === "AbortError";
    console.error(JSON.stringify({ event: "order_storage_unavailable", reason: timedOut ? "timeout" : String((e && e.message) || "unavailable").slice(0, 120) }));
    return res.status(timedOut ? 504 : 502).json({ ok: false, saved: false, error: timedOut ? "order-storage-timeout" : "order-storage-unavailable" });
  } finally {
    clearTimeout(timer);
  }
};

module.exports.orderMessage = orderMessage;
module.exports.notifyOrder = notifyOrder;
