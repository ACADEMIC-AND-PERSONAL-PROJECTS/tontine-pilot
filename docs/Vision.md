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

## User stories (acceptance-level)
- US1 — Admin creates "Tontine Quartier Liberté": name, Sep 1 → Dec 31, 20,000 FCFA
  monthly, 12 members with emails/phones/history → AI previews rotation with Ibrahima
  last and reasons → confirms → every member gets a branded welcome email.
- US2 — Moussa declares by text: "Moussa a payé 20000 pour Cheikh" → AI extracts
  amount 20000, member m2, recipient Cheikh, confidence ≥ 0.8 → admin confirms →
  dashboard collected rises by 20000 within seconds.
- US3 — Awa uploads a Wave screenshot → OCR returns amount, WV transaction ID,
  date, provider at confidence ≥ 0.7 → confirm → CONFIRMED row with receipt link.
- US4 — Ibrahima misses September: cron creates exactly one LATE_PAYMENT alert
  (never duplicates), trust drops 75 → 68, branded email sent; admin accepts the
  10,000 + 10,000 installment proposal from the alert card.
- US5 — Admin asks Tonti "remind Ibrahima he is late": chatbot resolves the member
  inside the admin's own groups, sends the reminder, recalculates trust, confirms
  in French. Off-topic questions ("best football team?") are politely declined.
- US6 — New user Khadim signs up, verifies the code, lands on real zeros with an
  onboarding CTA — never Liberté's 200,000/240,000 figures.
- US7 — Cycle close: admin plays the audio digest (Léa voice, deadline countdown
  included), exports the CSV, shares it to end disputes.

## Success metrics (pilot)
- Declaration time: < 30 seconds (vs ~5 minutes of WhatsApp back-and-forth).
- Collection rate narrative: 83% → 100% with reminders + emergency cover.
- Zero duplicate alerts across re-runs (dedupeKey enforced + verified).
- AI availability: every call has a mock/fallback path; zero hard failures in logs.
- Accessibility: full FR/EN parity, audio-first path for low-literacy members.

## Perspectives (post-pilot)
- Custom domain + SES production access: real delivery to any member address
  (today: sandbox, verified test recipients only).
- SMS reminders at scale via SNS (today: verified +221 numbers only).
- Mobile Money API callbacks to reconcile declarations automatically.
