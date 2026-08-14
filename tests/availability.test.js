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
    { id: "BDC-6400663895", source: "Booking.com", status: "ยืนยันแล้ว", checkin: "2026-08-10", checkout: "2026-08-12", rooms: "3" },
    { id: "BDC-9", source: "Booking.com", status: "ยกเลิก", checkin: "2026-08-10", checkout: "2026-08-11", rooms: "4" },
  ],
  rooms: Array.from({ length: 15 }, (_, i) => ({ room: String(101 + i) })),
};

global.fetch = async () => ({ ok: true, json: async () => FIXTURE, text: async () => "" });

const availability = require("../api/availability.js");
const book = require("../api/book.js");

function call(handler, { method = "GET", query = {}, headers = {}, body = {} } = {}) {
  return new Promise((resolve, reject) => {
    const res = {
      code: 200,
      setHeader() {},
      status(c) { this.code = c; return this; },
      json(o) { resolve({ code: this.code, body: o }); },
      end() { resolve({ code: this.code, body: null }); },
    };
    Promise.resolve(handler({ method, query, headers, body }, res)).catch(reject);
  });
}

module.exports = (async () => {
  // 1) การจอง 1 รายการที่จอง 3 ห้อง ต้องหัก 3 ห้อง ไม่ใช่ 1 ห้อง
  let r = await call(availability, { query: { checkin: "2026-08-10", checkout: "2026-08-11" } });
  assert.equal(r.code, 200);
  assert.equal(r.body.available, 11, "15 ห้อง - จอง 3 ห้อง - buffer 1 = 11");
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

  // 4) วันที่ผิดรูปแบบ, ลำดับผิด และวันที่ไม่มีจริง → 400 โดยไม่ throw/500
  const invalidRanges = [
    { checkin: "2026-09-05", checkout: "2026-09-01" },
    { checkin: "abc", checkout: "2026-09-01" },
    { checkin: "2026-13-01", checkout: "2026-13-02" },
    { checkin: "2026-02-30", checkout: "2026-03-02" },
    { checkin: "2025-02-29", checkout: "2025-03-01" },
  ];
  for (const query of invalidRanges) {
    r = await call(availability, { query });
    assert.equal(r.code, 400, JSON.stringify(query) + " ต้องตอบ 400");
    assert.equal(r.body.error, "invalid-dates");
  }

  // 5) วัน leap year ที่มีจริงต้องผ่าน
  r = await call(availability, { query: { checkin: "2028-02-29", checkout: "2028-03-01" } });
  assert.equal(r.code, 200);
  assert.equal(r.body.nights, 1);

  // 6) rate limit /api/book: ครั้งที่ 6 จาก IP เดิมใน 1 ชม. ต้องโดน 429
  process.env.SHEET_WEBAPP_URL = ""; // ให้ book ตอบ not-configured ไม่ยิงออกจริง
  const mkBook = () => call(book, {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.9" },
    body: { name: "ทดสอบ", checkin: "2026-09-01", checkout: "2026-09-02" },
  });
  for (let i = 0; i < 5; i++) {
    const b = await mkBook();
    assert.equal(b.code, 503, "5 ครั้งแรกต้องผ่าน rate limit และแจ้งว่า service ยังไม่ได้ตั้งค่า (ครั้งที่ " + (i + 1) + ")");
  }
  const blocked = await mkBook();
  assert.equal(blocked.code, 429, "ครั้งที่ 6 ต้องโดน rate limit");
  // IP อื่นต้องไม่โดนหางเลข
  const other = await call(book, {
    method: "POST",
    headers: { "x-forwarded-for": "198.51.100.7" },
    body: { name: "ทดสอบ2", checkin: "2026-09-01", checkout: "2026-09-02" },
  });
  assert.equal(other.code, 503);

  // 7) ต้องตอบสำเร็จเฉพาะเมื่อ Apps Script ยืนยัน ok และส่ง booking id กลับมา
  process.env.SHEET_WEBAPP_URL = "https://sheet.fixture/exec";
  const validBody = {
    name: "CODEX TEST", phone: "0000000000",
    checkin: "2026-09-10", checkout: "2026-09-11",
    guests: "2", rooms: "1", total: "700",
    room: "ห้อง Standard", note: "test only",
  };
  global.fetch = async (_url, options) => {
    const sent = JSON.parse(options.body);
    assert.equal(sent.note, "ประเภทห้อง: ห้อง Standard · test only");
    return { ok: true, text: async () => JSON.stringify({ ok: true, id: "WEB-TEST-1" }) };
  };
  const saved = await call(book, {
    method: "POST", headers: { "x-forwarded-for": "203.0.113.16" }, body: validBody,
  });
  assert.equal(saved.code, 201);
  assert.deepEqual(saved.body, { ok: true, saved: true, id: "WEB-TEST-1" });

  // 8) HTTP 200 จาก Apps Script ไม่พอ — JSON ต้องยืนยันการบันทึกด้วย
  global.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ error: "unauthorized" }) });
  const rejected = await call(book, {
    method: "POST", headers: { "x-forwarded-for": "203.0.113.17" }, body: validBody,
  });
  assert.equal(rejected.code, 502);
  assert.equal(rejected.body.saved, false);

  global.fetch = async () => ({ ok: true, text: async () => "not-json" });
  const invalidJson = await call(book, {
    method: "POST", headers: { "x-forwarded-for": "203.0.113.18" }, body: validBody,
  });
  assert.equal(invalidJson.code, 502);

  global.fetch = async () => { throw new Error("offline"); };
  const unavailable = await call(book, {
    method: "POST", headers: { "x-forwarded-for": "203.0.113.19" }, body: validBody,
  });
  assert.equal(unavailable.code, 502);
  assert.equal(unavailable.body.error, "booking-storage-unavailable");

  const missingPhone = await call(book, {
    method: "POST", headers: { "x-forwarded-for": "203.0.113.20" }, body: { ...validBody, phone: "" },
  });
  assert.equal(missingPhone.code, 400);

  console.log("ALL TESTS PASSED");
  return "ALL TESTS PASSED";
})().catch((e) => {
  console.error("TEST FAILED:", e.message);
  process.exitCode = 1;
  throw e;
});
