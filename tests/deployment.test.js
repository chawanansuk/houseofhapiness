/** Regression tests for the Production deployment source guard and endpoint. */
const assert = require("assert");
const { validateProductionDeploy } = require("../scripts/verify-production-deploy.js");
const deployment = require("../api/deployment.js");

const githubMain = {
  VERCEL_ENV: "production",
  VERCEL_GIT_PROVIDER: "github",
  VERCEL_GIT_REPO_OWNER: "chawanansuk",
  VERCEL_GIT_REPO_SLUG: "houseofhapiness",
  VERCEL_GIT_COMMIT_REF: "main",
  VERCEL_GIT_COMMIT_SHA: "0123456789abcdef",
};

assert.deepEqual(validateProductionDeploy(githubMain), []);
assert.deepEqual(validateProductionDeploy({ VERCEL_ENV: "preview" }), []);
assert.ok(validateProductionDeploy({ ...githubMain, VERCEL_GIT_COMMIT_REF: "old-branch" }).length > 0);
assert.ok(validateProductionDeploy({ ...githubMain, VERCEL_GIT_PROVIDER: "" }).length > 0);
assert.ok(validateProductionDeploy({ ...githubMain, VERCEL_GIT_COMMIT_SHA: "" }).length > 0);

function call(handler, env) {
  Object.assign(process.env, env);
  return new Promise((resolve, reject) => {
    const res = {
      code: 200,
      setHeader() {},
      status(code) { this.code = code; return this; },
      json(value) { resolve({ code: this.code, body: value }); },
    };
    Promise.resolve(handler({ method: "GET" }, res)).catch(reject);
  });
}

(async () => {
  const result = await call(deployment, githubMain);
  assert.equal(result.code, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.source.repository, "chawanansuk/houseofhapiness");
  assert.equal(result.body.source.ref, "main");
  assert.equal(result.body.source.sha, githubMain.VERCEL_GIT_COMMIT_SHA);
  console.log("DEPLOYMENT TESTS PASSED");
})().catch((error) => {
  console.error("DEPLOYMENT TEST FAILED:", error.message);
  process.exitCode = 1;
});
