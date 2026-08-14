/**
 * GET /api/health — dependency health check สำหรับ Vercel Cron / external monitoring
 * ไม่ส่งคืน URL, token หรือข้อมูลลูกค้า
 */

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "method-not-allowed" });

  const [sheet, ical] = await Promise.all([checkSheet(), checkIcal()]);
  const ok = sheet === "ok" && (ical === "ok" || ical === "not-configured");
  const result = {
    ok,
    checkedAt: new Date().toISOString(),
    checks: { sheet, ical },
  };
  const event = JSON.stringify({ event: "dependency_health", ok, sheet, ical });
  if (ok) console.info(event); else console.error(event);
  return res.status(ok ? 200 : 503).json(result);
};

async function checkSheet() {
  const url = (process.env.SHEET_WEBAPP_URL || "").trim();
  const token = (process.env.SHEET_TOKEN || "").trim();
  if (!url || !token) return "not-configured";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const sep = url.includes("?") ? "&" : "?";
    const r = await fetch(`${url}${sep}action=list&token=${encodeURIComponent(token)}`, {
      redirect: "follow", signal: ctrl.signal,
    });
    if (!r.ok) return "unavailable";
    const j = await r.json();
    // bookings คือ dependency หลัก ส่วน rooms เป็น field ที่เพิ่มภายหลังและมี fallback
    return Array.isArray(j && j.bookings) ? "ok" : "invalid-response";
  } catch (e) {
    return e && e.name === "AbortError" ? "timeout" : "unavailable";
  } finally {
    clearTimeout(timer);
  }
}

async function checkIcal() {
  const raw = (process.env.BOOKING_ICAL_URLS || "").trim();
  if (!raw) return "not-configured";
  const urls = raw.split(",").map((s) => s.trim()).filter(Boolean)
    .map((s) => { const i = s.indexOf("|"); return i > 0 ? s.slice(i + 1).trim() : s; });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const results = await Promise.all(urls.map((url) => fetch(url, { redirect: "follow", signal: ctrl.signal })));
    return results.every((r) => r.ok) ? "ok" : "unavailable";
  } catch (e) {
    return e && e.name === "AbortError" ? "timeout" : "unavailable";
  } finally {
    clearTimeout(timer);
  }
}
