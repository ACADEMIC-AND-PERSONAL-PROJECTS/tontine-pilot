# Security

- **Secrets**: none in git history (verified: only AWS-doc placeholder keys in SDK
  code). No `.env` files; `amplify_outputs.json` holds IDs/endpoints only and is
  force-added deliberately for hosting. Demo password lives in shell history +
  submission notes, never the repo. Gitleaks runs in CI + manual scans per push.
- **Repo**: private; Amplify deploy key is read-only; webhook is build-trigger only.
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
