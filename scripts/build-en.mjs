/**
 * สร้างหน้าภาษาอังกฤษแยก URL ไว้ใน /en/ จากหน้าไทยที่เป็นต้นฉบับ
 *
 * ทำไมต้องมี: แขกเราเกือบทั้งหมดเป็นชาวต่างชาติ แต่คำแปลอังกฤษทั้งเว็บอยู่ใน
 * JavaScript หน้าเดียวกับภาษาไทย Google จึงเก็บได้แค่เวอร์ชันไทย การมี URL
 * แยกต่อภาษา + hreflang คือวิธีมาตรฐานที่ทำให้หน้าอังกฤษถูกจัดอันดับในภาษาอังกฤษ
 *
 * หลักการ: ไม่แตะเนื้อหา ไม่แปลอะไรใหม่ ใช้คำแปลที่อยู่ใน data-i18n อยู่แล้วเท่านั้น
 *
 * รัน:  node scripts/build-en.mjs           สร้าง/อัปเดตไฟล์ใน en/
 *       node scripts/build-en.mjs --check   ตรวจว่า en/ ตรงกับหน้าไทยหรือยัง (ไม่เขียนไฟล์)
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
const SITE = "https://houseofhappinessbangkok.com";
const OUT = path.join(root, "en");

/* หน้าที่ไม่ต้องทำเวอร์ชันอังกฤษ: 404 จัดการด้วย Vercel, credits เป็นหน้า noindex */
/* services.html ยังเป็นเมนูอาหารภาษาไทยล้วน (ข้อความ ~90 จุดไม่ได้อยู่ในระบบ data-i18n)
   ถ้าปล่อยให้มี /en/services.html จะกลายเป็นหน้าที่บอกว่าเป็นอังกฤษแต่เนื้อหาเป็นไทย
   ซึ่งแย่กว่าการไม่มีหน้านั้นเลย — รอแปลงหน้านั้นเป็น data-i18n ก่อนค่อยเปิด */
const SKIP = new Set(["404.html", "services.html"]);

const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

/* ── รวมพจนานุกรมของหน้าหนึ่ง ๆ: assets/i18n.js + Object.assign ในหน้านั้น ── */
function dictFor(html) {
  const sandbox = { I18N: {}, window: {}, document: { addEventListener() {} }, localStorage: { getItem: () => null, setItem() {} }, navigator: { language: "en" } };
  vm.createContext(sandbox);
  // i18n.js ประกาศ const I18N ซึ่งไม่ผูกกับ global ของ sandbox — เปลี่ยนเป็น globalThis.I18N ก่อนรัน
  const src = read("assets/i18n.js").replace(/^const I18N = \{/m, "globalThis.I18N = {");
  try { vm.runInContext(src, sandbox, { timeout: 5000 }); } catch (e) { /* ส่วนที่ต้องใช้ DOM ข้ามได้ */ }
  for (const m of html.matchAll(/Object\.assign\(I18N,\s*\{[\s\S]*?\n\}\);/g)) {
    try { vm.runInContext(m[0], sandbox, { timeout: 5000 }); } catch (e) { /* ข้าม */ }
  }
  return sandbox.I18N || {};
}

/* ── ลิงก์ภายในทั้งหมดชี้ไปเวอร์ชันอังกฤษ และไฟล์ static ใช้ path จากราก ── */
function rewriteUrl(url, pages) {
  if (!url) return url;
  if (/^(https?:|mailto:|tel:|data:|#|\/)/i.test(url)) return url;
  const [file, hash = ""] = url.split("#");
  if (!file) return url;
  if (/^(assets|images|api|admin|print|design|db|data)\//.test(file)) return "/" + file + (hash ? "#" + hash : "");
  // ไฟล์คงที่ที่วางอยู่ที่รากเว็บ
  if (/^(site\.webmanifest|robots\.txt|sitemap\.xml|llms\.txt|favicon\.ico)$/.test(file)) return "/" + file;
  if (pages.has(file)) return "/en/" + file + (hash ? "#" + hash : "");
  // หน้าที่ยังไม่มีเวอร์ชันอังกฤษ (เช่น รูมเซอร์วิส) ให้ลิงก์กลับไปหน้าไทยที่ราก ไม่ใช่ /en/ ที่ไม่มีไฟล์
  if (/\.html$/.test(file) && fs.existsSync(path.join(root, file))) return "/" + file + (hash ? "#" + hash : "");
  return url;
}

function englishTitle(file, title) {
  const parts = title.split("|").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return title;
  // index.html เขียนสลับด้าน: อังกฤษมาก่อน
  return file === "index.html" ? parts[0] : parts[parts.length - 1];
}

/* หน้าที่ย่อหน้านำสั้นเกินไป และ meta ไทยไม่มีครึ่งภาษาอังกฤษ — เขียนให้ตรง ๆ
   (เคยหลุดเป็นคำบรรยายภาษาไทยบนหน้าอังกฤษ เวลาแชร์ลิงก์หรือขึ้นใน Google) */
const EN_DESC = {
  "index.html": "Aparthotel in Khlong San, Bangkok, with three room layouts, a ฿5 ferry to Chinatown and the Gold Line nearby. Rated 8.8/10 on Booking.com.",
  "ride-hailing-guide.html": "How to use Grab and Bolt in Bangkok: install, book step by step, pay, find the airport pickup point, and what to do when the driver can't find you.",
  "local.html": "Our insider guide: 13 places locals really eat around Soi Tha Din Daeng 16, plus a 10-stop Khlong San walk most visitors never find.",
};

/* คำอธิบายภาษาอังกฤษ: ใช้ย่อหน้านำของหน้านั้นเอง ตัดให้จบประโยคภายใน ~158 ตัวอักษร */
function englishDescription(doc, fallback) {
  // ถ้าต้องใช้ meta เดิมเป็นตัวสำรอง ให้ตัดครึ่งภาษาไทยออกก่อน
  if (/[\u0E00-\u0E7F]/.test(fallback) && fallback.includes("|")) {
    const en = fallback.split("|").map((x) => x.trim()).find((x) => !/[\u0E00-\u0E7F]/.test(x));
    if (en) fallback = en;
  }
  const lead = doc.querySelector(".ld-intro .lead, .gd-hero .sub, .hero .sub, main p");
  const text = (lead ? lead.textContent : "").replace(/\s+/g, " ").trim();
  if (text.length < 40) return fallback;
  if (text.length <= 158) return text;
  const cut = text.slice(0, 158);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  if (stop > 80) return cut.slice(0, stop + 1).trim();
  // ไม่มีจุดจบประโยค — ตัดที่เครื่องหมายวรรคตอนใกล้สุด แล้วค่อยตัดที่คำ
  const soft = Math.max(cut.lastIndexOf(" — "), cut.lastIndexOf(", "), cut.lastIndexOf("; "));
  if (soft > 70) return cut.slice(0, soft).trim() + "…";
  return cut.replace(/\s+\S*$/, "").trim() + "…";
}

const pages = new Set(fs.readdirSync(root).filter((f) => f.endsWith(".html") && !SKIP.has(f)));
const built = [];
const stale = [];

for (const file of [...pages].sort()) {
  const html = read(file);
  const I18N = dictFor(html);
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  /* 1) ใส่คำแปลอังกฤษแล้วถอด data-i18n ออก เพื่อไม่ให้สคริปต์ฝั่งเบราว์เซอร์มาเขียนทับเป็นไทย */
  for (const el of doc.querySelectorAll("[data-i18n]")) {
    const item = I18N[el.dataset.i18n];
    if (item && item.en != null) {
      if (el.dataset.i18nAttr) el.setAttribute(el.dataset.i18nAttr, item.en);
      else el.innerHTML = item.en;
    }
    el.removeAttribute("data-i18n");
    el.removeAttribute("data-i18n-attr");
  }

  doc.documentElement.lang = "en";

  /* 2) หัวเรื่องและคำอธิบายเป็นอังกฤษล้วน */
  const oldTitle = doc.title;
  doc.title = englishTitle(file, oldTitle);
  const descEl = doc.querySelector('meta[name="description"]');
  const enDesc = EN_DESC[file] || englishDescription(doc, descEl ? descEl.content : "");
  // ตัวอักษรไทยจริง ไม่นับ ฿ (U+0E3F) ซึ่งอยู่ช่วงรหัสเดียวกันแต่หน้าอังกฤษใช้ได้ปกติ
  if (/[\u0E01-\u0E3A\u0E40-\u0E5B]/.test(enDesc)) throw new Error(`en/${file}: คำบรรยายยังเป็นภาษาไทย — เพิ่มใน EN_DESC`);
  if (descEl) descEl.content = enDesc;

  /* 3) canonical / og / hreflang */
  const enUrl = `${SITE}/en/${file}`;
  const thUrl = `${SITE}/${file === "index.html" ? "" : file}`;
  const setMeta = (sel, attr, val) => { const el = doc.querySelector(sel); if (el) el.setAttribute(attr, val); };
  setMeta('link[rel="canonical"]', "href", enUrl);
  setMeta('meta[property="og:url"]', "content", enUrl);
  const ogTitle = doc.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = doc.title;
  const ogDesc = doc.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.content = enDesc;
  for (const el of doc.querySelectorAll('link[rel="alternate"][hreflang]')) el.remove();
  const head = doc.querySelector("head");
  for (const [lang, href] of [["th", thUrl], ["en", enUrl], ["x-default", thUrl]]) {
    const l = doc.createElement("link");
    l.rel = "alternate"; l.setAttribute("hreflang", lang); l.href = href;
    head.appendChild(l);
  }
  const loc = doc.createElement("meta");
  loc.setAttribute("property", "og:locale"); loc.content = "en_US";
  head.appendChild(loc);

  /* 4) ปุ่มสลับภาษาเป็นลิงก์ระหว่าง URL สองภาษา ไม่ใช่ปุ่มสลับในหน้า */
  const toggle = doc.querySelector(".lang-toggle");
  if (toggle) {
    toggle.innerHTML =
      `<a href="${file === "index.html" ? "/" : "/" + file}" hreflang="th">ไทย</a>` +
      `<a class="active" aria-current="true" href="/en/${file}" hreflang="en">EN</a>`;
  }

  /* 5) ลิงก์และไฟล์ static */
  for (const a of doc.querySelectorAll("a[href]")) a.setAttribute("href", rewriteUrl(a.getAttribute("href"), pages));
  for (const el of doc.querySelectorAll("[src]")) el.setAttribute("src", rewriteUrl(el.getAttribute("src"), pages));
  for (const el of doc.querySelectorAll("link[href]")) {
    const rel = (el.getAttribute("rel") || "").toLowerCase();
    if (rel === "alternate" || rel === "canonical") continue;
    el.setAttribute("href", rewriteUrl(el.getAttribute("href"), pages));
  }
  for (const el of doc.querySelectorAll("source[srcset], img[srcset]")) {
    el.setAttribute("srcset", el.getAttribute("srcset").split(",").map((c) => {
      const [u, d] = c.trim().split(/\s+/);
      return rewriteUrl(u, pages) + (d ? " " + d : "");
    }).join(", "));
  }

  /* 6) บอกสคริปต์ฝั่งเบราว์เซอร์ว่าหน้านี้เป็นภาษาอังกฤษเสมอ (ใช้กับวันที่ สารบัญ ฯลฯ) */
  const forced = doc.createElement("script");
  forced.textContent = 'window.HOH_LANG = "en";';
  head.appendChild(forced);

  /* 7) schema: ภาษา อังกฤษ และ URL ชี้มาที่หน้านี้
        BreadcrumbList เก็บชื่อไว้เป็นข้อความไทย ต้องหาคู่ภาษาอังกฤษจากพจนานุกรมของหน้าเอง
        ไม่งั้นหน้าอังกฤษจะมี breadcrumb เป็นภาษาไทย ซึ่ง Google เอาไปแสดงใน SERP ตรง ๆ */
  // ป้าย breadcrumb ชุดคงที่ที่ไม่ได้อยู่ในพจนานุกรมแบบตรงตัว (ตัดคำ/ย่อไว้ต่างกัน)
  const enNames = {
    "ไกด์เที่ยว": "Local guides",
    "ไกด์เที่ยว & บทความ": "Guides & articles",
    "ที่พักใกล้ ICONSIAM": "Hotel near ICONSIAM",
    "ที่พักใกล้เยาวราช": "Hotel near Chinatown",
    "วิธีเดินทางจากสนามบิน": "Getting here from the airport",
  };
  for (const item of Object.values(I18N)) {
    if (item && typeof item.th === "string" && typeof item.en === "string") {
      const k = item.th.replace(/<[^>]+>/g, "").trim();
      if (!(k in enNames)) enNames[k] = item.en.replace(/<[^>]+>/g, "").trim();
    }
  }

  const enHeading = (doc.querySelector("h1") ? doc.querySelector("h1").textContent : doc.title).replace(/\s+/g, " ").trim();
  const hasThai = (x) => /[\u0E01-\u0E5B]/.test(x);   // ไม่นับ ฿ (U+0E3F) ซึ่งใช้ในข้อความอังกฤษด้วย
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    let d; try { d = JSON.parse(s.textContent); } catch (e) { continue; }
    // ป้าย breadcrumb ตัวสุดท้ายคือชื่อหน้านั้นเอง ใช้หัวเรื่องอังกฤษของหน้าได้ตรงที่สุด
    if (d["@type"] === "BreadcrumbList" && Array.isArray(d.itemListElement)) {
      const last = d.itemListElement[d.itemListElement.length - 1];
      if (last && hasThai(last.name || "") && enHeading) last.name = enHeading;
    }
    const fix = (o) => {
      if (!o || typeof o !== "object") return;
      if (Array.isArray(o)) return o.forEach(fix);
      if (o.inLanguage) o.inLanguage = "en";
      if (typeof o.mainEntityOfPage === "string") o.mainEntityOfPage = o.mainEntityOfPage.replace(`${SITE}/`, `${SITE}/en/`);
      if (typeof o.item === "string" && o.item.startsWith(SITE) && /\.html$/.test(o.item)) o.item = o.item.replace(`${SITE}/`, `${SITE}/en/`);
      if (o["@type"] === "ListItem" && typeof o.name === "string" && enNames[o.name]) o.name = enNames[o.name];
      if (o["@type"] === "Article") {
        if (o.alternativeHeadline) { o.headline = o.alternativeHeadline; delete o.alternativeHeadline; }
        o.description = enDesc;
        o.inLanguage = "en";
      }
      Object.values(o).forEach(fix);
    };
    fix(d);
    s.textContent = JSON.stringify(d, null, 0);
  }

  const out = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML + "\n";
  const dest = path.join(OUT, file);
  const prev = fs.existsSync(dest) ? fs.readFileSync(dest, "utf8") : null;
  if (prev !== out) {
    stale.push(file);
    if (!check) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(dest, out); }
  }
  built.push(file);
}

/* ── หน้าที่ไม่มีคู่ภาษาอังกฤษ ต้องไม่มี hreflang ค้างอยู่ ── */
for (const file of SKIP) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) continue;
  const html = fs.readFileSync(p, "utf8");
  const cleaned = html.replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n/g, "");
  if (cleaned !== html) { stale.push(file + " (ลบ hreflang ที่ค้าง)"); if (!check) fs.writeFileSync(p, cleaned); }
}

/* ── หน้าไทยต้องมี hreflang ชี้กลับมาด้วย ไม่งั้นจับคู่ไม่ครบ ── */
for (const file of pages) {
  let html = read(file);
  const enUrl = `${SITE}/en/${file}`;
  const thUrl = `${SITE}/${file === "index.html" ? "" : file}`;
  const block = `<link rel="alternate" hreflang="th" href="${thUrl}">\n` +
                `<link rel="alternate" hreflang="en" href="${enUrl}">\n` +
                `<link rel="alternate" hreflang="x-default" href="${thUrl}">\n`;
  const cleaned = html.replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n/g, "");
  const m = cleaned.match(/<link rel="canonical"[^>]*>\n/);
  if (!m) continue;
  const next = cleaned.slice(0, m.index + m[0].length) + block + cleaned.slice(m.index + m[0].length);
  if (next !== html) { stale.push(file + " (hreflang)"); if (!check) fs.writeFileSync(path.join(root, file), next); }
}

console.log(`หน้าอังกฤษ ${built.length} หน้า`);
if (check) {
  console.log(stale.length ? "ยังไม่ตรงกับต้นฉบับ:\n  " + stale.join("\n  ") : "en/ ตรงกับหน้าไทยแล้ว");
  process.exitCode = stale.length ? 1 : 0;
} else {
  console.log(stale.length ? `เขียนใหม่ ${stale.length} ไฟล์` : "ไม่มีอะไรเปลี่ยน");
}
