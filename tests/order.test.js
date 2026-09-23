/** Regression tests for /api/order — ออเดอร์รูมเซอร์วิสจากเว็บ */
const assert = require("assert");

process.env.SHEET_WEBAPP_URL = "https://sheet.fixture/exec";
process.env.SHEET_TOKEN = "test-token";
const order = require("../api/order.js");

const tomorrow = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
const good = () => ({
  name: "Somchai Test", room: "701", date: tomorrow, time: "09:30", note: "ไม่เผ็ด", lang: "th", channel: "line",
  items: [{ th: "มัสมั่น", variant: "ไก่", qty: 2, price: 100 }, { th: "ชาไทย", qty: 1, price: 40 }],
  total: "999999", // ต้องถูกคำนวณใหม่ฝั่งเซิร์ฟเวอร์
});

function call(body, ip = "1.1.1.1") {
  return new Promise((resolve, reject) => {
    const res = { code: 200, setHeader() {}, status(c) { this.code = c; return this; }, json(v) { resolve({ code: this.code, body: v }); }, end() { resolve({ code: this.code, body: null }); } };
    Promise.resolve(order({ method: "POST", headers: { "x-forwarded-for": ip }, body }, res)).catch(reject);
  });
}

(async () => {
  let sent = null;
  global.fetch = async (_url, opts) => { sent = JSON.parse(opts.body); return { ok: true, status: 200, text: async () => JSON.stringify({ ok: true, id: "RS-TEST1" }) }; };

  let r = await call(good());
  assert.equal(r.code, 201);
  assert.equal(r.body.id, "RS-TEST1");
  assert.equal(sent.action, "orderadd");
  assert.equal(sent.token, "test-token");
  assert.equal(sent.total, "240", "ยอดต้องคำนวณใหม่จากรายการ ไม่เชื่อ total ที่ส่งมา");
  assert.ok(sent.items.includes("มัสมั่น (ไก่) × 2 — ฿200") && sent.items.includes("ชาไทย × 1 — ฿40"));
  assert.equal(sent.status, "รอยืนยัน");
  assert.equal(sent.room, "701");

  r = await call({ ...good(), items: [] });
  assert.equal(r.code, 400, "ไม่มีรายการ → 400");
  r = await call({ ...good(), date: "2020-01-01" });
  assert.equal(r.code, 400, "วันที่ย้อนหลัง → 400");
  r = await call({ ...good(), name: "" });
  assert.equal(r.code, 400, "ไม่มีชื่อ → 400");
  r = await call({ ...good(), items: [{ th: "x", qty: 99, price: 100 }] });
  assert.equal(r.code, 400, "จำนวนเกิน 20 → 400");
  r = await call({ ...good(), time: "9am" });
  assert.equal(r.code, 400, "เวลาผิดรูปแบบ → 400");

  global.fetch = async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ error: "unauthorized" }) });
  r = await call(good());
  assert.equal(r.code, 502);
  global.fetch = async () => { throw new Error("offline"); };
  r = await call(good());
  assert.equal(r.code, 502);
  assert.equal(r.body.error, "order-storage-unavailable");

  process.env.SHEET_TOKEN = "";
  r = await call(good());
  assert.equal(r.code, 503);
  process.env.SHEET_TOKEN = "test-token";

  // rate limit ต่อ IP
  global.fetch = async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ ok: true, id: "RS-X" }) });
  let last;
  // ลิมิตอ่านจากซอร์สจริง — แขกทุกห้องใช้ไวไฟเดียวกัน ลิมิตต้องรองรับทั้งตึกในหนึ่งรอบส่ง
  const ORDER_MAX = Number(require("fs").readFileSync(require("path").join(__dirname, "..", "api", "order.js"), "utf8").match(/const RATE_MAX = (\d+)/)[1]);
  assert.ok(ORDER_MAX >= 15, "ลิมิตสั่งอาหารต้องรองรับอย่างน้อย 15 ห้องต่อชั่วโมง");
  for (let i = 0; i < ORDER_MAX; i++) { last = await call(good(), "9.9.9.9"); assert.equal(last.code, 201, "ออเดอร์ก่อนถึงลิมิตต้องผ่าน"); }
  last = await call(good(), "9.9.9.9");
  assert.equal(last.code, 429, "เกินลิมิตแล้วจึงบล็อก");

  /* ── แจ้งเตือน LINE เมื่อมีออเดอร์ใหม่ ── */
  {
    // ข้อความ: อ่านจบในจอเดียว
    const msg = order.orderMessage({ ...good(), date: "2026-09-24", items: "มัสมั่น (ไก่) × 2 — ฿200; ชาไทย × 1 — ฿40", total: "240" }, "RS-9");
    assert.ok(msg.startsWith("🛎 ออเดอร์รูมเซอร์วิสใหม่"));
    assert.ok(msg.includes("ห้อง 701 · Somchai Test"));
    assert.ok(msg.includes("ส่ง พฤ. 24 ก.ย. 2569 เวลา 09:30 (รอบเช้า)"), "วันไทย พ.ศ. + รอบ");
    assert.ok(msg.includes("• มัสมั่น (ไก่) × 2 — ฿200\n• ชาไทย × 1 — ฿40"), "รายการละบรรทัด");
    assert.ok(msg.includes("รวม ฿240 · เก็บเงินสดตอนส่ง"));
    assert.ok(msg.includes("หมายเหตุ: ไม่เผ็ด"));
    assert.ok(msg.includes("#RS-9"));
    const pm = order.orderMessage({ ...good(), time: "14:00", note: "", lang: "en", channel: "whatsapp", items: "x × 1 — ฿10", total: "10" }, "RS-1");
    assert.ok(pm.includes("(รอบบ่าย)") && pm.includes("แขกส่งทาง WhatsApp · แขกใช้ภาษาอังกฤษ") && !pm.includes("หมายเหตุ"));

    // ตั้งค่าแล้ว: บันทึกสำเร็จ → push 1 ครั้ง ไปหาคนที่ตั้งไว้ ด้วย token ที่ตั้งไว้
    process.env.LINE_CHANNEL_TOKEN = "line-test-token";
    process.env.LINE_NOTIFY_TO = "Uowner";
    const calls = [];
    const router = (lineResult) => async (url, opts) => {
      calls.push({ url, opts });
      if (String(url).includes("api.line.me")) return lineResult();
      return { ok: true, status: 200, text: async () => JSON.stringify({ ok: true, id: "RS-N1" }) };
    };
    global.fetch = router(() => ({ ok: true, status: 200, text: async () => "{}" }));
    let r2 = await call(good(), "2.2.2.2");
    assert.equal(r2.code, 201);
    const pushes = calls.filter((c) => c.url.includes("api.line.me/v2/bot/message/push"));
    assert.equal(pushes.length, 1, "ออเดอร์หนึ่งรายการ = แจ้งหนึ่งครั้ง");
    assert.equal(pushes[0].opts.headers.Authorization, "Bearer line-test-token");
    const pb = JSON.parse(pushes[0].opts.body);
    assert.equal(pb.to, "Uowner");
    assert.ok(pb.messages[0].text.includes("ห้อง 701") && pb.messages[0].text.includes("#RS-N1"));

    // LINE ตอบ error → ออเดอร์ยังสำเร็จ และบันทึกครั้งเดียว ไม่เบิ้ล
    calls.length = 0;
    global.fetch = router(() => ({ ok: false, status: 401, text: async () => '{"message":"Authentication failed"}' }));
    r2 = await call(good(), "2.2.2.3");
    assert.equal(r2.code, 201, "LINE พังต้องไม่ทำให้ออเดอร์พัง");
    assert.equal(calls.filter((c) => !c.url.includes("api.line.me")).length, 1, "บันทึกออเดอร์ครั้งเดียว");

    // LINE ต่อไม่ติด → ออเดอร์ยังสำเร็จ
    global.fetch = router(() => { throw new Error("offline"); });
    r2 = await call(good(), "2.2.2.4");
    assert.equal(r2.code, 201, "LINE ต่อไม่ติดต้องไม่ทำให้ออเดอร์พัง");

    // สร้างข้อความพัง → ต้องไม่โยน error ออกมา (ในทางฐานข้อมูล ถ้าโยนจะไปบันทึกซ้ำลงชีต)
    await order.notifyOrder(null, "RS-X");

    // ยังไม่ได้ตั้งค่า → ไม่ยิงไปหา LINE เลย
    delete process.env.LINE_CHANNEL_TOKEN;
    delete process.env.LINE_NOTIFY_TO;
    calls.length = 0;
    global.fetch = router(() => ({ ok: true, status: 200, text: async () => "{}" }));
    r2 = await call(good(), "2.2.2.5");
    assert.equal(r2.code, 201);
    assert.equal(calls.filter((c) => c.url.includes("api.line.me")).length, 0, "ไม่ได้ตั้งค่า = ไม่ส่ง");
  }

  console.log("ORDER API TESTS PASSED");
})().catch((e) => { console.error(e); process.exit(1); });
