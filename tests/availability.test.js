/**
 * ทดสอบ /api/availability + rate limit ของ /api/book ด้วย fixture (ไม่แตะของจริง)
 * รัน:  node tests/availability.test.js
 * ผ่านทุกข้อจะพิมพ์ "ALL TESTS PASSED"
 */
const assert = require("assert");

process.env.ADMIN_PASSWORD = "test-admin";
process.env.SHEET_WEBAPP_URL = "https://sheet.fixture/exec";
process.env.SHEET_TOKEN = "t";
process.env.BOOKING_ICAL_URLS = "";
delete process.env.SAFETY_BUFFER;

// จำลองสถานการณ์จริงในชีต: การจอง Booking.com ที่อีเมลไม่บอกวันที่ (ว่าง)
// ปนกับรายการที่มีวันที่ และรายการยกเลิก
const FIXTURE = {
  bookings: [
    { id: "BDC-1", source: "Booking.com", status: "รอเติมชื่อจาก Pulse", checkin: "", checkout: "" },
    { id: "BDC-2", source: "Booking.com", status: "รอเติมชื่อจาก Pulse", checkin: "", checkout: "" },
    { id: "BDC-3", source: "Booking.com", status: "ยืนยันแล้ว", checkin: "", checkout: "" },
    { id: "BDC-6400663895", source: "Booking.com", status: "ยืนยันแล้ว", checkin: "2026-08-10", checkout: "2026-08-12" },
    { id: "BDC-9", source: "Booking.com", status: "ยกเลิก", checkin: "2026-08-10", checkout: "2026-08-11" },
  ],
  rooms: Array.from({ length: 15 }, (_, i) => ({ room: String(101 + i) })),
};

global.fetch = async () => ({ ok: true, json: async () => FIXTURE, text: async () => "" });

const availability = require("../api/availability.js");
const book = require("../api/book.js");

function call(handler, { method = "GET", query = {}, headers = {}, body = {} } = {}) {
  return new Promise((resolve) => {
    const res = {
      code: 200,
      setHeader() {},
      status(c) { this.code = c; return this; },
      json(o) { resolve({ code: this.code, body: o }); },
      end() { resolve({ code: this.code, body: null }); },
    };
    handler({ method, query, headers, body }, res);
  });
}

(async () => {
  // 1) วันที่มีการจองจริง (2026-08-10) ต้องไม่ตอบว่าว่างทั้ง 15 ห้อง
  let r = await call(availability, { query: { checkin: "2026-08-10", checkout: "2026-08-11" } });
  assert.equal(r.code, 200);
  assert.ok(r.body.available < 15, "วันที่มีจองต้องได้ available < 15, ได้ " + r.body.available);
  assert.equal(r.body.available, 13, "15 ห้อง - จอง 1 - buffer 1 = 13");
  assert.equal(r.body.unknown, 3, "การจองไม่รู้วันที่ต้องนับได้ 3 (ไม่รวมยกเลิก)");
  assert.equal(r.body.warning, "uncertain", "มีการจองไม่รู้วันที่ → ต้องเตือน uncertain");
  assert.equal(r.body.full, false);

  // 2) วันว่างสนิท: หัก buffer แล้วเหลือ 14 และยังต้องเตือน uncertain อยู่
  r = await call(availability, { query: { checkin: "2026-09-01", checkout: "2026-09-02" } });
  assert.equal(r.body.available, 14);
  assert.equal(r.body.warning, "uncertain");

  // 3) ปิด buffer ด้วย env SAFETY_BUFFER=0
  process.env.SAFETY_BUFFER = "0";
  r = await call(availability, { query: { checkin: "2026-09-01", checkout: "2026-09-02" } });
  assert.equal(r.body.available, 15, "SAFETY_BUFFER=0 ต้องไม่หักห้อง");
  delete process.env.SAFETY_BUFFER;

  // 4) วันที่ผิดรูปแบบ / checkout ก่อน checkin → 400
  r = await call(availability, { query: { checkin: "2026-09-05", checkout: "2026-09-01" } });
  assert.equal(r.code, 400);
  r = await call(availability, { query: { checkin: "abc", checkout: "2026-09-01" } });
  assert.equal(r.code, 400);

  // 5) rate limit /api/book: ครั้งที่ 6 จาก IP เดิมใน 1 ชม. ต้องโดน 429
  process.env.SHEET_WEBAPP_URL = ""; // ให้ book ตอบ not-configured ไม่ยิงออกจริง
  const mkBook = () => call(book, {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.9" },
    body: { name: "ทดสอบ", checkin: "2026-09-01", checkout: "2026-09-02" },
  });
  for (let i = 0; i < 5; i++) {
    const b = await mkBook();
    assert.equal(b.code, 200, "5 ครั้งแรกต้องผ่าน (ครั้งที่ " + (i + 1) + ")");
  }
  const blocked = await mkBook();
  assert.equal(blocked.code, 429, "ครั้งที่ 6 ต้องโดน rate limit");
  // IP อื่นต้องไม่โดนหางเลข
  const other = await call(book, {
    method: "POST",
    headers: { "x-forwarded-for": "198.51.100.7" },
    body: { name: "ทดสอบ2", checkin: "2026-09-01", checkout: "2026-09-02" },
  });
  assert.equal(other.code, 200);

  console.log("ALL TESTS PASSED");
})().catch((e) => { console.error("TEST FAILED:", e.message); process.exit(1); });
