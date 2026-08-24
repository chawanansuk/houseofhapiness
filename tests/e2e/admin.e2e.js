/* E2E หลังบ้าน 2.0 — รันด้วยเบราว์เซอร์จริง (Playwright)
   เสิร์ฟไฟล์จาก repo + จำลอง /api/data และ /api/update (backend จิ๋วที่ apply การแก้จริง)
   ตรวจ: ล็อกอิน/บทบาท · คิวงานวันนี้ (เช็คอินโดนบล็อกถ้าห้องสกปรก) · payload ทุก action
   ตรงกับของเดิม · โหมดจัดห้อง · รายการจอง (ซ่อนยกเลิก/ค้นหา) · ธีม · มือถือ tabbar
   วิธีรัน:  cd tests/e2e && npm install && node admin.e2e.js */
const http = require("http");
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");

const today = new Date().toISOString().slice(0, 10);
const d = (off) => new Date(Date.parse(today) + off * 86400000).toISOString().slice(0, 10);
const mkB = (id, name, ciOff, coOff, source, status, extra = {}) => ({
  id, source, name, checkin: ciOff === null ? "" : d(ciOff), checkout: coOff === null ? "" : d(coOff),
  nights: (ciOff !== null && coOff !== null) ? coOff - ciOff : "", guests: "2", rooms: 1, phone: "",
  amount: "2,400", status, note: "", created: "", room_no: "", ...extra,
});
// backend จิ๋ว: state ถูกแก้จริงเมื่อได้รับ /api/update — flow ต่อเนื่องเหมือนระบบจริง
let DB;
function resetDB(){
  DB = {
    rooms: ["701","702","703","704","705","706","707twin","708twin","709","710","713","714-จองตรง","715twin","716","717","718","งิ้ว2","งิ้ว3"]
      .map((r) => ({ room: r, clean: (r === "716" || r === "งิ้ว3") ? "รอทำความสะอาด" : "สะอาด", note: "" })),
    bookings: [
      mkB("BDC-2001", "Amara Okafor", 0, 4, "Booking.com", "ยืนยันแล้ว", { room_no: "716", note: "คำขอแขก: มาถึง 15:00" }),
      mkB("WEB-2002", "Daniel Lee", 0, 2, "เว็บไซต์ (จองตรง)", "ยืนยันแล้ว", { room_no: "708twin" }),
      mkB("BDC-2003", "Mei-Lin Chao", -1, 0, "Booking.com", "เข้าพักอยู่", { room_no: "703" }),
      mkB("BDC-2004", "Sofia Marchetti", 1, 3, "Booking.com", "ยืนยันแล้ว"),
      mkB("WEB-2005", "ธนากร พงษ์ไพศาล", 1, 4, "เว็บไซต์ (จองตรง)", "รอยืนยัน", { phone: "089-555-1122", amount: "2,700" }),
      mkB("BDC-2006", "Kenji Watanabe", -1, 6, "Booking.com", "เข้าพักอยู่", { room_no: "709" }),
      mkB("BDC-2007", "Tang Fangxue", 3, 8, "Booking.com", "ยกเลิก"),
      mkB("BDC-2008", "", 4, null, "Booking.com", "รอเติมชื่อจาก Pulse", { amount: "" }),
    ],
    expenses: [],
  };
}
resetDB();
const updates = [];
const MIME = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".webmanifest":"application/json", ".woff2":"font/woff2" };
const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if (url === "/api/data") {
    const key = String(req.headers["x-admin-key"] || "");
    res.setHeader("Content-Type", "application/json");
    if (key !== "x" && key !== "staffpass") { res.statusCode = 401; return res.end(JSON.stringify({ ok: false, error: "unauthorized", demo: false })); }
    const role = key === "staffpass" ? "staff" : "admin";
    const bookings = DB.bookings.map((b) => role === "staff" ? { ...b, amount: "" } : b);
    return res.end(JSON.stringify({ ok: true, demo: false, today, role, bookings, rooms: DB.rooms, ical: [], expenses: role === "staff" ? [] : DB.expenses, sources: { sheet: true, ical: false } }));
  }
  if (url === "/api/update") {
    let body = ""; req.on("data", (c) => body += c);
    req.on("end", () => {
      let j = {}; try { j = JSON.parse(body); } catch {}
      updates.push(j);
      if (j.action === "update") { const b = DB.bookings.find((x) => x.id === j.id); if (b && j.fields) Object.assign(b, j.fields); }
      if (j.action === "roomclean") { const r = DB.rooms.find((x) => x.room === j.room); if (r) { r.clean = j.clean; if (j.note !== undefined) r.note = j.note; } }
      if (j.action === "add") DB.bookings.push({ ...j, id: "WEB-E2E-NEW", rooms: 1 });
      if (j.action === "expadd") DB.expenses.push({ ...j, id: "EXP-E2E-1" });
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, saved: true, id: "WEB-E2E-NEW" }));
    });
    return;
  }
  if (url.startsWith("/api/")) { res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify({ ok: true })); }
  let f = path.join(ROOT, url === "/admin" || url === "/admin/" ? "admin/index.html" : url);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end("nf"); }
  res.setHeader("Content-Type", MIME[path.extname(f)] || "application/octet-stream");
  res.end(fs.readFileSync(f));
});

(async () => {
  await new Promise((r) => server.listen(8899, r));
  const { chromium } = require("playwright");
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
  const fails = [];
  const check = (name, cond) => { console.log((cond ? "PASS" : "FAIL") + " " + name); if (!cond) fails.push(name); };
  const login = async (page, pass) => {
    await page.goto("http://127.0.0.1:8899/admin/");
    await page.waitForSelector("#passInput", { state: "visible" });
    await page.fill("#passInput", pass);
    await page.click("#loginBtn");
    await page.waitForSelector("#appView", { state: "visible" });
    await page.waitForTimeout(400);
  };

  /* ── desktop: เจ้าของ ── */
  const dt = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "th-TH" })).newPage();
  const pageErrors = [];
  dt.on("pageerror", (e) => pageErrors.push(String(e)));
  await login(dt, "x");
  check("ล็อกอินแล้วเห็นหน้า 'วันนี้' พร้อม tiles 5 ใบ", await dt.locator("#tiles .tile").count() === 5);
  check("คิวงานวันนี้มีแขกมาถึง (Amara)", (await dt.locator("#queue").innerText()).includes("Amara Okafor"));

  // 1) เช็คอินห้องสกปรกต้องถูกบล็อก (716 รอทำความสะอาด)
  const before = updates.length;
  await dt.locator('#g-arr [data-act="checkin"][data-id="BDC-2001"]').click();
  await dt.waitForTimeout(400);
  check("เช็คอินห้องสกปรกโดนบล็อก (ไม่ยิง API + toast แดง)", updates.length === before && (await dt.locator("#toast").innerText()).includes("รอทำความสะอาด"));

  // 2) แม่บ้านกดสะอาดแล้ว → payload roomclean สะอาด
  await dt.locator('#g-dirty [data-act="clean-done"][data-no="716"]').click();
  await dt.waitForTimeout(700);
  const cl = updates.find((u) => u.action === "roomclean" && u.room === "716");
  check("กดสะอาดแล้ว → {action:'roomclean', room:'716', clean:'สะอาด'}", !!cl && cl.clean === "สะอาด");

  // 3) คราวนี้เช็คอิน Amara ได้ → update status เข้าพักอยู่
  await dt.locator('#g-arr [data-act="checkin"][data-id="BDC-2001"]').first().click();
  await dt.waitForTimeout(700);
  const ci = updates.find((u) => u.action === "update" && u.id === "BDC-2001");
  check("เช็คอิน → {action:'update', fields:{status:'เข้าพักอยู่'}}", !!ci && ci.fields && ci.fields.status === "เข้าพักอยู่" && Object.keys(ci.fields).length === 1);

  // 4) เช็คเอาต์ Mei-Lin → update เช็คเอาต์แล้ว + roomclean 703 รอทำความสะอาด
  await dt.locator('#g-dep [data-act="checkout"][data-id="BDC-2003"]').click();
  await dt.waitForTimeout(700);
  const co = updates.find((u) => u.action === "update" && u.id === "BDC-2003");
  const co2 = updates.find((u) => u.action === "roomclean" && u.room === "703");
  check("เช็คเอาต์ → status เช็คเอาต์แล้ว + ห้องเดิมเข้าคิวทำความสะอาด", !!co && co.fields.status === "เช็คเอาต์แล้ว" && !!co2 && co2.clean === "รอทำความสะอาด");

  // 5) โหมดจัดห้อง (ผังห้อง): เลือก Sofia → แตะห้องว่าง → update room_no
  await dt.evaluate(() => { location.hash = "#rooms"; });
  await dt.waitForTimeout(400);
  await dt.locator('#unassignedList [data-act="assign"][data-id="BDC-2004"]').click();
  await dt.waitForTimeout(400);
  check("โหมดจัดห้อง: มี assign bar + ห้องว่างขึ้นเส้นประ", await dt.locator("#assignBar.on").count() === 1 && await dt.locator("#roomGrid .room.assignable").count() > 0);
  await dt.locator('#roomGrid .room.assignable[data-no="704"]').click();
  await dt.waitForTimeout(700);
  const asg = updates.find((u) => u.action === "update" && u.id === "BDC-2004");
  check("จัดห้อง → {action:'update', fields:{room_no:'704'}}", !!asg && asg.fields.room_no === "704");

  // 6) รายการจอง: ค่าเริ่มต้นซ่อนที่ยกเลิก · toggle แล้วเห็น
  await dt.evaluate(() => { location.hash = "#bookings"; });
  await dt.waitForTimeout(400);
  const listText = await dt.locator("#bkList").innerText();
  check("ค่าเริ่มต้นซ่อนรายการที่ยกเลิก", !listText.includes("Tang Fangxue"));
  await dt.locator("#bkCancel").check();
  await dt.waitForTimeout(300);
  check("เปิด 'แสดงที่ยกเลิก' แล้วเห็นรายการขีดฆ่า", (await dt.locator("#bkList").innerText()).includes("Tang Fangxue"));
  await dt.locator("#bkCancel").uncheck();
  await dt.waitForTimeout(300);

  // 7) ค้นหาจากหน้าอื่นเด้งมารายการจองพร้อมกรอง
  await dt.evaluate(() => { location.hash = "#today"; });
  await dt.waitForTimeout(300);
  await dt.fill("#q", "Kenji");
  await dt.waitForTimeout(400);
  check("พิมพ์ค้นหาแล้วเด้งไปรายการจอง + เจอ Kenji", await dt.evaluate(() => location.hash) === "#bookings" && (await dt.locator("#bkList").innerText()).includes("Kenji Watanabe"));
  await dt.fill("#q", "");
  await dt.waitForTimeout(300);

  // 8) sheet การจอง: เปิดจากแถว → Esc ปิด
  await dt.locator('#bkList [data-act="open-booking"]').first().click();
  await dt.waitForTimeout(300);
  check("แตะแถวเปิด sheet รายละเอียด", await dt.locator("#sheet.on").count() === 1);
  await dt.keyboard.press("Escape");
  await dt.waitForTimeout(300);
  check("Esc ปิด sheet", await dt.locator("#sheet.on").count() === 0);

  // 9) ยกเลิกการจองต้องกดสองครั้ง (ไม่ใช้ confirm())
  await dt.locator('#bkList [data-act="open-booking"][data-id="WEB-2002"]').first().click();
  await dt.waitForTimeout(300);
  const cbefore = updates.length;
  await dt.locator('#sheet [data-act="cancel"]').click();
  await dt.waitForTimeout(200);
  check("กดยกเลิกครั้งแรก = ยังไม่ยิง API (arm สองจังหวะ)", updates.length === cbefore && (await dt.locator('#sheet [data-act="cancel"]').innerText()).includes("อีกครั้ง"));
  await dt.locator('#sheet [data-act="cancel"]').click();
  await dt.waitForTimeout(700);
  const cc = updates.find((u) => u.action === "update" && u.id === "WEB-2002" && u.fields && u.fields.status === "ยกเลิก");
  check("กดครั้งที่สอง → {action:'update', fields:{status:'ยกเลิก'}}", !!cc);

  // 10) ไทม์ไลน์: แถบจอง + แตะช่องว่างเปิดจองใหม่ + จองใหม่ยิง action add
  await dt.evaluate(() => { location.hash = "#timeline"; });
  await dt.waitForTimeout(500);
  check("ไทม์ไลน์มีแถบการจอง", await dt.locator("#tl .bar").count() >= 2);
  check("ถาดรอจัดห้องแสดงจำนวน", (await dt.locator("#tlTray").innerText()).includes("รอจัดห้อง"));
  await dt.locator('.tl-row[data-rowno="705"] .tl-cellbtn').first().click();
  await dt.waitForTimeout(300);
  check("แตะช่องว่างเปิด sheet จองใหม่ (prefill ห้อง)", (await dt.locator("#sheetTitle").innerText()).includes("จองใหม่"));
  await dt.fill("#fName", "E2E ทดสอบ");
  await dt.locator('#sheet [data-act="save-new"]').click();
  await dt.waitForTimeout(700);
  const add = updates.find((u) => u.action === "add" && u.name === "E2E ทดสอบ");
  check("บันทึกจองใหม่ → {action:'add', room_no:'705', ...}", !!add && add.room_no === "705" && !!add.checkin && !!add.checkout);

  // 11) รายจ่าย: บันทึก → action expadd payload เดิม
  await dt.evaluate(() => { location.hash = "#money"; });
  await dt.waitForTimeout(400);
  await dt.locator("#expAdd").click();
  await dt.waitForTimeout(300);
  await dt.fill("#eAmt", "500");
  await dt.fill("#eTo", "ร้านทดสอบ");
  await dt.locator('#sheet [data-act="save-expense"]').click();
  await dt.waitForTimeout(700);
  const ex = updates.find((u) => u.action === "expadd");
  check("บันทึกรายจ่าย → {action:'expadd', date, amount, category, method, vendor, note}", !!ex && ex.amount === "500" && ex.vendor === "ร้านทดสอบ" && "category" in ex && "method" in ex && "note" in ex);

  // 12) ธีม: สลับแล้ว data-theme เปลี่ยน + จำค่าไว้
  const t0 = await dt.evaluate(() => document.documentElement.getAttribute("data-theme"));
  await dt.locator("#themeBtn").click();
  await dt.waitForTimeout(200);
  const t1 = await dt.evaluate(() => document.documentElement.getAttribute("data-theme"));
  const saved = await dt.evaluate(() => localStorage.getItem("hoh-admin-theme"));
  check("สลับธีมแล้ว data-theme เปลี่ยนและถูกจำไว้", t0 !== t1 && saved === t1);

  check("ไม่มี JavaScript error ตลอดการใช้งาน", pageErrors.length === 0);
  if (pageErrors.length) console.log("  errors:", pageErrors.slice(0, 3));

  /* ── พนักงาน: เมนูการเงินต้องหาย ── */
  resetDB();
  const stf = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "th-TH" })).newPage();
  await login(stf, "staffpass");
  check("พนักงาน: เมนูรายรับ-รายจ่ายถูกซ่อน", await stf.locator('.nav a[data-view="money"].hide').count() === 1);
  await stf.evaluate(() => { location.hash = "#money"; });
  await stf.waitForTimeout(400);
  check("พนักงานเข้า #money แล้วเด้งกลับหน้า 'วันนี้'", await stf.evaluate(() => location.hash) === "#today");
  await stf.close();

  /* ── มือถือ: tabbar นำทาง + ไม่มี horizontal scroll ── */
  resetDB();
  const mob = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "th-TH", hasTouch: true })).newPage();
  await login(mob, "x");
  check("มือถือ: เห็น tabbar 5 ปุ่ม", await mob.locator("#tabbar button").count() === 5);
  await mob.locator('#tabbar button[data-view="clean"]').click();
  await mob.waitForTimeout(400);
  check("แตะแท็บแม่บ้านแล้วเปิดหน้าแม่บ้าน", await mob.locator("#view-clean.on").count() === 1);
  await mob.locator('#tabbar button[data-view="more"]').click();
  await mob.waitForTimeout(300);
  check("แท็บ 'เพิ่มเติม' เปิด sheet เมนู (มีรายรับ-รายจ่ายสำหรับเจ้าของ)", (await mob.locator("#sheetBody").innerText()).includes("รายรับ-รายจ่าย"));
  await mob.keyboard.press("Escape");
  await mob.waitForTimeout(200);
  let overflow = 0;
  for (const v of ["today", "timeline", "rooms", "clean", "calendar", "bookings"]) {
    await mob.evaluate((vv) => { location.hash = "#" + vv; }, v);
    await mob.waitForTimeout(300);
    overflow += await mob.evaluate(() => Math.max(0, document.documentElement.scrollWidth - (window.innerWidth + 1)));
  }
  check("มือถือ: ไม่มี horizontal scroll ทุกหน้า", overflow === 0);
  await mob.close();

  await dt.close();
  await browser.close();
  server.close();
  console.log(fails.length ? `\n❌ ${fails.length} failed` : "\n✅ all passed");
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
