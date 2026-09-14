#!/usr/bin/env node
/* ซิงก์ width/height บน <img> ให้ตรงกับขนาดไฟล์จริงใน images/attractions/
 *
 * ทำไมต้องมี: ทุกหน้าฝัง width/height ไว้ในแท็กตรงๆ (97 จุด) เวลาเปลี่ยนรูปใหม่
 * ที่สัดส่วนไม่เท่าเดิม ตัวเลขพวกนี้จะผิดทันที เบราว์เซอร์จองพื้นที่ผิดสัดส่วน
 * ก่อนรูปโหลดเสร็จ (layout shift) — เปลี่ยนรูปแล้วรันคำสั่งนี้ทีเดียวจบ
 *
 *   node tools/sync-image-dims.js          ดูว่าจะแก้อะไรบ้าง (ไม่เขียนไฟล์)
 *   node tools/sync-image-dims.js --write  เขียนจริง
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIR = "images/attractions";
const write = process.argv.includes("--write");

// อ่านขนาดจากส่วนหัว JPEG โดยตรง ไม่ต้องพึ่ง dependency ภายนอก
function jpegSize(file) {
  const d = fs.readFileSync(file);
  if (d[0] !== 0xff || d[1] !== 0xd8) return null;
  let i = 2;
  while (i < d.length - 9) {
    if (d[i] !== 0xff) { i++; continue; }
    const m = d[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { w: d.readUInt16BE(i + 7), h: d.readUInt16BE(i + 5) };
    }
    if (m === 0xd8 || m === 0xd9 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    i += 2 + d.readUInt16BE(i + 2);
  }
  return null;
}

const real = {};
for (const f of fs.readdirSync(path.join(ROOT, DIR))) {
  if (!f.endsWith(".jpg")) continue;
  const s = jpegSize(path.join(ROOT, DIR, f));
  if (s) real[f] = s;
  else console.warn(`อ่านขนาดไม่ได้: ${f}`);
}

// og:image ชี้ไปรูปไหนก็ได้ใต้ images/ จึงอ่านขนาดตอนใช้จริงแทนการอ่านล่วงหน้า
const sizeCache = new Map();
function sizeOf(rel) {
  if (!sizeCache.has(rel)) {
    const abs = path.join(ROOT, rel);
    sizeCache.set(rel, rel.endsWith(".jpg") && fs.existsSync(abs) ? jpegSize(abs) : null);
  }
  return sizeCache.get(rel);
}

let changed = 0, files = 0;
for (const fn of fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"))) {
  const p = path.join(ROOT, fn);
  const before = fs.readFileSync(p, "utf8");
  let hits = 0;
  const after = before.replace(/<img\b[^>]*>/g, (tag) => {
    const src = /src="[^"]*images\/attractions\/([a-z0-9-]+\.jpg)"/.exec(tag);
    if (!src || !real[src[1]]) return tag;
    const { w, h } = real[src[1]];
    const hasW = /\bwidth="(\d+)"/.exec(tag);
    const hasH = /\bheight="(\d+)"/.exec(tag);
    if (!hasW || !hasH) return tag;                    // ไม่เคยระบุไว้ ก็ไม่ต้องไปใส่
    if (+hasW[1] === w && +hasH[1] === h) return tag;  // ตรงอยู่แล้ว
    hits++;
    return tag.replace(/\bwidth="\d+"/, `width="${w}"`).replace(/\bheight="\d+"/, `height="${h}"`);
  });
  let after2 = after;
  const og = /<meta property="og:image" content="[^"]*\/(images\/[^"]+)">/.exec(after);
  const sz = og && sizeOf(og[1]);
  if (sz) {
    after2 = after2.replace(/(<meta property="og:image:width" content=")\d+(">)/, (m, a, b) => {
      if (m === `${a}${sz.w}${b}`) return m;
      hits++; return `${a}${sz.w}${b}`;
    }).replace(/(<meta property="og:image:height" content=")\d+(">)/, (m, a, b) => {
      if (m === `${a}${sz.h}${b}`) return m;
      hits++; return `${a}${sz.h}${b}`;
    });
  }

  if (hits) {
    files++; changed += hits;
    console.log(`${fn}: ${hits} จุด`);
    if (write) fs.writeFileSync(p, after2);
  }
}

console.log(changed
  ? `\n${changed} จุดใน ${files} ไฟล์${write ? " — เขียนแล้ว" : " — ยังไม่เขียน (ใส่ --write เพื่อเขียนจริง)"}`
  : "\nตรงกับไฟล์จริงทุกจุดแล้ว");
process.exit(write || !changed ? 0 : 1);
