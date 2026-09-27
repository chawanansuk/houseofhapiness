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

// วันที่ "ปรับปรุงล่าสุด" = commit ล่าสุดที่เปลี่ยนข้อความที่แขกมองเห็นจริง
// ไม่นับ commit ที่แก้แค่ schema/สคริปต์/คลาส/รูปแบบไฟล์ หรือแก้แค่บรรทัดวันที่เอง
// (เดิมนับทุก commit ทำให้ 25 หน้าได้วันเดียวกันหมดจากการแก้เทมเพลตครั้งเดียว)
function visibleText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<p class="ld-stamp">[\s\S]*?<\/p>/g, " ")
    .replace(/<head>[\s\S]*?<\/head>/, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
// ข้อความไทย/อังกฤษของหน้าอยู่ในบล็อก I18N ด้วย ถ้าคำแปลเปลี่ยนก็นับเป็นการแก้เนื้อหา
function i18nText(html) {
  const m = String(html || "").match(/Object\.assign\(I18N,\s*\{[\s\S]*?\n\}\);/g);
  return m ? m.join("\n").replace(/\s+/g, " ") : "";
}
const show = (rev, file) => {
  try { return execFileSync("git", ["show", `${rev}:${file}`], { cwd: root, maxBuffer: 1 << 26 }).toString(); } catch (e) { return null; }
};
function lastCommitDate(file) {
  let log;
  try { log = execFileSync("git", ["log", "--no-merges", "--format=%H %cs", "--", file], { cwd: root, maxBuffer: 1 << 26 }).toString().trim(); }
  catch (e) { return null; }
  if (!log) return null;
  for (const line of log.split("\n")) {
    const [sha, date] = line.split(" ");
    const now = show(sha, file), before = show(sha + "^", file);
    if (before === null) return date;   // commit ที่สร้างไฟล์
    if (visibleText(now) !== visibleText(before) || i18nText(now) !== i18nText(before)) return date;
  }
  return null;
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
  raw = raw.replace(/"dateModified":\s?"\d{4}-\d{2}-\d{2}"/g, `"dateModified": "${date}"`);

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
