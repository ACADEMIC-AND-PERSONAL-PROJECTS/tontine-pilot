# AI Features

All Bedrock calls go through `bedrock-runtime` Converse with explicit `maxTokens`
(unset maxTokens silently reserves ~43× quota — the #1 ThrottlingException cause),
`maxAttempts: 5, retryMode: "adaptive"`, and a deterministic fallback. Rule:
retry throttling/timeouts; never retry validation/access errors.

## Natural-language declarations
Haiku parses FR/EN/Wolof-inflected text → `{memberId, amount, recipientName,
confidence, rawTextEn}`. Heuristic fallback mirrors the same contract.
Strictness rule (both paths + server-side guard): names resolve ONLY against
group members — unknown payers return empty (never another member), the UI
blocks and proposes adding them with catch-up.

## Receipt OCR
S3 upload → Sonnet vision extracts amount, transaction ID, date, provider.
Textract `DetectDocumentText` is the quota-free fallback path.
Honest failure: unreadable receipts return `amount: null` (never the standard
contribution) — the UI shows an error and switches to manual entry.

## Mediation & reminders
Haiku drafts warm ≤40-word FR+EN nudges; installment/swap/emergency proposals
cite real balances and concrete high-trust candidates. Template fallback included.

## Rotation order
Deterministic core: `trust = clamp(50, 99, 92 − 7×lates + min(6, cycles))`,
sorted trust↓, lates↑, seniority↓. Haiku adds one-line FR+EN rationales.
Cold start (all-zero history) → provisional Fisher–Yates lottery, labeled as such.

## Tonti assistant chatbot
Two layers: (1) deterministic intent pre-router (regex, unit-tested) for
reminder/message requests — executes immediately with templated confirmation;
(2) Haiku with `send_member_email` tool (member resolution owner-scoped,
dedupe-guarded alerts, trust recompute, SES send) for everything else, plus
general platform Q&A with a scope guard (declines off-platform topics, never
invents features). Bot bubbles render safe rich markdown (bold/lists/headings,
no raw HTML). Reply language follows the user's message, not the UI.

## Audio digest
Cycle stats → script (FR/EN + deadline countdown) → Polly neural
(`Lea` fr-FR / `Joanna` en-US) → S3 mp3 → presigned URL → `<audio>`,
speechSynthesis fallback.
