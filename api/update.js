/**
 * POST /api/update — สั่งงานจากหน้า /admin: เช็คอิน/เช็คเอาต์/ย้ายห้อง/เปลี่ยนสถานะ/ทำความสะอาด
 *
 * ต้องส่ง header "x-admin-key" ตรงกับ ADMIN_PASSWORD หรือ STAFF_PASSWORD
 * (โหมดตัวอย่างใช้ demo1234 / staff1234 และจะไม่บันทึกจริง — ตอบ ok ให้ UI ทดลองได้)
 * รหัสพนักงานสั่งงานได้ทุกอย่าง ยกเว้นแก้ยอดเงิน (ฟิลด์ amount ถูกตัดทิ้ง)
 *
 * body รูปแบบใดรูปแบบหนึ่ง:
 *   { action: "update", id, fields: { status?, room_no?, note?, checkin?, checkout?, amount?, name?, phone?, guests? } }
 *   { action: "roomclean", room, clean, note? }
 *   { action: "add", name, checkin, checkout, room_no?, phone?, guests?, amount?, source?, status?, note? }
 *   { action: "expadd", date, category, amount, vendor?, method?, note? }   (เฉพาะเจ้าของ)
 *   { action: "expdel", id }                                               (เฉพาะเจ้าของ)
 */

const DEMO_KEY = "demo1234";
const DEMO_STAFF_KEY = "staff1234";

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
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
    return res.status(401).json({ ok: false, error: "unauthorized", demo: demoMode });
  }

  const b = (req.body && typeof req.body === "object") ? req.body : {};
  const action = String(b.action || "");
  if (!["update", "roomclean", "add", "expadd", "expdel"].includes(action)) {
    return res.status(400).json({ ok: false, error: "unknown-action" });
  }

  if (role === "staff") {
    // รายจ่ายเป็นเรื่องเงิน — เฉพาะเจ้าของเท่านั้น
    if (action === "expadd" || action === "expdel") {
      return res.status(403).json({ ok: false, error: "staff-not-allowed" });
    }
    delete b.amount;
    if (b.fields && typeof b.fields === "object") delete b.fields.amount;
  }

  if (demoMode) {
    // โหมดตัวอย่าง: ไม่บันทึกจริง แต่ตอบ ok ให้ UI เดินต่อได้
    return res.status(200).json({ ok: true, demo: true, saved: false });
  }

  const url = (process.env.SHEET_WEBAPP_URL || "").trim();
  const token = (process.env.SHEET_TOKEN || "").trim();
  if (!url) return res.status(200).json({ ok: false, error: "ยังไม่ได้ตั้ง SHEET_WEBAPP_URL" });

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...b, token }),
      redirect: "follow",
    });
    if (!r.ok) return res.status(200).json({ ok: false, error: `ชีตตอบ HTTP ${r.status}` });
    const j = await r.json().catch(() => ({}));
    if (j && j.error) return res.status(200).json({ ok: false, error: String(j.error) });
    return res.status(200).json({ ok: true, saved: true, id: j.id });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String((e && e.message) || e) });
  }
};
