/**
 * แจ้งเตือนเจ้าของผ่าน LINE Messaging API (push หาคนเดียว)
 *
 * ตั้งค่าใน Vercel → Settings → Environment Variables (แล้ว Redeploy หนึ่งครั้ง)
 *   LINE_CHANNEL_TOKEN  Channel access token (long-lived) ของ LINE OA
 *   LINE_NOTIFY_TO      User ID ของผู้รับ ขึ้นต้นด้วย U — ผู้รับต้องแอด OA เป็นเพื่อนไว้แล้ว
 *
 * หลักการ
 * - ไม่ได้ตั้งค่า = ข้ามเงียบ ๆ ออเดอร์ยังบันทึกตามปกติ
 * - ส่งไม่สำเร็จ = เขียน log ไว้ ห้ามทำให้งานหลัก (บันทึกออเดอร์) พังตาม
 * - push หาคนเดียวนับโควต้า 1 ข้อความ · push เข้ากลุ่มนับตามจำนวนสมาชิก จึงตั้งให้ส่งหาคนเดียว
 * - ไม่ต้องเปิด webhook และไม่ต้องปิดโหมดแชทของ OA — แชทกับแขกทำงานเหมือนเดิม
 */
const PUSH_URL = "https://api.line.me/v2/bot/message/push";
const TIMEOUT_MS = 3000;
let warnedNotConfigured = false;

const TH_MON = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const TH_DOW = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

/** "2026-09-24" → "พฤ. 24 ก.ย. 2569" — แบบเดียวกับที่หน้า /admin ใช้ */
function thaiDate(ymd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd || ""))) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${TH_DOW[dow]} ${d} ${TH_MON[m - 1]} ${y + 543}`;
}

function lineConfigured() {
  return Boolean((process.env.LINE_CHANNEL_TOKEN || "").trim() && (process.env.LINE_NOTIFY_TO || "").trim());
}

async function notifyLine(text) {
  const token = (process.env.LINE_CHANNEL_TOKEN || "").trim();
  const to = (process.env.LINE_NOTIFY_TO || "").trim();
  if (!token || !to) {
    if (!warnedNotConfigured) {
      console.warn(JSON.stringify({ event: "line_notify_not_configured" }));
      warnedNotConfigured = true;
    }
    return { sent: false, reason: "not-configured" };
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to, messages: [{ type: "text", text: String(text).slice(0, 5000) }] }),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      // ข้อความ error ของ LINE บอกสาเหตุ (token ผิด / ผู้รับยังไม่แอดเพื่อน / โควต้าหมด) — ไม่ log token
      let detail = "";
      try { detail = String((await r.text()) || "").slice(0, 160); } catch { /* ไม่มี body */ }
      console.error(JSON.stringify({ event: "line_notify_failed", status: r.status, detail }));
      return { sent: false, reason: `http-${r.status}` };
    }
    console.info(JSON.stringify({ event: "line_notify_sent" }));
    return { sent: true };
  } catch (e) {
    const timedOut = e && e.name === "AbortError";
    console.error(JSON.stringify({ event: "line_notify_failed", reason: timedOut ? "timeout" : String((e && e.message) || "error").slice(0, 120) }));
    return { sent: false, reason: timedOut ? "timeout" : "error" };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { notifyLine, lineConfigured, thaiDate };
