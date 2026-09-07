/**
 * ทดสอบชั้นเก็บข้อมูล Postgres (api/_store.js) ด้วย PGlite — Postgres จริงในโปรเซส ไม่ต้องมีเซิร์ฟเวอร์
 * รัน: node tests/store.test.js
 */
const assert = require("assert");
const { PGlite } = require("@electric-sql/pglite");
const { createStore, parseDbUrl } = require("../api/_store.js");

(async () => {
  const db = new PGlite();
  const query = async (sql, params) => { const r = await db.query(sql, params); return { rows: r.rows, rowCount: r.affectedRows != null ? r.affectedRows : r.rows.length }; };
  const store = createStore(query);

  // 1) schema สร้างเอง + ห้องจริง 18 ช่อง + ค่าตั้งค่าเว็บเริ่มต้น
  await store.ensureSchema();
  let all = await store.listAll();
  assert.equal(all.rooms.length, 18, "ห้องเริ่มต้นตามผังจริง 18 ช่อง");
  assert.equal(all.rooms[0].room, "701");
  assert.deepEqual(Object.keys(all), ["bookings", "rooms", "expenses", "orders"], "รูปแบบตอบกลับตรงกับ Apps Script list");
  const site = await store.getSite();
  assert.equal(site.site.price_per_night, "700");

  // 2) จองตรงจากเว็บ → id WEB-… คืนคำนวณเอง สถานะรอยืนยัน
  const id = await store.addBooking({ source: "เว็บไซต์ (จองตรง)", name: "E2E ทดสอบ", checkin: "2026-10-01", checkout: "2026-10-03", guests: "2", phone: "0812345678", amount: "", note: "ประเภทห้อง: Standard" }, "web");
  assert.match(id, /^WEB-\d{12}$/);
  all = await store.listAll();
  const b = all.bookings.find((x) => x.id === id);
  assert.equal(b.nights, "2"); assert.equal(b.status, "รอยืนยัน"); assert.equal(b.rooms, "1"); assert.ok(b.created);
  assert.deepEqual(Object.keys(b), ["id", "source", "name", "checkin", "checkout", "nights", "guests", "rooms", "phone", "amount", "status", "note", "created", "room_no", "paid", "pay_status"], "ฟิลด์ booking ตรงกับชีตทุกตัว");

  // 3) id ซ้ำในวินาทีเดียวต้องไม่ชน
  const id2 = await store.addBooking({ source: "เว็บไซต์ (จองตรง)", name: "คนที่สอง", checkin: "2026-10-01", checkout: "2026-10-03" }, "web");
  assert.notEqual(id, id2);

  // 4) update: จัดห้อง / เช็คอิน / เปลี่ยนวันออก → nights ใหม่ / ช่องที่ไม่อนุญาตถูกเมิน
  let r = await store.updateBooking(id, { room_no: "704", status: "เข้าพักอยู่", id: "HACK", created: "x" }, "staff");
  assert.equal(r.ok, true);
  r = await store.updateBooking(id, { checkout: "2026-10-05" }, "admin");
  all = await store.listAll();
  const b2 = all.bookings.find((x) => x.id === id);
  assert.equal(b2.room_no, "704"); assert.equal(b2.status, "เข้าพักอยู่"); assert.equal(b2.nights, "4"); assert.equal(b2.id, id);
  r = await store.updateBooking("NOPE", { status: "x" });
  assert.equal(r.ok, false);

  // 5) ชำระเงิน (paid / pay_status) บันทึกได้
  await store.updateBooking(id, { paid: "1400", pay_status: "จ่ายครบ" });
  assert.equal((await store.listAll()).bookings.find((x) => x.id === id).pay_status, "จ่ายครบ");

  // 6) ห้อง: แจ้งรอทำความสะอาด + โน้ต / ห้องไม่มี → error
  r = await store.setRoomClean("704", "รอทำความสะอาด", undefined, "staff");
  assert.equal(r.ok, true);
  r = await store.setRoomClean("704", "สะอาด", "แอร์เสียงดัง", "staff");
  const room = (await store.listAll()).rooms.find((x) => x.room === "704");
  assert.equal(room.clean, "สะอาด"); assert.equal(room.note, "แอร์เสียงดัง");
  r = await store.setRoomClean("999", "สะอาด");
  assert.equal(r.error, "room-not-found");

  // 7) รายจ่าย เพิ่ม/ลบ
  const eid = await store.addExpense({ date: "2026-10-02", category: "ค่าไฟ", amount: "4200", vendor: "MEA", method: "โอน", note: "" }, "admin");
  assert.match(eid, /^EXP-/);
  assert.equal((await store.listAll()).expenses.length, 1);
  assert.equal((await store.deleteExpense(eid)).ok, true);
  assert.equal((await store.deleteExpense(eid)).ok, false);

  // 8) รูมเซอร์วิส เพิ่ม/เปลี่ยนสถานะ
  const oid = await store.addOrder({ name: "Somchai", room: "704", date: "2026-10-02", time: "09:30", items: "มัสมั่น (ไก่) × 2 — ฿200", total: "200", note: "", lang: "th", channel: "line" });
  assert.match(oid, /^RS-/);
  r = await store.updateOrder(oid, { status: "ส่งแล้ว", paid: "200", hack: "x" });
  const o = (await store.listAll()).orders.find((x) => x.id === oid);
  assert.equal(o.status, "ส่งแล้ว"); assert.equal(o.paid, "200");

  // 9) ย้ายจากชีต: รันซ้ำไม่ซ้ำแถว และไม่ทับค่าที่แก้ในฐานข้อมูลแล้ว
  const sheetList = {
    bookings: [{ id: "BDC-1", source: "Booking.com", name: "Amara", checkin: "2026-10-10", checkout: "2026-10-12", nights: "2", guests: "2", rooms: "1", phone: "", amount: "2,400", status: "ยืนยันแล้ว", note: "", created: "2026-09-01 10:00", room_no: "716" },
               { id: id, name: "ค่าเก่าจากชีต", room_no: "" }],
    rooms: [{ room: "701", clean: "รอทำความสะอาด", note: "" }, { room: "งิ้ว9", clean: "สะอาด", note: "ห้องใหม่" }],
    expenses: [{ id: "EXP-1", date: "2026-09-02", category: "ค่าน้ำ", amount: "980", vendor: "MWA", method: "โอน", note: "", created: "" }],
    orders: [],
  };
  const sheetSite = { site: { price_per_night: "750", announcement_th: "ปิดปรับปรุง" }, rates: [{ from: "2026-12-30", to: "2027-01-01", room: "all", price: "1200", note: "ปีใหม่" }] };
  let c = await store.importFromSheet(sheetList, sheetSite);
  assert.equal(c.bookings, 1, "booking ที่มีอยู่แล้วต้องไม่ถูกทับ (นับเฉพาะแถวใหม่)");
  assert.equal(c.rates, 1);
  all = await store.listAll();
  assert.equal(all.bookings.find((x) => x.id === id).room_no, "704", "ค่าในฐานข้อมูลชนะค่าเก่าจากชีต");
  assert.equal(all.bookings.find((x) => x.id === "BDC-1").room_no, "716");
  assert.equal(all.rooms.find((x) => x.room === "701").clean, "สะอาด", "สถานะห้องเดิมไม่ถูกทับ (แก้ในหลังบ้านไปแล้ว)");
  assert.ok(all.rooms.find((x) => x.room === "งิ้ว9"), "ห้องใหม่จากชีตถูกเพิ่ม");
  assert.equal((await store.getSite()).site.price_per_night, "750");
  assert.equal((await store.getSite()).rates[0].price, "1200");
  c = await store.importFromSheet(sheetList, sheetSite);
  assert.equal(c.bookings, 0, "รันซ้ำไม่เพิ่มแถว");
  assert.equal((await store.listAll()).expenses.length, 1);

  // 10) audit log บันทึกทุกการแก้ไข
  const log = await query("SELECT actor, action, target FROM audit_log ORDER BY id");
  assert.ok(log.rows.length >= 10);
  assert.ok(log.rows.some((x) => x.action === "update" && x.actor === "staff" && x.target === id));

  // 11) bootstrap อัตโนมัติ: ฐานข้อมูลใหม่ที่ว่าง + มีชีต → ดึงมาให้เอง · ฐานข้อมูลที่มีข้อมูลแล้ว → ไม่ทำ
  const db2 = new PGlite();
  const store2 = createStore(async (sql, params) => { const r = await db2.query(sql, params); return { rows: r.rows, rowCount: r.affectedRows != null ? r.affectedRows : r.rows.length }; });
  let calls = 0;
  const fakeFetch = async (u) => { calls++; return { ok: true, json: async () => u.includes("action=site") ? sheetSite : sheetList }; };
  let bc = await store2.bootstrapFromSheet({ url: "https://sheet.fixture/exec", token: "t", fetchImpl: fakeFetch });
  assert.equal(bc.bookings, 2, "ฐานข้อมูลว่าง → ดึงจากชีต");
  assert.equal((await store2.listAll()).bookings.length, 2);
  bc = await store2.bootstrapFromSheet({ url: "https://sheet.fixture/exec", token: "t", fetchImpl: fakeFetch });
  assert.equal(bc, null, "ครั้งที่สองไม่ทำซ้ำ");
  assert.equal(calls, 2);
  assert.equal(await store.bootstrapFromSheet({ url: "https://sheet.fixture/exec", token: "t", fetchImpl: fakeFetch }), null, "ฐานข้อมูลที่มีข้อมูลแล้วไม่ดึงทับ");
  assert.equal(await store2.bootstrapFromSheet({ url: "", token: "", fetchImpl: fakeFetch }), null, "ไม่มีชีต → ข้าม");

  // 12) DATABASE_URL ที่คัดลอกมาผิดรูปต้องซ่อมได้/บอกสาเหตุได้ โดยไม่หลุดค่าจริง
  assert.equal(parseDbUrl("postgresql://postgres.abc:pass@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres").connectionString, "postgresql://postgres.abc:pass@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres");
  assert.equal(parseDbUrl("  \"postgresql://postgres.abc:pass@host:6543/postgres\" ").connectionString, "postgresql://postgres.abc:pass@host:6543/postgres", "ตัดช่องว่างและเครื่องหมายคำพูด");
  const fixed = parseDbUrl("postgresql://postgres.abc:P@ss#w/rd%1@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres");
  assert.equal(fixed.repaired, true); assert.equal(fixed.connectionString, "postgresql://postgres.abc:P%40ss%23w%2Frd%251@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres", "รหัสที่มี @ # / % ถูก encode ให้เอง");
  assert.equal(new URL(fixed.connectionString).password, "P%40ss%23w%2Frd%251");
  assert.equal(parseDbUrl("postgresql://postgres.abc:[YOUR-PASSWORD]@host:6543/postgres").error, "placeholder");
  assert.equal(parseDbUrl("not a url").error, "invalid-url");
  assert.equal(parseDbUrl("").error, "missing");

  // 13) ซิงก์จากชีตช่วงเปลี่ยนผ่าน: แถวใหม่เข้า · เติมช่องว่าง · รับยกเลิก · ไม่ทับค่าที่หลังบ้านแก้
  const syncList = {
    bookings: [
      { id: "BDC-NEW", source: "Booking.com", name: "", checkin: "", checkout: "", status: "รอเติมชื่อจาก Pulse", note: "", created: "2026-09-07 10:00", room_no: "" },
      { id: "BDC-1", source: "Booking.com", name: "Amara Okafor", checkin: "2026-10-10", checkout: "2026-10-13", nights: "3", guests: "2", rooms: "1", amount: "3,600", status: "ยืนยันแล้ว", note: "", created: "2026-09-01 10:00", room_no: "" },
      { id: id, name: "ชื่อจากชีต", status: "ยกเลิก", note: "ยกเลิกตามอีเมล 7 ก.ย.", room_no: "" },
    ],
    rooms: [{ room: "701", clean: "รอทำความสะอาด" }],
    expenses: [], orders: [{ id: "RS-SHEET", created: "", name: "X", room: "702", date: "2026-10-01", time: "09:00", items: "ชาไทย × 1 — ฿40", total: "40", note: "", status: "รอยืนยัน", paid: "", lang: "th", channel: "line" }],
  };
  await store.updateBooking("BDC-1", { room_no: "716", guests: "" }, "staff"); // หลังบ้านจัดห้องแล้ว และ guests ว่างรอเติม
  const sy = await store.syncFromSheet(syncList);
  assert.deepEqual([sy.added, sy.backfilled, sy.cancelled, sy.orders], [1, 1, 1, 1]);
  all = await store.listAll();
  assert.ok(all.bookings.find((x) => x.id === "BDC-NEW"), "แถวใหม่จากอีเมลเข้าฐานข้อมูล");
  const amara = all.bookings.find((x) => x.id === "BDC-1");
  assert.equal(amara.room_no, "716", "ห้องที่หลังบ้านจัดต้องไม่ถูกทับ");
  assert.equal(amara.guests, "2", "ช่องว่างถูกเติมจากชีต");
  assert.equal(amara.checkout, "2026-10-12", "วันที่ที่มีอยู่แล้วไม่ถูกทับด้วยค่าชีต");
  const cancelled = all.bookings.find((x) => x.id === id);
  assert.equal(cancelled.status, "ยกเลิก"); assert.equal(cancelled.room_no, "704"); assert.notEqual(cancelled.name, "ชื่อจากชีต", "ชื่อที่มีอยู่ไม่ถูกทับ");
  assert.equal(all.rooms.find((x) => x.room === "701").clean, "สะอาด", "สถานะห้องจากชีตไม่ทับ (หลังบ้านเป็นตัวจริง)");
  assert.ok(all.orders.find((x) => x.id === "RS-SHEET"));
  let syncCalls = 0;
  const syncFetch = async () => { syncCalls++; return { ok: true, json: async () => syncList }; };
  await store.syncFromSheetIfStale({ url: "https://sheet.fixture/exec", token: "t", fetchImpl: syncFetch, minIntervalMs: 0 });
  await store.syncFromSheetIfStale({ url: "https://sheet.fixture/exec", token: "t", fetchImpl: syncFetch });
  assert.equal(syncCalls, 1, "ภายใน 2 นาทีไม่ซิงก์ซ้ำ");

  console.log("STORE TESTS PASSED");
})().catch((e) => { console.error(e); process.exit(1); });
