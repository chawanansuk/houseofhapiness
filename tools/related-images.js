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
/* หัวเรื่องของหน้า ใช้เป็นคำอธิบายรูปเวลารูปปกไม่มี alt */
function headingOf(raw) {
  const h1 = raw.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (!h1) return "";
  return h1[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

const heroCache = new Map();
function imagesOf(file) {
  if (heroCache.has(file)) return heroCache.get(file);
  const p = path.join(root, file);
  if (!fs.existsSync(p)) { heroCache.set(file, []); return []; }
  if (FALLBACK[file]) { heroCache.set(file, [FALLBACK[file]]); return heroCache.get(file); }
  const raw = fs.readFileSync(p, "utf8");
  const isBg = (t) => /class="[^"]*\bbg\b/.test(t);
  const tags = [...raw.matchAll(/<img\b[^>]*\bsrc="(images\/[^"]+\.(?:jpg|webp))"[^>]*>/g)].map((m) => m[0]);
  tags.sort((a, b) => (isBg(b) ? 1 : 0) - (isBg(a) ? 1 : 0));   // hero มาก่อน
  const seen = new Set();
  const out = [];
  for (const tag of tags) {
    const src = tag.match(/\bsrc="(images\/[^"]+)"/)[1];
    if (src.includes("${") || seen.has(src)) continue;   // ข้ามรูปที่หน้าปลายทางสร้างจาก JS
    if (!fs.existsSync(path.join(root, src))) continue;
    seen.add(src);
    // รูปห้องพัก/รูปอาคารของที่พัก ไม่ใช่ภาพประกอบเรื่องของหน้านั้น
    // (เคยหลุดไปเป็นรูปเตียงบนการ์ด "เที่ยวเยาวราชกลางคืน" มาแล้ว)
    // รับเฉพาะรูปปกของหน้านั้น หรือรูปที่เป็นเรื่องของหน้านั้นจริง ๆ
    // ไม่งั้นจะไปหยิบรูปห้องพักที่ติดมาจากบล็อกอื่นในหน้า (เคยหลุดเป็นรูปเตียง
    // บนการ์ด "เที่ยวเยาวราชกลางคืน" มาแล้ว) — หน้าห้องพักยังใช้รูปปกตัวเองได้ปกติ
    const bg = isBg(tag);
    const isTopical = bg || /^images\/(attractions|local|services)\//.test(src);
    if (!isTopical) continue;
    // รูปปกของหน้าห้องพักตั้ง alt="" ไว้ (ถูกต้องแล้วเพราะมี h1 ทับอยู่)
    // พอเอามาใช้บนการ์ด รูปกลายเป็นเนื้อหา จึงต้องมีคำอธิบาย — ใช้ h1 ของหน้านั้น
    let alt = (tag.match(/\balt="([^"]*)"/) || [, ""])[1];
    if (!alt && bg) alt = headingOf(raw);
    if (!alt) continue;
    out.push({
      src,
      alt,
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
      // ลำดับความสำคัญ: รูปปกของหน้านั้นก่อนเสมอ เพราะตรงเรื่องที่สุด
      // ถ้าซ้ำกับการ์ดอื่นในบล็อกเดียวกัน ค่อยหารูปสถานที่อื่นของหน้านั้นแทน
      // แต่ไม่ลงไปหยิบรูปอาหารรูมเซอร์วิสมาใส่การ์ดไกด์ ยอมให้รูปซ้ำดีกว่ารูปผิดเรื่อง
      let pick = cands[0];
      if (used.has(pick.src)) {
        pick = cands.find((c) => !used.has(c.src) && c.src.startsWith("images/attractions/")) || pick;
      }
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
