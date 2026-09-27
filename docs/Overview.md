# Overview

**TontinePilot** is an AI copilot for community rotating savings groups (tontines).
A tontine: N members contribute a fixed amount each cycle; each cycle one member receives the pot.
Today this runs on notebooks and WhatsApp threads — disputes over "I paid / no you didn't" are the norm.

## What it does
| Feature | How |
|---|---|
| Natural-language declarations | "I paid 20000 for Cheikh" → Bedrock NLU extracts amount, member, recipient |
| Mobile Money OCR | Wave / Orange Money / MTN screenshots → Bedrock Vision (Textract fallback) |
| Empathic mediation | Warm FR/EN reminders, installment and tour-swap proposals, anomaly detection |
| Emergency fund (Tontine Flex) | Reserve with its own menu: top-ups, safety-net payouts on Accept, repayments, history; target per group |
| Dual currency | FCFA or USD per group — formatting, parsing, OCR, emails and digests follow |
| Mid-group members | Add members anytime with full catch-up (late dues + alerts, honest trust) |
| Cycle close | Close a complete/overdue cycle → next opens automatically, rotation advances |
| AI rotation order | Trust − lates + seniority; provisional lottery when no history exists |
| Audio digest | Real Polly neural voices (Léa FR / Joanna EN), adaptive per language |
| Assistant chatbot (Tonti) | Bedrock-powered, answers + sends member emails/reminders in natural language |
| Exportable ledger | CSV + printable preview ending disputes |
| Multi-group management | Switch, archive, per-account isolation |

## Who it serves
Community savings groups in Senegal and beyond (12-member pilot: "Tontine Quartier Liberté"),
admins who reconcile payments, members with low literacy (audio-first inclusive design).

## Product principles
1. **Real zeros, never fake data** — new accounts start empty with onboarding, not demo figures.
2. **Bilingual FR/EN everywhere**, including AI outputs and emails.
3. **Human in the loop** — AI proposes, admin confirms (rotation, mediation, declarations).
4. **Graceful degradation** — every AI call has a deterministic fallback; the app never hard-fails.
5. **Tracking only** — never moves real money.

## 3-minute demo script (for judges and video)
1. **Landing (30s)**: hero → live demo preview (September cycle, 83% bar animating).
2. **Declare (45s)**: type "Moussa a payé 20000 pour Cheikh" → structured result with
   confidence → confirm → dashboard collected ticks up.
3. **OCR (30s)**: upload Wave screenshot → amount + transaction ID extracted → confirm.
4. **Alerts (30s)**: open Ibrahima's late alert → accept installment plan → mark resolved.
5. **Audio + export (30s)**: play the Léa-voiced digest → download the CSV ledger.
6. **Chatbot (15s)**: "remind Ibrahima he is late" → confirmation with trust recalculated.

## Repository map
- `tontine-pilot/` — Next.js app + Amplify backend + scripts (this repo).
- `tontine-pilot/app/` — routes (`(app)/` protected, `/login`, landing `/`).
- `tontine-pilot/components/` — `app/` (shell, chatbot), `auth/` (login flow),
  `landing/`, `ui/` (design system primitives).
- `tontine-pilot/lib/` — `fake-data.ts` (demo dataset + bilingual helpers),
  `groups.tsx` (multi-group store), `backend.ts` / `remote.ts` / `use-remote.ts`
  (live-data layer), `i18n.tsx` (FR/EN dictionaries).
- `tontine-pilot/amplify/` — Gen 2 backend: `auth/`, `data/resource.ts` (schema),
  `storage/`, `functions/` (8 Lambdas), `backend.ts` (wiring, IAM, scheduler).
- `tontine-pilot/scripts/` — `seed.ts`, `verify*.ts` (live checks), `deploy-functions.sh`.
- `tontine-pilot/docs/` — this documentation.
