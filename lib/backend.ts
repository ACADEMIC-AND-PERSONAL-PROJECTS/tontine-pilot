import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";

// Typed AppSync client. Amplify.configure(outputs) happens once in
// components/providers.tsx. All backend access goes through here so the
// USE_REMOTE switch lives in exactly one place.
export const client = generateClient<Schema>();

export type { Schema };
