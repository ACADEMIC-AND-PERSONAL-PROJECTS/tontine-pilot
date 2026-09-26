<div align="center">

# TontinePilot

[![Live Demo](https://img.shields.io/badge/LIVE_DEMO-8B5CF6?style=flat-square&logo=vercel&logoColor=white)](https://main.dhnfua5oyahpy.amplifyapp.com)
[![CI](https://img.shields.io/github/actions/workflow/status/khadimmbaye0/tontine-pilot/ci.yml?label=CI&style=flat-square&logo=githubactions&logoColor=white)](https://github.com/khadimmbaye0/tontine-pilot/actions)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![AWS Bedrock](https://img.shields.io/badge/AWS_Bedrock-Haiku_4.5_%2B_Sonnet_4.5-FF9900?style=flat-square&logo=amazonaws&logoColor=white)](https://aws.amazon.com/bedrock/)
[![Amplify Gen 2](https://img.shields.io/badge/Amplify-Gen_2-DD344C?style=flat-square&logo=awsamplify&logoColor=white)](https://docs.amplify.aws)
[![License MIT](https://img.shields.io/badge/License-MIT-FACC15?style=flat-square&logoColor=white)](LICENSE)

<img src="assets/hero-banner.jpg" width="100%" alt="TontinePilot — group dashboard, rotation order, contribution tracking, reminders and export registry">

**TontinePilot** is the AI copilot for community rotating savings groups (tontines).
It turns informal declarations and Mobile Money screenshots into a shared,
verifiable ledger — with empathic mediation, an emergency fund, and audio digests.
Built with **Next.js 16** and **AWS Bedrock**, bilingual French/English, designed
for a real tontine admin — not a throwaway demo.

**[Open the live demo](https://main.dhnfua5oyahpy.amplifyapp.com)** · demo account on request ·
no real money ever moves, tracking only.

</div>

<div align="center">
<img src="assets/brand/divider.svg" width="480" alt="Divider">
</div>

## What it does

| Area | Capability |
|---|---|
| Natural-language declarations | "I paid 20000 for Cheikh" → Bedrock extracts amount, member, recipient |
| Mobile Money OCR | Wave / Orange Money / MTN screenshots → amount, transaction ID, date |
| Empathic mediation | Gentle nudges, installment plans, tour swaps, anomaly detection |
| Emergency fund | Tontine Flex reserve that unlocks the recipient on critical lates |
| AI rotation order | Trust − lates + seniority; provisional lottery with no history |
| Audio digest | Cycle summary read aloud (Polly Léa / Joanna), FR/EN, with countdown |
| Tonti assistant | Answers and acts: emails and reminds members in natural language |
| Exportable ledger | CSV + printable preview to end disputes |

<div align="center">
<img src="assets/brand/divider.svg" width="480" alt="Divider">
</div>

## Landing

<div align="center">
<img src="assets/screenshots/landing-hero.png" width="660" alt="TontinePilot landing: hero with community network">
</div>

<details>
<summary><b>Product film, live demo and how it works</b></summary>

<div align="center">
<img src="assets/screenshots/landing-film.png" width="560" alt="Product film section">
<br><br>
<img src="assets/screenshots/landing-demo.png" width="560" alt="September cycle live demo section">
<br><br>
<img src="assets/screenshots/landing-how.png" width="560" alt="How it works section">
<br><br>
<img src="assets/screenshots/landing-features.png" width="560" alt="Capabilities section">
</div>

</details>

<div align="center">
<img src="assets/brand/divider.svg" width="480" alt="Divider">
</div>

## The app

<div align="center">
<img src="assets/screenshots/app-dashboard.png" width="660" alt="Dashboard: collection, contributions, emergency fund, alerts">
</div>

<details>
<summary><b>Sign in and groups</b></summary>

<div align="center">
<img src="assets/screenshots/app-login.png" width="560" alt="Animated sign-in with code verification">
<br><br>
<img src="assets/screenshots/app-groups.png" width="560" alt="Multi-group management with cycle progress">
</div>

</details>

<details>
<summary><b>Declare, members and alerts</b></summary>

<div align="center">
<img src="assets/screenshots/app-declare.png" width="560" alt="Declare by text or Mobile Money receipt">
<br><br>
<img src="assets/screenshots/app-members.png" width="560" alt="Members with trust scores">
<br><br>
<img src="assets/screenshots/app-alerts.png" width="560" alt="Alerts with filters and mediation">
</div>

</details>

<details>
<summary><b>Export and group creation</b></summary>

<div align="center">
<img src="assets/screenshots/app-export.png" width="560" alt="CSV ledger export">
<br><br>
<img src="assets/screenshots/app-group-new.png" width="560" alt="Five-step group creation wizard">
</div>

</details>

<div align="center">
<img src="assets/brand/divider.svg" width="480" alt="Divider">
</div>

## Stack

| Layer | Arsenal |
|---|---|
| Frontend | Next.js 16.3.6 · React 19.2.8 · Tailwind CSS 4 · Framer Motion 13.4.4 |
| Backend | Amplify Gen 2 · Cognito · AppSync GraphQL · DynamoDB · Lambda Node 22 · S3 |
| AI | Bedrock Converse: Claude Haiku 4.5 (NLU, mediation, chat) · Sonnet 4.5 (vision) · Polly (Léa, Joanna) · Textract (OCR fallback) |
| Infra | EventBridge Scheduler · SES · SNS · Amplify Hosting · CDK 2.271.0 |
| Quality | Strict TypeScript · Vitest (33 tests) · ESLint · GitHub Actions · Gitleaks |

## Architecture

```mermaid
%%{init: {"theme":"dark", "themeVariables": {"primaryColor":"#8B5CF6", "primaryTextColor":"#FAFAFA", "primaryBorderColor":"#8B5CF6", "lineColor":"#22D3EE"}}}%%
flowchart LR
    subgraph Client["Browser — Next.js FR/EN"]
        UI[Pages + Tonti chatbot]
    end
    subgraph AWS["AWS us-east-1"]
        COG[Cognito]
        API[AppSync]
        DB[(DynamoDB ×7)]
        FN[Lambda ×8]
        BR[Bedrock Haiku + Sonnet]
        PO[Polly]
        S3[(S3 receipts + audio)]
        EV[EventBridge Scheduler]
        MAIL[SES + SNS]
    end
    UI --> COG --> API --> DB
    API --> FN --> BR
    FN --> PO --> S3
    EV --> FN --> MAIL
```

Every AI call has a deterministic fallback — the app never hard-fails,
even with zero Bedrock quota.

<div align="center">
<img src="assets/brand/divider.svg" width="480" alt="Divider">
</div>

## Quickstart

```bash
git clone github.com:khadimmbaye0/tontine-pilot.git
cd tontine-pilot
npm install && npm run dev   # http://localhost:3101
```

Without a backend it runs on the built-in demo dataset. With `amplify_outputs.json`
(from `npx ampx sandbox`) and an account, it talks to live AWS data:

```bash
npx ampx sandbox --identifier tontine   # dev backend
npx tsx scripts/seed.ts                 # demo dataset (SEED_USER + SEED_PASSWORD)
npx tsx scripts/verify.ts               # 9 live checks
./scripts/deploy-functions.sh [fn...]   # push Lambda code
```

## API

| Operation | Input → Output |
|---|---|
| `parseDeclaration` | text + group → member, amount, recipient, confidence, EN translation |
| `parseReceipt` | S3 key + group → amount, transaction, recipient, date, provider |
| `draftNudge` | alert + locale → FR/EN message + proposal |
| `recommendRotationOp` | group → order, bilingual reasons, provisional flag |
| `buildDigest` | cycle + locale → script + mp3 URL |
| `sendNudge` / `resolveAlert` | alert → send / resolve (dedupeKey anti-doubles) |
| `notifyNewGroup` | group → welcome fan-out `{sent, skipped}` |
| `askAssistant` | question + locale + history → answer (+ member-email tool) |

## Quality

Strict TypeScript across three configs (app, `amplify/`, functions), 33 Vitest tests
(rotation, trust, parsers, intents, adapters), 9 live checks before every ship,
secret scans on every push, end-to-end `docs/` from idea to deployment.

<div align="center">
<img src="assets/brand/divider.svg" width="480" alt="Divider">
<br><br>
<b>TontinePilot — the tontine, piloted.</b>
<br><br>
MIT License · AWS Zero to Shipped
</div>
