/** Regression tests for /api/update upstream error handling. */
const assert = require("assert");

process.env.ADMIN_PASSWORD = "test-admin";
process.env.STAFF_PASSWORD = "test-staff";
process.env.SHEET_WEBAPP_URL = "https://sheet.fixture/exec";
process.env.SHEET_TOKEN = "test-token";

const update = require("../api/update.js");

function call(body = { action: "roomclean", room: "101", clean: true }) {
  return new Promise((resolve, reject) => {
    const res = {
      code: 200,
      setHeader() {},
      status(code) { this.code = code; return this; },
      json(value) { resolve({ code: this.code, body: value }); },
    };
    Promise.resolve(update({
      method: "POST",
      headers: { "x-admin-key": "test-admin" },
      body,
    }, res)).catch(reject);
  });
}

(async () => {
  global.fetch = async () => ({
    ok: true, status: 200, text: async () => JSON.stringify({ ok: true }),
  });
  let result = await call();
  assert.equal(result.code, 200);
  assert.equal(result.body.saved, true);

  global.fetch = async () => ({
    ok: false, status: 500, text: async () => "server error",
  });
  result = await call();
  assert.equal(result.code, 502);
  assert.equal(result.body.saved, false);

  global.fetch = async () => ({
    ok: true, status: 200, text: async () => "not-json",
  });
  result = await call();
  assert.equal(result.code, 502);

  global.fetch = async () => ({
    ok: true, status: 200, text: async () => JSON.stringify({ error: "unauthorized" }),
  });
  result = await call();
  assert.equal(result.code, 502);

  global.fetch = async () => { throw new Error("offline"); };
  result = await call();
  assert.equal(result.code, 502);
  assert.equal(result.body.error, "update-storage-unavailable");

  process.env.SHEET_TOKEN = "";
  result = await call();
  assert.equal(result.code, 503);
  assert.equal(result.body.error, "update-service-not-configured");

  console.log("UPDATE TESTS PASSED");
})().catch((error) => {
  console.error("UPDATE TEST FAILED:", error.message);
  process.exitCode = 1;
});
