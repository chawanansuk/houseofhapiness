#!/usr/bin/env node
/* ถ่าย screenshot ทุกหน้า 2 ขนาดจอ 2 ภาษา ไว้ตรวจด้วยตา + รายงานหน้าที่เลื่อนซ้ายขวาได้
   รัน: node tools/shots.js [outDir] [page.html ...]   (ไม่ใส่ชื่อหน้า = ทุกหน้า)  */
const http = require("http");
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".webmanifest": "application/json", ".woff2": "font/woff2", ".txt": "text/plain", ".xml": "application/xml" };

const args = process.argv.slice(2);
const outDir = path.join(ROOT, "_review", "screens", args[0] || "now");
const only = args.slice(1);
const SKIP = new Set(["404.html"]);
const pages = only.length ? only
  : fs.readdirSync(ROOT).filter((f) => f.endsWith(".html") && !SKIP.has(f)).sort();

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if (url === "/api/site") { res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ ok: true, price: 720, prices: { std: 720, stu: 850, dlx: 950 } })); }
  if (url.startsWith("/api/")) { res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify({ ok: true })); }
  const file = path.join(ROOT, url === "/" ? "index.html" : decodeURIComponent(url));
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end("nf"); }
  res.setHeader("Content-Type", MIME[path.extname(file)] || "application/octet-stream");
  res.end(fs.readFileSync(file));
});

const VIEWS = [{ n: "m", width: 390, height: 844 }, { n: "d", width: 1280, height: 800 }];

(async () => {
  await new Promise((r) => server.listen(8901, r));
  const { chromium } = require("playwright");
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
  fs.mkdirSync(outDir, { recursive: true });
  const problems = [];

  for (const view of VIEWS) {
    const ctx = await browser.newContext({ viewport: { width: view.width, height: view.height }, deviceScaleFactor: 1 });
    for (const lang of ["th", "en"]) {
      const page = await ctx.newPage();
      await page.addInitScript((l) => { try { localStorage.setItem("hoh-lang", l); } catch (e) {} }, lang);
      for (const file of pages) {
        const errs = [];
        page.on("pageerror", (e) => errs.push(String(e).slice(0, 120)));
        await page.goto(`http://127.0.0.1:8901/${file}`, { waitUntil: "load" }).catch(() => {});
        // เลื่อนทีละจอจากบนลงล่าง แล้วดูว่ามีบล็อกไหนอยู่ในจอแต่ยังโปร่งใสอยู่ไหม
        // นี่คือสิ่งที่แขกเจอจริง ๆ ถ้าเอฟเฟกต์ fade พัง: แถบว่างกลางหน้า
        const blankSeen = await (async () => {
          let worst = 0;
          const steps = await page.evaluate(() => Math.ceil(document.body.scrollHeight / innerHeight));
          for (let k = 0; k <= Math.min(steps, 12); k++) {
            await page.evaluate((i) => window.scrollTo({ top: i * innerHeight * 0.9, behavior: "instant" }), k);
            await page.waitForTimeout(180);
            const n = await page.evaluate(() => [...document.querySelectorAll(".reveal")]
              .filter((el) => { const r = el.getBoundingClientRect();
                return r.bottom > 0 && r.top < innerHeight && getComputedStyle(el).opacity === "0"; }).length);
            if (n > worst) worst = n;
            if (worst) break;
          }
          return worst;
        })();
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await page.waitForTimeout(500);
        const slug = file.replace(/\.html$/, "");
        await page.screenshot({ path: path.join(outDir, `${slug}.${view.n}.${lang}.png`), fullPage: true });

        const info = await page.evaluate(() => {
          const de = document.documentElement;
          const over = de.scrollWidth - de.clientWidth;
          // ข้ามของที่อยู่ในรางเลื่อนแนวนอน (ตั้งใจให้ล้นอยู่แล้ว) จะได้เหลือแต่ของที่ล้นจริง
          const inRail = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement)
            if (/auto|scroll/.test(getComputedStyle(p).overflowX)) return true; return false; };
          const wide = over > 1 ? [...document.querySelectorAll("body *")]
            .filter((el) => el.getBoundingClientRect().right > de.clientWidth + 1 && !inRail(el))
            .slice(0, 4).map((el) => el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : "")) : [];
          // บล็อกที่ยังโปร่งใสอยู่หลังหน้านิ่งแล้ว = ของจริงที่แขกจะเห็นเป็นที่ว่าง
          // ดูที่ opacity ที่คำนวณจริง ไม่ดูแค่คลาส เพราะกฎ CSS ที่เจาะจงกว่าอาจทับกันเองได้
          const blank = 0;
          const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute("src")).map((i) => i.currentSrc || i.src);
          return { over, wide, blank, broken, h: document.body.scrollHeight };
        });
        if (info.over > 1) problems.push(`${file} ${view.n}/${lang}: ล้นขวา ${info.over}px — ${info.wide.join(", ")}`);
        if (blankSeen) problems.push(`${file} ${view.n}/${lang}: เลื่อนแล้วเจอ ${blankSeen} บล็อกอยู่ในจอแต่ยังโปร่งใส`);
        if (info.broken.length) problems.push(`${file} ${view.n}/${lang}: รูปโหลดไม่ขึ้น ${info.broken.slice(0, 3).join(", ")}`);
        if (errs.length) problems.push(`${file} ${view.n}/${lang}: JS error ${errs[0]}`);
      }
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  server.close();
  fs.writeFileSync(path.join(outDir, "_problems.txt"), problems.join("\n") + "\n");
  console.log(problems.length ? problems.join("\n") : "ไม่พบปัญหาเลย์เอาต์");
  console.log(`\n${pages.length} หน้า × ${VIEWS.length} จอ × 2 ภาษา -> ${path.relative(ROOT, outDir)}`);
  process.exit(0);
})();
