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
- **OCR receipt**: `uploadData` to S3 → `parseReceipt` (Sonnet vision, Textract fallback) → confirm.
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
