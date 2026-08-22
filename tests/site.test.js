/**
 * Static regression checks for public pages, accessibility, analytics, and admin exports.
 * Run: node tests/site.test.js
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const publicPages = ["index.html", "booking.html", "gallery.html", "attractions.html", "local.html"];
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

const admin = read("admin/index.html");
assert.doesNotMatch(admin, /URLSearchParams\(location\.search\).*get\("key"\)/s, "admin key must not be accepted from URL");
assert.doesNotMatch(admin, /_vercel\/insights/, "admin must not load public analytics");
assert.match(admin, /role="dialog" aria-modal="true"/, "admin modals must expose dialog semantics");
assert.match(admin, /function safeCsvCell/, "CSV exports must sanitize spreadsheet formulas");
assert.match(admin, /id="csvSummary"/, "monthly summary export must be available");

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

  console.log("SITE TESTS PASSED");
  return "SITE TESTS PASSED";
})().catch((e) => {
  console.error("TEST FAILED:", e.message);
  process.exitCode = 1;
  throw e;
});
