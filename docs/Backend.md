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

## Full data model (enums verbatim)
- **Group**: name*, description(+En), currency=FCFA, contributionAmount*, frequency
  WEEKLY|MONTHLY, memberCount*, currentCycleIndex*, emergencyFundBalance/Target*,
  role Admin|Member, cycleCollected/Expected, openAlerts, archived, startDate,
  endDate, ownerId. Secondary index: ownerId.
- **Member**: groupId*, name*, email*, phone, trustScore*, lateCount=0,
  cyclesCompleted=0, notifySms=false, ownerId. Indexes: groupId, ownerId.
- **Cycle**: groupId*, cycleNumber*, recipientMemberId/Name, startDate*, endDate*,
  status OPEN|CLOSED, totalExpected*, totalCollected*. Index: groupId.
- **Contribution**: groupId*, cycleId* (index), memberId*, memberName*, amount*,
  status CONFIRMED|PENDING|LATE|COVERED_BY_EMERGENCY_FUND, dateDeclared,
  rawText(+En), method TEXT_NLU|OCR_RECEIPT|MANUAL|EMERGENCY_FUND, transactionId,
  receiptKey.
- **Alert**: groupId*, cycleId, memberId(+Name), type LATE_PAYMENT|ANOMALY|REMINDER|
  SWAP_PROPOSAL|EMERGENCY_DISPATCH, message(+En)*, createdAt*, resolved=false,
  proposalKind swap|installment|emergency, proposalDetails(+En), dedupeKey*
  (`group#cycle#member#type`). Indexes: groupId, dedupeKey.
- **FundMovement**: groupId*, cycleId, kind DEBIT|REPAY, amount*, reason(+En), createdAt*.
- **Digest**: groupId*, cycleId*, locale fr|en, script*, audioKey*, createdAt*.
`*` = required. `owner` (implicit, allow.owner) coexists with explicit `ownerId`.

## IAM table (backend.ts)
| Grantee | Actions | Resources |
|---|---|---|
| 4 Bedrock functions | bedrock:InvokeModel | us-east-1 inference profiles `us.anthropic.*` + app profiles + `arn:aws:bedrock:*::foundation-model/anthropic.claude-*` |
| parse-receipt | s3:GetObject | receipts/* |
| digest-audio | polly:SynthesizeSpeech (no resource scoping exists → `*`), s3:Get/Put digests/*, textract:DetectDocumentText (`*`, account-scoped) |
| reminders-worker, notify, assistant | ses:SendEmail/SendRawEmail (`*`, identities verified at send), sns:Publish (worker) | — |
| Scheduler role | lambda:InvokeFunction | reminders-worker ARN |

## Handler anatomy (every Lambda)
1. `dataClient()` (explicit endpoint + introspection + chain credentials).
2. Parse/validate AppSync `event.arguments` (throw `VALIDATION:` on bad input).
3. `USE_MOCK` branch or live Bedrock call with try/catch → deterministic fallback.
4. Structured logging (`CONVERSE_OK`, `FALLBACK:`, `SEND`, `TOOL_*`) for CloudWatch triage.
