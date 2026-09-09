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
  check("เมนูเปิด มีลิงก์ครบ 8 อัน (รวม hub ไกด์ + รูมเซอร์วิส)", await page.locator(".mobile-menu a").count() === 8);
  const links = await page.locator(".mobile-menu a").allTextContents();
  check("มีลิงก์ รูปภาพ + ไกด์เที่ยว + จองเลย",
    links.some((t) => /รูปภาพ/.test(t)) && links.some((t) => /ไกด์เที่ยว/.test(t)) &&
    links.some((t) => /จองเลย/.test(t)));
  await page.click(".menu-btn"); // ปิด
  check("กด ✕ แล้วเมนูปิด", await page.isHidden(".mobile-menu"));

  /* ── นโยบาย rate parity: ราคาห้องต้องไม่โผล่บนหน้าแรก — โชว์ "สอบถามราคา" แทน ── */
  const bodyTxt = await page.locator("body").innerText();
  check("หน้าแรกไม่มีราคาห้อง (rate parity)", !/฿7\d\d|฿8\d\d/.test(bodyTxt));
  check("การ์ดห้องแสดงป้ายสอบถามราคา", (await page.locator('.amount.ask-rate').count()) === 3);


  /* ── C: ลำดับหน้าแรกใหม่ — ห้องพัก+รีวิวมาก่อน ── */
  const order = await page.evaluate(() => [...document.querySelectorAll("main > section")].map((s) => s.id));
  check("แถบตัวเลขจริงใต้ hero แล้วห้องพักขึ้นก่อน (numbers → rooms → reviews → about)", order[0] === "numbers" && order[1] === "rooms" && order[2] === "reviews" && order[3] === "about");

  /* ── B1: หน้าแรกมือถือแบบกะทัดรัด (Prom Design density budget) ── */
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } window.scrollTo(0, 0); });
  const dens = await page.evaluate(() => {
    const rail = (sel) => { const el = document.querySelector(sel); const cs = getComputedStyle(el); return cs.display === "flex" && cs.overflowX === "auto" && el.scrollWidth > el.clientWidth + 40; };
    return {
      screens: document.documentElement.scrollHeight / innerHeight,
      noSideScroll: document.documentElement.scrollWidth <= innerWidth,
      roomRail: rail(".room-rail"), galleryRail: rail(".gallery.rail"), nearRail: rail(".near-photos.rail"),
      cues: [...document.querySelectorAll(".rail-cue")].every((c) => getComputedStyle(c).display !== "none"),
      foldsClosed: document.querySelectorAll("details.m-fold").length === 2 && document.querySelectorAll("details.m-fold[open]").length === 0,
      summaryTap: [...document.querySelectorAll("details.m-fold > summary")].every((s) => s.getBoundingClientRect().height >= 44),
      heroExtrasHidden: getComputedStyle(document.querySelector(".hero .highlights")).display === "none" && getComputedStyle(document.querySelector(".cta-strip")).display === "none",
    };
  });
  check("หน้าแรกมือถือยาวไม่เกิน 8 จอ (ได้ " + dens.screens.toFixed(1) + ")", dens.screens <= 8);
  check("หน้าไม่เลื่อนด้านข้าง", dens.noSideScroll);
  check("ห้องพัก / แกลเลอรี / สถานที่ใกล้เคียง เป็นรางเลื่อนแนวนอน", dens.roomRail && dens.galleryRail && dens.nearRail);
  check("รางเลื่อนมีคำใบ้ 'เลื่อนดู'", dens.cues);
  check("แผนที่วาดมือ + วิธีเดินทาง พับไว้บนมือถือ (2 ส่วน) หัวข้อกดได้ ≥44px", dens.foldsClosed && dens.summaryTap);
  check("hero ซ่อนไฮไลต์ซ้ำ + ไม่มีแถบ CTA ท้ายหน้าซ้ำกับแถบจองติดล่าง", dens.heroExtrasHidden);
  await page.click("#gettinghere .m-fold > summary");
  check("กดหัวข้อพับแล้วเปิดดูวิธีเดินทางได้", await page.evaluate(() => document.querySelector("#gettinghere .m-fold").open && document.querySelector(".gh-card").getBoundingClientRect().height > 40));

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
  const dl = await dt.evaluate(() => ({
    foldsOpen: document.querySelectorAll("details.m-fold[open]").length === 2,
    summaryHidden: [...document.querySelectorAll("details.m-fold > summary")].every((s) => getComputedStyle(s).display === "none"),
    cardsStacked: (() => { const c = [...document.querySelectorAll(".room-rail .room-card")]; return c.length === 3 && c[1].getBoundingClientRect().top > c[0].getBoundingClientRect().bottom; })(),
    galleryGrid: getComputedStyle(document.querySelector(".gallery")).display === "grid",
    cueHidden: [...document.querySelectorAll(".rail-cue")].every((c) => getComputedStyle(c).display === "none"),
  }));
  check("desktop: ส่วนพับเปิดค้าง ไม่เห็นหัวข้อพับ", dl.foldsOpen && dl.summaryHidden);
  check("desktop: การ์ดห้องยังเรียงลงตามเดิม แกลเลอรียัง grid ไม่มีคำใบ้เลื่อน", dl.cardsStacked && dl.galleryGrid && dl.cueHidden);

  await browser.close();
  server.close();
  console.log(fails.length ? "\n❌ " + fails.length + " failed" : "\n✅ all passed");
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
