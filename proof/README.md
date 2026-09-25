# Proof pack — TontinePilot ship gate

## Live URL
_Pending first green hosting build — fill after 5.3:_

- Public URL: https://main.dhnfua5oyahpy.amplifyapp.com (Amplify Hosting, us-east-1)
- Check: `curl -s -o /dev/null -w "%{http_code}" <URL>` must print `200`

## Agent connection proof
- Coding agent used for the whole build (scaffold → backend → integration → ship).
- AWS access method: AWS CLI (root session) + `gh` CLI, both from the dev machine.
- Amplify sandbox deploys driven by the agent: `npx ampx sandbox --identifier tontine`
  (stack `amplify-tontinepilot-tontine-sandbox-*`, us-east-1).
- Backend proof: 6 Lambdas + EventBridge schedule `tontine-daily-reminders`
  (ENABLED), AppSync API, Cognito pool, S3 buckets — all created via agent-run commands.
- Live Bedrock verification: `scripts/verify.ts` 9/9 green against us-east-1
  (`us.anthropic.claude-haiku-4-5-20251001-v1:0`).

## AWS services used
Cognito (email+password+code auth) · AppSync + DynamoDB (Amplify Data) ·
Lambda ×6 (Bedrock NLU, Vision OCR, mediation, rotation, Polly digest, reminders) ·
Bedrock Converse (Haiku 4.5, Sonnet 4.5) · S3 (receipts, digests) ·
EventBridge Scheduler (daily reminders) · SES + SNS (notifications) ·
Polly (Léa/Joanna audio digests) · Textract (OCR fallback) · Amplify Hosting.

## Judge login
- Demo user: `demo@tontinepilot.sn` (pre-confirmed, password in Builder Center private notes — never in repo)
- Language toggle FR/EN on every page.
