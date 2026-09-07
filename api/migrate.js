/**
 * /api/migrate — ย้ายข้อมูลจาก Google Sheets (Apps Script) เข้าฐานข้อมูล Postgres
 *
 * GET  (x-admin-key เจ้าของ): สถานะ — เชื่อมฐานข้อมูลได้ไหม มีข้อมูลกี่แถว
 * POST (x-admin-key เจ้าของ): คัดลอกทุกแท็บจากชีตเข้าฐานข้อมูล รันซ้ำได้ ไม่ทับค่าที่แก้ในฐานข้อมูลแล้ว
 * ใช้ตอนสลับระบบครั้งเดียว (รันบน Vercel ที่มีทั้ง SHEET_WEBAPP_URL และ DATABASE_URL อยู่แล้ว — ไม่ต้องส่ง token ผ่านแชท)
 */
const { dbEnabled, getStore } = require("./_store.js");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const adminPass = (process.env.ADMIN_PASSWORD || "").trim();
  if (!adminPass || String(req.headers["x-admin-key"] || "") !== adminPass) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  if (!dbEnabled()) return res.status(503).json({ ok: false, error: "database-not-configured", hint: "ตั้ง DATABASE_URL ใน Vercel ก่อน" });
  const st = getStore();

  if (req.method === "GET") {
    try {
      const d = await st.listAll();
      return res.status(200).json({ ok: true, db: "ok", counts: { bookings: d.bookings.length, rooms: d.rooms.length, expenses: d.expenses.length, orders: d.orders.length } });
    } catch (e) {
      return res.status(503).json({ ok: false, db: "unavailable", error: String((e && e.message) || e).slice(0, 160) });
    }
  }
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method-not-allowed" });

  const url = (process.env.SHEET_WEBAPP_URL || "").trim();
  const token = (process.env.SHEET_TOKEN || "").trim();
  if (!url || !token) return res.status(503).json({ ok: false, error: "sheet-not-configured" });
  const sep = url.includes("?") ? "&" : "?";
  const get = async (action) => {
    const r = await fetch(`${url}${sep}action=${action}&token=${encodeURIComponent(token)}&_ts=${Date.now()}`, { redirect: "follow" });
    if (!r.ok) throw new Error(`sheet ${action} http-${r.status}`);
    const j = await r.json();
    if (j && j.error) throw new Error(`sheet ${action}: ${j.error}`);
    return j;
  };
  try {
    const [list, site] = await Promise.all([get("list"), get("site").catch(() => null)]);
    const counts = await st.importFromSheet(list, site);
    console.info(JSON.stringify({ event: "db_import_from_sheet", counts }));
    const d = await st.listAll();
    return res.status(200).json({ ok: true, imported: counts, totals: { bookings: d.bookings.length, rooms: d.rooms.length, expenses: d.expenses.length, orders: d.orders.length } });
  } catch (e) {
    console.error(JSON.stringify({ event: "db_import_failed", reason: String((e && e.message) || e).slice(0, 160) }));
    return res.status(502).json({ ok: false, error: String((e && e.message) || e).slice(0, 160) });
  }
};
