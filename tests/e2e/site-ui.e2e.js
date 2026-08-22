/* ทดสอบเว็บฝั่งลูกค้า — รัน: cd tests/e2e && npm install && node site-ui.e2e.js
   ครอบคลุม: เมนู ☰ มือถือ · ลำดับ section หน้าแรก · แกลเลอรี 2 คอลัมน์ · lightbox ปัดเปลี่ยนรูป/ปัดลงปิด */
const http = require("http");
const fs = require("fs");
const path = require("path");
const ROOT = require("path").join(__dirname, "..", "..");

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".webmanifest": "application/json", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if (url === "/api/site") { res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify({ ok: true, price: 720, prices: { std: 720, stu: 820, dlx: 870 }, rates: [], ann: { th: "", en: "" }, source: "sheet" })); }
  if (url.startsWith("/api/")) { res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify({ ok: true })); }
  let file = path.join(ROOT, url === "/" ? "index.html" : url);
  if (!fs.existsSync(file)) { res.statusCode = 404; return res.end("nf"); }
  res.setHeader("Content-Type", MIME[path.extname(file)] || "application/octet-stream");
  res.end(fs.readFileSync(file));
});

(async () => {
  await new Promise((r) => server.listen(8899, r));
  const { chromium } = require("playwright");
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
  const fails = [];
  const check = (name, cond) => { console.log((cond ? "PASS" : "FAIL") + " " + name); if (!cond) fails.push(name); };

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: "th-TH" });
  const page = await ctx.newPage();

  /* ── A: เมนู ☰ มือถือ ── */
  await page.goto("http://127.0.0.1:8899/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  check("ปุ่ม ☰ โผล่บนมือถือ", await page.isVisible(".menu-btn"));
  await page.click(".menu-btn");
  check("เมนูเปิด มีลิงก์ครบ 7 อัน (รวม hub ไกด์)", await page.locator(".mobile-menu a").count() === 7);
  const links = await page.locator(".mobile-menu a").allTextContents();
  check("มีลิงก์ รูปภาพ + ไกด์เที่ยว + จองเลย",
    links.some((t) => /รูปภาพ/.test(t)) && links.some((t) => /ไกด์เที่ยว/.test(t)) &&
    links.some((t) => /จองเลย/.test(t)));
  await page.click(".menu-btn"); // ปิด
  check("กด ✕ แล้วเมนูปิด", await page.isHidden(".mobile-menu"));

  /* ── ราคาจากชีต: ทุกจุดที่ติด data-price ต้องอัปเดตตาม /api/site ── */
  await page.waitForFunction(() => document.getElementById("priceAmt")?.textContent === "฿720", null, { timeout: 3000 }).catch(() => {});
  check("ราคาห้อง Standard อัปเดตจากชีต (data-price)", (await page.textContent("#priceAmt")) === "฿720");
  check("ราคาห้อง Studio/Deluxe อัปเดตจากชีตด้วย",
    (await page.textContent('.price-box .amount[data-price="stu"]')) === "฿820" &&
    (await page.textContent('.price-box .amount[data-price="dlx"]')) === "฿870");

  /* ── C: ลำดับหน้าแรกใหม่ — ห้องพัก+รีวิวมาก่อน ── */
  const order = await page.evaluate(() => [...document.querySelectorAll("main > section")].map((s) => s.id));
  check("ห้องพักขึ้นก่อน (rooms → reviews → about)", order[0] === "rooms" && order[1] === "reviews" && order[2] === "about");

  /* ── B1: แกลเลอรีหน้าแรก 2 คอลัมน์บนมือถือ ── */
  const cols = await page.evaluate(() => getComputedStyle(document.querySelector(".gallery")).gridTemplateColumns.split(" ").length);
  check("แกลเลอรีหน้าแรก 2 คอลัมน์", cols === 2);

  /* เมนูจากหน้าอื่น: ลิงก์ anchor ต้องพากลับ index.html ── */
  await page.goto("http://127.0.0.1:8899/gallery.html", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await page.click(".menu-btn");
  const href = await page.getAttribute('.mobile-menu a[data-i18n="nav.rooms"]', "href");
  check("หน้าอื่น: ลิงก์ห้องพักชี้กลับ index.html#rooms", href === "index.html#rooms");

  /* ── B2: หน้ารูปทั้งหมด 2 คอลัมน์ + lightbox ปัดได้ ── */
  const cols2 = await page.evaluate(() => getComputedStyle(document.querySelector(".gl-grid")).gridTemplateColumns.split(" ").length);
  check("หน้ารูปทั้งหมด 2 คอลัมน์", cols2 === 2);
  await page.click(".menu-btn"); // ปิดเมนูก่อน
  await page.click('figure[data-idx="0"]');
  check("แตะรูปเปิด lightbox", await page.isVisible("#lb.open"));
  const src0 = await page.getAttribute("#lbImg", "src");
  // จำลองปัดซ้าย (ไปรูปถัดไป)
  await page.evaluate(() => {
    const lb = document.getElementById("lb");
    const mk = (type, x) => {
      const t = new Touch({ identifier: 1, target: lb, clientX: x, clientY: 400 });
      return new TouchEvent(type, { touches: type === "touchend" ? [] : [t], changedTouches: [t], bubbles: true });
    };
    lb.dispatchEvent(mk("touchstart", 300));
    lb.dispatchEvent(mk("touchend", 180));
  });
  await page.waitForTimeout(200);
  const src1 = await page.getAttribute("#lbImg", "src");
  check("ปัดซ้ายเปลี่ยนเป็นรูปถัดไป", src1 !== src0);
  // ปัดลงปิด
  await page.evaluate(() => {
    const lb = document.getElementById("lb");
    const mk = (type, y) => {
      const t = new Touch({ identifier: 2, target: lb, clientX: 200, clientY: y });
      return new TouchEvent(type, { touches: type === "touchend" ? [] : [t], changedTouches: [t], bubbles: true });
    };
    lb.dispatchEvent(mk("touchstart", 300));
    lb.dispatchEvent(mk("touchend", 450));
  });
  await page.waitForTimeout(200);
  check("ปัดลงปิด lightbox", !(await page.isVisible("#lb.open")));

  /* เมนูสลับภาษา EN ── */
  await page.goto("http://127.0.0.1:8899/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await page.click('.lang-toggle button[data-lang="en"]');
  await page.click(".menu-btn");
  const enLinks = await page.locator(".mobile-menu a").allTextContents();
  check("สลับ EN แล้วเมนูเป็นอังกฤษ", enLinks.some((t) => /Rooms/i.test(t)) && enLinks.some((t) => /Book/i.test(t)));

  /* desktop: ปุ่ม ☰ ต้องไม่โผล่ */
  const dt = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  await dt.goto("http://127.0.0.1:8899/", { waitUntil: "domcontentloaded" });
  await dt.waitForTimeout(300);
  check("desktop: ไม่เห็นปุ่ม ☰ (ใช้เมนูบนตามเดิม)", !(await dt.isVisible(".menu-btn")));
  check("desktop: เมนูบน nav ยังอยู่ครบ", await dt.locator(".navlinks a").count() === 5);

  await browser.close();
  server.close();
  console.log(fails.length ? "\n❌ " + fails.length + " failed" : "\n✅ all passed");
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
