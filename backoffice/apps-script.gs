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
  ["price_per_night", "700", "ราคาห้อง Standard (บาท/คืน) — หน้าเว็บใช้เป็นราคาเริ่มต้นที่โชว์"],
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
  var parsed = parseBookingEmail_(subject, msg.getPlainBody() || "");
  if (!parsed.type) return; // โปรโมชั่น, รีวิว, ใบแจ้งหนี้ ฯลฯ

  var resNo = parsed.reservationNo;
  var id = resNo ? "BDC-" + resNo : "MAIL-" + msg.getId().slice(-8);
  var existing = findById_(id) || (resNo ? findByResNo_(resNo) : null);

  if (parsed.type === "cancel") {
    if (existing) {
      setStatus_(existing._rowIndex, "ยกเลิก", "ยกเลิกตามอีเมล " + fmtDate_(msg.getDate()));
    } else {
      appendBooking_({
        id: id, source: "Booking.com", name: parsed.name, status: "ยกเลิก",
        note: "อีเมลยกเลิกแต่ไม่พบการจองเดิมในชีต (orphan) — เปิด Pulse ตรวจว่ายกเลิกรายการไหน",
      });
    }
    return;
  }

  // อีเมลซ้ำและอีเมลแก้ไขช่วยเติมเฉพาะช่องที่ยังว่าง โดยไม่ทับค่าที่พนักงานแก้เอง
  if (existing) {
    var filled = backfillBooking_(existing, parsed);
    var resolved = isBookingComplete_(existing);
    var status = resolved && /รอเติม/.test(existing.status) ? "ยืนยันแล้ว" : (existing.status || "ยืนยันแล้ว");
    if (parsed.type === "modify" || filled.length) {
      var action = parsed.type === "modify" ? "มีการแก้ไขตามอีเมล " : "เติมข้อมูลจากอีเมลซ้ำ ";
      var detail = filled.length ? " (เติม: " + filled.join(", ") + ")" : "";
      setStatus_(existing._rowIndex, status, action + fmtDate_(msg.getDate()) + detail);
    }
    return;
  }

  // อีเมลแก้ไขแต่ยังไม่มีแถวเดิม: เก็บเป็นรายการใหม่เพื่อไม่ให้การจองหายเงียบ ๆ
  var incomplete = !parsed.name || !parsed.checkin || !parsed.checkout;
  var noteBits = [];
  if (parsed.checkinFromSubject) noteBits.push("วันเช็คอินคาดจากหัวข้ออีเมล — ยืนยันวันจริง/วันออกใน Pulse");
  if (incomplete) noteBits.push("อีเมลไม่ระบุรายละเอียดครบ — เปิดแอป Pulse แล้วเติมข้อมูล (" + subject + ")");
  if (parsed.type === "modify") noteBits.push("สร้างจากอีเมลแก้ไข เพราะไม่พบรายการเดิมในชีต");

  appendBooking_({
    id: id,
    source: "Booking.com",
    name: parsed.name,
    checkin: parsed.checkin,
    checkout: parsed.checkout,
    guests: parsed.guests,
    rooms: parsed.rooms,
    amount: parsed.amount,
    status: incomplete ? "รอเติมชื่อจาก Pulse" : "ยืนยันแล้ว",
    note: noteBits.join(" | "),
  });
}

/**
 * สแกนอีเมลเก่าย้อนหลัง 365 วันเพื่อซ่อมรายการ Booking.com ที่ข้อมูลไม่ครบ
 * - ต้องกด Run เองเท่านั้น (ไม่มี Trigger)
 * - เติมเฉพาะช่องว่างและไม่สร้างแถวใหม่ ไม่ทับค่าที่พนักงานแก้ไว้
 * - ไม่ติด/ลบ label และไม่เปลี่ยนสถานะยกเลิก
 */
function repairIncompleteBookingsFromEmails() {
  var rows = readAll_();
  var pending = {};
  rows.forEach(function (row) {
    var resNo = String(row.id || "").replace(/\D/g, "");
    if (resNo && !/ยกเลิก/.test(row.status) && !isBookingComplete_(row)) pending[resNo] = row;
  });

  var summary = { messages: 0, matched: 0, updatedBookings: 0, filledFields: 0 };
  var threads = GmailApp.search('from:(booking.com) newer_than:365d', 0, 500);
  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (msg) {
      summary.messages++;
      var parsed = parseBookingEmail_(msg.getSubject() || "", msg.getPlainBody() || "");
      var row = parsed.reservationNo ? pending[parsed.reservationNo] : null;
      if (!row || parsed.type === "cancel") return;
      summary.matched++;
      var filled = backfillBooking_(row, parsed);
      if (!filled.length) return;
      summary.updatedBookings++;
      summary.filledFields += filled.length;
      var status = isBookingComplete_(row) && /รอเติม/.test(row.status) ? "ยืนยันแล้ว" : (row.status || "ยืนยันแล้ว");
      setStatus_(row._rowIndex, status, "ซ่อมข้อมูลจากอีเมลเก่า " + fmtDate_(msg.getDate()) + " (เติม: " + filled.join(", ") + ")");
      row.status = status;
    });
  });
  Logger.log(JSON.stringify(summary));
  return summary;
}

function backfillBooking_(row, parsed) {
  var sh = getSheet_();
  var filled = [];
  var fields = {
    name: parsed.name,
    checkin: parsed.checkin,
    checkout: parsed.checkout,
    guests: parsed.guests,
    rooms: parsed.rooms,
    amount: parsed.amount,
  };

  Object.keys(fields).forEach(function (key) {
    var value = fields[key];
    if (!value || asText_(row[key])) return;
    sh.getRange(row._rowIndex, HEADERS.indexOf(key) + 1).setValue(value);
    row[key] = String(value);
    filled.push(key);
  });

  if (!asText_(row.nights) && /^\d{4}-\d{2}-\d{2}$/.test(row.checkin) && /^\d{4}-\d{2}-\d{2}$/.test(row.checkout)) {
    var nights = Math.round((new Date(row.checkout) - new Date(row.checkin)) / 86400000);
    if (nights > 0) {
      sh.getRange(row._rowIndex, HEADERS.indexOf("nights") + 1).setValue(nights);
      row.nights = String(nights);
      filled.push("nights");
    }
  }
  return filled;
}

function isBookingComplete_(row) {
  return !!(asText_(row.name) && /^\d{4}-\d{2}-\d{2}$/.test(asText_(row.checkin)) && /^\d{4}-\d{2}-\d{2}$/.test(asText_(row.checkout)));
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

function parseBookingEmail_(subject, body) {
  var cleanSubject = normalizeEmailText_(subject);
  var text = normalizeEmailText_(cleanSubject + "\n" + (body || ""));
  var type = "";

  // ให้ยกเลิกมีลำดับสูงสุด เพราะหัวข้อบางแบบมีทั้ง "booking" และ "cancelled"
  if (/cancel(?:led|lation)?|ยกเลิก/i.test(cleanSubject)) type = "cancel";
  else if (/modif(?:ied|ication)?|booking changed|reservation changed|change(?:d)?\s+(?:to\s+)?(?:booking|reservation)|เปลี่ยนแปลง|แก้ไข/i.test(cleanSubject)) type = "modify";
  else if (/new booking|new reservation|reservation confirmed|booking confirmation|การจองใหม่|คุณมีการจองใหม่|ยืนยันการจอง/i.test(cleanSubject)) type = "new";

  var dates = extractDates_(text);
  var fromSubject = false;
  if (type === "new" && !dates.checkin) {
    var subjectDate = findAnyDate_(cleanSubject);
    if (subjectDate) {
      dates.checkin = subjectDate;
      fromSubject = true;
    }
  }

  return {
    type: type,
    reservationNo: extractReservationNo_(text),
    name: extractGuestName_(text),
    checkin: dates.checkin,
    checkout: dates.checkout,
    guests: extractGuests_(text),
    rooms: extractRooms_(text),
    amount: extractAmount_(text),
    checkinFromSubject: fromSubject,
  };
}

function normalizeEmailText_(text) {
  return String(text == null ? "" : text)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(function (line) { return line.replace(/[ \t]+/g, " ").trim(); })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractReservationNo_(text) {
  var m = String(text).match(/(?:reservation(?:\s+(?:number|no\.?))?|booking(?:\s+(?:number|no\.?))?|confirmation(?:\s+(?:number|no\.?))?|หมายเลขการจอง|เลขที่การจอง|รหัสการจอง)\s*[:#：-]?\s*([0-9][0-9\s-]{7,20})/i);
  if (m) {
    var labeled = m[1].replace(/\D/g, "");
    if (labeled.length >= 9 && labeled.length <= 13) return labeled;
  }

  // fallback เฉพาะหัวข้ออีเมล เพื่อลดการหยิบเบอร์โทร/ยอดเงิน 10 หลักจากเนื้อหา
  var subject = String(text || "").split("\n")[0];
  m = subject.match(/(?:^|\D)(\d{9,13})(?:\D|$)/);
  return m ? m[1] : "";
}

function extractGuestName_(text) {
  var m = String(text).match(/(?:guest name|booker|booked by|ชื่อผู้เข้าพัก|ชื่อผู้จอง|ชื่อลูกค้า)\s*[:：-]?\s*([^\n\r|]{2,100})/i);
  if (!m) return "";
  return m[1]
    .replace(/\s+(?:check[\s-]?(?:in|out)|arrival|departure|เช[็๊]กอิน|เช[็๊]กเอา(?:ต์|ท์)).*$/i, "")
    .trim();
}

function extractGuests_(text) {
  var s = String(text);
  var m = s.match(/(?:number of guests|guests?|adults?|จำนวนผู้เข้าพัก|ผู้เข้าพัก|ผู้ใหญ่)\s*[:：-]?\s*(\d+)/i);
  if (!m) m = s.match(/(\d+)\s*(?:adults?|guests?|ผู้ใหญ่|ผู้เข้าพัก|ท่าน)(?:\b|$)/i);
  return m ? m[1] : "";
}

function extractRooms_(text) {
  var s = String(text);
  var m = s.match(/(?:number of rooms|rooms?|units?|จำนวนห้อง|ห้องพัก)\s*[:：-]?\s*(\d+)/i);
  if (!m) m = s.match(/(\d+)\s*(?:rooms?|units?|ห้อง)(?:\b|$)/i);
  return m ? m[1] : "";
}

function extractAmount_(text) {
  var m = String(text).match(/(?:total(?:\s+price)?|booking total|price|ราคารวม|ยอดรวม|ยอดชำระ)\s*[:：-]?\s*(?:THB|฿)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:THB|฿)?/i);
  return m ? m[1] : "";
}

function extractDates_(text) {
  var s = String(text);
  var ci = matchDate_(s, /(?:check[\s-]?in|arrival(?:\s+date)?|เช็คอิน|เช็กอิน|วันที่เช็คอิน|วันที่เช็กอิน|วันเข้าพัก)\s*[:：-]?\s*([^\n\r]{4,100})/i);
  var co = matchDate_(s, /(?:check[\s-]?out|departure(?:\s+date)?|เช็คเอาต์|เช็คเอาท์|เช็กเอาต์|เช็กเอาท์|วันที่ออก|วันออก)\s*[:：-]?\s*([^\n\r]{4,100})/i);

  // รูปแบบบรรทัดเดียว เช่น "Stay: 15 August 2026 - 17 August 2026"
  if (!ci || !co) {
    var range = s.match(/(?:stay|booking dates?|reservation dates?|ระยะเวลาเข้าพัก|ช่วงเข้าพัก|วันที่เข้าพัก)\s*[:：-]?\s*([^\n\r]{8,180})/i);
    if (range) {
      var found = findDateTokens_(range[1]);
      if (!ci && found.length > 0) ci = found[0];
      if (!co && found.length > 1) co = found[1];
    }
  }
  return { checkin: ci, checkout: co };
}

function matchDate_(text, re) {
  var m = text.match(re);
  return m ? parseDate_(m[1]) : "";
}

function findDateTokens_(text) {
  var s = String(text || "");
  var patterns = [
    /\d{4}-\d{1,2}-\d{1,2}/g,
    /\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}/g,
    /\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-zก-๙.]+\s+(?:(?:ค|พ)\.?ศ\.?\s*)?\d{4}/gi,
    /[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?[,]?\s+\d{4}/gi,
  ];
  var hits = [];
  patterns.forEach(function (re) {
    var m;
    while ((m = re.exec(s)) !== null) {
      var value = parseDate_(m[0]);
      if (value) hits.push({ index: m.index, value: value });
    }
  });
  hits.sort(function (a, b) { return a.index - b.index; });
  var result = [];
  hits.forEach(function (hit) {
    if (result.indexOf(hit.value) < 0) result.push(hit.value);
  });
  return result;
}

// แปลงวันที่หลายรูปแบบเป็น YYYY-MM-DD พร้อมตรวจว่าวันนั้นมีอยู่จริง
function parseDate_(value) {
  var s = normalizeEmailText_(value).replace(/,/g, " ");
  var m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return validYmd_(Number(m[1]), Number(m[2]), Number(m[3]));

  m = s.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
  if (m) return validYmd_(normalYear_(Number(m[3])), Number(m[2]), Number(m[1]));

  m = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-zก-๙.]+)\s+(?:(?:ค|พ)\.?ศ\.?\s*)?(\d{4})/i);
  if (m) {
    var month = monthNumber_(m[2]);
    return month ? validYmd_(normalYear_(Number(m[3])), month, Number(m[1])) : "";
  }

  m = s.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\d{4})/i);
  if (m) {
    var monthFirst = monthNumber_(m[1]);
    return monthFirst ? validYmd_(normalYear_(Number(m[3])), monthFirst, Number(m[2])) : "";
  }
  return "";
}

function monthNumber_(name) {
  var months = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
    may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
    sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
    "มค": 1, "กพ": 2, "มีค": 3, "เมย": 4, "พค": 5, "มิย": 6,
    "กค": 7, "สค": 8, "กย": 9, "ตค": 10, "พย": 11, "ธค": 12,
    "มกราคม": 1, "กุมภาพันธ์": 2, "มีนาคม": 3, "เมษายน": 4, "พฤษภาคม": 5, "มิถุนายน": 6,
    "กรกฎาคม": 7, "สิงหาคม": 8, "กันยายน": 9, "ตุลาคม": 10, "พฤศจิกายน": 11, "ธันวาคม": 12,
  };
  var key = String(name || "").toLowerCase().replace(/\./g, "");
  return months[key] || months[key.slice(0, 3)] || 0;
}

function normalYear_(year) {
  return year > 2400 ? year - 543 : year;
}

function validYmd_(year, month, day) {
  if (year < 2000 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return "";
  var d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return "";
  return year + "-" + pad2_(month) + "-" + pad2_(day);
}

// หาเฉพาะวันที่ในหัวข้ออีเมล ใช้เป็น check-in แบบคาดการณ์เมื่อไม่มี label
function findAnyDate_(text) {
  var found = findDateTokens_(text);
  return found.length ? found[0] : "";
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
