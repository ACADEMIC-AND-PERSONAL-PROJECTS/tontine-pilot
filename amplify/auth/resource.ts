import { defineAuth } from "@aws-amplify/backend";

export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailSubject:
        "TontinePilot — ton code de vérification / your verification code",
    },
  },
  userAttributes: { email: { required: true, mutable: false } },
  // NOTE: this @aws-amplify/backend version exposes no passwordPolicy key —
  // Cognito defaults apply (8+ chars). Policy enforced client-side in the
  // signup form (06.5). Logged in backend-plan DECISIONS area (04.1).
});
