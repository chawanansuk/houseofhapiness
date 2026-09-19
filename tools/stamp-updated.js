#!/usr/bin/env node
/* ปั๊มวันที่แก้ไขล่าสุดของแต่ละหน้า จากประวัติ git จริง ไม่ใช่พิมพ์มือ
   - อัปเดต "dateModified" ใน schema Article
   - อัปเดตบรรทัด <p class="ld-stamp"> ท้ายบทความ (สร้างให้ถ้ายังไม่มี)
   รัน: node tools/stamp-updated.js [--check]   (--check = บอกว่าอะไรจะเปลี่ยน ไม่เขียนไฟล์) */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const check = process.argv.includes("--check");

function lastCommitDate(file) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { cwd: root }).toString().trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch (e) { return null; }
}

const STAMP = /<p class="ld-stamp">[\s\S]*?<\/p>\n?/;
const files = fs.readdirSync(root).filter((f) => f.endsWith(".html"));
const changed = [];

for (const file of files) {
  const p = path.join(root, file);
  let raw = fs.readFileSync(p, "utf8");
  if (!raw.includes('<div class="ld-wrap">')) continue;   // เฉพาะหน้าบทความ
  const date = lastCommitDate(file);
  if (!date) continue;
  const before = raw;

  // 1) schema
  raw = raw.replace(/"dateModified": "\d{4}-\d{2}-\d{2}"/g, `"dateModified": "${date}"`);

  // 2) บรรทัดที่แขกเห็น — วางไว้ก่อน </div> ปิด .ld-wrap
  const stamp = `<p class="ld-stamp"><span data-i18n="st.by">เขียนโดยทีม House of Happiness</span> · ` +
    `<span data-i18n="st.on">ปรับปรุงล่าสุด</span> <time datetime="${date}">${date}</time></p>\n`;
  if (STAMP.test(raw)) {
    raw = raw.replace(STAMP, stamp);
  } else {
    // แทรกก่อน </div> ตัวสุดท้ายที่อยู่ก่อน <footer> (บางหน้ามีบรรทัดว่างคั่น)
    const fi = raw.indexOf("<footer");
    const end = fi > -1 ? raw.lastIndexOf("</div>", fi) : -1;
    if (end > -1) raw = raw.slice(0, end) + stamp + raw.slice(end);
  }
  if (raw !== before) { changed.push(`${file} -> ${date}`); if (!check) fs.writeFileSync(p, raw); }
}
console.log(changed.length ? changed.join("\n") : "ไม่มีอะไรต้องเปลี่ยน");
console.log(`${check ? "จะปั๊ม" : "ปั๊มแล้ว"} ${changed.length} หน้า`);
