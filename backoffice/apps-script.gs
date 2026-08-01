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
var ROOMS_SHEET = "Rooms";
var EXPENSES_SHEET = "Expenses";
var LABEL_DONE = "HOH-บันทึกแล้ว";
var HEADERS = ["id", "source", "name", "checkin", "checkout", "nights", "guests", "rooms", "phone", "amount", "status", "note", "created", "room_no"];
var ROOM_HEADERS = ["room", "clean", "note"];
// รายชื่อห้องจริง เรียงตามผังที่พนักงานคุ้นจาก AzHotel (แก้ชื่อ/ลำดับได้ในชีต Rooms)
var REAL_ROOMS = ["701", "702", "703", "704", "705", "706", "707-สองเตียง", "708-สองเตียง",
  "709", "710", "713", "714-จองตรง", "715-สองเตียง", "716", "717", "718",
  "จั่ว1", "จั่ว2", "จั่ว3", "จั่ว4"];
var EXP_HEADERS = ["id", "date", "category", "amount", "vendor", "method", "note", "created"];
var SITE_SHEET = "Site";
// แผงตั้งค่าเว็บ — แก้คอลัมน์ value ในแท็บ Site แล้วหน้าเว็บอัปเดตเองภายใน ~2 นาที
var SITE_DEFAULTS = [
  ["price_per_night", "800", "ราคาต่อคืน (บาท) — หน้าเว็บใช้โชว์และคำนวณราคา"],
  ["announcement_th", "", "ประกาศแถบบนหน้าแรก ภาษาไทย (เว้นว่าง = ไม่แสดง)"],
  ["announcement_en", "", "ประกาศหน้าแรก ภาษาอังกฤษ (เว้นว่าง = ไม่แสดง)"],
];
// คอลัมน์ที่หน้า /admin แก้ไขได้ผ่าน action=update
var EDITABLE = ["status", "room_no", "note", "checkin", "checkout", "amount", "name", "phone", "guests"];

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
    b.room_no || "",
  ]);
}

/* ── ชีต Rooms: รายชื่อห้อง + สถานะความสะอาด (แก้ชื่อห้องในชีตได้เลย) ── */

function getRoomsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(ROOMS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(ROOMS_SHEET);
    sh.appendRow(ROOM_HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, ROOM_HEADERS.length).setFontWeight("bold");
    // สร้างห้องตั้งต้นตามผังจริง (แก้ชื่อ/เพิ่ม/ลบ ได้เองในชีต)
    for (var i = 0; i < REAL_ROOMS.length; i++) sh.appendRow([REAL_ROOMS[i], "สะอาด", ""]);
  }
  return sh;
}

function readRooms_() {
  var sh = getRoomsSheet_();
  var values = sh.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    if (!asText_(values[i][0])) continue;
    rows.push({ room: asText_(values[i][0]), clean: asText_(values[i][1]) || "สะอาด", note: asText_(values[i][2]), _rowIndex: i + 1 });
  }
  return rows;
}

function setRoomClean_(room, clean, note) {
  var sh = getRoomsSheet_();
  var rows = readRooms_();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].room === String(room)) {
      sh.getRange(rows[i]._rowIndex, 2).setValue(clean);
      if (note !== undefined) sh.getRange(rows[i]._rowIndex, 3).setValue(note);
      return true;
    }
  }
  return false;
}

/* ── ชีต Expenses: บันทึกรายจ่าย (ค่าน้ำ ไฟ แม่บ้าน ซ่อม ฯลฯ) ── */

function getExpensesSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(EXPENSES_SHEET);
  if (!sh) {
    sh = ss.insertSheet(EXPENSES_SHEET);
    sh.appendRow(EXP_HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, EXP_HEADERS.length).setFontWeight("bold");
  }
  return sh;
}

function readExpenses_() {
  var sh = getExpensesSheet_();
  var values = sh.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    if (!asText_(values[i][0])) continue;
    var row = {};
    for (var c = 0; c < EXP_HEADERS.length; c++) row[EXP_HEADERS[c]] = asText_(values[i][c]);
    row._rowIndex = i + 1;
    rows.push(row);
  }
  return rows;
}

function appendExpense_(x) {
  var sh = getExpensesSheet_();
  var id = "EXP-" + Utilities.formatDate(new Date(), "Asia/Bangkok", "yyMMddHHmmss");
  sh.appendRow([
    id, x.date || Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd"),
    x.category || "อื่นๆ", x.amount || "", x.vendor || "", x.method || "",
    x.note || "", Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm"),
  ]);
  return id;
}

function deleteExpense_(id) {
  var rows = readExpenses_();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].id === String(id)) {
      getExpensesSheet_().deleteRow(rows[i]._rowIndex);
      return true;
    }
  }
  return false;
}

/* ── ชีต Site: แผงตั้งค่าเว็บ (ราคา/ประกาศ) แก้ได้เองไม่ต้องแตะโค้ด ── */

function getSiteSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SITE_SHEET);
  if (!sh) {
    sh = ss.insertSheet(SITE_SHEET);
    sh.appendRow(["key", "value", "คำอธิบาย (แก้เฉพาะช่อง value)"]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 3).setFontWeight("bold");
    for (var i = 0; i < SITE_DEFAULTS.length; i++) sh.appendRow(SITE_DEFAULTS[i]);
  }
  return sh;
}

function readSite_() {
  var values = getSiteSheet_().getDataRange().getValues();
  var site = {};
  for (var i = 1; i < values.length; i++) {
    var k = asText_(values[i][0]);
    if (k) site[k] = asText_(values[i][1]);
  }
  return site;
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
    var rooms = readRooms_().map(function (r) { delete r._rowIndex; return r; });
    var exps = readExpenses_().map(function (r) { delete r._rowIndex; return r; });
    return json_({ bookings: rows, rooms: rooms, expenses: exps });
  }
  // ค่าตั้งค่าเว็บ (ราคา/ประกาศ) — /api/site เรียกด้วย token ฝั่งเซิร์ฟเวอร์
  if (p.action === "site") {
    return json_({ site: readSite_() });
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
    var id = "WEB-" + Utilities.formatDate(new Date(), "Asia/Bangkok", "yyMMddHHmmss");
    appendBooking_({
      id: id,
      source: b.source || "เว็บไซต์ (จองตรง)",
      name: b.name, checkin: b.checkin, checkout: b.checkout,
      guests: b.guests, rooms: b.rooms, phone: b.phone,
      amount: b.amount, status: b.status || "รอยืนยัน", note: b.note,
      room_no: b.room_no,
    });
    return json_({ ok: true, id: id });
  }
  // แก้ไขการจองเดิมจากหน้า /admin เช่น เช็คอิน/เช็คเอาต์/ย้ายห้อง/เปลี่ยนสถานะ
  if (b.action === "update") {
    var row = findById_(b.id);
    if (!row) return json_({ error: "not-found" });
    var sh = getSheet_();
    var fields = b.fields || {};
    for (var k in fields) {
      if (EDITABLE.indexOf(k) < 0) continue;
      sh.getRange(row._rowIndex, HEADERS.indexOf(k) + 1).setValue(String(fields[k]));
    }
    return json_({ ok: true });
  }
  // อัปเดตสถานะความสะอาดของห้อง
  if (b.action === "roomclean") {
    var done = setRoomClean_(b.room, b.clean || "สะอาด", b.note);
    return json_(done ? { ok: true } : { error: "room-not-found" });
  }
  // บันทึก/ลบรายจ่าย (จากหน้า /admin แท็บ "รายจ่าย")
  if (b.action === "expadd") {
    if (!b.amount || !b.date) return json_({ error: "missing-fields" });
    var expId = appendExpense_(b);
    return json_({ ok: true, id: expId });
  }
  if (b.action === "expdel") {
    return json_(deleteExpense_(b.id) ? { ok: true } : { error: "not-found" });
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
    // หาแถวเดิมแบบหลวม ๆ ด้วย: id ตรงเป๊ะ → เทียบเฉพาะตัวเลขเลขที่จอง
    var hit = existing || (resNo ? findByResNo_(resNo) : null);
    if (hit) setStatus_(hit._rowIndex, "ยกเลิก", "ยกเลิกตามอีเมล " + fmtDate_(msg.getDate()));
    else appendBooking_({ id: id, source: "Booking.com", name: extractGuestName_(text), status: "ยกเลิก", note: "อีเมลยกเลิกแต่ไม่พบการจองเดิมในชีต (orphan) — เปิด Pulse ตรวจว่ายกเลิกรายการไหน" });
    return;
  }
  if (isModify) {
    if (existing) setStatus_(existing._rowIndex, existing.status || "ยืนยันแล้ว", "มีการแก้ไขตามอีเมล " + fmtDate_(msg.getDate()) + " — ตรวจสอบใน Extranet");
    else isNew = true; // อีเมลแก้ไขแต่ไม่มีแถวเดิม → บันทึกเป็นการจองใหม่
    if (!isNew) return;
  }

  if (existing) return; // เคยบันทึกแล้ว ไม่เพิ่มซ้ำ

  // อีเมลยุคใหม่ของ Booking.com มักไม่บอกชื่อแขก (ให้ไปดูใน Pulse)
  // → บันทึกเท่าที่มี แล้วติดสถานะ "รอเติมชื่อจาก Pulse" ไม่ปล่อยให้การจองหายเงียบ ๆ
  var dates = extractDates_(text);
  var guest = extractGuestName_(text);

  // fallback: หัวข้ออีเมลมักมีวันเช็คอิน เช่น "คุณมีการจองใหม่! วันจันทร์ที่ 10 สิงหาคม ค.ศ. 2026"
  // ใช้เป็นวันเช็คอินแบบ "คาดการณ์" — ดีกว่าปล่อยว่างจนระบบนับห้องว่างไม่ได้
  var fromSubject = false;
  if (!dates.checkin) {
    var sd = findAnyDate_(subject);
    if (sd) { dates.checkin = sd; fromSubject = true; }
  }

  var incomplete = !guest || !dates.checkin || !dates.checkout;
  var noteBits = [];
  if (fromSubject) noteBits.push("วันเช็คอินคาดจากหัวข้ออีเมล — ยืนยันวันจริง/วันออกใน Pulse");
  if (incomplete) noteBits.push("อีเมลไม่ระบุรายละเอียดครบ — เปิดแอป Pulse แล้วเติมข้อมูล (" + subject + ")");
  appendBooking_({
    id: id,
    source: "Booking.com",
    name: guest,
    checkin: dates.checkin,
    checkout: dates.checkout,
    guests: extractGuests_(text),
    rooms: extractRooms_(text),
    amount: extractAmount_(text),
    status: incomplete ? "รอเติมชื่อจาก Pulse" : "ยืนยันแล้ว",
    note: noteBits.join(" | "),
  });
}

// หาแถวจากเลขที่จองแบบเทียบเฉพาะตัวเลข (id ในชีตอาจมี prefix BDC- หรือรูปแบบต่างกัน)
function findByResNo_(resNo) {
  var digits = String(resNo).replace(/\D/g, "");
  if (!digits) return null;
  var rows = readAll_();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id || "").replace(/\D/g, "") === digits) return rows[i];
  }
  return null;
}

/* ═══════════════ สรุปงานส่งอีเมลทุกเช้า ═══════════════ */

function bahtNum_(v) {
  var n = Number(String(v == null ? "" : v).replace(/[^\d.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function fmtBaht_(n) {
  var neg = n < 0;
  var s = Math.abs(Math.round(n)).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-฿" : "฿") + s;
}

/** ส่งสรุปงาน + เงินเดือนนี้ เข้าอีเมลเจ้าของ (Trigger เรียกทุกเช้า ~08:00) */
function dailyDigest() {
  var tz = "Asia/Bangkok";
  var today = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
  var isYMD = function (s) { return /^\d{4}-\d{2}-\d{2}$/.test(s); };
  var rows = readAll_();
  var act = rows.filter(function (r) {
    return !/ยกเลิก/.test(r.status) && isYMD(r.checkin) && isYMD(r.checkout);
  });
  var notOut = function (r) { return !/เช็คเอาต์แล้ว/.test(r.status); };
  var ci = act.filter(function (r) { return r.checkin === today && notOut(r); });
  var co = act.filter(function (r) { return r.checkout === today && notOut(r); });
  var stay = act.filter(function (r) { return r.checkin <= today && today < r.checkout && notOut(r); });
  var dirty = readRooms_().filter(function (r) { return r.clean === "รอทำความสะอาด"; });

  // รายการข้อมูลไม่ครบ (ตรงกับแบนเนอร์เหลืองในหลังบ้าน): ขาดชื่อ หรือขาดวันเข้า/ออก
  var needFix = rows.filter(function (r) {
    return !/ยกเลิก/.test(r.status) && (!r.name || !isYMD(r.checkin) || !isYMD(r.checkout));
  });

  // เงินเดือนนี้ — รายรับนับตามเดือนที่เช็คอิน (ตรงกับกราฟในหลังบ้าน) หักรายจ่ายจากชีต Expenses
  var ym = today.slice(0, 7);
  var rev = 0, revCount = 0;
  rows.forEach(function (r) {
    if (/ยกเลิก/.test(r.status)) return;
    if (String(r.checkin).slice(0, 7) === ym && bahtNum_(r.amount) > 0) { rev += bahtNum_(r.amount); revCount++; }
  });
  var expTotal = 0, expCount = 0;
  readExpenses_().forEach(function (x) {
    if (String(x.date).slice(0, 7) === ym) { expTotal += bahtNum_(x.amount); expCount++; }
  });
  var profit = rev - expTotal;

  var L = [];
  L.push("สรุปงาน House of Happiness — " + Utilities.formatDate(new Date(), tz, "d MMM yyyy"));
  L.push("");
  L.push("== งานวันนี้ ==");
  L.push("เช็คอินวันนี้: " + ci.length + " รายการ");
  ci.forEach(function (r) { L.push("  - " + (r.name || "(รอเติมชื่อ)") + (r.room_no ? " | ห้อง " + r.room_no : " | ยังไม่จัดห้อง") + " | " + r.source); });
  L.push("เช็คเอาต์วันนี้: " + co.length + " รายการ");
  co.forEach(function (r) { L.push("  - " + (r.name || "(รอเติมชื่อ)") + (r.room_no ? " | ห้อง " + r.room_no : "")); });
  L.push("กำลังเข้าพักคืนนี้: " + stay.length + " ห้อง");
  L.push("ห้องรอทำความสะอาด: " + (dirty.length ? dirty.map(function (r) { return r.room; }).join(", ") : "ไม่มี"));
  L.push("");
  L.push("== เงินเดือนนี้ (" + ym + ") ==");
  L.push("รายรับตามยอดจอง: " + fmtBaht_(rev) + (revCount ? " (" + revCount + " การจอง)" : " — ยังไม่มีการจองที่ใส่ยอดเงิน"));
  L.push("รายจ่าย: " + fmtBaht_(expTotal) + (expCount ? " (" + expCount + " รายการ)" : ""));
  L.push("กำไร: " + fmtBaht_(profit));
  if (needFix.length) {
    L.push("");
    L.push("== ข้อมูลค้าง ==");
    L.push("รายการรอเติมข้อมูล (ชื่อ/วันที่): " + needFix.length + " รายการ — เปิดหลังบ้านแตะแบนเนอร์เหลือง เทียบกับแอป Pulse");
    needFix.slice(0, 8).forEach(function (r) {
      L.push("  - #" + r.id + (isYMD(r.checkin) ? " เข้า " + r.checkin : " (ไม่ทราบวันเข้า)") + (isYMD(r.checkout) ? "" : " ขาดวันออก") + (r.name ? "" : " ขาดชื่อ"));
    });
    if (needFix.length > 8) L.push("  ...และอีก " + (needFix.length - 8) + " รายการ");
  }
  L.push("");
  L.push("เปิดหลังบ้าน: https://houseofhappinessbangkok.com/admin/");

  MailApp.sendEmail(
    Session.getEffectiveUser().getEmail(),
    "[HOH] เช็คอิน " + ci.length + " · เช็คเอาต์ " + co.length + " · พัก " + stay.length + " ห้อง" + (needFix.length ? " · ค้างเติม " + needFix.length : ""),
    L.join("\n")
  );
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
  // รองรับ "ค.ศ./พ.ศ." คั่นระหว่างเดือนกับปี เช่น "10 สิงหาคม ค.ศ. 2026"
  // (รูปแบบหัวข้ออีเมล Booking.com ภาษาไทย — เดิมอ่านไม่ได้เลยเพราะไม่รองรับตัวคั่นนี้)
  m = s.match(/(\d{1,2})\s+([A-Za-z฀-๿.]+?)\s+(?:ค\.?ศ\.?|พ\.?ศ\.?)?\s*(\d{4})/);
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

// หา "วันที่แรกที่เจอ" ในข้อความสั้น ๆ (ใช้กับหัวข้ออีเมล) — คืน YYYY-MM-DD หรือ ""
function findAnyDate_(text) {
  var s = String(text || "");
  var m = s.match(/\d{4}-\d{2}-\d{2}/);
  if (m) return parseDate_(m[0]);
  m = s.match(/\d{1,2}\s+[A-Za-z฀-๿.]+\s+(?:ค\.?ศ\.?|พ\.?ศ\.?)?\s*\d{4}/);
  if (m) return parseDate_(m[0]);
  m = s.match(/\d{1,2}\/\d{1,2}\/\d{4}/);
  if (m) return parseDate_(m[0]);
  return "";
}

function pad2_(n) { return (n < 10 ? "0" : "") + n; }
function fmtDate_(d) { return Utilities.formatDate(d, "Asia/Bangkok", "yyyy-MM-dd HH:mm"); }

/* ═══════════════ ติดตั้ง Trigger (รันครั้งเดียว) ═══════════════ */

/** รันฟังก์ชันนี้ 1 ครั้งจากเมนู Run:
 *  - สแกนอีเมล Booking.com ทุก 30 นาที
 *  - ส่งสรุปงานเข้าอีเมลทุกเช้า ~08:00 (ตั้ง timezone โปรเจกต์เป็น Bangkok ก่อน:
 *    Project Settings ⚙️ → Time zone → (GMT+07:00) Bangkok)
 */
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === "scanBookingEmails" || h === "dailyDigest") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("scanBookingEmails").timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger("dailyDigest").timeBased().everyDays(1).atHour(8).create();
}

/** ทดสอบด้วยมือ: รัน scanBookingEmails ทันที แล้วเปิดชีตดูผล */
function testScanNow() {
  scanBookingEmails();
}

/** รันมือ 1 ครั้ง (ถ้าชีต Rooms เดิมยังเป็น 101-115):
 *  เขียนรายชื่อห้องใหม่ตามผังจริง (REAL_ROOMS ด้านบน) ทับของเดิมทั้งแท็บ
 *  สถานะความสะอาด/โน้ตของห้องที่ชื่อตรงกันจะถูกเก็บไว้ */
function applyRealRoomList() {
  var sh = getRoomsSheet_();
  var old = {};
  readRooms_().forEach(function (r) { old[r.room] = r; });
  sh.clearContents();
  sh.appendRow(ROOM_HEADERS);
  sh.getRange(1, 1, 1, ROOM_HEADERS.length).setFontWeight("bold");
  for (var i = 0; i < REAL_ROOMS.length; i++) {
    var prev = old[REAL_ROOMS[i]] || {};
    sh.appendRow([REAL_ROOMS[i], prev.clean || "สะอาด", prev.note || ""]);
  }
  Logger.log("อัปเดตรายชื่อห้องเป็นผังจริง " + REAL_ROOMS.length + " ห้องแล้ว");
}

/** ซ่อมข้อมูลย้อนหลัง — รันด้วยมือ 1 ครั้งหลังอัปเดตสคริปต์เป็น v4:
 *  ไล่อีเมลที่เคยสแกนไปแล้ว (label HOH-บันทึกแล้ว) มาเติม "วันเช็คอิน"
 *  ให้แถวที่วันที่ยังว่าง โดยอ่านจากหัวข้ออีเมล (เช่น "...วันจันทร์ที่ 10 สิงหาคม ค.ศ. 2026")
 *  เติมเฉพาะช่องที่ว่างเท่านั้น ไม่ทับข้อมูลที่กรอกมือไว้แล้ว */
function repairMissingDates() {
  var threads = GmailApp.search('label:"' + LABEL_DONE + '" from:booking.com', 0, 100);
  var sh = getSheet_();
  var fixed = 0;
  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (msg) {
      var subject = msg.getSubject() || "";
      var text = subject + "\n" + (msg.getPlainBody() || "");
      var resNo = extractReservationNo_(text);
      if (!resNo) return;
      var row = findByResNo_(resNo);
      if (!row || /^\d{4}-\d{2}-\d{2}$/.test(row.checkin)) return; // ไม่มีแถว หรือมีวันที่แล้ว → ข้าม
      var d = extractDates_(text);
      var ciDate = d.checkin || findAnyDate_(subject);
      if (!ciDate) return;
      sh.getRange(row._rowIndex, HEADERS.indexOf("checkin") + 1).setValue(ciDate);
      if (d.checkout && !/^\d{4}-\d{2}-\d{2}$/.test(row.checkout)) {
        sh.getRange(row._rowIndex, HEADERS.indexOf("checkout") + 1).setValue(d.checkout);
      }
      var cell = sh.getRange(row._rowIndex, HEADERS.indexOf("note") + 1);
      var old = asText_(cell.getValue());
      var tag = "เติมวันเช็คอินจากหัวข้ออีเมล — ยืนยันวันจริง/วันออกใน Pulse";
      if (old.indexOf(tag) < 0) cell.setValue(old ? old + " | " + tag : tag);
      fixed++;
    });
  });
  Logger.log("เติมวันที่ให้ " + fixed + " รายการ");
}
