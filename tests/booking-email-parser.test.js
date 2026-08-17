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

console.log("Booking email parser tests passed");
