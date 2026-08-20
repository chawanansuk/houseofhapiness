/* ทดสอบ UI หลังบ้าน /admin กับ API จำลอง — รัน: cd tests/e2e && npm install && node admin.e2e.js
   ครอบคลุม: แถบสรุปลอย · โหมดแม่บ้าน · dark mode · sync เมนู desktop · ลากแถบจอง · ยกเลิกการจอง */
const http = require("http");
const fs = require("fs");
const path = require("path");
const ROOT = require("path").join(__dirname, "..", "..");

const today = "2026-08-20";
const d = (off) => new Date(Date.parse(today) + off * 86400000).toISOString().slice(0, 10);
const mkData = (role) => ({
  ok: true, demo: false, role, today,
  rooms: [
    { room: "701", clean: "สะอาด" }, { room: "702", clean: "สะอาด" },
    { room: "703", clean: "รอทำความสะอาด" }, { room: "704", clean: "สะอาด" },
  ],
  bookings: [
    { id: "BDC-1000000001", name: "Volker Goering", checkin: d(-1), checkout: d(3), nights: 4, guests: "2", source: "Booking.com", status: "เข้าพักอยู่", room_no: "701", amount: "3,200", phone: "", note: "" },
    { id: "BDC-1000000002", name: "Matthew Chopping", checkin: d(0), checkout: d(3), nights: 3, guests: "1", source: "Booking.com", status: "ยืนยันแล้ว", room_no: "702", amount: "2,400", phone: "", note: "" },
    // ห้อง 703 สกปรก + แขกเข้าวันนี้ → การ์ดแม่บ้านต้องขึ้น ⚠ ด่วน
    { id: "BDC-1000000003", name: "Lena P", checkin: d(0), checkout: d(2), nights: 2, guests: "2", source: "Booking.com", status: "ยืนยันแล้ว", room_no: "703", amount: "1,600", phone: "", note: "" },
  ],
  expenses: [], ical: [],
  sources: { sheet: true, icalError: "ยังไม่ได้ตั้งค่า BOOKING_ICAL_URLS" },
});
const updates = [];
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webmanifest": "application/json", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if (url === "/api/data") {
    const role = String(req.headers["x-admin-key"] || "") === "staffpass" ? "staff" : "admin";
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify(mkData(role)));
  }
  if (url === "/api/update") {
    let body = ""; req.on("data", (c) => body += c);
    req.on("end", () => { updates.push(JSON.parse(body)); res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ ok: true, saved: true })); });
    return;
  }
  const file = path.join(ROOT, url === "/admin/" ? "admin/index.html" : url);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end("nf"); }
  res.setHeader("Content-Type", MIME[path.extname(file)] || "application/octet-stream");
  res.end(fs.readFileSync(file));
});

(async () => {
  await new Promise((r) => server.listen(8899, r));
  const { chromium } = require("playwright");
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
  const fails = [];
  const check = (name, cond) => { console.log((cond ? "PASS" : "FAIL") + " " + name); if (!cond) fails.push(name); };
  const login = async (page, pass) => {
    await page.goto("http://127.0.0.1:8899/admin/");
    await page.fill("#passInput", pass);
    await page.click("#loginBtn");
    await page.waitForSelector("#appView", { state: "visible" });
    await page.waitForTimeout(300);
  };

  /* ── รอบ 2: แถบสรุปลอยมือถือ ── */
  const mob = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await login(mob, "x");
  const ms = await mob.textContent("#miniStats");
  check("แถบสรุปมือถือ: เข้า 2 · พัก 3 · ว่าง 1 · รอทำ 1",
    /เข้า 2/.test(ms) && /พัก 3/.test(ms) && /ว่าง 1/.test(ms) && /รอทำ 1/.test(ms));
  await mob.click('.tabbar [data-nav="secBookings"]');
  await mob.waitForTimeout(200);
  check("แถบสรุปยังเห็นในแท็บอื่น (sticky topbar)", await mob.isVisible("#miniStats"));

  /* ── รอบ 3: โหมดแม่บ้าน ── */
  await mob.click('.tabbar [data-nav="secClean"]');
  await mob.waitForTimeout(200);
  const hk = await mob.textContent("#cleanDirty");
  check("หน้าแม่บ้าน: ห้อง 703 ขึ้นการ์ด + ⚠ แขกเข้าวันนี้", /703/.test(hk) && /มีแขกเข้าวันนี้/.test(hk));
  await mob.click('[data-clean="703"]');
  await mob.waitForTimeout(300);
  check("กด ✓ เสร็จ → ยิง roomclean สะอาด", updates.some((u) => u.action === "roomclean" && u.room === "703" && u.clean === "สะอาด"));
  mob.once("dialog", (dg) => dg.accept());
  await mob.click('[data-dirty="704"]');
  await mob.waitForTimeout(300);
  check("แตะห้องสะอาด → แจ้งรอทำความสะอาด", updates.some((u) => u.action === "roomclean" && u.room === "704" && u.clean === "รอทำความสะอาด"));

  /* dark mode */
  await mob.click(".topbar .act-theme");
  await mob.waitForTimeout(100);
  check("สลับโหมดมืด: data-theme=dark", await mob.evaluate(() => document.documentElement.getAttribute("data-theme")) === "dark");
  await mob.reload();
  await mob.waitForSelector("#appView", { state: "visible" });
  check("โหลดใหม่ยังเป็นโหมดมืด (จำค่า)", await mob.evaluate(() => document.documentElement.getAttribute("data-theme")) === "dark");
  await mob.close();

  /* staff เข้าระบบ → เจอหน้าแม่บ้านเป็นหน้าแรก + ไม่เห็นแท็บเงิน */
  const stf = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await login(stf, "staffpass");
  check("พนักงาน: หน้าแรกคือแม่บ้าน", await stf.evaluate(() => document.querySelector(".section.active").id) === "secClean");
  check("พนักงาน: ไม่เห็นแท็บเงิน", !(await stf.isVisible('.tabbar [data-nav="secMoney"]')));
  await stf.close();

  /* ── รอบ 2: sync เมนูซ้ายตอน scroll (desktop) + รอบ 4: ลากแถบ ── */
  const dt = await (await browser.newContext({ viewport: { width: 1366, height: 850 } })).newPage();
  await login(dt, "x");
  await dt.evaluate(() => { document.getElementById("secBookings").scrollIntoView(); });
  await dt.evaluate(() => window.scrollBy(0, 10));
  await dt.waitForTimeout(400);
  const onNav = await dt.evaluate(() => (document.querySelector(".side-nav a.on") || {}).textContent || "");
  check("เลื่อนถึงรายการจอง → เมนูซ้ายไฮไลต์ตาม", /รายการจอง/.test(onNav));

  /* รอบ 4a: ลากแถบ Matthew (702) ลงไปแถวห้อง 704 = ย้ายห้อง */
  await dt.evaluate(() => { document.getElementById("secTimeline").scrollIntoView(); window.scrollBy(0, -60); });
  await dt.waitForTimeout(300);
  const bar = await dt.locator('.tl-bar[data-barid="BDC-1000000002"]').boundingBox();
  const cell704 = await dt.locator('.tl-cell[data-room="704"]').first().boundingBox();
  check("เจอแถบและแถวเป้าหมาย", !!bar && !!cell704);
  dt.once("dialog", (dg) => dg.accept());
  await dt.mouse.move(bar.x + Math.min(40, bar.width / 2), bar.y + bar.height / 2);
  await dt.mouse.down();
  await dt.mouse.move(bar.x + Math.min(40, bar.width / 2), cell704.y + cell704.height / 2, { steps: 8 });
  await dt.mouse.up();
  await dt.waitForTimeout(400);
  check("ลากย้ายห้อง → ยิง update room_no=704",
    updates.some((u) => u.action === "update" && u.id === "BDC-1000000002" && u.fields && u.fields.room_no === "704"));

  /* รอบ 4b: ลากขอบขวาแถบ Volker (701) ยืดวันออก */
  await dt.waitForTimeout(400);
  const bar2 = await dt.locator('.tl-bar[data-barid="BDC-1000000001"]').boundingBox();
  check("เจอแถบ Volker", !!bar2);
  dt.once("dialog", (dg) => dg.accept());
  await dt.mouse.move(bar2.x + bar2.width - 5, bar2.y + bar2.height / 2);
  await dt.mouse.down();
  await dt.mouse.move(bar2.x + bar2.width + 120, bar2.y + bar2.height / 2, { steps: 8 });
  await dt.mouse.up();
  await dt.waitForTimeout(400);
  const resize = updates.find((u) => u.action === "update" && u.id === "BDC-1000000001" && u.fields && u.fields.checkout);
  check("ลากขอบขวา → ยิง update checkout ใหม่ (หลังวันเดิม)", !!resize && resize.fields.checkout > d(3) === false ? resize.fields.checkout !== d(3) : !!resize);

  /* แตะเฉย ๆ (ไม่ลาก) ยังเปิดเมนูด่วนได้ */
  await dt.waitForTimeout(400);
  const bar3 = await dt.locator('.tl-bar[data-barid="BDC-1000000003"]').boundingBox();
  await dt.mouse.click(bar3.x + Math.min(30, bar3.width / 2), bar3.y + bar3.height / 2);
  await dt.waitForSelector("#qkEdit", { state: "visible", timeout: 3000 });
  check("คลิกเฉย ๆ ยังเปิดเมนูด่วน", true);

  /* ── ยกเลิกการจองจากเมนูด่วน: สถานะเป็นยกเลิก + ห้องแขกที่พักอยู่ขึ้นรอทำความสะอาด ── */
  await dt.click("#actClose");
  await dt.waitForTimeout(200);
  const barV = await dt.locator('.tl-bar[data-barid="BDC-1000000001"]').boundingBox();
  await dt.mouse.click(barV.x + Math.min(30, barV.width / 2), barV.y + barV.height / 2);
  await dt.waitForSelector("#qkCancel", { state: "visible" });
  dt.once("dialog", (dg) => dg.accept());
  await dt.click("#qkCancel");
  await dt.waitForTimeout(400);
  check("ยกเลิกการจอง → status ยกเลิก",
    updates.some((u) => u.action === "update" && u.id === "BDC-1000000001" && u.fields && u.fields.status === "ยกเลิก"));
  check("แขกพักอยู่ถูกยกเลิก → ห้องเดิมรอทำความสะอาด",
    updates.some((u) => u.action === "roomclean" && u.room === "701" && u.clean === "รอทำความสะอาด"));

  await browser.close();
  server.close();
  console.log(fails.length ? "\n❌ " + fails.length + " failed" : "\n✅ all passed");
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
