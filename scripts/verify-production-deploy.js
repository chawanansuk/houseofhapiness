/**
 * Fail a Vercel Production build unless it comes from the connected main branch.
 */

const EXPECTED = {
  provider: "github",
  repository: "chawanansuk/houseofhapiness",
  ref: "main",
};

function deploymentSource(env) {
  const clean = (value) => String(value || "").trim();
  const owner = clean(env.VERCEL_GIT_REPO_OWNER);
  const slug = clean(env.VERCEL_GIT_REPO_SLUG);
  return {
    provider: clean(env.VERCEL_GIT_PROVIDER).toLowerCase(),
    repository: owner && slug ? `${owner}/${slug}` : "",
    ref: clean(env.VERCEL_GIT_COMMIT_REF),
    sha: clean(env.VERCEL_GIT_COMMIT_SHA),
  };
}

function validateProductionDeploy(env) {
  if (env.VERCEL_ENV !== "production") return [];
  const source = deploymentSource(env);
  const errors = [];
  if (source.provider !== EXPECTED.provider) errors.push(`provider must be ${EXPECTED.provider}`);
  if (source.repository.toLowerCase() !== EXPECTED.repository.toLowerCase()) {
    errors.push(`repository must be ${EXPECTED.repository}`);
  }
  if (source.ref !== EXPECTED.ref) errors.push(`branch must be ${EXPECTED.ref}`);
  if (!source.sha) errors.push("commit SHA is missing");
  return errors;
}

if (require.main === module) {
  const errors = validateProductionDeploy(process.env);
  if (errors.length) {
    console.error("Blocked unsafe Production deployment:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(process.env.VERCEL_ENV === "production"
    ? "Production deployment source verified: GitHub main."
    : "Deployment source guard skipped outside Production.");
}

module.exports = { deploymentSource, validateProductionDeploy };
