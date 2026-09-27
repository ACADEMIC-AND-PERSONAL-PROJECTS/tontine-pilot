# Data & Trust

## Isolation (the SaaS rule)
Groups and members carry an explicit `ownerId` (implicit `owner` filtering
proved unreliable in AppSync and was replaced). Reads are owner-scoped;
the per-account localStorage cache (`tp-groups-<userId>`) unions with remote
rows (remote wins) so offline creates and read-after-write races never lose
data, and two accounts never see each other. New users get `EMPTY_GROUP`
(zeros) + onboarding CTAs — demo figures are impossible for them.
The Liberté seed belongs to the demo account only.

## Trust-score engine (`amplify/functions/_shared/trust.ts`)
Single source of truth: `trust = clamp(50, 99, 92 − 7×lateCount + min(6, cyclesCompleted))`.
Every `LATE_PAYMENT` creation (cron, manual nudge, chatbot) runs `applyLateEvent`:
lateCount+1, recompute, persist — so the next rotation prices fresh behavior.
Unit-tested (`lib/__tests__/trust.test.ts`).

## Membership changes
- **Mid-group join** (`lib/catchup.ts`): missed cycles → LATE contributions +
  one alert each, open cycles → PENDING, `memberCount` and cycle expectations
  bumped, trust initialized from missed count. Idempotent per cycle.
- **Cycle close** (dashboard CTA, human-confirmed): current → CLOSED, next opens
  with anchored dates and the next recipient in rotation order; replays reuse
  the existing N+1 instead of duplicating.
- **Group delete** cascades (children first) — no orphan members/cycles/ledger rows.

## Cold start
First cycle with zero history → provisional lottery order, labeled as such —
matching how real tontines draw lots. Typing a known email at group creation
auto-fills history from previous groups (best match by seniority).

## Durability
DynamoDB is the system of record. PITR enabled on all 7 tables + dated manual
backups. Lesson learned: an Amplify schema update once replaced tables (seed
wiped, reseeded) — rule until winners announced: additive schema changes only,
backup first, never delete the sandbox stack.
