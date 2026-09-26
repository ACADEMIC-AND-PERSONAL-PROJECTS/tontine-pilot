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
| Emergency fund (Tontine Flex) | Optional reserve covering critical lates, repaid over ~2 cycles |
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
