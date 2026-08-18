/**
 * GET /api/deployment — public, non-secret deployment identity for monitoring.
 */

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method-not-allowed" });
  }

  const source = {
    provider: clean(process.env.VERCEL_GIT_PROVIDER),
    repository: repositoryName(process.env),
    ref: clean(process.env.VERCEL_GIT_COMMIT_REF),
    sha: clean(process.env.VERCEL_GIT_COMMIT_SHA),
  };
  const ok = Boolean(source.provider && source.repository && source.ref && source.sha);
  return res.status(ok ? 200 : 503).json({
    ok,
    source,
    error: ok ? undefined : "deployment-source-unavailable",
  });
};

function clean(value) {
  return String(value || "").trim();
}

function repositoryName(env) {
  const owner = clean(env.VERCEL_GIT_REPO_OWNER);
  const slug = clean(env.VERCEL_GIT_REPO_SLUG);
  return owner && slug ? `${owner}/${slug}` : "";
}
