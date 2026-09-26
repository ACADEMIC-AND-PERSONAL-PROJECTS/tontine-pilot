# Testing

## Automated (CI on every push: typecheck + lint + tests + build + gitleaks)
- `lib/__tests__/`: rotation order, formatters, backend adapters, fallback
  heuristics, receipt parsing, digest scripts, trust engine, chatbot intent +
  locale detection (33+ tests, vitest).
- Handler logic lives in pure `_shared/` modules precisely so it is unit-testable;
  thin handlers stay untested by design.

## Live verification scripts (`scripts/`, tsx + signed-in demo user)
| Script | Proves |
|---|---|
| `verify.ts` | 9/9: NLU parse, rotation, digest script+mp3, mock nudge, AI draft |
| `verify-assistant.ts` | FR + EN answers, off-topic decline |
| `verify-tool.ts` | reminder tool: alert created + trust bumped (hermetic temp member) |
| `verify-ocr.ts` | receipt PNG → amount/ID/provider @0.95 |
| `verify-notify.ts` | welcome fan-out degrades gracefully in sandbox |
| `verify-realsend.ts` | inbox-to-inbox delivery (verified identities) |
| `seed.ts` | idempotent seed (create-or-update) · `cleanup-alerts.ts` hygiene |

## Manual checklist (pre-ship)
Auth full loop in FR + EN · declare→dashboard refresh · OCR upload · rotation
with history · audio play/stop · export CSV row counts · chatbot email action ·
empty new-account tour · hard-refresh after each deploy (CDN staleness bites).
