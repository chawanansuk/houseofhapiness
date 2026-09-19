/**
 * ตรวจหน้าภาษาอังกฤษใน /en/ และการจับคู่ hreflang
 * รัน: node tests/en-pages.test.js
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const SITE = "https://houseofhappinessbangkok.com";

const enDir = path.join(root, "en");
assert.ok(fs.existsSync(enDir), "ต้องมีโฟลเดอร์ en/ — รัน node scripts/build-en.mjs");
const enPages = fs.readdirSync(enDir).filter((f) => f.endsWith(".html")).sort();
assert.ok(enPages.length >= 30, `คาดว่ามีหน้าอังกฤษอย่างน้อย 30 หน้า เจอ ${enPages.length}`);

for (const f of enPages) {
  const raw = read(path.join("en", f));
  const where = `en/${f}`;
  assert.ok(fs.existsSync(path.join(root, f)), `${where}: ไม่มีหน้าไทยคู่กัน`);

  assert.match(raw, /<html lang="en">/, `${where}: ต้องประกาศ lang="en"`);
  // ดูเฉพาะ markup จริง — บางหน้าสร้างการ์ดจาก JS ซึ่งยังมี data-i18n อยู่ในสตริงได้
  const markup = raw.replace(/<script[\s\S]*?<\/script>/g, "");
  assert.ok(!/\sdata-i18n="/.test(markup),
    `${where}: ยังมี data-i18n ค้างอยู่ใน markup — สคริปต์ฝั่งเบราว์เซอร์จะเขียนทับกลับเป็นไทย`);
  assert.match(raw, /window\.HOH_LANG = "en";/, `${where}: ต้องบอกสคริปต์ว่าหน้านี้เป็นอังกฤษถาวร`);

  assert.match(raw, new RegExp(`<link rel="canonical" href="${SITE}/en/${f.replace(/\./g, "\\.")}">`),
    `${where}: canonical ต้องชี้มาที่ตัวเอง`);
  for (const lang of ["th", "en", "x-default"]) {
    assert.ok(raw.includes(`hreflang="${lang}"`), `${where}: ขาด hreflang ${lang}`);
  }

  // ปุ่มสลับภาษาต้องเป็นลิงก์ระหว่าง URL ไม่ใช่ปุ่มสลับในหน้า
  const toggle = (raw.match(/<div class="lang-toggle">([\s\S]*?)<\/div>/) || [, ""])[1];
  assert.equal((toggle.match(/<a /g) || []).length, 2, `${where}: ปุ่มสลับภาษาต้องเป็นลิงก์ 2 อัน`);
  assert.ok(!toggle.includes("<button"), `${where}: ห้ามเหลือปุ่ม setLang ในหน้าอังกฤษ`);

  // ไฟล์ static และลิงก์ภายในต้องเป็น path จากราก ไม่งั้นจะหาไฟล์ไม่เจอเพราะอยู่ลึกลงไปหนึ่งชั้น
  for (const m of markup.matchAll(/\s(?:src|href)="(?!https?:|mailto:|tel:|data:|#|\/)([^"]+)"/g)) {
    assert.fail(`${where}: ยังมี path แบบสัมพัทธ์ "${m[1]}" ซึ่งจะพังเพราะหน้าอยู่ใน /en/`);
  }
  for (const m of markup.matchAll(/srcset="([^"]+)"/g)) {
    for (const cand of m[1].split(",")) {
      const u = cand.trim().split(/\s+/)[0];
      if (!u || /^https?:/.test(u)) continue;
      assert.ok(u.startsWith("/"), `${where}: srcset "${u}" ต้องเป็น path จากราก`);
      assert.ok(fs.existsSync(path.join(root, u.slice(1))), `${where}: srcset ชี้ไปไฟล์ที่ไม่มีอยู่ ${u}`);
    }
  }
  // ld+json ต้อง parse ได้ และบอกว่าเป็นภาษาอังกฤษ
  for (const m of raw.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const d = JSON.parse(m[1]);
    if (d["@type"] === "Article") assert.equal(d.inLanguage, "en", `${where}: Article schema ต้องระบุ inLanguage en`);
  }
}

// หน้าไทยที่มีคู่อังกฤษ ต้องมี hreflang ครบ · หน้าที่ไม่มีคู่ ต้องไม่มี hreflang ค้าง
const thPages = fs.readdirSync(root).filter((f) => f.endsWith(".html"));
for (const f of thPages) {
  const raw = read(f);
  const hasEn = fs.existsSync(path.join(enDir, f));
  const n = (raw.match(/<link rel="alternate" hreflang=/g) || []).length;
  if (hasEn) assert.equal(n, 3, `${f}: ต้องมี hreflang 3 บรรทัด (th/en/x-default) เจอ ${n}`);
  else assert.equal(n, 0, `${f}: ไม่มีคู่ภาษาอังกฤษ จึงต้องไม่มี hreflang เจอ ${n}`);
}

// sitemap ต้องครอบคลุมทั้งสองภาษาและไม่มี URL ที่ไม่มีไฟล์จริง
const sm = read("sitemap.xml");
assert.match(sm, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/, "sitemap ต้องประกาศ namespace xhtml สำหรับ hreflang");
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
assert.ok(locs.length >= 60, `sitemap ควรมี URL อย่างน้อย 60 รายการ เจอ ${locs.length}`);
for (const u of locs) {
  const rel = u.replace(SITE + "/", "") || "index.html";
  assert.ok(fs.existsSync(path.join(root, rel)), `sitemap ชี้ไปที่ ${u} ซึ่งไม่มีไฟล์จริง`);
  const html = read(rel);
  assert.ok(!/<meta name="robots" content="[^"]*noindex/.test(html), `sitemap ไม่ควรมีหน้า noindex: ${u}`);
}
assert.ok(locs.some((u) => u.includes("/en/")), "sitemap ต้องมี URL ภาษาอังกฤษ");

console.log("EN PAGES TESTS PASSED");
