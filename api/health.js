/**
 * GET /api/health — ตรวจสุขภาพระบบ (ใช้โดย GitHub Actions smoke test + มอนิเตอร์)
 *
 * ตอบ JSON เสมอ: { ok: boolean, checks: { sheet: "ok" | "fail" | "unset" } }
 *   - sheet "ok"    = ต่อ Google Sheet (ผ่าน Apps Script) แล้วได้ข้อมูลจริง
 *   - sheet "fail"  = ต่อไม่ได้/รหัสไม่ตรง/สคริปต์ error
 *   - sheet "unset" = ยังไม่ได้ตั้ง SHEET_WEBAPP_URL (โหมดตัวอย่าง)
 * HTTP 200 เมื่อสุขภาพดี, 503 เมื่อมีปัญหา (body ยังเป็น JSON เพื่อให้ jq อ่านได้)
 */

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method-not-allowed" });
  }

  const checks = {};
  const url = (process.env.SHEET_WEBAPP_URL || "").trim();
  const token = (process.env.SHEET_TOKEN || "").trim();

  if (!url) {
    checks.sheet = "unset";
  } else {
    try {
      const sep = url.includes("?") ? "&" : "?";
      const r = await fetch(`${url}${sep}action=list&token=${encodeURIComponent(token)}`, {
        redirect: "follow",
      });
      const j = await r.json().catch(() => null);
      checks.sheet = (r.ok && j && !j.error && Array.isArray(j.bookings)) ? "ok" : "fail";
    } catch {
      checks.sheet = "fail";
    }
  }

  const ok = checks.sheet === "ok";
  return res.status(ok ? 200 : 503).json({ ok, checks });
};
