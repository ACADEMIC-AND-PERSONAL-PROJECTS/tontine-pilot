# Architecture

All in **us-east-1** (single region: data + Bedrock quotas co-located).

```
Browser (Next.js 16, FR/EN)
 │  aws-amplify client (amplify_outputs.json)
 ▼
Cognito (email + password + email code) ──► AppSync GraphQL ──► DynamoDB (7 tables, PITR + backups)
 │                                            │  ▲ allow.resource grants
 │                                            ▼  │
 │                              Lambda (Node 22, mock-first → live Bedrock):
 │                                parse-declaration · parse-receipt · mediate
 │                                recommend-rotation · digest-audio · reminders-worker
 │                                assistant · notify
 ▼
S3: receipts/<identity>/*.jpg, digests/<cycle>/<fr|en>.mp3
EventBridge Scheduler: daily 08:00 UTC → reminders-worker
SES (HTML emails) + SNS (SMS) · Polly (Léa/Joanna) · Textract (OCR fallback)
Amplify Hosting: main → https://main.dhnfua5oyahpy.amplifyapp.com
```

## Request flows
- **Declare by text**: UI → `parseDeclaration` (Haiku Converse, JSON) → confirm → `Contribution.create` → totals recomputed → dashboard refresh.
- **OCR receipt**: `uploadData` to S3 → `parseReceipt` (Haiku vision, Textract fallback) → confirm.
- **Reminders**: scheduler/“Nudge” → dedupe-guarded `Alert` → trust recompute → branded SES email (+SMS if opted in).
- **Rotation**: deterministic heuristic + Haiku rationales; all-zero history → provisional lottery.
- **Assistant**: intent pre-router (deterministic) → Bedrock tool `send_member_email` → alert + trust + SES; general Q&A via Haiku with platform-scoped prompt.
- **Audio**: cycle stats → Polly mp3 → S3 → presigned URL → `<audio>` (speechSynthesis fallback).
- **Export**: CSV built client-side from live rows.

## Environments
| Env | Backend | Frontend |
|---|---|---|
| Sandbox (dev) | `npx ampx sandbox` | `npm run dev` + sandbox outputs |
| Prod (judges) | sandbox stack (frozen) | Amplify Hosting, outputs bundled |

See [Backend](Backend.md), [Deployment](Deployment.md).

## Function inventory (all Node 22, callers in eu-west-1 → Bedrock us-east-1)
| Function | Trigger | In → Out | Flags |
|---|---|---|---|
| parse-declaration (60s/512MB) | `parseDeclaration` query | text+groupId → member/amount/recipient/confidence/EN | USE_MOCK=false |
| parse-receipt (180s/1024MB) | `parseReceipt` query | s3Key+groupId → amount/txn/recipient/date/provider/conf | OCR_ENGINE=bedrock |
| mediate (60s) | `draftNudge` query | alertId+locale → FR+EN message + proposal | USE_MOCK=false |
| recommend-rotation (90s) | `recommendRotationOp` | groupId → ordered entries + reasons + provisional | USE_MOCK=false |
| digest-audio (120s) | `buildDigest` | cycleId+locale → script + mp3 URL | USE_POLLY=true |
| reminders-worker (300s) | schedule + `sendNudge` | scan → alerts + trust + emails | MOCK_SEND=true (sandbox) |
| assistant (60s) | `askAssistant` | question+locale+history → answer (+email tool) | USE_MOCK=false |
| notify (120s) | `notifyNewGroup` | groupId → {sent, skipped} welcome fan-out | MOCK_SEND=true (sandbox) |

## Auth modes per call
Browser: Cognito userPool (signed-in session). Lambdas: IAM role (SigV4 via
credentials chain) with `allow.resource(fn)` schema grants. Seed/verify scripts:
userPool as the demo user.

## Quotas & limits that bit us
- Bedrock TPM quotas start at 0 on new accounts → console increase request (days).
- SES sandbox: verified sender AND verified recipients or sends fail gracefully.
- Cognito default email sender: fine for verification codes; watch daily limits.
- Always set Converse `maxTokens` explicitly (unset reserves ~43× quota).
