# Security

- **Secrets**: none in git history (verified: only AWS-doc placeholder keys in SDK
  code). No `.env` files; `amplify_outputs.json` holds IDs/endpoints only and is
  force-added deliberately for hosting. Demo password lives in shell history +
  submission notes, never the repo. Gitleaks runs in CI + manual scans per push.
- **Repo**: PUBLIC (org repo) — hence the rule: no secrets in git, ever. Verified by
  gitleaks v8 in CI (allowlist for build output) + manual pattern scans per push.
  Amplify auto-build webhook died in the repo transfer; deploys are manual
  `start-job` releases (see Deployment).
- **IAM**: Lambda roles are least-privilege (Bedrock scoped to inference profiles
  + foundation-model wildcard; SES/SNS/Pinecone-free; S3 path-scoped). No static
  keys in code — roles + Cognito Identity credentials chain.
- **Account hygiene (audit 2026-09-27)**: no root access keys (root has MFA);
  single IAM user `vigil-deploy` holds AdministratorAccess on a static key with
  NO MFA — highest residual risk: scope it down or move to OIDC, rotate often.
  Cognito pool: self-signup open (consumer app), MFA off, 1 stale unconfirmed
  account (harmless). Unauthenticated identity role has zero policies.
- **Detective controls**: CloudTrail trail `tontine-audit` (validated logs to a
  private bucket) + $20 monthly budget (`tontine-monthly-20`, 80% actual and
  100% forecasted alerts to SNS email).
- **IAM**: Lambda roles are least-privilege (Bedrock scoped to inference profiles
  + foundation-model wildcard; SES/SNS/Pinecone-free; S3 path-scoped). No static
  keys in code — roles + Cognito Identity credentials chain.
- **Auth**: owner-scoped data (`ownerId`), per-account caches, email verification
  before first sign-in, password policy == UI message.
- **SES**: sandbox until production access; per-recipient try/catch so one bad
  address never breaks a fan-out; PII-safe logs (masked prefixes only).
- **Bedrock**: no prompt-injection surface beyond scoped Q&A; tool inputs validated
  (member resolution owner-scoped); temperatures low; token caps explicit.
- **Known acceptance**: root AWS account used during the hackathon sprint —
  migrate to an IAM admin user post-hackathon; rotate the GitHub token used for
  Amplify repo connect.
