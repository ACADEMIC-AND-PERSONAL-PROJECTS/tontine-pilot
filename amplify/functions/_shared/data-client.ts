import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import type { Schema } from "../../data/resource";

// Explicit AppSync wiring — no $amplify/env magic (see backend-plan/04 notes).
// Endpoint is injected at deploy time via addEnvironment in amplify/backend.ts.
// Auth: IAM SigV4 with the Lambda execution role (ambient credentials chain).
const region = process.env.AWS_REGION ?? "eu-west-1";
const rawEndpoint = process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT;
if (!rawEndpoint) throw new Error("CONFIG: AMPLIFY_DATA_GRAPHQL_ENDPOINT missing");
const endpoint: string = rawEndpoint;

let configured = false;

export function dataClient() {
  if (!configured) {
    Amplify.configure(
      {
        API: {
          GraphQL: { endpoint, region, defaultAuthMode: "iam" },
        },
      },
      {
        Auth: {
          credentialsProvider: {
            getCredentialsAndIdentityId: async () => {
              const credentials = await fromNodeProviderChain()();
              return { credentials, identityId: undefined };
            },
            clearCredentialsAndIdentityId: () => {},
          },
        },
      }
    );
    configured = true;
  }
  return generateClient<Schema>({ authMode: "iam" });
}
