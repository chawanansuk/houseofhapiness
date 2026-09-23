"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "..", "backoffice", "apps-script.gs"),
  "utf8"
);
const sandbox = { console, Date };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "apps-script.gs" });

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

{
  const parsed = plain(sandbox.parseBookingEmail_(
    "New booking - 1234567890",
    [
      "Reservation number: 1234567890",
      "Guest name: Jane Doe",
      "Check-in: Thursday, 13 August 2026",
      "Check-out: Saturday, 15 August 2026",
      "Guests: 2",
      "Rooms: 1",
      "Total price: THB 1,400.00",
    ].join("\n")
  ));
  assert.deepEqual(parsed, {
    type: "new",
    reservationNo: "1234567890",
    name: "Jane Doe",
    checkin: "2026-08-13",
    checkout: "2026-08-15",
    guests: "2",
    rooms: "1",
    amount: "1,400.00",
    checkinFromSubject: false,
  });
}

{
  const parsed = plain(sandbox.parseBookingEmail_(
    "คุณมีการจองใหม่ 9876543210",
    [
      "หมายเลขการจอง: 9876543210",
      "ชื่อผู้เข้าพัก: สมชาย ใจดี",
      "เช็กอิน: 10 สิงหาคม พ.ศ. 2569",
      "เช็กเอาต์: 12 สิงหาคม พ.ศ. 2569",
      "ผู้ใหญ่: 2",
      "จำนวนห้อง: 1",
      "ยอดรวม: ฿1,800",
    ].join("\n")
  ));
  assert.equal(parsed.type, "new");
  assert.equal(parsed.reservationNo, "9876543210");
  assert.equal(parsed.name, "สมชาย ใจดี");
  assert.equal(parsed.checkin, "2026-08-10");
  assert.equal(parsed.checkout, "2026-08-12");
  assert.equal(parsed.guests, "2");
  assert.equal(parsed.rooms, "1");
  assert.equal(parsed.amount, "1,800");
}

{
  const parsed = plain(sandbox.parseBookingEmail_(
    "Reservation modified: 1122334455",
    [
      "Confirmation no: 1122334455",
      "Guest name:\u00a0\u200B Alex Smith",
      "Stay: August 20, 2026 – August 22, 2026",
      "2 adults",
      "1 unit",
      "Booking total: 2,100 THB",
    ].join("\r\n")
  ));
  assert.equal(parsed.type, "modify");
  assert.equal(parsed.reservationNo, "1122334455");
  assert.equal(parsed.name, "Alex Smith");
  assert.equal(parsed.checkin, "2026-08-20");
  assert.equal(parsed.checkout, "2026-08-22");
  assert.equal(parsed.guests, "2");
  assert.equal(parsed.rooms, "1");
  assert.equal(parsed.amount, "2,100");
}

{
  const parsed = plain(sandbox.parseBookingEmail_(
    "Booking cancelled - 5566778899",
    "Reservation number: 5566778899\nGuest name: Cancelled Guest"
  ));
  assert.equal(parsed.type, "cancel");
  assert.equal(parsed.reservationNo, "5566778899");
}

{
  const parsed = plain(sandbox.parseBookingEmail_(
    "New booking received",
    "Phone: 0812345678\nGuest name: Phone Must Not Become Booking Id"
  ));
  assert.equal(parsed.reservationNo, "");
}

{
  const parsed = plain(sandbox.parseBookingEmail_(
    "คุณมีการจองใหม่! วันจันทร์ที่ 10 ส.ค. 2569",
    "หมายเลขการจอง: 1029384756"
  ));
  assert.equal(parsed.checkin, "2026-08-10");
  assert.equal(parsed.checkout, "");
  assert.equal(parsed.checkinFromSubject, true);
}

assert.equal(sandbox.parseDate_("31/02/2026"), "");
assert.equal(sandbox.parseDate_("2026-2-3"), "2026-02-03");
assert.equal(sandbox.parseDate_("September 5th, 2026"), "2026-09-05");

/* ── อีเมลสรุปรายวัน "เช็คอินวันนี้/พรุ่งนี้" (ตาราง: เลขจอง|ชื่อ|เช็คอิน|เช็คเอาท์) ── */

assert.equal(sandbox.isArrivalsDigest_("Reservations with today's or tomorrow's arrival date for House of Happiness"), true);
assert.equal(sandbox.isArrivalsDigest_("คุณมีการจองใหม่! วันจันทร์ที่ 10 สิงหาคม ค.ศ. 2026"), false);
assert.equal(sandbox.isArrivalsDigest_("Booking cancelled - 5566778899"), false);

{
  // stub ชีต: มีแถวเดิม 1 รายการที่ยังไม่รู้วันที่ (สภาพเดียวกับรายการจากอีเมลจองใหม่ยุคหลัง)
  const existing = [{
    id: "BDC-5923801224", source: "Booking.com", name: "", checkin: "", checkout: "",
    nights: "", guests: "", rooms: "", phone: "", amount: "",
    status: "รอเติมชื่อจาก Pulse", note: "อีเมลไม่ระบุรายละเอียดครบ", created: "", room_no: "", _rowIndex: 2,
  }];
  const appended = [];
  const cellWrites = {};
  sandbox.readAll_ = () => existing;
  sandbox.appendBooking_ = (b) => appended.push(b);
  sandbox.getSheet_ = () => ({
    getRange: (row, col) => ({
      setValue: (v) => { cellWrites[row + ":" + sandbox.HEADERS[col - 1]] = v; },
      getValue: () => (existing[row - 2] ? existing[row - 2].note : ""),
    }),
  });

  const html = [
    '<table><tr><th>การจอง</th><th>ชื่อผู้เข้าพัก</th><th>วันเช็คอิน</th><th>วันเช็คเอาท์</th></tr>',
    '<tr><td><a href="#">6003254919</a></td><td>Volker Goering</td><td>20 ส.ค. 2026</td><td>23 ส.ค. 2026</td></tr>',
    '<tr><td><a href="#">5461969032</a></td><td>Matthew Chopping<br/><span>Approximate time of arrival: 08:00</span></td><td>20 ส.ค. 2026</td><td>25 ส.ค. 2026</td></tr>',
    '<tr><td><a href="#">5923801224</a></td><td>George Glenn</td><td>21 ส.ค. 2026</td><td>28 ส.ค. 2026</td></tr>',
    '</table>',
  ].join("\n");

  assert.equal(sandbox.importArrivalRows_(html), 3);
  // แถวใหม่ 2 รายการถูกเพิ่ม พร้อมชื่อ/วัน/สถานะยืนยัน (ชื่อไม่ติดโน้ตเวลามาถึง)
  assert.equal(appended.length, 2);
  const volker = appended.find((b) => b.id === "BDC-6003254919");
  assert.deepEqual([volker.name, volker.checkin, volker.checkout, volker.status],
    ["Volker Goering", "2026-08-20", "2026-08-23", "ยืนยันแล้ว"]);
  const mat = appended.find((b) => b.id === "BDC-5461969032");
  assert.equal(mat.name, "Matthew Chopping");
  // คำขอพิเศษของแขก (บรรทัดถัดจากชื่อ) ต้องถูกเก็บลงโน้ต
  assert.ok(mat.note.includes("คำขอแขก: Approximate time of arrival: 08:00"));
  // แถวเดิมถูกเติมวันที่/ชื่อ/คืน และพ้นสถานะรอเติม
  assert.equal(cellWrites["2:checkin"], "2026-08-21");
  assert.equal(cellWrites["2:checkout"], "2026-08-28");
  assert.equal(cellWrites["2:name"], "George Glenn");
  assert.equal(cellWrites["2:nights"], 7);
  assert.equal(cellWrites["2:status"], "ยืนยันแล้ว");
  // รันซ้ำเมื่อข้อมูลครบแล้ว — ต้องไม่เพิ่ม/ไม่แก้อะไร
  existing.length = 0;
  existing.push(
    { id: "BDC-5923801224", name: "George Glenn", checkin: "2026-08-21", checkout: "2026-08-28", nights: "7", status: "ยืนยันแล้ว", note: "", _rowIndex: 2 },
    { id: "BDC-6003254919", name: "Volker Goering", checkin: "2026-08-20", checkout: "2026-08-23", nights: "3", status: "ยืนยันแล้ว", note: "", _rowIndex: 3 },
    { id: "BDC-5461969032", name: "Matthew Chopping", checkin: "2026-08-20", checkout: "2026-08-25", nights: "5", status: "ยืนยันแล้ว", note: "จากอีเมลสรุปเช็คอินวันนี้/พรุ่งนี้ | คำขอแขก: Approximate time of arrival: 08:00", _rowIndex: 4 }
  );
  appended.length = 0;
  assert.equal(sandbox.importArrivalRows_(html), 0);
  assert.equal(appended.length, 0);
}

/* ── เมลสรุปเช้า: หมวด "เช็คอินพรุ่งนี้" + คำขอแขก ── */
{
  const ymd = (d) => d.toISOString().slice(0, 10);
  const today = ymd(new Date());
  const tomorrow = ymd(new Date(Date.now() + 86400000));
  sandbox.Utilities = {
    formatDate: (d, tz, fmt) => (fmt === "yyyy-MM-dd" ? ymd(d) : d.toDateString()),
  };
  sandbox.Session = { getEffectiveUser: () => ({ getEmail: () => "owner@test" }) };
  let sent = null;
  sandbox.MailApp = { sendEmail: (to, subject, body) => { sent = { to, subject, body }; } };
  sandbox.readRooms_ = () => [];
  sandbox.readExpenses_ = () => [];
  sandbox.readAll_ = () => [
    { id: "A", name: "วันนี้ คนแรก", checkin: today, checkout: tomorrow, status: "ยืนยันแล้ว", room_no: "701", source: "Booking.com", note: "", amount: "" },
    { id: "B", name: "Matthew Chopping", checkin: tomorrow, checkout: "2099-01-05", status: "ยืนยันแล้ว", room_no: "", source: "Booking.com", amount: "",
      note: "จากอีเมลสรุปเช็คอินวันนี้/พรุ่งนี้ | คำขอแขก: Early check-in 08:00" },
  ];

  sandbox.dailyDigest();
  assert.ok(sent, "dailyDigest ต้องส่งอีเมล");
  assert.ok(sent.body.includes("== เตรียมพรุ่งนี้ =="));
  assert.ok(sent.body.includes("เช็คอินพรุ่งนี้: 1 รายการ"));
  assert.ok(sent.body.includes("Matthew Chopping | ยังไม่จัดห้อง | Booking.com | ⚠ คำขอแขก: Early check-in 08:00"));
  assert.ok(sent.subject.includes("พรุ่งนี้ 1"));
}

/* ── แจ้งเตือนจองใหม่: วันที่แบบไทย + จำนวนคืน ── */
{
  assert.equal(sandbox.fmtThaiYMD_("2026-11-14"), "ส. 14 พ.ย. 2569");
  assert.equal(sandbox.fmtThaiYMD_("2026-01-01"), "พฤ. 1 ม.ค. 2569");
  assert.equal(sandbox.fmtThaiYMD_(""), "", "วันที่ว่างต้องไม่พังและไม่เดาแทน");
  assert.equal(sandbox.fmtThaiYMD_("13 August 2026"), "", "รับเฉพาะรูปแบบ YYYY-MM-DD");
  assert.equal(sandbox.nightsBetween_("2026-11-14", "2026-11-16"), 2);
  assert.equal(sandbox.nightsBetween_("2026-11-14", ""), 0, "ขาดวันออก = ไม่เดาจำนวนคืน");
}

/* ── ไม่มีอะไรใหม่ = ไม่ส่งเมลเปล่า ── */
{
  assert.equal(sandbox.buildNewBookingNotice_([], []), null);
  assert.equal(sandbox.buildNewBookingNotice_(null, null), null);
}

/* ── จองใหม่ 1 รายการ ครบวัน ── */
{
  const n = sandbox.buildNewBookingNotice_(
    [{ id: "BDC-1234567890", name: "Jane Doe", checkin: "2026-11-14", checkout: "2026-11-16" }],
    []
  );
  assert.equal(n.subject, "[HOH] จองใหม่ — เข้า ส. 14 พ.ย. 2569");
  assert.ok(n.body.includes("เข้า ส. 14 พ.ย. 2569 → ออก จ. 16 พ.ย. 2569 (2 คืน)"));
  assert.ok(n.body.includes("Jane Doe · #BDC-1234567890"));
  assert.ok(n.body.includes("/admin/"), "ต้องมีลิงก์หลังบ้านให้กดต่อ");
}

/* ── อีเมลไม่บอกวัน/ชื่อ: ยังต้องแจ้ง และบอกตรง ๆ ว่าไม่ทราบ ห้ามเดา ── */
{
  const n = sandbox.buildNewBookingNotice_([{ id: "MAIL-abcd1234", name: "", checkin: "", checkout: "" }], []);
  assert.ok(n, "ข้อมูลไม่ครบก็ยังต้องแจ้ง");
  assert.equal(n.subject, "[HOH] จองใหม่ — อีเมลไม่ระบุวันเข้า");
  assert.ok(n.body.includes("อีเมลไม่ระบุวันเข้า"));
  assert.ok(n.body.includes("(ยังไม่ทราบชื่อ)"));
  assert.ok(!/2569/.test(n.body), "ไม่มีวันที่ = ห้ามมีวันที่โผล่ในข้อความ");
}

/* ── หลายรายการ: หัวข้อบอกจำนวน + วันเข้าที่เจอเป็นอันแรก ── */
{
  const n = sandbox.buildNewBookingNotice_(
    [
      { id: "MAIL-1", name: "", checkin: "", checkout: "" },
      { id: "BDC-2", name: "Somchai", checkin: "2026-12-31", checkout: "2027-01-02" },
    ],
    []
  );
  assert.equal(n.subject, "[HOH] จองใหม่ 2 รายการ — เข้าวันแรก พฤ. 31 ธ.ค. 2569");
  assert.ok(n.body.includes("→ ออก ส. 2 ม.ค. 2570 (2 คืน)"), "ข้ามปีต้องคิดคืนถูก");
}

/* ── อ่านอีเมลไม่ออก: ต้องแจ้งด้วย ไม่ปล่อยเงียบ ── */
{
  const n = sandbox.buildNewBookingNotice_([], [{ subject: "Your invoice is ready" }]);
  assert.equal(n.subject, "[HOH] อ่านอีเมล Booking.com ไม่สำเร็จ 1 ฉบับ");
  assert.ok(n.body.includes("Your invoice is ready"));
}

/* ── processMessage_ ต้องรายงานว่าเป็นจองใหม่ ไม่งั้น scanBookingEmails ไม่มีอะไรจะแจ้ง ── */
{
  const appended = [];
  sandbox.appendBooking_ = (b) => { appended.push(b); };
  sandbox.findById_ = () => null;
  sandbox.findByResNo_ = () => null;
  const msg = {
    getSubject: () => "New booking - 1234567890",
    getPlainBody: () => [
      "Reservation number: 1234567890",
      "Guest name: Jane Doe",
      "Check-in: Thursday, 13 August 2026",
      "Check-out: Saturday, 15 August 2026",
    ].join("\n"),
    getBody: () => "",
    getDate: () => new Date("2026-08-01T00:00:00Z"),
    getId: () => "msg-abcdefgh",
  };
  const res = sandbox.processMessage_(msg);
  assert.equal(res.kind, "new");
  assert.equal(res.id, "BDC-1234567890");
  assert.equal(res.checkin, "2026-08-13");
  assert.equal(res.checkout, "2026-08-15");
  assert.equal(appended.length, 1, "ยังต้องบันทึกลงชีตเหมือนเดิม");

  // อีเมลที่ไม่เกี่ยวกับการจองต้องไม่ถูกนับเป็นจองใหม่
  const promo = sandbox.processMessage_({
    getSubject: () => "Rate your stay",
    getPlainBody: () => "How was it?",
    getBody: () => "",
    getDate: () => new Date(),
    getId: () => "msg-zzzzzzzz",
  });
  assert.equal(promo.kind, "skip");
  assert.equal(appended.length, 1, "อีเมลโปรโมชั่นต้องไม่สร้างแถวใหม่");
}

console.log("Booking email parser tests passed");
