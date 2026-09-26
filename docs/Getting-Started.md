# Getting Started

## Try the live app
1. Open https://main.dhnfua5oyahpy.amplifyapp.com
2. Sign up with your email → enter the 6-digit code → you land on an empty dashboard.
3. **Create your first group**: name, start/end dates, amount, frequency, members (name + email + phone + history).
4. **Declare**: write "I paid 20000 for Cheikh" or upload a receipt screenshot, confirm.
5. Watch the dashboard update, play the audio digest, ask Tonti (bottom-right) anything.

Password rule: 8+ chars, a lowercase letter and a number (e.g. `Tontine2026!`).

## Run locally
```bash
git clone github.com:khadimmbaye0/tontine-pilot.git
cd tontine-pilot
npm install && npm run dev   # http://localhost:3000
```
Without backend outputs the app runs on the built-in demo dataset (Liberté group).
With `amplify_outputs.json` (from `npx ampx sandbox`) + login, it talks to live AWS data.

## Key commands
| Command | Purpose |
|---|---|
| `npm test` | 33+ unit/integration tests (vitest) |
| `npx tsc --noEmit` | typecheck app (amplify/ and functions have their own configs) |
| `npm run build` | production build |
| `npx tsx scripts/seed.ts` | seed demo dataset (needs SEED_USER/SEED_PASSWORD) |
| `npx tsx scripts/verify.ts` | 9 live backend checks |
| `./scripts/deploy-functions.sh [fn...]` | push Lambda code (see Deployment quirks) |
