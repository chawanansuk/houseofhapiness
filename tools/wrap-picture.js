#!/usr/bin/env node
/* ห่อ <img> ที่มีไฟล์ .webp คู่กันไว้ใน <picture> พร้อม srcset
   เบราว์เซอร์ที่รู้จัก WebP จะโหลดไฟล์เล็กกว่า ที่เหลือยังได้ .jpg เดิม
   รันซ้ำได้ ไม่ห่อซ้ำ: node tools/wrap-picture.js [--check] */
const fs = require("fs");
const path = require("path");

const check = process.argv.includes("--check");
const root = process.cwd();
const files = fs.readdirSync(root).filter((f) => f.endsWith(".html"));

const exists = (p) => fs.existsSync(path.join(root, p));

function sizesFor(tag, before) {
  if (/class="[^"]*\bbg\b/.test(tag)) return "100vw";
  if (/<div class="pic">\s*$/.test(before)) return "(max-width: 760px) 100vw, 380px";
  return "(max-width: 760px) 100vw, 480px";
}

let changed = 0;
const report = [];

for (const file of files) {
  const raw = fs.readFileSync(path.join(root, file), "utf8");
  let out = "";
  let i = 0;
  let n = 0;
  const re = /<img\b[^>]*>/g;
  let m;
  while ((m = re.exec(raw))) {
    const tag = m[0];
    const before = raw.slice(Math.max(0, m.index - 200), m.index);
    // ข้ามถ้าอยู่ใน <picture> อยู่แล้ว
    if (/<picture\b[^>]*>\s*(<source[^>]*>\s*)*$/.test(before)) continue;
    const src = (tag.match(/\bsrc="([^"]+)"/) || [])[1];
    if (!src || !src.endsWith(".jpg")) continue;
    const base = src.slice(0, -4);
    if (!exists(base + ".webp")) continue;

    const w = Number((tag.match(/\bwidth="(\d+)"/) || [])[1] || 0);
    const parts = [];
    if (exists(base + "-800.webp")) parts.push(`${base}-800.webp 800w`);
    if (w) parts.push(`${base}.webp ${w}w`);
    const srcset = parts.length ? parts.join(", ") : `${base}.webp`;
    const sizesAttr = parts.length > 1 ? ` sizes="${sizesFor(tag, before)}"` : "";

    // onerror เดิมลบ parentElement — พอห่อด้วย <picture> พ่อแม่จะกลายเป็น picture
    const fixed = tag.replace(
      /onerror="this\.parentElement\.remove\(\)"/,
      'onerror="(this.closest(\'a,.pic,figure\')||this).remove()"'
    );

    out += raw.slice(i, m.index);
    out += `<picture><source type="image/webp" srcset="${srcset}"${sizesAttr}>${fixed}</picture>`;
    i = m.index + tag.length;
    n++;
  }
  if (!n) continue;
  out += raw.slice(i);
  report.push(`${file}: ${n}`);
  changed += n;
  if (!check) fs.writeFileSync(path.join(root, file), out);
}

console.log(report.join("\n"));
console.log(`${check ? "จะห่อ" : "ห่อแล้ว"} ${changed} รูป ใน ${report.length} หน้า`);
