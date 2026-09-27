import { fetchAuthSession } from "aws-amplify/auth";

/** Read the Cognito sub for the last-authenticated user directly from
 *  storage (no Amplify session needed). Returns null when absent. */
export function subFromStorage(storage: {
  getItem: (k: string) => string | null;
  key?: (i: number) => string | null;
  readonly length?: number;
}): string | null {
  try {
    if (typeof storage.length !== "number" || !storage.key) return null;
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      const m = k?.match(/^CognitoIdentityServiceProvider\.([^.]+)\.LastAuthUser$/);
      if (!m) continue;
      const sub = storage.getItem(k as string);
      if (!sub) continue;
      // Only trust it when tokens were actually persisted for that sub.
      if (
        storage.getItem(`CognitoIdentityServiceProvider.${m[1]}.${sub}.idToken`)
      ) {
        return sub;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Resolve the current user's sub robustly:
 *  1. Amplify session tokens (normal path),
 *  2. retry while Amplify hydrates from storage (post-login race),
 *  3. direct storage read (stale/partial Amplify state).
 *  Throws only when no identity can be established. */
export async function sessionUserId(): Promise<string> {
  const deadline = Date.now() + 10000;
  for (;;) {
    try {
      const session = await fetchAuthSession();
      const sub = session.tokens?.idToken?.payload?.sub as string | undefined;
      if (sub) return sub;
    } catch {
      // fall through to storage fallback below
    }
    if (typeof window !== "undefined") {
      const direct = subFromStorage(window.localStorage);
      if (direct) return direct;
    }
    if (Date.now() > deadline) throw new Error("no-session");
    await new Promise((r) => setTimeout(r, 400));
  }
}
