/**
 * ใส่เวลาอ่านและวันที่ปรับปรุงลงการ์ดในหน้ารวมไกด์ (guides.html) จากตัวหน้าปลายทางจริง
 * - เวลาอ่าน = ตัวอักษรไทยในเนื้อหา ÷ 1,000 ปัดขึ้น (ไทยอ่านราว 1,000 ตัวอักษร/นาที) ขั้นต่ำ 1
 * - วันที่ = <time datetime> ใน .ld-stamp ของหน้านั้น
 * เขียนเป็น <span class="gd-rt" data-rt="N" data-upd="YYYY-MM-DD"></span> แล้ว ui.js แปลงเป็นข้อความตามภาษา
 * รัน: node scripts/build-guides-meta.mjs [--check]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
const gdPath = path.join(root, "guides.html");
let html = fs.readFileSync(gdPath, "utf8");

function metaOf(file) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, "utf8");
  const body = raw.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
  const thai = (body.match(/[฀-๿]/g) || []).length;
  const upd = (raw.match(/<p class="ld-stamp">[\s\S]*?<time datetime="(\d{4}-\d{2}-\d{2})"/) || [])[1];
  if (!upd) return null;
  return { rt: Math.max(1, Math.ceil(thai / 1000)), upd };
}

let changed = 0;
html = html.replace(/(<a class="gd-(?:card|feat)(?: lg)?" href="([^"]+)">[\s\S]*?)(\s*<span class="gd-rt"[^>]*><\/span>)?(\s*<span class="go")/g, (m, head, href, old, go) => {
  const meta = metaOf(href);
  if (!meta) return m;
  const span = `\n          <span class="gd-rt" data-rt="${meta.rt}" data-upd="${meta.upd}"></span>`;
  const next = head + span + go;
  if (next !== m) changed++;
  return next;
});

if (check) {
  if (html !== fs.readFileSync(gdPath, "utf8")) { console.error("guides.html: เวลาอ่าน/วันที่บนการ์ดไม่ตรงหน้าจริง — รัน node scripts/build-guides-meta.mjs"); process.exit(1); }
  console.log("เวลาอ่าน/วันที่บนการ์ดตรงหน้าจริง");
} else {
  fs.writeFileSync(gdPath, html);
  console.log(`อัปเดตการ์ด ${changed} ใบ`);
}
