/**
 * POST /api/update — write admin actions to Google Sheets through Apps Script.
 */

const DEMO_KEY = "demo1234";
const DEMO_STAFF_KEY = "staff1234";
const SHEET_TIMEOUT_MS = 12000;

// ชื่อห้องใหม่ → ชื่อเดิมในชีต: ชีตที่ยังไม่ได้รัน applyRealRoomList ใช้ชื่อเก่าอยู่
// ถ้าอัปเดตสถานะห้องด้วยชื่อใหม่ไม่เจอ จะลองชื่อเดิมให้อีกครั้งอัตโนมัติ
const ROOM_OLD_NAMES = { "707twin": "707-สองเตียง", "708twin": "708-สองเตียง", "715twin": "715-สองเตียง" };

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
  if (!["update", "roomclean", "add", "expadd", "expdel", "orderupdate"].includes(action)) {
    return res.status(400).json({ ok: false, error: "unknown-action" });
  }

  if (role === "staff") {
    if (action === "expadd" || action === "expdel") {
      return res.status(403).json({ ok: false, error: "staff-not-allowed" });
    }
    delete b.amount;
    if (b.fields && typeof b.fields === "object") delete b.fields.amount;
  }

  if (demoMode) {
    return res.status(200).json({ ok: true, demo: true, saved: false });
  }

  const url = (process.env.SHEET_WEBAPP_URL || "").trim();
  const token = (process.env.SHEET_TOKEN || "").trim();
  if (!url || !token) {
    console.error(JSON.stringify({ event: "admin_update_storage_not_configured" }));
    return res.status(503).json({ ok: false, saved: false, error: "update-service-not-configured" });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SHEET_TIMEOUT_MS);
  try {
    const send = async (payload) => {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ ...payload, token }),
        redirect: "follow",
        signal: ctrl.signal,
      });
      const text = await resp.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = null; }
      return { r: resp, result: parsed };
    };

    let { r, result } = await send(b);
    // ชีตเก่ายังไม่รู้จักชื่อห้องใหม่ (707twin ฯลฯ) — ลองชื่อเดิมอีกครั้ง
    if (action === "roomclean" && result && result.error === "room-not-found" && ROOM_OLD_NAMES[String(b.room || "")]) {
      ({ r, result } = await send({ ...b, room: ROOM_OLD_NAMES[String(b.room)] }));
    }

    if (!r.ok || !result || result.ok !== true) {
      console.error(JSON.stringify({
        event: "admin_update_storage_rejected",
        downstreamStatus: r.status || null,
        downstreamOk: r.ok,
        payloadOk: Boolean(result && result.ok === true),
        downstreamError: result && result.error ? String(result.error).slice(0, 80) : null,
      }));
      return res.status(502).json({ ok: false, saved: false, error: "update-storage-failed" });
    }

    return res.status(200).json({ ok: true, saved: true, id: result.id });
  } catch (e) {
    const timedOut = e && e.name === "AbortError";
    console.error(JSON.stringify({
      event: "admin_update_storage_unavailable",
      reason: timedOut ? "timeout" : String((e && e.message) || "unavailable").slice(0, 120),
    }));
    return res.status(timedOut ? 504 : 502).json({
      ok: false,
      saved: false,
      error: timedOut ? "update-storage-timeout" : "update-storage-unavailable",
    });
  } finally {
    clearTimeout(timer);
  }
};
