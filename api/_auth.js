/**
 * ยืนยันตัวตนหลังบ้าน (header "x-admin-key") — ใช้ร่วมกันใน /api/data และ /api/update
 *
 * - เทียบรหัสแบบ timing-safe (crypto.timingSafeEqual) ไม่ใช่ === ที่เวลาตอบต่างกันตามจำนวนตัวอักษรที่ตรง
 * - หน่วงเมื่อใส่ผิด และบล็อกชั่วคราวเมื่อผิดซ้ำจาก IP เดียวกัน (ในหน่วยความจำของอินสแตนซ์นั้น —
 *   Vercel มีหลายอินสแตนซ์ จึงเป็นแค่กำแพงชั้นแรก ไม่ใช่ตัวจำกัดที่แน่นอน แต่ทำให้การเดารหัสช้าลงมาก)
 * - ยังไม่ตั้ง ADMIN_PASSWORD = โหมดตัวอย่าง (demo1234 / staff1234) เหมือนเดิม
 */
const crypto = require("crypto");

const DEMO_KEY = "demo1234";
const DEMO_STAFF_KEY = "staff1234";
const MAX_FAILS = 8;          // ผิดได้กี่ครั้งใน 10 นาที
const WINDOW_MS = 10 * 60 * 1000;
const BLOCK_MS = 10 * 60 * 1000;
const FAIL_DELAY_MS = 350;    // หน่วงทุกครั้งที่ผิด

const fails = new Map(); // ip → { n, first, until }

function safeEqual(a, b) {
  const A = Buffer.from(String(a || ""), "utf8"), B = Buffer.from(String(b || ""), "utf8");
  if (!A.length || !B.length) return false;
  // ความยาวต่าง → เทียบกับตัวเองเพื่อใช้เวลาเท่ากัน แล้วตอบเท็จ
  if (A.length !== B.length) { crypto.timingSafeEqual(A, A); return false; }
  return crypto.timingSafeEqual(A, B);
}

function clientIp(req) {
  const h = req.headers || {};
  const xf = String(h["x-forwarded-for"] || "").split(",")[0].trim();
  return xf || String(h["x-real-ip"] || "") || (req.socket && req.socket.remoteAddress) || "unknown";
}

function isBlocked(ip) {
  const f = fails.get(ip);
  if (!f) return false;
  if (f.until && Date.now() < f.until) return true;
  if (Date.now() - f.first > WINDOW_MS) { fails.delete(ip); return false; }
  return false;
}

function noteFail(ip) {
  const now = Date.now();
  const f = fails.get(ip);
  if (!f || now - f.first > WINDOW_MS) { fails.set(ip, { n: 1, first: now, until: 0 }); return; }
  f.n += 1;
  if (f.n >= MAX_FAILS) f.until = now + BLOCK_MS;
  // กันแมปโตไม่สิ้นสุด
  if (fails.size > 5000) for (const [k, v] of fails) if (now - v.first > WINDOW_MS && !(v.until > now)) fails.delete(k);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * คืน { role: "admin"|"staff"|null, demoMode, blocked }
 * ถ้า role เป็น null ผู้เรียกควรตอบ 401 (หรือ 429 เมื่อ blocked)
 */
async function resolveRole(req) {
  const adminPass = (process.env.ADMIN_PASSWORD || "").trim();
  const staffPass = (process.env.STAFF_PASSWORD || "").trim();
  const demoMode = !adminPass;
  const key = String((req.headers && req.headers["x-admin-key"]) || "");
  const ip = clientIp(req);
  if (isBlocked(ip)) return { role: null, demoMode, blocked: true };

  let role = null;
  if (demoMode) role = safeEqual(key, DEMO_KEY) ? "admin" : safeEqual(key, DEMO_STAFF_KEY) ? "staff" : null;
  else role = safeEqual(key, adminPass) ? "admin" : (staffPass && safeEqual(key, staffPass)) ? "staff" : null;

  if (!role) {
    if (key) noteFail(ip); // ไม่มี header เลย (หน้า login เพิ่งเปิด) ไม่นับเป็นการเดา
    await sleep(FAIL_DELAY_MS);
    return { role: null, demoMode, blocked: isBlocked(ip) };
  }
  fails.delete(ip);
  return { role, demoMode, blocked: false };
}

function __reset() { fails.clear(); }

module.exports = { resolveRole, safeEqual, DEMO_KEY, DEMO_STAFF_KEY, MAX_FAILS, __reset };
