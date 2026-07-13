/************************************************************************
 * House of Happiness — ระบบหลังบ้าน (Google Apps Script)
 * วางสคริปต์นี้ใน Google Sheets: Extensions → Apps Script
 *
 * หน้าที่:
 *  1) scanBookingEmails() — อ่านอีเมลยืนยันการจองจาก Booking.com ใน Gmail
 *     อัตโนมัติ แล้วบันทึกลงชีต "Bookings" (ตั้ง Trigger ทุก 30 นาที)
 *  2) doPost() — รับคำขอจองตรงจากเว็บไซต์ houseofhapiness (ผ่าน /api/book)
 *  3) doGet()  — ส่งรายการจองทั้งหมดเป็น JSON ให้หน้า /admin (ผ่าน /api/data)
 *
 * วิธีติดตั้งอยู่ใน backoffice/SETUP.md
 ************************************************************************/

// ⚠️ ตั้งรหัสลับของคุณเอง (ยาว ๆ เดายาก) — ต้องตรงกับ SHEET_TOKEN บน Vercel
var TOKEN = "เปลี่ยนรหัสลับตรงนี้";

var SHEET_NAME = "Bookings";
var LABEL_DONE = "HOH-บันทึกแล้ว";
var HEADERS = ["id", "source", "name", "checkin", "checkout", "nights", "guests", "rooms", "phone", "amount", "status", "note", "created"];

/* ═══════════════ ชีต ═══════════════ */

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sh;
}

function readAll_() {
  var sh = getSheet_();
  var values = sh.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = {};
    for (var c = 0; c < HEADERS.length; c++) row[HEADERS[c]] = asText_(values[i][c]);
    row._rowIndex = i + 1;
    rows.push(row);
  }
  return rows;
}

function asText_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, "Asia/Bangkok", "yyyy-MM-dd");
  }
  return String(v == null ? "" : v).trim();
}

function appendBooking_(b) {
  var sh = getSheet_();
  var nights = "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(b.checkin) && /^\d{4}-\d{2}-\d{2}$/.test(b.checkout)) {
    nights = Math.round((new Date(b.checkout) - new Date(b.checkin)) / 86400000);
  }
  sh.appendRow([
    b.id || "", b.source || "", b.name || "", b.checkin || "", b.checkout || "",
    nights, b.guests || "", b.rooms || "", b.phone || "", b.amount || "",
    b.status || "", b.note || "",
    Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm"),
  ]);
}

function findById_(id) {
  if (!id) return null;
  var rows = readAll_();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].id === String(id)) return rows[i];
  }
  return null;
}

function setStatus_(rowIndex, status, extraNote) {
  var sh = getSheet_();
  sh.getRange(rowIndex, HEADERS.indexOf("status") + 1).setValue(status);
  if (extraNote) {
    var cell = sh.getRange(rowIndex, HEADERS.indexOf("note") + 1);
    var old = asText_(cell.getValue());
    cell.setValue(old ? old + " | " + extraNote : extraNote);
  }
}

/* ═══════════════ Web App: GET = ส่งข้อมูล, POST = รับจองตรง ═══════════════ */

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.token !== TOKEN) return json_({ error: "unauthorized" });
  if (p.action === "list") {
    var rows = readAll_().map(function (r) { delete r._rowIndex; return r; });
    return json_({ bookings: rows });
  }
  return json_({ error: "unknown-action" });
}

function doPost(e) {
  var b;
  try {
    b = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ error: "bad-json" });
  }
  if (b.token !== TOKEN) return json_({ error: "unauthorized" });
  if (b.action === "add") {
    appendBooking_({
      id: "WEB-" + Utilities.formatDate(new Date(), "Asia/Bangkok", "yyMMddHHmmss"),
      source: b.source || "เว็บไซต์ (จองตรง)",
      name: b.name, checkin: b.checkin, checkout: b.checkout,
      guests: b.guests, rooms: b.rooms, phone: b.phone,
      amount: b.amount, status: b.status || "รอยืนยัน", note: b.note,
    });
    return json_({ ok: true });
  }
  return json_({ error: "unknown-action" });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ═══════════════ อ่านอีเมล Booking.com อัตโนมัติ ═══════════════ */

/**
 * สแกนอีเมลจาก Booking.com ย้อนหลัง 7 วัน (เฉพาะที่ยังไม่เคยบันทึก)
 * - อีเมลจองใหม่  → เพิ่มแถวในชีต
 * - อีเมลยกเลิก   → เปลี่ยนสถานะแถวเดิมเป็น "ยกเลิก"
 * - อีเมลแก้ไข    → เพิ่มหมายเหตุให้แถวเดิม (กันข้อมูลเพี้ยน ไปแก้เองในชีต)
 * - อ่านไม่สำเร็จ → บันทึกแถวพร้อมหัวข้ออีเมลไว้ให้ตรวจเอง (ไม่มีอะไรหายเงียบ ๆ)
 */
function scanBookingEmails() {
  var label = GmailApp.getUserLabelByName(LABEL_DONE) || GmailApp.createLabel(LABEL_DONE);
  var threads = GmailApp.search('from:(booking.com) newer_than:7d -label:"' + LABEL_DONE + '"');

  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (msg) {
      try { processMessage_(msg); }
      catch (err) {
        appendBooking_({
          id: "MAIL-" + msg.getId().slice(-8),
          source: "Booking.com (อ่านไม่สำเร็จ)",
          name: "", status: "ตรวจสอบเอง",
          note: "หัวข้อ: " + msg.getSubject() + " | error: " + err,
        });
      }
    });
    thread.addLabel(label);
  });
}

function processMessage_(msg) {
  var subject = msg.getSubject() || "";
  var body = msg.getPlainBody() || "";
  var text = subject + "\n" + body;

  // ข้ามอีเมลที่ไม่ใช่เรื่องการจอง (โปรโมชั่น, รีวิว, ใบแจ้งหนี้ ฯลฯ)
  var isNew = /new booking|new reservation|การจองใหม่|คุณมีการจองใหม่/i.test(subject);
  var isCancel = /cancel|ยกเลิก/i.test(subject);
  var isModify = /modif|change|เปลี่ยนแปลง|แก้ไข/i.test(subject);
  if (!isNew && !isCancel && !isModify) return;

  var resNo = extractReservationNo_(text);
  var id = resNo ? "BDC-" + resNo : "MAIL-" + msg.getId().slice(-8);
  var existing = findById_(id);

  if (isCancel) {
    if (existing) setStatus_(existing._rowIndex, "ยกเลิก", "ยกเลิกตามอีเมล " + fmtDate_(msg.getDate()));
    else appendBooking_({ id: id, source: "Booking.com", name: extractGuestName_(text), status: "ยกเลิก", note: "อีเมลยกเลิก (ไม่พบการจองเดิมในชีต)" });
    return;
  }
  if (isModify) {
    if (existing) setStatus_(existing._rowIndex, existing.status || "ยืนยันแล้ว", "มีการแก้ไขตามอีเมล " + fmtDate_(msg.getDate()) + " — ตรวจสอบใน Extranet");
    else isNew = true; // อีเมลแก้ไขแต่ไม่มีแถวเดิม → บันทึกเป็นการจองใหม่
    if (!isNew) return;
  }

  if (existing) return; // เคยบันทึกแล้ว ไม่เพิ่มซ้ำ

  var dates = extractDates_(text);
  appendBooking_({
    id: id,
    source: "Booking.com",
    name: extractGuestName_(text),
    checkin: dates.checkin,
    checkout: dates.checkout,
    guests: extractGuests_(text),
    rooms: extractRooms_(text),
    amount: extractAmount_(text),
    status: "ยืนยันแล้ว",
    note: dates.checkin ? "" : "อ่านวันที่จากอีเมลไม่ได้ — เปิดอีเมล/Extranet ตรวจอีกครั้ง (" + subject + ")",
  });
}

/* ── ตัวช่วยสกัดข้อมูลจากเนื้ออีเมล (รองรับไทย/อังกฤษหลายรูปแบบ) ── */

function extractReservationNo_(text) {
  var m = text.match(/(?:reservation(?:\s+number)?|booking number|confirmation number|หมายเลขการจอง|เลขที่การจอง)[^\d]{0,30}(\d{9,13})/i);
  if (m) return m[1];
  m = text.match(/\b(\d{10})\b/); // เลข 10 หลักโดด ๆ มักเป็นเลขการจอง
  return m ? m[1] : "";
}

function extractGuestName_(text) {
  var m = text.match(/(?:guest name|booker|booked by|ชื่อผู้เข้าพัก|ชื่อผู้จอง)\s*[:：]?\s*([^\n\r]{2,80})/i);
  return m ? m[1].trim() : "";
}

function extractGuests_(text) {
  var m = text.match(/(\d+)\s*(?:adults?|guests?|ผู้ใหญ่|ผู้เข้าพัก|ท่าน)/i);
  return m ? m[1] : "";
}

function extractRooms_(text) {
  var m = text.match(/(\d+)\s*(?:rooms?|units?|ห้อง)/i);
  return m ? m[1] : "";
}

function extractAmount_(text) {
  var m = text.match(/(?:total(?:\s+price)?|ราคารวม|ยอดรวม)[^\d฿]{0,20}(?:THB|฿)?\s*([\d,]+(?:\.\d{2})?)/i);
  return m ? m[1] : "";
}

function extractDates_(text) {
  var ci = matchDate_(text, /(?:check[\s-]?in|arrival|เช็คอิน|วันเข้าพัก)\s*[:：]?\s*([^\n\r]{4,60})/i);
  var co = matchDate_(text, /(?:check[\s-]?out|departure|เช็คเอาต์|เช็คเอาท์|วันออก)\s*[:：]?\s*([^\n\r]{4,60})/i);
  return { checkin: ci, checkout: co };
}

function matchDate_(text, re) {
  var m = text.match(re);
  return m ? parseDate_(m[1]) : "";
}

// แปลงวันที่หลายรูปแบบ → YYYY-MM-DD: "2026-07-13", "13 July 2026", "Sunday, 13 July 2026", "13 ก.ค. 2569", "13/07/2026"
function parseDate_(s) {
  s = String(s).trim();
  var m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + "-" + m[2] + "-" + m[3];

  var months = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    "ม.ค": 1, "ก.พ": 2, "มี.ค": 3, "เม.ย": 4, "พ.ค": 5, "มิ.ย": 6,
    "ก.ค": 7, "ส.ค": 8, "ก.ย": 9, "ต.ค": 10, "พ.ย": 11, "ธ.ค": 12,
    "มกราคม": 1, "กุมภาพันธ์": 2, "มีนาคม": 3, "เมษายน": 4, "พฤษภาคม": 5, "มิถุนายน": 6,
    "กรกฎาคม": 7, "สิงหาคม": 8, "กันยายน": 9, "ตุลาคม": 10, "พฤศจิกายน": 11, "ธันวาคม": 12,
  };
  m = s.match(/(\d{1,2})\s+([A-Za-z฀-๿.]+)\s+(\d{4})/);
  if (m) {
    var key = m[2].toLowerCase().replace(/\.$/, "");
    var mo = months[key.slice(0, 3)] || months[key];
    if (mo) {
      var y = Number(m[3]);
      if (y > 2400) y -= 543; // พ.ศ. → ค.ศ.
      return y + "-" + pad2_(mo) + "-" + pad2_(Number(m[1]));
    }
  }
  m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    var y2 = Number(m[3]);
    if (y2 > 2400) y2 -= 543;
    return y2 + "-" + pad2_(Number(m[2])) + "-" + pad2_(Number(m[1]));
  }
  return "";
}

function pad2_(n) { return (n < 10 ? "0" : "") + n; }
function fmtDate_(d) { return Utilities.formatDate(d, "Asia/Bangkok", "yyyy-MM-dd HH:mm"); }

/* ═══════════════ ติดตั้ง Trigger (รันครั้งเดียว) ═══════════════ */

/** รันฟังก์ชันนี้ 1 ครั้งจากเมนู Run เพื่อให้สแกนอีเมลอัตโนมัติทุก 30 นาที */
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "scanBookingEmails") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("scanBookingEmails").timeBased().everyMinutes(30).create();
}

/** ทดสอบด้วยมือ: รัน scanBookingEmails ทันที แล้วเปิดชีตดูผล */
function testScanNow() {
  scanBookingEmails();
}
