/**
 * สร้าง sitemap.xml ใหม่จากไฟล์ที่มีอยู่จริง ทั้งภาษาไทยและอังกฤษ
 * - lastmod มาจากวันที่ commit ล่าสุดของไฟล์นั้น ไม่ใช่พิมพ์มือ
 * - ทุก URL มี xhtml:link rel="alternate" ครบทั้งคู่ภาษา ตามที่ Google กำหนด
 * - หน้า noindex และหน้าที่ยังไม่มีคู่ภาษาอังกฤษ จัดการแยกให้ถูกต้อง
 * รัน: node scripts/build-sitemap.mjs [--check]
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
const SITE = "https://houseofhappinessbangkok.com";

const PRIORITY = { "index.html": "1.0", "booking.html": "0.9", "guides.html": "0.8" };
const pri = (f) => PRIORITY[f] || (f.startsWith("room-") ? "0.8" : "0.7");

function lastmod(file) {
  try {
    const d = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { cwd: root }).toString().trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  } catch (e) { /* ไฟล์ใหม่ที่ยังไม่ commit */ }
  return new Date().toISOString().slice(0, 10);
}

const isNoindex = (f) => /<meta name="robots" content="[^"]*noindex/.test(fs.readFileSync(path.join(root, f), "utf8"));
const loc = (f) => `${SITE}/${f === "index.html" ? "" : f}`;
const enLoc = (f) => `${SITE}/en/${f}`;

const thPages = fs.readdirSync(root)
  .filter((f) => f.endsWith(".html") && f !== "404.html" && !isNoindex(f)).sort();
const hasEn = (f) => fs.existsSync(path.join(root, "en", f));

const urls = [];
for (const f of thPages) {
  const alts = hasEn(f)
    ? [["th", loc(f)], ["en", enLoc(f)], ["x-default", loc(f)]]
    : [];
  const links = alts.map(([l, h]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${h}"/>`).join("\n");
  urls.push(`  <url>\n    <loc>${loc(f)}</loc>\n    <lastmod>${lastmod(f)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${pri(f)}</priority>${links ? "\n" + links : ""}\n  </url>`);
  if (hasEn(f)) {
    urls.push(`  <url>\n    <loc>${enLoc(f)}</loc>\n    <lastmod>${lastmod("en/" + f)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${pri(f)}</priority>\n${links}\n  </url>`);
  }
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
const dest = path.join(root, "sitemap.xml");
const prev = fs.existsSync(dest) ? fs.readFileSync(dest, "utf8") : null;
if (prev !== xml && !check) fs.writeFileSync(dest, xml);
console.log(`${urls.length} URL (ไทย ${thPages.length} · อังกฤษ ${thPages.filter(hasEn).length})`);
if (check && prev !== xml) { console.log("sitemap.xml ยังไม่ตรงกับไฟล์จริง"); process.exitCode = 1; }
