import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { Schema } from "../../data/resource";

// Official Amplify pattern WITHOUT the $amplify/env import (which has no
// bundler resolver in this toolchain): $amplify/env/<fn> is literally
// `process.env` with generated types, and the DATA_* vars below are
// auto-injected because the schema grants allow.resource(fn) (see
// amplify/data/resource.ts schema authorization).
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as unknown as Parameters<
    typeof getAmplifyDataClientConfig
  >[0]
);
Amplify.configure(resourceConfig, libraryOptions);

export function dataClient() {
  return generateClient<Schema>();
}
