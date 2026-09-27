// Pure auth helpers (no React, no Amplify calls) — unit-tested.

/** True when Cognito rejects a confirmation because the account is already
 *  confirmed (code retried after success). Real message: "User cannot be
 *  confirmed. Current status is CONFIRMED". */
export function isAlreadyConfirmedError(e: unknown): boolean {
  const name = (e as { name?: string })?.name ?? "";
  const msg = (e as Error)?.message ?? "";
  return (
    /NotAuthorized/.test(name) &&
    (/already.+confirmed/i.test(msg) || /current status is confirmed/i.test(msg))
  );
}

export function passwordScore(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/\d/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (pw.length >= 12) s++;
  return s;
}
