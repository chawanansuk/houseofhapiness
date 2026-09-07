/**
 * ทดสอบ API ทุกตัวในโหมดฐานข้อมูล (DATABASE_URL ตั้งแล้ว) ด้วย PGlite — เส้นทางเดียวกับที่รันบน Vercel หลังสลับระบบ
 * รัน: node tests/api-db.test.js
 */
const assert = require("assert");
const { PGlite } = require("@electric-sql/pglite");

process.env.ADMIN_PASSWORD = "test-admin";
process.env.STAFF_PASSWORD = "test-staff";
process.env.DATABASE_URL = "postgres://test";          // แค่ให้ dbEnabled() จริง — pool จริงถูกแทนด้วย PGlite ด้านล่าง
process.env.SHEET_WEBAPP_URL = "";                      // ต้องไม่ถูกเรียกเลยในโหมดนี้
process.env.SHEET_TOKEN = "";
process.env.BOOKING_ICAL_URLS = "";
global.fetch = async () => { throw new Error("fetch must not be called in db mode"); };

const store = require("../api/_store.js");
const db = new PGlite();
store.__setStore(store.createStore(async (sql, params) => { const r = await db.query(sql, params); return { rows: r.rows, rowCount: r.affectedRows != null ? r.affectedRows : r.rows.length }; }));

const data = require("../api/data.js");
const update = require("../api/update.js");
const book = require("../api/book.js");
const order = require("../api/order.js");
const site = require("../api/site.js");
const availability = require("../api/availability.js");
const health = require("../api/health.js");
const migrate = require("../api/migrate.js");

function call(handler, { method = "GET", query = {}, headers = {}, body = {} } = {}) {
  return new Promise((resolve, reject) => {
    const res = { code: 200, setHeader() {}, status(c) { this.code = c; return this; }, json(o) { resolve({ code: this.code, body: o }); }, end() { resolve({ code: this.code, body: null }); } };
    Promise.resolve(handler({ method, query, headers, body }, res)).catch(reject);
  });
}
const admin = { "x-admin-key": "test-admin" }, staff = { "x-admin-key": "test-staff" };
const d = (off) => new Date(Date.now() + off * 86400000).toISOString().slice(0, 10);

(async () => {
  // 1) /api/data ว่างเปล่าแต่มีห้อง 18 ช่อง · sources.db
  let r = await call(data, { headers: admin });
  assert.equal(r.code, 200); assert.equal(r.body.rooms.length, 18); assert.equal(r.body.sources.db, true); assert.deepEqual(r.body.orders, []);

  // 2) จองตรงจากเว็บ → บันทึกในฐานข้อมูล
  r = await call(book, { method: "POST", body: { name: "Somchai Web", phone: "0812345678", checkin: d(5), checkout: d(7), guests: "2", rooms: "1", room: "Standard", note: "มาถึง 15:00", total: "" } });
  assert.equal(r.code, 201); assert.match(r.body.id, /^WEB-/);
  const webId = r.body.id;

  // 3) รูมเซอร์วิสจากเว็บ
  r = await call(order, { method: "POST", headers: { "x-forwarded-for": "1.2.3.4" }, body: { name: "Somchai Web", room: "701", date: d(1), time: "09:30", lang: "th", channel: "line", items: [{ th: "ผัดไทย", variant: "กุ้ง", qty: 2, price: 100 }] } });
  assert.equal(r.code, 201); assert.match(r.body.id, /^RS-/);
  const rsId = r.body.id;

  // 4) หลังบ้าน: จัดห้อง (staff) / เช็คอิน / รับเงิน (admin) / ห้องสกปรก / ออเดอร์ส่งแล้ว
  r = await call(update, { method: "POST", headers: staff, body: { action: "update", id: webId, fields: { room_no: "704", amount: "9999" } } });
  assert.equal(r.code, 200); assert.equal(r.body.saved, true);
  r = await call(update, { method: "POST", headers: admin, body: { action: "update", id: webId, fields: { status: "เข้าพักอยู่", amount: "1400", paid: "1400", pay_status: "จ่ายครบ" } } });
  assert.equal(r.code, 200);
  r = await call(update, { method: "POST", headers: staff, body: { action: "roomclean", room: "704", clean: "รอทำความสะอาด" } });
  assert.equal(r.code, 200);
  r = await call(update, { method: "POST", headers: staff, body: { action: "orderupdate", id: rsId, fields: { status: "ส่งแล้ว", paid: "200" } } });
  assert.equal(r.code, 200);
  r = await call(update, { method: "POST", headers: staff, body: { action: "expadd", date: d(0), amount: "500", category: "ของใช้" } });
  assert.equal(r.code, 403, "พนักงานห้ามบันทึกรายจ่าย");
  r = await call(update, { method: "POST", headers: admin, body: { action: "expadd", date: d(0), amount: "500", category: "ของใช้", vendor: "แม็คโคร", method: "เงินสด", note: "" } });
  assert.equal(r.code, 200); const expId = r.body.id; assert.match(expId, /^EXP-/);
  r = await call(update, { method: "POST", headers: admin, body: { action: "update", id: "NOPE", fields: { status: "x" } } });
  assert.equal(r.code, 502, "ไม่พบรายการ → 502 เหมือนเดิม");
  r = await call(update, { method: "POST", headers: admin, body: { action: "add", name: "Walk-in", checkin: d(1), checkout: d(3), room_no: "705", source: "จองตรง", status: "เข้าพักอยู่", amount: "1400", guests: "2" } });
  assert.equal(r.code, 200); assert.match(r.body.id, /^WEB-/);

  // 5) /api/data สะท้อนทุกอย่าง — และพนักงานไม่เห็นยอดเงิน/รายจ่าย
  r = await call(data, { headers: admin });
  const b = r.body.bookings.find((x) => x.id === webId);
  assert.equal(b.room_no, "704"); assert.equal(b.status, "เข้าพักอยู่"); assert.equal(b.amount, "1400", "พนักงานส่ง amount มาต้องถูกตัดออก ค่าที่เจ้าของใส่ต้องอยู่"); assert.equal(b.pay_status, "จ่ายครบ");
  assert.equal(r.body.rooms.find((x) => x.room === "704").clean, "รอทำความสะอาด");
  assert.equal(r.body.orders[0].status, "ส่งแล้ว");
  assert.equal(r.body.expenses.length, 1);
  r = await call(data, { headers: staff });
  assert.equal(r.body.bookings.find((x) => x.id === webId).amount, ""); assert.deepEqual(r.body.expenses, []); assert.equal(r.body.orders.length, 1, "พนักงานต้องเห็นออเดอร์อาหาร");
  r = await call(data, { headers: { "x-admin-key": "wrong" } });
  assert.equal(r.code, 401);

  // 6) ห้องว่างสาธารณะคำนวณจากฐานข้อมูล (2 ห้องถูกใช้ช่วง d(5)-d(7): webId ห้อง 704 เท่านั้น → 18-1-buffer1 = 16)
  r = await call(availability, { query: { checkin: d(5), checkout: d(7) } });
  assert.equal(r.code, 200); assert.equal(r.body.total, 18); assert.equal(r.body.available, 16);

  // 7) /api/site จากฐานข้อมูล
  r = await call(site);
  assert.equal(r.body.source, "db"); assert.equal(r.body.prices.std, 700);

  // 8) health ตัดสินจากฐานข้อมูล
  r = await call(health);
  assert.equal(r.code, 200); assert.equal(r.body.checks.db, "ok");

  // 9) /api/migrate: สถานะ + ต้องเป็นเจ้าของ
  r = await call(migrate, { headers: admin });
  assert.equal(r.code, 200); assert.equal(r.body.counts.bookings, 2);
  r = await call(migrate, { headers: staff });
  assert.equal(r.code, 401);

  // 10) ลบรายจ่าย
  r = await call(update, { method: "POST", headers: admin, body: { action: "expdel", id: expId } });
  assert.equal(r.code, 200);
  r = await call(data, { headers: admin });
  assert.equal(r.body.expenses.length, 0);

  console.log("API DB-MODE TESTS PASSED");
})().catch((e) => { console.error(e); process.exit(1); });
