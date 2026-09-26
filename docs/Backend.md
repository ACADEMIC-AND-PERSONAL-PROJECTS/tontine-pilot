# Backend

Amplify Gen 2, TypeScript code-first (`amplify/`): `defineAuth` / `defineData` /
`defineFunction` / `defineStorage` + CDK escapes in `amplify/backend.ts`.

## Auth (`amplify/auth/resource.ts`)
Cognito email login; sign-up requires a 6-digit email code before first sign-in.
Password policy aligned with the UI message: min 8, lowercase + number required
(no uppercase/symbol gate) — set on the pool so server and message agree.

## Data (`amplify/data/resource.ts`)
Models: **Group** (incl. startDate/endDate, ownerId), **Member** (trustScore,
lateCount, cyclesCompleted, ownerId), **Cycle**, **Contribution** (TEXT_NLU /
OCR_RECEIPT / MANUAL / EMERGENCY_FUND), **Alert** (dedupeKey, bilingual fields),
**FundMovement**, **Digest**. Every user-facing string exists in FR + EN
(`message`/`messageEn`, `rawText`/`rawTextEn`…).

Auth model: `allow.authenticated()` read, `allow.owner()` write, plus
`allow.resource(fn)` schema-level grants. Gotcha documented: `allow.resource`
is schema-level only (model-level fails typecheck); inference-profile IAM needs
BOTH profile ARN and foundation-model wildcard ARN.

Custom operations: `parseDeclaration`, `parseReceipt`, `draftNudge`,
`recommendRotationOp`, `buildDigest`, `sendNudge`, `notifyNewGroup`, `askAssistant`.

## Functions (`amplify/functions/*`)
Each: `resource.ts` (env incl. `USE_MOCK`, model profiles, `BEDROCK_REGION`),
`handler.ts`, `package.json`. Shared code in `_shared/`: `bedrock.ts` (adaptive
retry, explicit maxTokens, no retry on Validation/AccessDenied), `fallbacks.ts`,
`trust.ts` (score engine), `intent.ts` (chatbot pre-router), `email.ts`
(branded templates), `digest.ts`, `receipt.ts`, `data-client.ts`.

Data access pattern (verified): official `getAmplifyDataClientConfig(process.env)`
for endpoint+introspection, with `Auth: {}` spread so the custom
`fromNodeProviderChain()` credentials provider survives the Amplify merge —
plain env-var credentials are unreliable in Lambda.

## Bedrock usage
Converse API only, explicit `maxTokens`, temperature 0.2–0.3.
NLU/mediation/chat: `us.anthropic.claude-haiku-4-5-20251001-v1:0`;
Vision OCR: `us.anthropic.claude-sonnet-4-5-20250929-v1:0`.
Full prompts + JSON contracts in `backend-plan/05-functions-prompts.md`.

## Storage & schedule
S3: `receipts/<identityId>/*` (auth-scoped), `digests/*`.
EventBridge Scheduler cron `0 8 * * ? *` → reminders-worker (dedupe-guarded fan-out).
