/**
 * E2E test หน้าจอง — รันด้วยเบราว์เซอร์จริง (Playwright)
 *
 * เสิร์ฟไฟล์จาก repo + จำลอง /api/* (ไม่ยิงระบบจริง ไม่สร้างการจองจริง)
 * ตรวจ: นโยบายขั้นต่ำ 2 คืน, ปุ่มเลือกไว 2/3/5, การเปิดปุ่ม LINE/WhatsApp,
 *        ลิงก์ LINE ต้องเป็น @ ดิบ (ไม่ใช่ %40), และ /api/book ได้รับข้อมูลครบ
 *
 * วิธีรัน:  cd tests/e2e && npm install && node booking.e2e.js
 * (เครื่องที่ยังไม่มีเบราว์เซอร์: npx playwright install chromium)
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..", "..");
const PORT = 8931;
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".txt": "text/plain" };

const bookCalls = []; // เก็บทุก POST /api/book ที่หน้าเว็บยิงมา

const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/api/availability") { res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ ok: true, demo: false, total: 20, available: 9, nights: 2, full: false })); }
  if (p === "/api/site") {
    res.writeHead(200, { "Content-Type": "application/json" });
    // จำลองเรทเทศกาล: คืน ymd(9) ห้อง Standard คิด ฿1,200 (คืนอื่นราคาปกติ)
    return res.end(JSON.stringify({
      ok: true, price: 700, prices: { std: 700, stu: 800, dlx: 850 },
      rates: [{ from: ymd(9), to: ymd(9), room: "std", price: 1200, note: "เทศกาลทดสอบ" }],
      ann: { th: "", en: "" }, source: "sheet",
    }));
  }
  if (p === "/api/book") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try { bookCalls.push(JSON.parse(body)); } catch { bookCalls.push({ parseError: body }); }
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, saved: true, id: "WEB-E2E-1" }));
    });
    return;
  }
  let f = p.endsWith("/") ? p + "index.html" : p;
  const file = path.join(ROOT, f);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end("nf"); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  res.end(fs.readFileSync(file));
});

const ymd = (offsetDays) => {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

async function launch() {
  try { return await chromium.launch(); }
  catch { return await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }); }
}

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await launch();
  const page = await browser.newPage();
  const BASE = `http://localhost:${PORT}`;
  let passed = 0;
  const ok = (name) => { passed++; console.log("  ✓", name); };

  // ── 1) หน้าจองโหลด + ปุ่มเลือกไวไม่มีตัวเลือก 1 คืน ──
  await page.goto(`${BASE}/booking.html`, { waitUntil: "networkidle" });
  assert.equal(await page.locator("#bookingForm").count(), 1);
  const chips = await page.locator(".chip-btn").evaluateAll((els) => els.map((e) => e.dataset.nights));
  assert.deepEqual(chips, ["2", "3", "5"], "ปุ่มเลือกไวต้องเป็น 2/3/5 เท่านั้น");
  assert.ok((await page.locator(".min-note").innerText()).length > 0, "ต้องมีโน้ตขั้นต่ำ 2 คืน");
  ok("โหลดหน้าจอง · ไม่มีตัวเลือก 1 คืน · มีโน้ตขั้นต่ำ 2 คืน");

  // ── 2) เลือกเช็คอินแล้ว เช็คเอาต์ต้องบังคับห่างอย่างน้อย 2 คืน ──
  await page.fill("#checkin", ymd(7));
  await page.dispatchEvent("#checkin", "change");
  assert.equal(await page.inputValue("#checkout") || await page.locator("#checkout").getAttribute("min"), ymd(9), "เช็คเอาต์เร็วสุดต้องเป็น +2 คืน");
  ok("เลือกเช็คอินแล้ว เช็คเอาต์เร็วสุด = +2 คืน");

  // ── 3) กดชิป 3 คืน → เช็คเอาต์ = +3 ──
  await page.click('.chip-btn[data-nights="3"]');
  assert.equal(await page.inputValue("#checkout"), ymd(10));
  ok("ชิป 3 คืนตั้งเช็คเอาต์ +3 วันถูกต้อง");

  // ── 4) เลือกห้อง + กรอกชื่อเบอร์ → ปุ่ม LINE เปิด และลิงก์ต้องเป็น @ ดิบ ──
  await page.check('input[name="room"][value="std"]');
  await page.fill("#name", "E2E ทดสอบ");
  await page.fill("#phone", "0812345678");
  await page.dispatchEvent("#phone", "input");
  await page.waitForFunction(() => document.getElementById("btnLine").getAttribute("aria-disabled") === "false");
  const lineHref = await page.getAttribute("#btnLine", "href");
  assert.ok(lineHref.includes("line.me/R/oaMessage/@060hvzok/"), "ลิงก์ LINE ต้องมี @ ดิบ");
  assert.ok(!lineHref.includes("%40"), "ห้าม encode @ เป็น %40 (ทำให้ LINE หา OA ไม่เจอ)");
  const waHref = await page.getAttribute("#btnWa", "href");
  assert.ok(waHref.startsWith("https://wa.me/66994419465?text="), "ลิงก์ WhatsApp ถูกต้อง");
  ok("ปุ่ม LINE/WhatsApp เปิดใช้ · ลิงก์ถูกต้อง (@ ดิบ ไม่ใช่ %40)");

  // ── 4.5) นโยบายไม่แสดงราคา (rate parity): ห้ามมีราคาห้อง/ยอดรวมโผล่ และข้อความจองต้องขอราคา ──
  const summaryText = await page.locator("#summary").innerText();
  assert.ok(!/฿[\d,]+/.test(summaryText), "สรุปการจองต้องไม่มีตัวเลขราคา: " + summaryText);
  const pageText = await page.locator("body").innerText();
  assert.ok(!pageText.includes("฿700") && !pageText.includes("฿800") && !pageText.includes("฿850"),
    "หน้าจองต้องไม่มีราคาห้องโผล่ที่ไหนเลย");
  const lineMsg = decodeURIComponent(await page.getAttribute("#btnLine", "href"));
  assert.ok(lineMsg.includes("รบกวนแจ้งราคารวม") || lineMsg.includes("total price"),
    "ข้อความจองต้องขอให้ที่พักแจ้งราคา");
  assert.ok(!/฿[\d,]+/.test(lineMsg), "ข้อความจองต้องไม่มีตัวเลขราคา");
  ok("ไม่มีราคาห้องบนหน้าจอง · ข้อความจองขอราคาจากที่พักแทน");

  // ── 5) กดปุ่ม LINE → ต้องยิง /api/book ครบถ้วน (กันเปิด line.me จริงด้วย preventDefault) ──
  await page.evaluate(() => document.getElementById("btnLine").addEventListener("click", (e) => e.preventDefault()));
  await page.click("#btnLine");
  await page.waitForFunction(() => !document.getElementById("bookingSaveStatus").hidden);
  assert.equal(bookCalls.length, 1, "ต้องยิง /api/book 1 ครั้ง");
  const b = bookCalls[0];
  assert.equal(b.name, "E2E ทดสอบ");
  assert.equal(b.checkin, ymd(7));
  assert.equal(b.checkout, ymd(10));
  assert.equal(b.total, "", "โหมดไม่แสดงราคา: ยอดที่ส่งเข้าระบบต้องว่าง (ทีมงานใส่ราคาเองตอนคอนเฟิร์ม)");
  const savedText = await page.locator("#bookingSaveStatus").innerText();
  assert.ok(savedText.includes("WEB-E2E-1"), "ต้องแสดงเลขที่จองจากระบบ");
  ok("กดจองแล้วบันทึกเข้าระบบ + โชว์เลขที่จอง WEB-E2E-1");

  // ── 6) พรีฟิลจาก URL แบบ 1 คืน → ต้องไม่รับค่าเช็คเอาต์ (ต่ำกว่าขั้นต่ำ) ──
  await page.goto(`${BASE}/booking.html?checkin=${ymd(14)}&checkout=${ymd(15)}`, { waitUntil: "networkidle" });
  assert.equal(await page.inputValue("#checkin"), ymd(14));
  assert.notEqual(await page.inputValue("#checkout"), ymd(15), "เช็คเอาต์ 1 คืนจากลิงก์ต้องถูกปฏิเสธ");
  ok("พรีฟิลจากลิงก์แบบ 1 คืนถูกปฏิเสธ");

  // ── 7) หน้าแรก: กล่องเช็คห้องว่างก็บังคับ 2 คืน ──
  await page.goto(`${BASE}/index.html`, { waitUntil: "networkidle" });
  await page.fill("#hbIn", ymd(7));
  await page.dispatchEvent("#hbIn", "change");
  assert.equal(await page.locator("#hbOut").getAttribute("min"), ymd(9));
  ok("กล่องหน้าแรกบังคับขั้นต่ำ 2 คืน");

  await browser.close();
  server.close();
  console.log(`\nE2E BOOKING TESTS PASSED (${passed} checks)`);
})().catch((e) => { console.error("E2E FAILED:", e.message); process.exit(1); });
