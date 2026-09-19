#!/usr/bin/env node
/* สร้างบล็อก "จุดต่าง ๆ บนแผนที่" ในหน้าบทความ จากรายชื่อสถานที่ใน schema Article ของหน้านั้นเอง
   ไม่มีการเดาพิกัดหรือเดาชื่อสถานที่ — ใช้เฉพาะชื่อที่หน้านั้นประกาศไว้แล้วใน "about"
   รันซ้ำได้ (เขียนทับบล็อกเดิม): node tools/add-places.js [--check] */
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const check = process.argv.includes("--check");

const ORIGIN = "House of Happiness 558/1 Tha Din Daeng Rd Khlong San Bangkok";
// กว้างเกินกว่าจะปักหมุดให้มีประโยชน์ — ข้ามไป
const TOO_BROAD = new Set(["Bangkok", "Chao Phraya River", "Khlong San", "Chinatown", "Thonburi", "Ayutthaya Historical Park"]);
const MAX_STOPS = 8;

const enc = encodeURIComponent;
const searchUrl = (name, city) => `https://www.google.com/maps/search/?api=1&query=${enc(name + ", " + city + ", Thailand")}`;
const dirUrl = (names, city) => {
  const stops = names.slice(0, MAX_STOPS).map((n) => n + ", " + city + ", Thailand");
  const dest = stops[stops.length - 1];
  const way = stops.slice(0, -1);
  let u = `https://www.google.com/maps/dir/?api=1&origin=${enc(ORIGIN)}&destination=${enc(dest)}`;
  if (way.length) u += `&waypoints=${way.map(enc).join("%7C")}`;
  return u;
};

function placesOf(raw) {
  for (const m of raw.matchAll(/<script type="application\/ld\+json">\s*(\{[\s\S]*?\})\s*<\/script>/g)) {
    let d; try { d = JSON.parse(m[1]); } catch (e) { continue; }
    if (d["@type"] !== "Article" || !Array.isArray(d.about)) continue;
    return d.about.filter((a) => a["@type"] === "Place" && a.name && !TOO_BROAD.has(a.name)).map((a) => a.name);
  }
  return [];
}

const BLOCK = /\n?  <section class="ld-sec ld-places">[\s\S]*?<\/section>\n/;
const files = fs.readdirSync(root).filter((f) => f.endsWith(".html"));
const done = [];

for (const file of files) {
  const p = path.join(root, file);
  let raw = fs.readFileSync(p, "utf8");
  if (!raw.includes('<div class="ld-wrap">')) continue;
  const names = placesOf(raw);
  if (names.length < 3) continue;
  const city = file.startsWith("ayutthaya") ? "Ayutthaya" : "Bangkok";

  const links = names.map((n) =>
    `      <a href="${searchUrl(n, city)}" target="_blank" rel="noopener">📍 ${n}</a>`).join("\n");
  const block = `\n  <section class="ld-sec ld-places">
    <h2 data-i18n="pl.t">จุดในเส้นทางนี้บน Google Maps</h2>
    <p class="ld-p" data-i18n="pl.d">กดชื่อสถานที่เพื่อเปิดหมุดใน Google Maps — ใช้ชื่อภาษาอังกฤษแบบที่ Google ค้นเจอ</p>
    <div class="ld-pl">
${links}
    </div>
    <a class="ld-plroute" href="${dirUrl(names, city)}" target="_blank" rel="noopener" data-i18n="pl.route">เปิดเส้นทางทั้งหมดจากที่พัก →</a>
  </section>\n`;

  raw = raw.replace(BLOCK, "\n");
  // วางไว้ก่อนปุ่ม CTA ท้ายบทความ ถ้าไม่มีก็ก่อน </div> ที่ปิด .ld-wrap
  let at = raw.indexOf('  <div class="ld-cta"');
  if (at < 0) { const fi = raw.indexOf("<footer"); at = fi > -1 ? raw.lastIndexOf("</div>", fi) : -1; }
  if (at < 0) continue;
  raw = raw.slice(0, at) + block + raw.slice(at);
  done.push(`${file}: ${names.length} จุด`);
  if (!check) fs.writeFileSync(p, raw);
}
console.log(done.join("\n"));
console.log(`${check ? "จะเพิ่ม" : "เพิ่มแล้ว"} ${done.length} หน้า`);
