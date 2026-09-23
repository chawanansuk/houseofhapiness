/**
 * Static regression checks for public pages, accessibility, analytics, and admin exports.
 * Run: node tests/site.test.js
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const publicPages = ["index.html", "booking.html", "gallery.html", "attractions.html", "local.html", "services.html"];
for (const page of publicPages) {
  const html = read(page);
  assert.match(html, /<html lang="th">/, page + " must declare Thai document language");
  assert.match(html, /<meta name="description"/, page + " must have a meta description");
  assert.match(html, /<link rel="canonical"/, page + " must have a canonical URL");
  assert.match(html, /assets\/ui\.js/, page + " must load shared UI and page-view analytics");
}

const ui = read("assets/ui.js");
assert.match(ui, /\/_vercel\/insights\/script\.js/, "public analytics script must be injected");
assert.match(ui, /role", "dialog"/, "home lightbox must expose dialog semantics");
assert.match(ui, /img\.tabIndex = 0/, "home gallery images must be keyboard focusable");

const gallery = read("gallery.html");
assert.match(gallery, /role="button" tabindex="0"/, "gallery cards must be keyboard focusable");
assert.match(gallery, /e\.key === "Enter" \|\| e\.key === " "/, "gallery must open with keyboard");
assert.match(gallery, /lbTrigger.*focus/s, "gallery must restore focus after closing");

// หน้ารูมเซอร์วิส: ปุ่มสั่งต้องใช้ oaMessage (ลิงก์ธรรมดา LINE หาบัญชีไม่เจอ) + เงื่อนไขสั่งล่วงหน้า/จ่ายเงินสดต้องแสดง
const services = read("services.html");
assert.match(services, /line\.me\/R\/oaMessage/, "room service order buttons must deep-link into the LINE OA chat");
assert.match(services, /wa\.me/, "room service must also offer ordering via WhatsApp");
assert.match(services, /มัสมั่น/, "room service must list the real in-room dining menu (Massaman curry)");
assert.match(services, /ขั้นต่ำ ฿100/, "room service must state the ฿100 minimum order from the printed menu");
assert.doesNotMatch(services, /จองตรงกับเรา/, "booking CTA must not appear on the room service page (confusing next to food ordering)");
assert.match(services, /สั่งล่วงหน้าอย่างน้อย 1 วัน/, "room service page must state the 1-day advance-order rule");
assert.match(services, /จ่ายเงินสดตอนรับอาหาร/, "room service page must state cash-on-delivery payment");
assert.match(services, /fetch\("\/api\/order"/, "room service orders must also be recorded to the back office (/api/order)");

// นโยบาย rate parity: หน้าสาธารณะห้ามมีราคาห้อง/ข้อความเคลมเทียบ OTA — แขกถามราคาทาง LINE/WhatsApp
for (const page of ["index.html", "booking.html", "room-standard.html", "room-studio.html",
  "room-deluxe.html", "near-iconsiam.html", "near-chinatown.html", "loy-krathong.html", "new-year-countdown.html"]) {
  const html = read(page);
  assert.doesNotMatch(html, /฿700|฿800|฿850|700 บาท|priceRange/, page + " must not show room rates (rate parity policy)");
  assert.doesNotMatch(html, /ราคาดีที่สุด|ราคาดีกว่า|best rate|better rates/i, page + " must not claim better/best rates vs OTA");
  assert.doesNotMatch(html, /\bOTA\b|commission|คอมมิชชั่น|เว็บตัวกลาง|middleman|จองตรงถูกกว่า|cheaper booked direct/i, page + " must not compare against OTA / Booking.com");
  // ราคาที่ Google/Facebook อ่านได้ (og:description, JSON-LD offers.price) และคำเคลมเทียบราคา ก็ห้ามเช่นกัน
  assert.doesNotMatch(html, /\d{3} THB|THB\/night|"price":\s*"\d+"|"priceCurrency"|หาไม่ได้ในย่าน|won't find elsewhere|ราคาเดียวกัน|same-priced|\d+ บาทจากห้อง|฿\d+ more than|more than Standard/i,
    page + " must not expose room rates in meta/JSON-LD or make price-comparison claims");
}
assert.doesNotMatch(read("index.html"), /id="whydirect"|wbd-table/, "homepage must not carry the direct-vs-OTA comparison table");
assert.doesNotMatch(read("index.html"), /instead of Booking\.com/i, "homepage FAQ must not frame itself against Booking.com");
assert.doesNotMatch(read("assets/i18n.js"), /"wbd\.|\bOTA\b|คอมมิชชั่น|commission|ตัวกลาง/i, "shared i18n must not carry OTA comparison copy");
assert.match(read("assets/i18n.js").match(/"faq\.a4":[\s\S]*?\},/)[0], /LINE\/WhatsApp/, "direct-booking FAQ must point guests to ask rates in chat");
assert.doesNotMatch(read("assets/i18n.js"), /ราคาดีที่สุด|ราคาดีกว่า|best rate|better rates/i, "shared i18n must not carry rate-comparison claims");

// Prom Design pass 1: ไอคอนเส้นแทนอีโมจิ · hero ขายด้วยตัวเลข · ป้ายที่มาของรูป · เมนูไม่ล้นบน iPad
const home = read("index.html");
assert.doesNotMatch(home, /class="ico">[^<\s]/, "homepage icons must be line icons (data-icon), not emoji");
assert.ok((home.match(/data-icon="/g) || []).length >= 20, "homepage must paint icons via data-icon");
assert.match(read("assets/i18n.js").match(/"hero\.tagline":[\s\S]*?\},/)[0], /3 แบบ[\s\S]*~2 กม\.[\s\S]*3 layouts[\s\S]*~2 km/, "hero tagline must lead with real numbers, not adjectives");
assert.ok(home.indexOf('id="numbers"') < home.indexOf('id="rooms"'), "proof strip (numbers) must sit right under the hero, before rooms");
assert.match(home, /class="prov real"/, "own photos must carry the gold provenance chip");
assert.match(read("room-deluxe.html"), /class="credit real"/, "room hero (own photo) must carry the gold provenance chip");
assert.match(read("near-iconsiam.html"), /data-i18n="prov\.stock"/, "stock hero must be labelled as illustration");
assert.match(read("assets/style.css"), /@media \(max-width: 860px\) \{\n  \.navlinks \{ display: none; \}/, "nav links must collapse to the menu button below 860px (iPad portrait overflowed at 768)");
assert.match(read("assets/ui.js"), /const sweep = /, "reveal animation must have a failsafe so no section can stay blank");
assert.ok(fs.existsSync(path.join(__dirname, "..", ".claude", "skills", "prom-design", "SKILL.md")), "prom-design skill must be installed for future design work");
for (const sk of ["hoh-analyze-guest-reviews", "hoh-reply-review", "hoh-reply-guest-chat", "hoh-weekly-owner-digest", "hoh-write-area-guide"]) {
  const md = fs.readFileSync(path.join(__dirname, "..", ".claude", "skills", sk, "SKILL.md"), "utf8");
  assert.match(md, new RegExp("^---\\nname: " + sk + "\\ndescription: "), sk + " must have skill frontmatter");
  assert.match(md, /hoh-property-brief/, sk + " must load the property brief first");
  assert.match(md, /# RULES/, sk + " must carry the property rules section");
}

const admin = read("admin/index.html");
const adminJs = read("admin/app.js");
assert.doesNotMatch(adminJs, /URLSearchParams\(location\.search\).*get\("key"\)/s, "admin key must not be accepted from URL");
assert.doesNotMatch(admin + adminJs, /_vercel\/insights/, "admin must not load public analytics");
assert.match(admin, /role="dialog" aria-modal="true"/, "admin sheet must expose dialog semantics");
assert.match(adminJs, /function safeCsvCell/, "CSV exports must sanitize spreadsheet formulas");
assert.match(adminJs, /function exportSummaryCSV/, "monthly summary export must be available");
assert.match(adminJs, /visibilitychange/, "admin must re-sync when the tab becomes visible again (front-desk tablet stays open all day)");
assert.match(adminJs, /function buildDailySummary/, "admin must offer a daily summary text for the staff LINE group");
assert.match(admin, /id="pwEye"/, "login must have a show-password toggle");
assert.match(admin, /id="offlineBar"/, "admin must show an offline banner");
assert.match(admin, /app\.js\?v=25/, "admin cache-bust version must be bumped with app changes");
// เจ้าของยืนยัน (ก.ย. 2569): ไม่มีมัดจำกุญแจ ฿1,000 — ห้ามโผล่ที่ไหนอีก (เว็บ · ข้อความยืนยัน · ป้ายในห้อง · llms)
for (const f of ["index.html", "room-standard.html", "room-studio.html", "room-deluxe.html", "booking.html", "assets/i18n.js", "admin/app.js", "llms.txt", "print/guest-board.html"]) {
  assert.doesNotMatch(read(f), /มัดจำกุญแจ|key deposit|มัดจำ (<b>)?฿1,000|฿1,000<\/b> refundable deposit|฿1,000 (refundable )?deposit|มีมัดจำ 1,000/i, f + " must not mention the ฿1,000 key deposit (there is none)");
}
// บั๊กที่เคยเจอ: พนักงานแก้/เห็นข้อมูลการชำระเงินได้ · การจองหายเมื่อ id ชนกัน · ซิงก์ชีตหน่วง /api/data
assert.match(read("api/update.js"), /for \(const k of \["amount", "paid", "pay_status"\]\)/, "staff must not write any money field");
assert.match(read("api/data.js"), /amount: "", paid: "", pay_status: ""/, "staff must not read any money field");
assert.match(read("api/_store.js"), /insertWithFreshId/, "new rows must be inserted atomically (no silent drop on id collision)");
assert.doesNotMatch(read("api/data.js"), /await getStore\(\)\.syncFromSheetIfStale/, "sheet sync must not block /api/data");
assert.match(read("api/_store.js"), /to_regclass/, "schema check must short-circuit on warm databases");
assert.match(read("vercel.json"), /"regions": \["sin1"\]/, "functions must run next to the database and guests (Singapore)");
assert.match(adminJs, /function applyPending/, "admin must keep just-saved values when the sheet returns a stale read");
assert.match(adminJs, /INFLIGHT\.has\(fkey\)/, "admin must ignore repeated taps while a save is in flight");
assert.match(read("backoffice/apps-script.gs"), /SpreadsheetApp\.flush\(\);/, "Apps Script must flush writes before replying");
assert.match(read("api/data.js"), /&_ts=\$\{Date\.now\(\)\}/, "sheet reads must carry a cache-buster");
assert.doesNotMatch(admin, /id="view-clean"|data-view="clean"/, "housekeeping is a side card on the today view now, not a separate view");
assert.match(admin, /id="ordersCard"/, "today view must have the room-service orders card");
assert.match(adminJs, /function renderOrders/, "admin must render room-service orders");
assert.match(adminJs, /function payState/, "admin must track booking payment state");
assert.match(read("backoffice/apps-script.gs"), /ORDERS_SHEET = "Orders"/, "Apps Script must have the Orders tab");
assert.match(read("backoffice/apps-script.gs"), /"paid", "pay_status"\]/, "Apps Script bookings must carry payment columns");
assert.match(read("backoffice/apps-script.gs"), /action === "orderadd"|action === "orderupdate"/, "Apps Script must accept order actions");
assert.match(read("api/update.js"), /"orderupdate"/, "update API must allow order status changes");

// ── /api/site: ราคา 3 ห้อง + เรทเทศกาล ต้อง validate ก่อนส่งให้หน้าเว็บ ──
const site = require("../api/site.js");
function call(handler, { method = "GET" } = {}) {
  return new Promise((resolve, reject) => {
    const res = {
      code: 200,
      setHeader() {},
      status(c) { this.code = c; return this; },
      json(o) { resolve({ code: this.code, body: o }); },
    };
    Promise.resolve(handler({ method }, res)).catch(reject);
  });
}

module.exports = (async () => {
  // 1) ยังไม่ตั้งค่าชีต → default ครบทั้ง 3 ราคา + rates ว่าง เว็บไม่พัง
  delete process.env.SHEET_WEBAPP_URL;
  let r = await call(site);
  assert.equal(r.code, 200);
  assert.deepEqual(r.body.prices, { std: 700, stu: 800, dlx: 850 });
  assert.deepEqual(r.body.rates, []);
  assert.equal(r.body.source, "default");

  // 2) อ่านราคาจากชีต + กรองแถวเรทที่เสีย (วันที่ผิด/ห้องมั่ว/ราคาติดลบ) ทิ้ง
  process.env.SHEET_WEBAPP_URL = "https://sheet.fixture/exec";
  process.env.SHEET_TOKEN = "tok";
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      site: { price_per_night: "750", price_studio: "฿850", price_deluxe: "900 บาท", announcement_th: "ประกาศ" },
      rates: [
        { from: "2026-12-30", to: "2027-01-01", room: "all", price: "1,200", note: "ปีใหม่" },
        { from: "2026-11-25", to: "2026-11-25", room: "dlx", price: 1500, note: "ลอยกระทง" },
        { from: "ไม่ใช่วันที่", to: "2026-12-31", room: "all", price: 999 },   // วันที่เสีย
        { from: "2026-12-01", to: "2026-12-02", room: "penthouse", price: 999 }, // ห้องไม่มีจริง
        { from: "2026-12-05", to: "2026-12-01", room: "all", price: 999 },     // from > to
        { from: "2026-12-01", to: "2026-12-02", room: "all", price: -5 },      // ราคาเพี้ยน
      ],
    }),
  });
  r = await call(site);
  assert.equal(r.body.source, "sheet");
  assert.deepEqual(r.body.prices, { std: 750, stu: 850, dlx: 900 });
  assert.equal(r.body.price, 750, "ต้องคง j.price ไว้ให้โค้ดรุ่นเก่า");
  assert.equal(r.body.rates.length, 2, "แถวเรทเสีย 4 แถวต้องถูกกรองทิ้ง");
  assert.deepEqual(r.body.rates[0], { from: "2026-12-30", to: "2027-01-01", room: "all", price: 1200, note: "ปีใหม่" });
  assert.equal(r.body.rates[1].room, "dlx");
  assert.equal(r.body.ann.th, "ประกาศ");

  // 3) สคริปต์เก่าไม่ส่ง rates → ต้องได้ [] ไม่ throw
  global.fetch = async () => ({ ok: true, json: async () => ({ site: { price_per_night: "700" } }) });
  r = await call(site);
  assert.deepEqual(r.body.rates, []);
  assert.equal(r.body.source, "sheet");

  // 4) ชีตล่ม → ตอบ default เว็บโชว์ราคาปกติต่อได้
  global.fetch = async () => { throw new Error("offline"); };
  r = await call(site);
  assert.equal(r.body.source, "default");
  assert.deepEqual(r.body.prices, { std: 700, stu: 800, dlx: 850 });

  // ไกด์เยาวราชกลางคืน: ไม่มีคำซ้ำผิด + หน้าไกด์พี่น้องลิงก์กลับมา (internal linking สองทาง)
{
  const yn = read("yaowarat-night-walk.html");
  assert.doesNotMatch(yn, /ต่างกันต่างกัน/, "night-walk page must not contain the duplicated word typo");
  assert.match(read("heritage-walk.html"), /href="yaowarat-night-walk\.html"/, "heritage walk must link to the night walk");
  assert.match(read("near-chinatown.html"), /href=\\?"yaowarat-night-walk\.html/, "near-chinatown must link to the night walk");
}
// ไล่ตรวจไกด์ (audit ก.ย. 2569): คำผิดที่แก้แล้วต้องไม่กลับมา + หน้าที่บางต้องมีรูปเพิ่ม
{
  assert.doesNotMatch(read("heritage-walk.html"), /ฮกเกี้ยว/, "heritage walk: Hokkien must be ฮกเกี้ยน not ฮกเกี้ยว");
  assert.doesNotMatch(read("near-iconsiam.html"), /เส้นทางเรียบถนน/, "near-iconsiam: must be เลียบถนน (walk along), not เรียบ");
  assert.doesNotMatch(read("local.html"), /Chua Jeab Ngon/, "local: romanisation must be Chua Jeab Nguan");
  assert.doesNotMatch(read("thonburi-one-day.html"), /~฿100 total transport|ค่าเดินทางรวม ~100 บาท/, "thonburi transport cost must be a realistic range");
  // หน้าไกด์ที่เคยมีรูปเดียว เติมแถวรูปแล้ว
  for (const [f, n] of [["thonburi-one-day.html", 4], ["loy-krathong.html", 2], ["new-year-countdown.html", 2]]) {
    assert.ok((read(f).match(/<img /g) || []).length > 1, f + " should have more than one image after enrichment");
    assert.match(read(f), /class="near-photos"/, f + " should carry the credited photo strip");
  }
  // local + attractions ต้องลิงก์กลับ hub ไกด์ (ไม่เป็นทางตัน)
  assert.match(read("local.html"), /href="guides\.html"/, "local must link back to the guides hub");
  assert.match(read("attractions.html"), /href="guides\.html"/, "attractions must link back to the guides hub");
}
console.log("SITE TESTS PASSED");
  return "SITE TESTS PASSED";
})().catch((e) => {
  console.error("TEST FAILED:", e.message);
  process.exitCode = 1;
  throw e;
});

// หน้าแรกมือถือแบบกะทัดรัด (Prom Design item 4): รางเลื่อน + ส่วนพับ + i18n ครบ — desktop ต้องไม่เปลี่ยน
{
  const idx = read("index.html"), css = read("assets/style.css"), ui = read("assets/ui.js"), i18n = read("assets/i18n.js");
  assert.match(idx, /<div class="room-rail rail" id="roomRail">/, "room cards must sit inside .room-rail");
  assert.equal((idx.match(/<div class="room-card">/g) || []).length, 3, "3 room cards, no inline margin-top");
  assert.match(idx, /<div class="gallery rail" id="galleryRail">/, "gallery is a rail on mobile");
  assert.equal((idx.match(/<details class="m-fold" open>/g) || []).length, 2, "hand map + getting-here folds (open by default for desktop/no-JS)");
  assert.equal((idx.match(/class="rail-cue m-only"/g) || []).length, 2, "swipe cues for rooms + gallery");
  assert.match(css, /\.room-rail \{ display: contents; \}/, "desktop: .room-rail must not change layout");
  assert.match(css, /details\.m-fold \{ background: none; border: 0;/, "m-fold must not inherit FAQ card box");
  assert.match(css, /\.gallery figcaption, \.gallery figure \.prov \{ z-index: 2; \}/, "gallery captions above image");
  assert.match(css, /@media \(max-width: 640px\) \{\s*\.m-only \{ display: block; \}/, "mobile compaction block");
  assert.match(ui, /details\.m-fold\[open\]"\)\.forEach\(\(d\) => d\.removeAttribute\("open"\)\)/, "ui.js closes folds on mobile");
  for (const k of ["rail.cue", "rail.cue2", "loc.foldmap", "gh.fold"]) assert.match(i18n, new RegExp(`"${k.replace(".", "\\.")}":\\s*\\{ th: "[^"]+", en: "[^"]+" \\}`), "i18n key " + k);
}

// ── รูปภาพ: ทุก <img> ที่ชี้ .jpg ต้องมี .webp คู่กันและถูกห่อด้วย <picture> ──
// กันไม่ให้มีคนเพิ่มรูปใหม่แล้วลืมสร้าง WebP (node tools/make-webp.js ทำให้อัตโนมัติ)
{
  const htmlFiles = fs.readdirSync(root).filter((f) => f.endsWith(".html"));
  let wrapped = 0;
  for (const f of htmlFiles) {
    const raw = read(f);
    const re = /<img\b[^>]*\bsrc="(images\/[^"]+\.jpg)"[^>]*>/g;
    let m;
    while ((m = re.exec(raw))) {
      const jpg = m[1];
      if (jpg.includes("${")) continue; // สร้างจาก JS — เช็กด้วยเทสต์อื่น
      const webp = jpg.replace(/\.jpg$/, ".webp");
      assert.ok(fs.existsSync(path.join(root, webp)), `${f}: ${jpg} ยังไม่มีไฟล์ ${webp} — รัน python3 tools/make-webp.py`);
      const before = raw.slice(Math.max(0, m.index - 260), m.index);
      assert.ok(/<picture\b[^>]*>\s*(<source[^>]*>\s*)+$/.test(before),
        `${f}: <img src="${jpg}"> ต้องอยู่ใน <picture> พร้อม <source type="image/webp">`);
      wrapped++;
    }
  }
  assert.ok(wrapped >= 100, `คาดว่ามีรูปที่ห่อ <picture> อย่างน้อย 100 รูป แต่เจอ ${wrapped}`);
  // ทุกไฟล์ที่อ้างใน srcset ต้องมีจริง — ถ้า <source> โหลดไม่ได้ เบราว์เซอร์จะไม่ถอยไปใช้ <img> ให้
  for (const f of htmlFiles) {
    for (const m of read(f).matchAll(/srcset="([^"]+)"/g)) {
      for (const cand of m[1].split(",")) {
        const url = cand.trim().split(/\s+/)[0];
        if (!url || url.includes("${")) continue;
        assert.ok(fs.existsSync(path.join(root, url)), `${f}: srcset ชี้ไปที่ ${url} ซึ่งไม่มีไฟล์จริง`);
      }
    }
  }
  assert.match(read("assets/style.css"), /picture \{ display: contents; \}/,
    "ต้องมี picture { display: contents; } ไม่งั้นตัวห่อจะดันเลย์เอาต์");
  // hero ต้องมีคำอธิบายรูปสองภาษา ไม่ใช่ alt=""
  const i18nSrc = read("assets/i18n.js");
  for (const f of htmlFiles) {
    const raw = read(f);
    const hero = raw.match(/<img class="bg"[^>]*>/) || raw.match(/<img[^>]*class="bg"[^>]*>/);
    if (!hero || !/images\/attractions\//.test(hero[0])) continue;
    const key = (hero[0].match(/data-i18n="(ph\.[a-z]+)"/) || [])[1];
    assert.ok(key, `${f}: hero ต้องมี data-i18n="ph.*" สำหรับ alt สองภาษา`);
    assert.ok(new RegExp(`"${key.replace(".", "\\.")}":`).test(i18nSrc), `i18n.js ขาดคีย์ ${key}`);
    assert.match(hero[0], /data-i18n-attr="alt"/, `${f}: hero ต้องมี data-i18n-attr="alt"`);
  }
}
console.log("IMAGE PIPELINE TESTS PASSED");

// ── Phase 2: UX ทั้งเว็บ ──
{
  const htmlFiles = fs.readdirSync(root).filter((f) => f.endsWith(".html"));
  const css = read("assets/style.css"), ui = read("assets/ui.js"), i18n = read("assets/i18n.js");

  // 1) เนื้อหาต้องไม่หายถ้า JS ไม่ทำงาน
  // attribute hidden ต้องชนะกฎ display ของ class ไม่งั้นของที่สั่งซ่อนจะเหลือเป็นกล่องว่างค้างจอ
  assert.match(css, /\[hidden\] \{ display: none !important; \}/,
    "style.css ต้องมีกฎ [hidden] { display: none !important } ครอบทั้งเว็บ");
  assert.match(css, /html\.js \.reveal \{ opacity: 0;/,
    ".reveal ต้องถูกซ่อนเฉพาะตอน html มีคลาส js ไม่งั้น JS พังแล้วหน้าจะว่าง");
  assert.ok(!/^\.reveal \{ opacity: 0;/m.test(css), "ห้ามมีกฎ .reveal ที่ซ่อนเนื้อหาโดยไม่ดูว่า JS ทำงานไหม");
  // กฎที่ทำให้โผล่ต้องเจาะจงเท่ากฎที่ซ่อน ไม่งั้นกฎซ่อนชนะแล้วทั้งเว็บไม่มีอะไรโผล่เลย
  assert.match(css, /html\.js \.reveal\.visible \{ opacity: 1;/,
    "กฎ .visible ต้องขึ้นต้นด้วย html.js ให้ specificity เท่ากับกฎที่ซ่อน");
  assert.ok(!/^\.reveal\.visible \{/m.test(css), "ห้ามเหลือกฎ .reveal.visible ที่ specificity ต่ำกว่ากฎซ่อน");
  for (const f of htmlFiles) {
    assert.match(read(f), /<script>document\.documentElement\.classList\.add\("js"\);<\/script>/,
      `${f}: ต้องมีสคริปต์บรรทัดเดียวใน <head> ที่ใส่คลาส js`);
  }
  assert.match(ui, /rootMargin: "220px 0px"/, "observer ต้องเริ่มแสดงก่อนถึงจอ");
  assert.match(ui, /if \(!fired\) showAll\(\)/, "ต้องมีตัวจับว่า observer ไม่เคยทำงาน");

  // 2) ลิงก์ไกด์ต้องอยู่ในเมนูบนของทุกหน้า (ยกเว้นหน้าไกด์เองกับ 404)
  for (const f of htmlFiles) {
    if (f === "guides.html" || f === "404.html") continue;
    const nav = (read(f).match(/<div class="navlinks">[\s\S]*?<\/div>/) || [""])[0];
    assert.match(nav, /href="guides\.html"/, `${f}: เมนูบนต้องมีลิงก์ไปหน้ารวมไกด์`);
  }
  assert.match(ui, /href="guides\.html" data-i18n="nav\.guides"/, "เมนู ☰ มือถือต้องมีลิงก์ไกด์");

  // 3) hero มือถือต้องไม่กินจอ และย่อหน้านำต้องย้ายออกมานอก hero แล้ว
  assert.match(css, /\.ld-hero\.cover \{ border-radius: 0 0 20px 20px; min-height: 360px; max-height: 70vh; \}/,
    "hero บนมือถือต้องสูงไม่เกิน 70vh");
  for (const f of htmlFiles) {
    const raw = read(f);
    if (!raw.includes('<header class="ld-hero cover">')) continue;
    const head = raw.slice(raw.indexOf('<header class="ld-hero cover">'), raw.indexOf("</header>"));
    assert.ok(!/<p class="sub"/.test(head), `${f}: ย่อหน้านำต้องอยู่นอก hero (ใน .ld-intro)`);
    assert.match(raw, /<div class="ld-intro"><p class="lead"/, `${f}: ต้องมี .ld-intro ต่อจาก hero`);
  }

  // 4) แถบปุ่มติดขอบล่างของหน้าบทความ
  assert.match(ui, /bar\.className = "ld-bar"/, "ui.js ต้องสร้างแถบปุ่มให้หน้าบทความ");
  assert.match(ui, /page === "booking\.html"/, "หน้า booking ไม่ต้องมีแถบซ้ำ");
  assert.match(ui, /ctaIn = e\.isIntersecting/, "แถบต้องหลบให้ปุ่ม CTA ท้ายบทความ");
  assert.match(css, /@media \(max-width: 640px\) \{ \.ld-bar \{ display: flex; \} \}/, "แถบนี้เฉพาะมือถือ");
  for (const k of ["sb.rates", "sb.line"]) {
    assert.ok(new RegExp(`"${k.replace(".", "\\.")}":`).test(i18n), `i18n.js ขาดคีย์ ${k}`);
  }

  // 5) หัวข้อกลุ่มในหน้า attractions ห้าม nowrap บนจอแคบ (ภาษาอังกฤษยาวกว่าไทยจนหน้าเลื่อนได้)
  assert.match(read("attractions.html"), /@media \(max-width:640px\)\{\.atr-group h2\{white-space:normal\}\}/,
    "attractions.html ต้องปล่อยให้หัวข้อตัดบรรทัดบนมือถือ");
}
console.log("UX TESTS PASSED");

// ── Phase 3: หน้ารวมไกด์ + ส่วนไกด์ในหน้าแรก ──
{
  const gd = read("guides.html");
  // เลขนับต้องมาจาก DOM ไม่ใช่พิมพ์ทิ้งไว้
  assert.ok(!/<span class="cnt">\d/.test(gd), "guides.html ห้ามมีเลขนับคงที่ใน HTML — ให้ JS นับจากการ์ดจริง");
  assert.match(gd, /cnt\.textContent = String\(n\)/, "ต้องมีโค้ดเขียนเลขนับจากจำนวนการ์ดจริง");
  assert.equal((gd.match(/<section class="gd-sec" data-cat="/g) || []).length, 5, "หมวดไกด์ 5 หมวด ต้องมี data-cat ครบ");
  const cards = (gd.match(/<a class="gd-card"/g) || []).length + (gd.match(/<a class="gd-feat"/g) || []).length;
  assert.ok(cards >= 24, `คาดว่ามีการ์ดไกด์อย่างน้อย 24 ใบ เจอ ${cards}`);
  // ข้อความจำนวนไกด์ต้องตรงกับจำนวนการ์ดในหมวดจริง (ไม่นับการ์ดรูมเซอร์วิส)
  const inCats = [...gd.matchAll(/<section class="gd-sec" data-cat="[^"]+">([\s\S]*?)<\/section>/g)]
    .reduce((n, m) => n + (m[1].match(/<a class="gd-card"/g) || []).length, 0) + 1;
  assert.ok(new RegExp(`✍️ ${inCats} ไกด์`).test(gd), `ข้อความสถิติต้องบอก ${inCats} ไกด์ ให้ตรงกับการ์ดจริง`);
  const pracSec = (gd.match(/<section class="gd-sec" data-cat="prac">([\s\S]*?)<\/section>/) || [])[1] || "";
  assert.ok(pracSec && !pracSec.includes("services.html"), "รูมเซอร์วิสต้องไม่อยู่ในหมวดไกด์แล้ว");
  assert.match(gd, /<section class="gd-rs" id="gdRs">/, "ต้องมีบล็อกรูมเซอร์วิสแยกท้ายหน้า");
  assert.match(gd, /id="gdFilter"/, "ต้องมีแถบตัวกรอง");
  assert.match(gd, /id="gdSearch"/, "ต้องมีช่องค้นหา");
  assert.match(gd, /id="gdStart"/, "ต้องมีบล็อก เริ่มจาก 3 อันนี้");
  assert.match(gd, /id="gdFest"/, "ต้องมีแถบเทศกาล");
  assert.match(gd, /class="gd-ask-map"/, "กล่องถามต้องมีแผนที่วาดมือ");
  assert.equal((gd.match(/data-f="/g) || []).length, 6, "ปุ่มกรอง 6 ปุ่ม (ทั้งหมด + 5 หมวด)");

  // festivals.json ต้องอ่านได้ และทุกวันที่ที่ยังไม่ยืนยันต้องมีโน้ต TODO-OWNER
  const fest = JSON.parse(read("assets/festivals.json"));
  assert.ok(Array.isArray(fest.festivals) && fest.festivals.length, "festivals.json ต้องมีรายการ");
  for (const f of fest.festivals) {
    assert.ok(f.id && f.slug && f.label && f.label.th && f.label.en, `festival ${f.id} ข้อมูลไม่ครบ`);
    assert.ok(fs.existsSync(path.join(root, f.slug)), `festival ${f.id} ชี้ไปหน้า ${f.slug} ที่ไม่มีอยู่`);
    if (!f.confirmed) assert.match(f.todo, /TODO-OWNER/, `festival ${f.id} ยังไม่ยืนยัน ต้องมีโน้ต TODO-OWNER`);
    if (f.start) assert.match(f.start, /^\d{4}-\d{2}-\d{2}$/, `festival ${f.id} รูปแบบวันที่ผิด`);
  }

  // หน้าแรกต้องมีส่วนไกด์ + ลิงก์ไปหน้ารวม
  const idx = read("index.html");
  assert.match(idx, /<section id="guides" class="reveal">/, "หน้าแรกต้องมีส่วนไกด์เที่ยว");
  assert.equal((idx.match(/<a class="hg-card"/g) || []).length, 3, "ส่วนไกด์ในหน้าแรกมี 3 การ์ด");
  assert.match(idx, /href="guides\.html" data-i18n="hg\.all"/, "ต้องมีปุ่มไปหน้ารวมไกด์");
}
console.log("GUIDES HUB TESTS PASSED");

// ── Phase 4: เทมเพลตบทความ ──
{
  const htmlFiles = fs.readdirSync(root).filter((f) => f.endsWith(".html"));
  const ui = read("assets/ui.js"), css = read("assets/style.css"), i18n = read("assets/i18n.js");

  // สารบัญสร้างจาก ui.js และผูก id กับคีย์ภาษา ไม่ใช่ข้อความ (สลับภาษาแล้วลิงก์ต้องไม่พัง)
  assert.match(ui, /nav\.className = "ld-toc"/, "ui.js ต้องสร้างสารบัญ");
  assert.match(ui, /heads\.length < 4/, "สารบัญขึ้นเฉพาะหน้าที่มีหัวข้อ 4 อันขึ้นไป");
  assert.match(ui, /h\.id = "s-" \+ \(\(h\.dataset\.i18n/, "id หัวข้อต้องมาจากคีย์ภาษา");
  assert.match(css, /\.ld-toc \{/, "ต้องมีสไตล์สารบัญ");

  // ทุกหน้าบทความต้องมีบรรทัดผู้เขียน + วันที่ และวันที่ต้องเป็น ISO ใน datetime
  const articlePages = htmlFiles.filter((f) => read(f).includes('<div class="ld-wrap">'));
  assert.ok(articlePages.length >= 25, `คาดว่ามีหน้าบทความอย่างน้อย 25 หน้า เจอ ${articlePages.length}`);
  for (const f of articlePages) {
    const raw = read(f);
    assert.match(raw, /<p class="ld-stamp">/, `${f}: ต้องมีบรรทัดผู้เขียน/วันที่ปรับปรุง`);
    assert.match(raw, /<time datetime="\d{4}-\d{2}-\d{2}">/, `${f}: วันที่ต้องอยู่ในรูป ISO ใน datetime`);
  }
  assert.match(ui, /MON_TH = \["ม\.ค\."/, "ต้องแปลงวันที่เป็นรูปแบบไทย (พ.ศ.) ตอนแสดงผล");

  // บล็อกจุดบนแผนที่: ทุกลิงก์ต้องเป็น Google Maps API url และชื่อสถานที่ต้องมาจาก schema ของหน้านั้น
  let placePages = 0;
  for (const f of htmlFiles) {
    const raw = read(f);
    if (!raw.includes('class="ld-sec ld-places"')) continue;
    placePages++;
    const schema = [...raw.matchAll(/<script type="application\/ld\+json">\s*(\{[\s\S]*?\})\s*<\/script>/g)]
      .map((m) => { try { return JSON.parse(m[1]); } catch (e) { return null; } })
      .find((d) => d && d["@type"] === "Article");
    assert.ok(schema && Array.isArray(schema.about), `${f}: บล็อกแผนที่ต้องมี schema Article ที่มี about`);
    const declared = new Set(schema.about.filter((a) => a["@type"] === "Place").map((a) => a.name));
    for (const m of raw.matchAll(/<a href="(https:\/\/www\.google\.com\/maps\/search[^"]+)" target="_blank" rel="noopener">📍 ([^<]+)<\/a>/g)) {
      assert.ok(declared.has(m[2]), `${f}: ชื่อสถานที่ "${m[2]}" ไม่ได้ประกาศไว้ใน schema — ห้ามตั้งเอง`);
    }
    assert.match(raw, /class="ld-plroute" href="https:\/\/www\.google\.com\/maps\/dir\/\?api=1&origin=/,
      `${f}: ต้องมีลิงก์เปิดเส้นทางทั้งหมด`);
    assert.ok(!/@-?\d+\.\d+,/.test(raw.match(/class="ld-plroute" href="([^"]+)"/)[1]),
      `${f}: ห้ามฝังพิกัดที่ไม่ได้ตรวจสอบในลิงก์แผนที่`);
  }
  assert.ok(placePages >= 12, `คาดว่ามีหน้าที่มีบล็อกแผนที่อย่างน้อย 12 หน้า เจอ ${placePages}`);

  // ลิงก์ไกด์ที่เกี่ยวกันทุกอันต้องมีรูป และรูปในบล็อกเดียวกันต้องไม่ซ้ำ
  for (const f of htmlFiles) {
    const raw = read(f);
    for (const block of raw.match(/<div class="ld-rooms">[\s\S]*?<\/div>/g) || []) {
      const seen = new Set();
      for (const m of block.matchAll(/<a class="ld-room" href="([^"]+)">(<picture>|<img\b)?/g)) {
        assert.ok(m[2], `${f}: ลิงก์ไกด์ที่เกี่ยวกัน ${m[1]} ยังไม่มีรูป`);
      }
      // รูปซ้ำในบล็อกเดียวยอมได้ (หลายไกด์ใช้รูปปกเดียวกันจริง เพราะรูปสถานที่มีแค่ 9 ไฟล์)
      // แต่รูปผิดเรื่องยอมไม่ได้ — เคยหลุดเป็นรูปเตียงบนการ์ด "เที่ยวเยาวราชกลางคืน" มาแล้ว
      for (const m of block.matchAll(/<a class="ld-room" href="([^"]+)">(?:<picture><source[^>]*>)?<img\b[^>]*\bsrc="([^"]+)"[^>]*\balt="([^"]*)"/g)) {
        const [, href, src, alt] = m;
        // รูปต้องเป็นรูปปกของหน้าปลายทางเอง หรือรูปในคลังภาพประกอบเนื้อหา
        // (รูปห้องพักที่ติดมาจากบล็อกอื่นในหน้านั้น ไม่นับ)
        const target = fs.existsSync(path.join(root, href)) ? read(href) : "";
        const isHeroOfTarget = new RegExp(`<img[^>]*class="[^"]*\\bbg\\b[^"]*"[^>]*src="${src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"|<img[^>]*src="${src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*class="[^"]*\\bbg\\b`).test(target);
        const isTopical = /^images\/(attractions|local|services)\//.test(src);
        assert.ok(isHeroOfTarget || isTopical,
          `${f}: การ์ด ${href} ใช้รูป ${src} ซึ่งไม่ใช่รูปปกของหน้านั้นและไม่ใช่ภาพประกอบเนื้อหา`);
        assert.ok(alt, `${f}: รูปบนการ์ด ${href} ไม่มีคำอธิบาย`);
        seen.add(src);
      }
    }
  }
  // หน้าบทความทุกหน้าต้องไม่เป็นทางตัน
  for (const f of articlePages) {
    assert.match(read(f), /<div class="ld-rooms">/, `${f}: ต้องมีบล็อกไกด์ที่เกี่ยวกัน`);
  }

  // twitter card + Article schema
  for (const f of htmlFiles) {
    if (f === "404.html") continue;
    const raw = read(f);
    if (!raw.includes('property="og:image"')) continue;
    assert.match(raw, /<meta name="twitter:card" content="summary_large_image">/, `${f}: ขาด twitter:card`);
    assert.match(raw, /<meta name="twitter:image"/, `${f}: ขาด twitter:image`);
  }
  for (const f of ["airport-guide.html", "attractions.html", "local.html", "loy-krathong.html", "new-year-countdown.html"]) {
    assert.match(read(f), /"@type": "Article"/, `${f}: ต้องมี schema Article`);
  }
  // ld+json ทุกก้อนในเว็บต้อง parse ได้
  for (const f of htmlFiles) {
    for (const m of read(f).matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)) {
      assert.doesNotThrow(() => JSON.parse(m[1]), `${f}: มี ld+json ที่ parse ไม่ได้`);
    }
  }
  for (const k of ["pl.t", "pl.d", "pl.route", "st.by", "st.on", "toc.t", "rel.t"]) {
    assert.ok(new RegExp(`"${k.replace(".", "\\.")}":`).test(i18n), `i18n.js ขาดคีย์ ${k}`);
  }
}
/* ── V2 ชั้นที่ 1: contrast ที่วัดได้จริง ไม่ใช่ความรู้สึก ──
   ทุกค่าคำนวณด้วยสูตร WCAG relative luminance ในเทสต์นี้เอง ถ้าใครแก้สีแล้วตก เทสต์จะบอกตัวเลข */
{
  const css = read("assets/style.css");

  const lum = (hex) => {
    const h = hex.replace("#", "");
    const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };
  const tokenOf = (name) => {
    const m = css.match(new RegExp("--" + name + ":\\s*(#[0-9a-fA-F]{6})"));
    assert.ok(m, "style.css ต้องมี token --" + name);
    return m[1].toLowerCase();
  };

  const cream = tokenOf("cream");
  const card = tokenOf("card");

  // ข้อความรอง: ต้องผ่าน WCAG 1.4.3 (4.5:1) บนพื้นที่ใช้คู่กันจริง
  const muted = tokenOf("muted");
  for (const [bg, label] of [[cream, "--cream"], [card, "--card"], ["#ffffff", "white"]]) {
    const r = ratio(muted, bg);
    assert.ok(r >= 4.5, `--muted (${muted}) บน ${label} ได้ ${r.toFixed(2)}:1 ต้อง >= 4.5`);
  }

  // ขอบ control: WCAG 1.4.11 กำหนด 3:1 — ช่องกรอกพื้นขาว
  const ctrl = tokenOf("border-control");
  for (const [bg, label] of [["#ffffff", "พื้นช่องกรอก"], [card, "--card"], [cream, "--cream"]]) {
    const r = ratio(ctrl, bg);
    assert.ok(r >= 3, `--border-control (${ctrl}) บน ${label} ได้ ${r.toFixed(2)}:1 ต้อง >= 3`);
  }

  // โทนเดิมเก็บไว้ได้ แต่ห้ามเอากลับมาใช้เป็น --muted
  assert.notEqual(muted, "#8d7f70", "#8d7f70 ได้ 3.46:1 บนครีม ห้ามใช้เป็นสีข้อความรอง");
  assert.match(css, /--muted-decor:\s*#8d7f70/, "เก็บโทนเดิมไว้เป็น --muted-decor สำหรับของตกแต่ง");

  // ช่องกรอกต้องไม่ถูกลบ outline ทิ้ง — ของเดิมใช้ outline:none + วงแหวน 1.26:1 ซึ่งมองไม่เห็น
  assert.ok(!/outline:\s*none/.test(css.replace(/\/\*[\s\S]*?\*\//g, "")),
    "ห้ามมี outline:none ใน style.css — ถ้าจะลบต้องมีตัวแทนที่มองเห็นได้");
  assert.match(css, /input:focus-visible[^{]*\{[^}]*outline:\s*2px solid/,
    "ช่องกรอกต้องมี outline 2px ตอนโฟกัสด้วยคีย์บอร์ด");
  assert.match(css, /:focus-visible\s*\{\s*outline:\s*2px solid/,
    "ต้องคงกฎ :focus-visible รวมสำหรับลิงก์และปุ่มไว้");

  // ขอบช่องกรอกต้องผูกกับ token ไม่ใช่ค่าดิบ (#ddcdb6 ของเดิมได้ 1.56:1)
  assert.ok(!/#ddcdb6/.test(css), "#ddcdb6 ได้ 1.56:1 บนพื้นขาว เอาออกแล้วใช้ --border-control");
}
console.log("CONTRAST TESTS PASSED");

console.log("ARTICLE TEMPLATE TESTS PASSED");
