/**
 * POST /api/update — สั่งงานจากหน้า /admin: เช็คอิน/เช็คเอาต์/ย้ายห้อง/เปลี่ยนสถานะ/ทำความสะอาด
 *
 * ต้องส่ง header "x-admin-key" ตรงกับ ADMIN_PASSWORD (โหมดตัวอย่างใช้ demo1234
 * และจะไม่บันทึกจริง — ตอบ ok เพื่อให้ UI ทดลองใช้งานได้)
 *
 * body รูปแบบใดรูปแบบหนึ่ง:
 *   { action: "update", id, fields: { status?, room_no?, note?, checkin?, checkout?, amount?, name?, phone?, guests? } }
 *   { action: "roomclean", room, clean, note? }
 *   { action: "add", name, checkin, checkout, room_no?, phone?, guests?, amount?, source?, status?, note? }
 */

const DEMO_KEY = "demo1234";

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method-not-allowed" });
  }

  const adminPass = (process.env.ADMIN_PASSWORD || "").trim();
  const demoMode = !adminPass;
  const key = String(req.headers["x-admin-key"] || "");
  if (key !== (demoMode ? DEMO_KEY : adminPass)) {
    return res.status(401).json({ ok: false, error: "unauthorized", demo: demoMode });
  }

  const b = (req.body && typeof req.body === "object") ? req.body : {};
  const action = String(b.action || "");
  if (!["update", "roomclean", "add"].includes(action)) {
    return res.status(400).json({ ok: false, error: "unknown-action" });
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
