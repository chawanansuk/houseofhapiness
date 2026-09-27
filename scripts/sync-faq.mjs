/**
 * เขียน FAQPage schema ภาษาไทยของทุกหน้าที่รากใหม่ จากคำถาม-คำตอบใน <details> ของหน้านั้นเอง
 * ดูเหตุผลใน scripts/faq-schema.mjs
 *
 * รัน:  node scripts/sync-faq.mjs           อัปเดตไฟล์
 *       node scripts/sync-faq.mjs --check   ตรวจอย่างเดียว (ใช้ใน npm test)
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { faqEntities, applyFaqToHtml } from "./faq-schema.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const SKIP = new Set(["404.html", "services.html", "credits.html"]);

function dictFor(html) {
  const sandbox = { I18N: {}, window: {}, document: { addEventListener() {} }, localStorage: { getItem: () => null, setItem() {} }, navigator: { language: "th" } };
  vm.createContext(sandbox);
  const src = read("assets/i18n.js").replace(/^const I18N = \{/m, "globalThis.I18N = {");
  try { vm.runInContext(src, sandbox, { timeout: 5000 }); } catch (e) { /* ข้าม */ }
  for (const m of html.matchAll(/Object\.assign\(I18N,\s*\{[\s\S]*?\n\}\);/g)) {
    try { vm.runInContext(m[0], sandbox, { timeout: 5000 }); } catch (e) { /* ข้าม */ }
  }
  return sandbox.I18N || {};
}

const stale = [];
let pagesWithFaq = 0;
for (const file of fs.readdirSync(root).filter((f) => f.endsWith(".html") && !SKIP.has(f)).sort()) {
  const html = read(file);
  const doc = new JSDOM(html).window.document;
  const ents = faqEntities(doc, dictFor(html), "th");
  if (ents.length) pagesWithFaq++;
  const next = applyFaqToHtml(html, ents);
  if (next !== html) {
    stale.push(file);
    if (!check) fs.writeFileSync(path.join(root, file), next);
  }
}

if (check && stale.length) {
  console.error("FAQ schema ไม่ตรงกับถามบ่อยบนหน้า: " + stale.join(", ") + "\nรัน: node scripts/sync-faq.mjs");
  process.exit(1);
}
console.log(check ? `FAQ schema ตรงกับหน้าจริงทุกหน้า (${pagesWithFaq} หน้า)` : `อัปเดต FAQ schema ${stale.length} ไฟล์ · หน้าที่มีถามบ่อย ${pagesWithFaq}`);
