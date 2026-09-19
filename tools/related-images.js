#!/usr/bin/env node
/* ใส่รูปให้ลิงก์ "ไกด์ที่เกี่ยวกัน" (.ld-room) โดยใช้รูป hero ของหน้าปลายทางเอง
   แขกเห็นว่ากำลังจะไปอ่านเรื่องอะไร ไม่ใช่แค่ตัวหนังสือ 3 บรรทัด
   รันซ้ำได้ ไม่ใส่ซ้ำ: node tools/related-images.js [--check] */
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const check = process.argv.includes("--check");

/* รูปของหน้าปลายทาง เรียงจาก hero ก่อน แล้วตามด้วยรูปอื่นในหน้านั้น
   ที่ต้องมีหลายตัวเลือกเพราะรูปสถานที่ยังมีแค่ 9 ไฟล์ หลายหน้าใช้ hero ซ้ำกัน
   ถ้าในบล็อกเดียวกันจะซ้ำ เราเลื่อนไปใช้รูปถัดไปของหน้านั้นแทน */
/* หน้าที่ไม่มี <img> คงที่ในตัวเอง (สร้างการ์ดจาก JS ล้วน) — ระบุรูปแทนไว้ตรงนี้
   ต้องเป็นรูปที่ตรงกับเนื้อหาหน้านั้นจริง ๆ ไม่ใช่หยิบรูปสวย ๆ มาใส่ */
const FALLBACK = {
  "local.html": { src: "images/local/krua.webp", alt: "ร้านอาหารใกล้ที่พักในซอยท่าดินแดง", w: "800", h: "824" },
};
const heroCache = new Map();
function imagesOf(file) {
  if (heroCache.has(file)) return heroCache.get(file);
  const p = path.join(root, file);
  if (!fs.existsSync(p)) { heroCache.set(file, []); return []; }
  if (FALLBACK[file]) { heroCache.set(file, [FALLBACK[file]]); return heroCache.get(file); }
  const raw = fs.readFileSync(p, "utf8");
  const tags = [...raw.matchAll(/<img\b[^>]*\bsrc="(images\/[^"]+\.(?:jpg|webp))"[^>]*>/g)].map((m) => m[0]);
  const isBg = (t) => /class="[^"]*\bbg\b/.test(t);
  tags.sort((a, b) => (isBg(b) ? 1 : 0) - (isBg(a) ? 1 : 0));   // hero มาก่อน
  const seen = new Set();
  const out = [];
  for (const tag of tags) {
    const src = tag.match(/\bsrc="(images\/[^"]+)"/)[1];
    if (src.includes("${") || seen.has(src)) continue;   // ข้ามรูปที่หน้าปลายทางสร้างจาก JS
    if (!fs.existsSync(path.join(root, src))) continue;
    seen.add(src);
    out.push({
      src,
      alt: (tag.match(/\balt="([^"]*)"/) || [, ""])[1],
      key: (tag.match(/data-i18n="(ph\.[a-z]+)"/) || [])[1],
      w: (tag.match(/\bwidth="(\d+)"/) || [])[1],
      h: (tag.match(/\bheight="(\d+)"/) || [])[1],
    });
  }
  heroCache.set(file, out);
  return out;
}

function pictureFor(hero) {
  if (hero.src.endsWith(".webp")) {
    const i18n = hero.key ? ` data-i18n="${hero.key}" data-i18n-attr="alt"` : "";
    const dim = hero.w && hero.h ? ` width="${hero.w}" height="${hero.h}"` : "";
    return `<img src="${hero.src}" alt="${hero.alt.replace(/"/g, "&quot;")}"${i18n}${dim} loading="lazy" decoding="async">`;
  }
  const base = hero.src.replace(/\.(jpg|webp)$/, "");
  const cands = [];
  if (fs.existsSync(path.join(root, base + "-800.webp"))) cands.push(`${base}-800.webp 800w`);
  if (fs.existsSync(path.join(root, base + ".webp")) && hero.w) cands.push(`${base}.webp ${hero.w}w`);
  const srcset = cands.length ? cands.join(", ") : base + ".webp";
  const sizes = cands.length > 1 ? ' sizes="(max-width: 760px) 100vw, 280px"' : "";
  const i18n = hero.key ? ` data-i18n="${hero.key}" data-i18n-attr="alt"` : "";
  const dim = hero.w && hero.h ? ` width="${hero.w}" height="${hero.h}"` : "";
  return `<picture><source type="image/webp" srcset="${srcset}"${sizes}>` +
    `<img src="${hero.src}" alt="${hero.alt.replace(/"/g, "&quot;")}"${i18n}${dim} loading="lazy" decoding="async"></picture>`;
}

const files = fs.readdirSync(root).filter((f) => f.endsWith(".html"));
let n = 0; let dup = 0; const touched = [];
for (const file of files) {
  const p = path.join(root, file);
  let raw = fs.readFileSync(p, "utf8");
  const before = raw;
  // เอารูปที่เคยใส่ไว้ออกก่อน เพื่อให้รันซ้ำได้ผลเหมือนรันครั้งแรกเสมอ
  // ลอกรูปเดิมออกให้หมดก่อน (บางลิงก์เคยมี <img> ของตัวเองอยู่แล้ว) เพื่อให้รันซ้ำได้ผลเดิมเสมอ
  for (let pass = 0; pass < 4; pass++) {
    const stripped = raw.replace(/(<a class="ld-room" href="[^"]+">)(?:<picture>[\s\S]*?<\/picture>|<img\b[^>]*>)/g, "$1");
    if (stripped === raw) break;
    raw = stripped;
  }
  // ทำทีละบล็อก .ld-rooms เพื่อไม่ให้รูปซ้ำกันเองภายในบล็อกเดียว
  raw = raw.replace(/<div class="ld-rooms">[\s\S]*?<\/div>/g, (block) => {
    const used = new Set();
    return block.replace(/<a class="ld-room" href="([^"]+)">/g, (m, href) => {
      const cands = imagesOf(href);
      if (!cands.length) return m;
      const pick = cands.find((c) => !used.has(c.src)) || cands[0];
      if (used.has(pick.src)) dup++;
      used.add(pick.src);
      n++;
      return `<a class="ld-room" href="${href}">${pictureFor(pick)}`;
    });
  });
  if (raw !== before) { touched.push(file); if (!check) fs.writeFileSync(p, raw); }
}
console.log(touched.join(", "));
console.log(`${check ? "จะใส่รูปให้" : "ใส่รูปให้"} ${n} ลิงก์ ใน ${touched.length} หน้า` + (dup ? ` · ยังซ้ำในบล็อกเดียวกัน ${dup} จุด (รูปสถานที่มีแค่ 9 ไฟล์)` : " · ไม่มีรูปซ้ำในบล็อกเดียวกัน"));
