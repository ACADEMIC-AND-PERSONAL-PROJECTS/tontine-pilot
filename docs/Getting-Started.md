# Getting Started

## Try the live app
1. Open https://main.dhnfua5oyahpy.amplifyapp.com
2. Sign up with your email → enter the 6-digit code → you land on an empty dashboard.
3. **Create your first group**: name, start/end dates, amount, frequency, members (name + email + phone + history).
4. **Declare**: write "I paid 20000 for Cheikh" or upload a receipt screenshot, confirm.
5. Watch the dashboard update, play the audio digest, ask Tonti (bottom-right) anything.

Password rule: 8+ chars, a lowercase letter and a number (e.g. `Tontine2026!`).

## Run locally
```bash
git clone github.com:khadimmbaye0/tontine-pilot.git
cd tontine-pilot
npm install && npm run dev   # http://localhost:3101
```
Without backend outputs the app runs on the built-in demo dataset (Liberté group).
With `amplify_outputs.json` (from `npx ampx sandbox`) + login, it talks to live AWS data.

## Key commands
| Command | Purpose |
|---|---|
| `npm test` | 33+ unit/integration tests (vitest) |
| `npx tsc --noEmit` | typecheck app (amplify/ and functions have their own configs) |
| `npm run build` | production build |
| `npx tsx scripts/seed.ts` | seed demo dataset (needs SEED_USER/SEED_PASSWORD) |
| `npx tsx scripts/verify.ts` | 9 live backend checks |
| `./scripts/deploy-functions.sh [fn...]` | push Lambda code (see Deployment quirks) |

## Prerequisites
- Node 20+ (repo runs 24), npm 11 (`npm install`, NOT `npm ci` — arborist drift, see Deployment).
- AWS CLI v2 with a profile that can deploy Amplify + invoke Bedrock.
- Bedrock model access granted (console): Haiku 4.5 (NLU + vision), us-east-1.
- Service quotas (user-side console steps): Bedrock inference TPM raised from 0.
- GitHub account (private repo + Actions work on Pro).

## Environment variables (scripts only — never committed)
- `SEED_USER` / `SEED_PASSWORD` — seeded demo/admin account for seed + verify scripts.
- `SEED_EMAIL_BASE` — optional; rewrites seed member emails to `base+name@domain` so
  sandbox SES can actually deliver.
- `RECEIPT_KEY` — S3 key for the OCR E2E test.
- `TEST_EMAIL` — real inbox for delivery tests (must be SES-verified in sandbox).
- Lambda env (`amplify/functions/*/resource.ts` + `backend.ts`): `USE_MOCK`,
  `BEDROCK_NLU_PROFILE`, `BEDROCK_VISION_PROFILE`, `BEDROCK_REGION`, `OCR_ENGINE`,
  `MOCK_SEND`, `USE_POLLY`, `SES_FROM`, `APP_URL`, `LOGO_URL`, `STORAGE_BUCKET`.

## Troubleshooting
| Symptom | Cause → fix |
|---|---|
| `npm ci` EUSAGE drift | Use `npm install`; lockfile regen planned post-hackathon |
| Sandbox `$amplify/env` bundle error | We bypass it — explicit endpoint wiring (see Backend) |
| Sandbox deploys don't refresh Lambda code | Run `./scripts/deploy-functions.sh`, then re-verify |
| `NoCredentials` in Lambda | Custom credentials-provider merge (documented in Backend) |
| SES "not verified" | Sandbox: verify sender + each recipient, or request production access |
| Owner filter returns nothing | Use explicit `ownerId` field, never implicit `owner` (verified broken) |
| Stale UI after deploy | Hard refresh (CDN), check job commit matches HEAD |
