#!/usr/bin/env node
/* ตรวจสุขภาพทุกหน้าสาธารณะในรอบเดียว — SEO · ลิงก์ · รูป · i18n · schema · CTA
 *
 *   node tools/audit-site.js            สรุปเฉพาะที่มีปัญหา
 *   node tools/audit-site.js --all      แสดงทุกหน้าแม้ผ่านหมด
 *
 * ไม่พึ่ง dependency ภายนอก อ่านไฟล์ตรง ๆ แล้วเช็คด้วย regex + ประเมิน i18n ด้วย Function
 * ใช้คู่กับ review-gate.js (เลย์เอาต์/JS error ในเบราว์เซอร์จริง) และ seo-pages.e2e.js
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const SHOW_ALL = process.argv.includes("--all");

const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html") && f !== "404.html");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel.split("#")[0].split("?")[0]));

// คีย์ภาษากลาง
const I18N = {};
new Function("I18N", fs.readFileSync(path.join(ROOT, "assets/i18n.js"), "utf8")
  .replace(/^const I18N = /m, "Object.assign(I18N, ")
  .replace(/\n};\n/, "\n});\n")
  .replace(/document\.addEventListener\("DOMContentLoaded", applyLang\);?/, ""))(I18N);

const findings = {};
const add = (page, sev, msg) => ((findings[page] ||= []).push({ sev, msg }));

const descSeen = {}; const titleSeen = {};
const idOf = (html) => { const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html); return m ? m[1].replace(/<[^>]+>/g, "").trim() : ""; };

for (const page of pages) {
  const raw = fs.readFileSync(path.join(ROOT, page), "utf8");
  const head = raw.slice(0, raw.indexOf("</head>"));
  // ตัดสคริปต์ออกก่อนสแกน href/img/id — template literal อย่าง ${x.url} ไม่ใช่ลิงก์จริง
  // แต่เก็บบล็อก i18n ไว้แยกต่างหาก และ JSON-LD ตรวจจาก raw
  const html = raw.replace(/<script\b(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/g, "");

  // ── title / description ─────────────────────────────────────────
  const title = (/<title>([^<]*)<\/title>/.exec(head) || [])[1] || "";
  if (!title) add(page, "err", "ไม่มี <title>");
  else {
    if (title.length > 65) add(page, "warn", `title ยาว ${title.length} ตัว (Google ตัดราว 60)`);
    (titleSeen[title] ||= []).push(page);
  }
  const desc = (/<meta name="description" content="([^"]*)"/.exec(head) || [])[1] || "";
  if (!desc) add(page, "err", "ไม่มี meta description");
  else {
    if (desc.length < 70) add(page, "warn", `description สั้น ${desc.length} ตัว`);
    if (desc.length > 170) add(page, "warn", `description ยาว ${desc.length} ตัว (ถูกตัดใน SERP)`);
    (descSeen[desc] ||= []).push(page);
  }

  // ── h1 ──────────────────────────────────────────────────────────
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) add(page, "err", `h1 มี ${h1s} อัน (ต้องมี 1)`);

  // ── canonical / og ──────────────────────────────────────────────
  const canon = (/<link rel="canonical" href="([^"]+)"/.exec(head) || [])[1];
  const expectCanon = page === "index.html" ? "https://houseofhappinessbangkok.com/" : `https://houseofhappinessbangkok.com/${page}`;
  if (!canon) add(page, "warn", "ไม่มี canonical");
  else if (canon !== expectCanon) add(page, "err", `canonical ชี้ผิด: ${canon}`);
  for (const p of ["og:title", "og:description", "og:image"]) {
    if (!new RegExp(`<meta property="${p}"`).test(head)) add(page, "warn", `ไม่มี ${p}`);
  }
  const og = (/<meta property="og:image" content="[^"]*\/(images\/[^"]+)"/.exec(head) || [])[1];
  if (og && !exists(og)) add(page, "err", `og:image ไม่มีไฟล์: ${og}`);
  if (/<meta name="robots" content="[^"]*noindex/.test(head) && page !== "credits.html") add(page, "warn", "ตั้ง noindex ไว้");

  // ── JSON-LD ─────────────────────────────────────────────────────
  const lds = [...raw.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  lds.forEach((m, i) => { try { JSON.parse(m[1]); } catch (e) { add(page, "err", `JSON-LD ก้อนที่ ${i + 1} พาร์สไม่ผ่าน: ${e.message.slice(0, 60)}`); } });
  if (!lds.length && !["credits.html"].includes(page)) add(page, "info", "ไม่มี JSON-LD");

  // ── ลิงก์ภายใน ─────────────────────────────────────────────────
  const hrefs = [...html.matchAll(/href="([^"#?][^"]*)"/g)].map((m) => m[1])
    .filter((h) => !/^(https?:|mailto:|tel:|data:|\/\/|javascript:)/.test(h));
  const broken = [...new Set(hrefs.filter((h) => !exists(h.replace(/^\//, ""))))];
  if (broken.length) add(page, "err", `ลิงก์ภายในเสีย: ${broken.slice(0, 5).join(", ")}${broken.length > 5 ? ` +${broken.length - 5}` : ""}`);
  // anchor ภายในหน้าเดียวกัน
  const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const deadAnchors = [...new Set(anchors.filter((a) => !ids.has(a)))];
  if (deadAnchors.length) add(page, "warn", `anchor ไม่มีปลายทาง: #${deadAnchors.slice(0, 4).join(", #")}`);
  const dupIds = Object.entries([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]).reduce((a, k) => (a[k] = (a[k] || 0) + 1, a), {})).filter(([, n]) => n > 1).map(([k]) => k);
  if (dupIds.length) add(page, "err", `id ซ้ำ: ${dupIds.slice(0, 4).join(", ")}`);

  // ── รูป ─────────────────────────────────────────────────────────
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    const tag = m[0];
    const src = (/src="([^"]*)"/.exec(tag) || [])[1];
    if (src === undefined) { add(page, "err", "img ไม่มี src"); continue; }
    if (src === "") continue; // placeholder (เช่น lightbox) เติม src ตอนคลิก
    if (!/^(https?:|data:)/.test(src) && !exists(src.replace(/^\//, ""))) add(page, "err", `รูปไม่มีไฟล์: ${src}`);
    if (!/\balt=/.test(tag)) add(page, "err", `img ไม่มี alt: ${src}`);
    const isHero = /class="bg"/.test(tag) || /fetchpriority="high"/.test(tag);
    if (!isHero && !/loading="lazy"/.test(tag) && !/logo|icon/.test(src)) add(page, "info", `รูปนอกจอแรกไม่มี loading=lazy: ${path.basename(src)}`);
  }

  // ── i18n ────────────────────────────────────────────────────────
  const local = {};
  for (const m of raw.matchAll(/Object\.assign\(I18N,\s*(\{[\s\S]*?\n\})\);/g)) {
    try { Object.assign(local, new Function("return " + m[1])()); }
    catch (e) { add(page, "err", `บล็อก i18n ในหน้าพาร์สไม่ผ่าน: ${e.message.slice(0, 60)}`); }
  }
  const used = [...new Set([...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]))];
  const missing = used.filter((k) => !(k in I18N) && !(k in local));
  const oneLang = used.filter((k) => { const v = local[k] || I18N[k]; return v && (!v.th || !v.en); });
  if (missing.length) add(page, "err", `data-i18n ไม่มีคำแปล: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ` +${missing.length - 5}` : ""}`);
  if (oneLang.length) add(page, "err", `คีย์มีภาษาเดียว: ${oneLang.slice(0, 5).join(", ")}`);
  if (!/lang-toggle/.test(html) && !["404.html"].includes(page)) add(page, "warn", "ไม่มีปุ่มสลับภาษา");

  // ── CTA / โครง ───────────────────────────────────────────────────
  const isGuide = !/^(index|booking|credits|services|gallery|attractions|local)\.html$/.test(page);
  if (isGuide && !/href="booking\.html/.test(html)) add(page, "warn", "หน้าไกด์ไม่มีลิงก์ไปหน้าจอง");
  if (!/assets\/ui\.js/.test(raw)) add(page, "warn", "ไม่ได้โหลด ui.js (เมนู ☰ / LINE fallback หาย)");
  if (!/<meta name="viewport"/.test(head)) add(page, "err", "ไม่มี viewport");

  // ── เนื้อหาผูกวัน ที่ต้องมีคนกลับมาดู ──────────────────────────
  const dated = [...raw.matchAll(/(\d{1,2})\s+(ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.|ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม)\s+(2569|2570)/g)].map((m) => m[0]);
  if (dated.length) add(page, "info", `มีวันที่เจาะจง ${[...new Set(dated)].slice(0, 4).join(" · ")}${dated.length > 4 ? " …" : ""} — ควรมีนัดกลับมาดู`);
}

// ── ซ้ำข้ามหน้า ───────────────────────────────────────────────────
for (const [d, ps] of Object.entries(descSeen)) if (ps.length > 1) ps.forEach((p) => add(p, "warn", `description ซ้ำกับ ${ps.filter((x) => x !== p).join(", ")}`));
for (const [t, ps] of Object.entries(titleSeen)) if (ps.length > 1) ps.forEach((p) => add(p, "err", `title ซ้ำกับ ${ps.filter((x) => x !== p).join(", ")}`));

// ── หน้ากำพร้า: ไม่มีหน้าไหนลิงก์มาหาเลย ─────────────────────────
const inbound = Object.fromEntries(pages.map((p) => [p, 0]));
for (const page of pages) {
  const html = fs.readFileSync(path.join(ROOT, page), "utf8");
  for (const m of html.matchAll(/href="([a-z0-9-]+\.html)/g)) if (m[1] in inbound && m[1] !== page) inbound[m[1]]++;
}
for (const [p, n] of Object.entries(inbound)) if (n === 0 && p !== "index.html") add(p, "warn", "หน้ากำพร้า: ไม่มีหน้าอื่นลิงก์มาเลย");
for (const [p, n] of Object.entries(inbound)) if (n === 1 && !/^(credits|404)\.html$/.test(p)) add(p, "info", `มีลิงก์เข้ามาแค่ 1 หน้า`);

// ── รายงาน ─────────────────────────────────────────────────────────
const ICON = { err: "❌", warn: "⚠️ ", info: "ℹ️ " };
let ne = 0, nw = 0, ni = 0;
for (const page of pages) {
  const f = (findings[page] || []).sort((a, b) => ["err", "warn", "info"].indexOf(a.sev) - ["err", "warn", "info"].indexOf(b.sev));
  ne += f.filter((x) => x.sev === "err").length; nw += f.filter((x) => x.sev === "warn").length; ni += f.filter((x) => x.sev === "info").length;
  if (!f.length && !SHOW_ALL) continue;
  console.log(`\n${page}${f.length ? "" : "  ✓"}`);
  for (const x of f) console.log(`  ${ICON[x.sev]} ${x.msg}`);
}
console.log(`\n── ${pages.length} หน้า · ❌ ${ne} · ⚠️  ${nw} · ℹ️  ${ni}`);
process.exit(ne ? 1 : 0);
