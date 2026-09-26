# Auth

Cognito User Pool (us-east-1): email + password + 6-digit email code.
Sign-up → code → auto sign-in. Unconfirmed sign-in attempts auto-resend and
route to verification. Password policy == UI message exactly: min 8, lowercase
+ number required (no uppercase/symbol gate) — enforced pool-side so judges
never hit a surprise rejection.

## Frontend (`/login`, `components/auth/`)
Platform-styled animated card (aurora + grid like the hero), three sliding steps:
sign in (show/hide password), sign up (live strength meter), verify (6-box OTP
with paste support, 60s resend cooldown that restarts only on success, explicit
success/error notices). All Cognito errors map to friendly FR/EN strings —
raw SDK text never surfaces. Transitions are gated on real success (no fake
navigation). Session persists refresh; `(app)` layout redirects logged-out users
to `/login`. Header avatar shows user initials with a profile menu (name, email,
log out).

## Demo access
Pre-confirmed judge account documented in the submission (never in the repo).
New accounts start empty (see [Data-and-Trust](Data-and-Trust.md)).
