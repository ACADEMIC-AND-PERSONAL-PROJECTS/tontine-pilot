import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import outputs from "../amplify_outputs.json";
import intro from "/tmp/intro.json";

const endpoint = (outputs as Record<string, Record<string, string>>).data.url;
Amplify.configure(
  {
    API: {
      GraphQL: {
        endpoint,
        region: "eu-west-1",
        defaultAuthMode: "iam",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        modelIntrospection: intro as any,
      },
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

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = generateClient<any>();
  console.log("models keys:", Object.keys(client.models ?? {}));
  const r = await client.models.Group.get({ id: "group-1" }, { authMode: "iam" });
  console.log("get result:", JSON.stringify(r.data)?.slice(0, 120), "errors:", JSON.stringify(r.errors));
}
main().catch((e) => console.error("THREW", e));
