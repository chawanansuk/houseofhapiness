/**
 * Review gate (ดัดแปลงจากแนวคิด shots.mjs ของสกิล prom-design) — ทุกหน้าสาธารณะ × 3 ความกว้างจอ
 * ตรวจ: หน้าห้ามเลื่อนซ้าย-ขวา (scrollWidth == viewport) · ไม่มีรูปแตก · ทุก .reveal ต้องโชว์หลังเลื่อนจนสุด
 *        · ไม่มี JS error · รายงานความยาวหน้าเป็น "จอ" (ตัวเลขเบื้องหลังคำว่า "เลื่อนยาวไป")
 * วิธีรัน:  cd tests/e2e && node review-gate.js            (เพิ่ม --shots ./out เพื่อเก็บภาพ)
 */
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..", ".."), PORT = 8935;
const MIME = { ".html":"text/html; charset=utf-8", ".css":"text/css", ".js":"text/javascript", ".json":"application/json", ".png":"image/png", ".jpg":"image/jpeg", ".webp":"image/webp", ".svg":"image/svg+xml", ".woff2":"font/woff2", ".webmanifest":"application/manifest+json", ".xml":"application/xml", ".txt":"text/plain" };
const PAGES = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html") && f !== "404.html");
const WIDTHS = [375, 768, 1280];
const shotsDir = (() => { const i = process.argv.indexOf("--shots"); return i > -1 ? path.resolve(process.argv[i + 1]) : null; })();
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  if (p.startsWith("/api/")) { res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ ok: true, demo: true, price: 700, ann: { th: "", en: "" }, total: 15, available: 9, full: false, source: "demo" })); }
  const f = path.join(ROOT, p === "/" ? "index.html" : p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("nf"); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(fs.readFileSync(f));
});
(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
  if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });
  const problems = [];
  console.log("page".padEnd(26), "width", "screens", "notes");
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 667 : 900 }, locale: "th-TH", hasTouch: width < 700 });
    for (const page of PAGES) {
      const pg = await ctx.newPage();
      const errors = [];
      pg.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
      pg.on("console", (m) => { if (m.type() === "error" && !/_vercel|favicon|net::ERR/.test(m.text())) errors.push(m.text().slice(0, 120)); });
      await pg.goto(`http://127.0.0.1:${PORT}/${page}`, { waitUntil: "networkidle" }).catch((e) => errors.push("goto: " + e.message.slice(0, 80)));
      // เลื่อนแบบคนจริง (ทีละ 40% ของจอ) แล้วกลับขึ้นบน
      await pg.evaluate(async () => { document.documentElement.style.scrollBehavior = "auto"; const step = Math.round(innerHeight * 0.4); for (let y = 0; y < document.body.scrollHeight; y += step) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); } scrollTo(0, 0); });
      await pg.waitForTimeout(400);
      const m = await pg.evaluate(() => ({
        sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth,
        screens: +(document.documentElement.scrollHeight / innerHeight).toFixed(1),
        broken: [...document.images].filter((i) => i.getAttribute("src") && i.complete && i.naturalWidth === 0).map((i) => i.getAttribute("src")),
        hidden: [...document.querySelectorAll(".reveal:not(.visible)")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.tagName.toLowerCase() + "#" + (e.id || e.className.replace(/\s+/g, "."))),
      }));
      const notes = [];
      if (m.sw > m.vw) notes.push(`overflow ${m.sw}>${m.vw}`);
      if (m.broken.length) notes.push(`broken img ${m.broken.join(",")}`);
      if (m.hidden.length) notes.push(`reveal never fired ${m.hidden.join(",")}`);
      if (errors.length) notes.push(`js error: ${errors[0]}`);
      console.log(page.padEnd(26), String(width).padEnd(5), String(m.screens).padEnd(7), notes.join(" · ") || "ok");
      notes.forEach((n) => problems.push(`${page} @${width}: ${n}`));
      if (shotsDir) await pg.screenshot({ path: path.join(shotsDir, `${page.replace(".html", "")}@${width}.png`), fullPage: true });
      await pg.close();
    }
    await ctx.close();
  }
  await browser.close(); server.close();
  if (problems.length) { console.log(`\n❌ ${problems.length} problem(s)`); problems.forEach((p) => console.log("  - " + p)); process.exit(1); }
  console.log("\n✅ REVIEW GATE PASSED (no horizontal overflow, no broken images, every reveal fired, no JS errors)");
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
