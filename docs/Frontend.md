# Frontend

Next.js 16 App Router + Tailwind v4, `tontine-pilot/` is the repo root.
Design is frozen — backend/integration work must not change pixels.

## Routes
| Route | Purpose |
|---|---|
| `/` | Landing (hero, features, live demo preview, how-it-works) |
| `/login` | Animated auth card: sign in / sign up / 6-box code verify |
| `/dashboard` | KPIs, contributions, outstanding, AI alerts, fund, audio, past cycles |
| `/groups` | Multi-group management, switch active, archive |
| `/group/new` | 5-step wizard: group, amount, members+history, AI rotation, confirm |
| `/declare` | Text NLU tab + OCR receipt tab, confirm writes live rows + recomputes totals |
| `/members` | Trust scores, rotation preview |
| `/alerts` | Filter/search/paginate, accept/resolve/nudge, audio digest |
| `/export` | Live CSV + printable preview |

## Key client modules (`lib/`)
- `backend.ts` — typed AppSync client + `isBackendEnabled()` (outputs present?)
- `remote.ts` — AppSync row → UI type adapters (throw loudly on drift)
- `use-remote.ts` — `useRemoteGroup/Members/CycleData` with `loaded` flags
- `groups.tsx` — per-account cache (`tp-groups-<userId>`), owner-scoped sync with union merge, `EMPTY_GROUP` placeholder, `hasGroups`/`synced`
- `i18n.tsx` — FR/EN dictionaries, every string keyed

## Data policy (the "no fake data" rule)
- Backend on: remote rows win even when empty; new accounts see onboarding + real zeros.
- Backend off/unreachable: built-in demo dataset (Liberté) so the app always renders.
- Loading states resolve in all branches (empty list is a valid result, never a stuck spinner).

## Page contracts (data in → UI out)
- **dashboard**: active group (or onboarding when none) → KPI cards (collected,
  completion, members, alerts), contributions list (OK/Late/Pending badges),
  outstanding, AI alerts preview, fund bar, audio digest (real mp3 or local synth),
  past cycles (remote, open cycle excluded).
- **declare**: text → `parseDeclaration` → confirm writes Contribution + recomputes
  cycle/group totals → auto-redirect to dashboard. OCR → S3 upload under
  `receipts/<identityId>/` → `parseReceipt` → confirm with receiptKey.
- **alerts**: search + status/type filters + newest/oldest + 4-per-page pager;
  resolve writes through; nudge fires `sendNudge`; digest uses the real open cycle.
- **group/new**: 5 steps; email blur auto-fills history from previous groups;
  final step writes Group + Members + Cycle 1, fires welcome emails, redirects.
- **groups**: remote list with progress bars, open/archive/restore/delete (all mirrored).
- **members/export**: remote rows; empty states when blank.
- **login**: animated card, strength meter, 6-box OTP, resend cooldown only on
  success, post-verify auto sign-in.

## Design tokens (globals.css)
Backgrounds `--background #070913`, `--bg-raised #0c0f1a`, `--bg-subtle #1a1f35`;
accent `#8b5cf6`, fuchsia `#d946ef`, cyan `#22d3ee`, gold `#facc15`;
status ok `#10b981` / warn `#f59e0b` / danger `#ef4444` (each with `-soft` wash).
Signature components: `panel-luminous`, `luminous-wash`, `grid-overlay`,
`float-chip`, `scrollbar-thin` (themed, `color-scheme: dark`).
Geist Sans/Mono, tabular numbers for money, framer-motion easings
`[0.16,1,0.3,1]` / `[0.22,1,0.36,1]`.
