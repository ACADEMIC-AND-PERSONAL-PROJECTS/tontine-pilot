import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { parseDeclaration } from "./functions/parse-declaration/resource";
import { parseReceipt } from "./functions/parse-receipt/resource";
import { mediate } from "./functions/mediate/resource";
import { recommendRotation } from "./functions/recommend-rotation/resource";
import { digestAudio } from "./functions/digest-audio/resource";
import { remindersWorker } from "./functions/reminders-worker/resource";
import { assistant } from "./functions/assistant/resource";
import { notify } from "./functions/notify/resource";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import * as scheduler from "aws-cdk-lib/aws-scheduler";
import * as targets from "aws-cdk-lib/aws-scheduler-targets";

const backend = defineBackend({
  auth,
  data,
  storage,
  parseDeclaration,
  parseReceipt,
  mediate,
  recommendRotation,
  digestAudio,
  remindersWorker,
  assistant,
  notify,
});

const ACCOUNT = process.env.AWS_ACCOUNT_ID;
if (!ACCOUNT) {
  throw new Error(
    "AWS_ACCOUNT_ID env var is required to synthesize the backend (no default — never commit an account ID)."
  );
}

// Explicit AppSync endpoint for all functions (no $amplify/env magic).
// NOTE: must be a STATIC string — referencing cfnGraphqlApi.attrGraphQlUrl
// here creates a DataStack<->FunctionStack circular dependency (custom-op
// datasources already point Data->Function). Bucket name is stable per
// sandbox; refresh it if the storage stack is ever replaced.
const STORAGE_BUCKET = "amplify-tontinepilot-tont-tontinefilesbucket763269-y2kcqdz2gtzg";
for (const fn of [backend.parseReceipt, backend.digestAudio]) {
  fn.addEnvironment("STORAGE_BUCKET", STORAGE_BUCKET);
}

// Bedrock invoke on inference profiles (dual-ARN least privilege, skill: amazon-bedrock).
// Quotas granted in us-east-1 -> us.* profiles.
for (const fn of [
  backend.parseDeclaration,
  backend.parseReceipt,
  backend.mediate,
  backend.recommendRotation,
  backend.assistant,
]) {
  fn.addEnvironment("BEDROCK_REGION", "us-east-1");
  fn.resources.lambda.addToRolePolicy(
    new PolicyStatement({
      actions: ["bedrock:InvokeModel"],
      resources: [
        `arn:aws:bedrock:us-east-1:${ACCOUNT}:inference-profile/us.anthropic.*`,
        `arn:aws:bedrock:us-east-1:${ACCOUNT}:application-inference-profile/*`,
        `arn:aws:bedrock:*::foundation-model/anthropic.claude-*`,
      ],
    })
  );
}

const bucket = backend.storage.resources.bucket;
backend.parseReceipt.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["s3:GetObject"],
    resources: [`${bucket.bucketArn}/receipts/*`],
  })
);
// Polly SynthesizeSpeech has no resource-level scoping -> "*" required.
backend.digestAudio.resources.lambda.addToRolePolicy(
  new PolicyStatement({ actions: ["polly:SynthesizeSpeech"], resources: ["*"] })
);
backend.digestAudio.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["s3:GetObject", "s3:PutObject"],
    resources: [`${bucket.bucketArn}/digests/*`],
  })
);
backend.digestAudio.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["textract:DetectDocumentText"],
    resources: ["*"], // Textract is account-scoped, no resource ARNs
  })
);
backend.remindersWorker.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["ses:SendEmail", "ses:SendRawEmail"],
    resources: ["*"], // SES identities verified at send time
  })
);
backend.remindersWorker.resources.lambda.addToRolePolicy(
  new PolicyStatement({ actions: ["sns:Publish"], resources: ["*"] })
);
backend.notify.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["ses:SendEmail", "ses:SendRawEmail"],
    resources: ["*"], // SES identities verified at send time
  })
);
backend.assistant.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["ses:SendEmail", "ses:SendRawEmail"],
    resources: ["*"], // chatbot member emails (same sender identity)
  })
);

// Daily cron 08:00 UTC (= 08:00 Dakar) -> remindersWorker, mock-send by default.
const schedStack = backend.createStack("ReminderSchedule");
const schedRole = new Role(schedStack, "SchedulerRole", {
  assumedBy: new ServicePrincipal("scheduler.amazonaws.com"),
});
schedRole.addToPolicy(
  new PolicyStatement({
    actions: ["lambda:InvokeFunction"],
    resources: [backend.remindersWorker.resources.lambda.functionArn],
  })
);
new scheduler.CfnSchedule(schedStack, "DailyReminders", {
  name: "tontine-daily-reminders",
  scheduleExpression: "cron(0 8 * * ? *)",
  flexibleTimeWindow: { mode: "OFF" },
  target: {
    arn: backend.remindersWorker.resources.lambda.functionArn,
    roleArn: schedRole.roleArn,
    input: JSON.stringify({ trigger: "cron-daily" }),
  },
});
