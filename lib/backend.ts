import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";

// Typed AppSync client. Amplify.configure(outputs) happens once in
// components/providers.tsx. All backend access goes through here so the
// USE_REMOTE switch lives in exactly one place.
export const client = generateClient<Schema>();

/** False in CI / pre-backend checkouts (no amplify_outputs.json) — pages
 *  must fall back to local demo data when this returns false. Supports both
 *  the legacy (API.GraphQL.endpoint) and Gen 2 (data.url) outputs shapes. */
export function isBackendEnabled(): boolean {
  try {
    const cfg = Amplify.getConfig() as {
      API?: { GraphQL?: { endpoint?: string } };
      data?: { url?: string };
    };
    return Boolean(cfg?.API?.GraphQL?.endpoint ?? cfg?.data?.url);
  } catch {
    return false;
  }
}

export type { Schema };
