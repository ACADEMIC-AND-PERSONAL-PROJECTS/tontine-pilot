import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "tontineFiles",
  access: (allow) => ({
    "receipts/{entity_id}/*": [
      allow.authenticated.to(["read", "write", "delete"]),
    ],
    "digests/*": [allow.authenticated.to(["read", "write"])],
  }),
});
