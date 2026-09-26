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
