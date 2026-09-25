import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import type { Schema } from "../../data/resource";

// resourceConfig (endpoint + model introspection from S3) comes from the
// official helper — verified working. Credentials do NOT come from its
// libraryOptions: that provider reads AWS_ACCESS_KEY_ID-style env vars,
// which are not reliably present in the Lambda runtime. fromNodeProviderChain
// covers env + ECS container endpoint (what Lambda actually sets) + shared
// config, so it is strictly more robust. Verified: direct helper = NoCredentials.
const { resourceConfig } = await getAmplifyDataClientConfig(
  process.env as unknown as Parameters<
    typeof getAmplifyDataClientConfig
  >[0]
);
Amplify.configure(resourceConfig, {
  Auth: {
    credentialsProvider: {
      getCredentialsAndIdentityId: async () => {
        const credentials = await fromNodeProviderChain()();
        return { credentials, identityId: undefined };
      },
      clearCredentialsAndIdentityId: () => {},
    },
  },
});

export function dataClient() {
  return generateClient<Schema>();
}
