import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";

async function main() {
  const env = {
    ...process.env,
    AMPLIFY_DATA_DEFAULT_NAME: "amplifyData",
    AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_BUCKET_NAME:
      "amplify-tontinepilot-tont-modelintrospectionschema-wqmzs3v7nldj",
    AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_KEY: "modelIntrospectionSchema.json",
    AMPLIFY_DATA_GRAPHQL_ENDPOINT: "https://example.appsync-api.eu-west-1.amazonaws.com/graphql",
  };
  const { resourceConfig } = await getAmplifyDataClientConfig(env);
  const models = Object.keys(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((resourceConfig as any).API?.GraphQL?.modelIntrospection as any)?.models ?? {}
  );
  console.log("introspection models:", models);
}

main().catch((e) => console.error("HELPER_FAIL", e));
