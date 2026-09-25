import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";

// Typed AppSync client. Amplify.configure(outputs) happens once in
// components/providers.tsx. All backend access goes through here so the
// USE_REMOTE switch lives in exactly one place.
export const client = generateClient<Schema>();

/** False in CI / pre-backend checkouts (no amplify_outputs.json) — pages
 *  must fall back to local demo data when this returns false. */
export function isBackendEnabled(): boolean {
  try {
    const cfg = Amplify.getConfig() as { API?: { GraphQL?: { endpoint?: string } } };
    return Boolean(cfg?.API?.GraphQL?.endpoint);
  } catch {
    return false;
  }
}

export type { Schema };
