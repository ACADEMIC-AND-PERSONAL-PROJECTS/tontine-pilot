# Notifications

## Email (SES, us-east-1)
Multipart HTML + text, 600px table layout, inline CSS, dark platform theme
(`#070913`/`#0c0f1a`, accent `#8b5cf6`, gold `#facc15`), centered logo header
with gold divider, single CTA, subordinate footer. All content bilingual.
Templates in `amplify/functions/_shared/email.ts`: `welcomeHtml` (group details,
member roster, dashboard CTA), `reminderHtml` (late/upcoming), `memberMessageHtml`
(admin free message).

Flows: group creation → `notifyNewGroup` (fire-and-forget, per-recipient
try/catch); cron/manual nudges → branded reminders; chatbot → message/reminder
via tool. Sandbox mode: unverified recipients fail gracefully (logged, counted,
never breaking creation). Sender + recipient identities verified for demos;
production access via console when ready (code needs no change).

## SMS (SNS)
Transactional SMS to opted-in members (`notifySms`), FR text. Verified for
Senegal (+221) before promising delivery.

## Scheduler
EventBridge Scheduler, `cron(0 8 * * ? *)` (08:00 UTC = Dakar), targets
reminders-worker. Idempotent by `dedupeKey` (`group#cycle#member#type`) —
re-runs never double-alert. Manual trigger: `sendNudge` mutation.

## Delivery proof + sandbox limits
Real welcome email landed in Gmail after a member add (see
`../proof/email-welcome-received.png`). No custom domain yet, so SES stays in
sandbox: only verified identities can receive, which is why demo recipients
are hardcoded test addresses. Perspective (post-pilot): register a domain,
verify it in SES, request production access — code needs no change, only
verified-identity configuration.
