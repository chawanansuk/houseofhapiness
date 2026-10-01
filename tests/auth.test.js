/** ทดสอบ api/_auth.js — เทียบรหัส timing-safe + หน่วง/บล็อกเมื่อผิดซ้ำ */
const assert = require("assert");
process.env.ADMIN_PASSWORD = "owner-secret";
process.env.STAFF_PASSWORD = "staff-secret";
const { resolveRole, safeEqual, MAX_FAILS, __reset } = require("../api/_auth.js");
const req = (key, ip = "1.2.3.4") => ({ headers: key == null ? { "x-forwarded-for": ip } : { "x-admin-key": key, "x-forwarded-for": ip } });

(async () => {
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abc", "abd"), false);
  assert.equal(safeEqual("abc", "abcd"), false, "ความยาวต่างต้องเป็นเท็จ ไม่โยน error");
  assert.equal(safeEqual("", ""), false, "ว่างทั้งคู่ต้องไม่ผ่าน");

  __reset();
  assert.equal((await resolveRole(req("owner-secret"))).role, "admin");
  assert.equal((await resolveRole(req("staff-secret"))).role, "staff");
  const t0 = Date.now();
  const bad = await resolveRole(req("wrong"));
  assert.equal(bad.role, null); assert.equal(bad.blocked, false);
  assert.ok(Date.now() - t0 >= 300, "ใส่ผิดต้องถูกหน่วงอย่างน้อย ~300ms");
  // ไม่มี header (หน้า login เพิ่งเปิด) ไม่นับเป็นการเดา
  for (let i = 0; i < MAX_FAILS + 2; i++) await resolveRole(req(null, "9.9.9.9"));
  assert.equal((await resolveRole(req("owner-secret", "9.9.9.9"))).role, "admin", "ไม่มี header ไม่ควรทำให้ IP ถูกบล็อก");
  // ผิดซ้ำจน MAX_FAILS → บล็อก แม้รหัสถูกก็ยังโดนบล็อกจาก IP นั้น; IP อื่นไม่กระทบ
  for (let i = 0; i < MAX_FAILS; i++) await resolveRole(req("guess" + i, "5.5.5.5"));
  const blocked = await resolveRole(req("owner-secret", "5.5.5.5"));
  assert.equal(blocked.role, null); assert.equal(blocked.blocked, true);
  assert.equal((await resolveRole(req("owner-secret", "6.6.6.6"))).role, "admin");
  console.log("AUTH TESTS PASSED");
})().catch((e) => { console.error(e); process.exit(1); });
