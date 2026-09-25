import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import type { Schema } from "../../data/resource";

// resourceConfig (endpoint + model introspection from S3) comes from the
// official helper — verified working. Credentials do NOT come from its
// libraryOptions: that provider reads AWS_ACCESS_KEY_ID-style env vars,
// which are not reliably present in the Lambda runtime. fromNodeProviderChain
// covers env + ECS container endpoint (what Lambda actually sets) + shared
// config, so it is strictly more robust. Verified: direct helper = NoCredentials.
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  process.env as unknown as Parameters<
    typeof getAmplifyDataClientConfig
  >[0]
);
// M8t merge inside aws-amplify discards a custom Auth.credentialsProvider
// unless resourceConfig carries an Auth key — spread an empty one through.
Amplify.configure(
  { ...resourceConfig, Auth: {} } as Parameters<
    typeof Amplify.configure
  >[0],
  libraryOptions
);

export function dataClient() {
  return generateClient<Schema>();
}

// Force bundle refresh sentinel (keeps deploys honest while iterating).
export const DATA_CLIENT_REV = 3;
// redeploy-marker 2026-09-25T22:24:50Z
