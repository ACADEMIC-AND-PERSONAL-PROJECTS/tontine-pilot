# Vision — from idea to design

## The idea
In Dakar and across West Africa, millions save through tontines: each month every
member contributes a fixed amount, and one member takes the whole pot in turn.
No bank, no app — a notebook, a WhatsApp group, and trust. When memory diverges
("I paid" / "no you didn't"), groups argue, stall, sometimes dissolve.
TontinePilot is an AI copilot that keeps the shared truth: who paid, who owes,
whose turn is next — plus the human layer (gentle reminders, mediation, audio
for low-literacy members) that a spreadsheet never provides.

## The people
- **Aïssatou**, group admin: collects cash, chases late payers on WhatsApp, keeps the notebook.
- **Ibrahima**, irregular income: pays late 3 cycles out of 4, needs installments not shame.
- **Modou**, forgetful but willing: a nudge before the deadline is enough.
- **Khadija**, always on time: should receive early in the rotation.

## Design journey
1. **Demo-first front** (bilingual FR/EN, dark luminous theme): dashboard, declare-by-text,
   members with trust scores, alerts, export — all on fake data to lock UX and storytelling.
2. **Mock-first backend**: Amplify Gen 2 (Cognito, AppSync, DynamoDB, Lambda, S3) with
   deterministic fallbacks behind flags, so the product works with zero AI quota.
3. **Real AI, proven live**: Bedrock Converse (Haiku NLU/mediation/chat, Sonnet vision),
   verified 9/9 against production with zero fallbacks in logs.
4. **SaaS hardening**: per-account isolation, empty onboarding instead of demo figures,
   password policy == UI message, branded emails, Polly audio digests.
5. **Ship**: public URL on Amplify Hosting, proof pack, Builder Center submission.

## Non-goals (deliberate)
No real-money movement (tracking only), no Wave/Orange Money API callbacks,
no PDF binary export in the MVP, single region, no custom domain yet.
