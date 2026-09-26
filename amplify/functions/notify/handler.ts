import type { Handler } from "aws-lambda";
import { dataClient } from "../_shared/data-client";
import type { Schema } from "../../data/resource";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { log } from "../_shared/bedrock";
import { welcomeHtml } from "../_shared/email";

console.log("HANDLER_REV=1");

const client = dataClient();

const region = process.env.AWS_REGION ?? "us-east-1";
const ses = new SESClient({ region });
const MOCK = (process.env.MOCK_SEND ?? "false").toLowerCase() !== "false";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const handler: Handler = async (event) => {
  const args = (event as { arguments?: { groupId?: string } }).arguments ?? {};
  if (!args.groupId) throw new Error("VALIDATION: groupId required");
  const group = (await client.models.Group.get({ id: args.groupId })).data;
  if (!group) throw new Error("VALIDATION: unknown group");
  const members = (
    await client.models.Member.list({ filter: { groupId: { eq: group.id } } })
  ).data;

  const appUrl = process.env.APP_URL ?? "https://main.dhnfua5oyahpy.amplifyapp.com";
  const logoUrl = process.env.LOGO_URL ?? `${appUrl}/logo.jpeg`;
  let sent = 0;
  let skipped = 0;
  for (const m of members) {
    try {
      const email = (m.email ?? "").trim();
      if (!EMAIL_RE.test(email)) {
        skipped++;
        continue;
      }
      const mail = welcomeHtml({
        memberName: m.name,
        groupName: group.name,
        amount: group.contributionAmount,
        frequency: group.frequency ?? "MONTHLY",
        memberCount: group.memberCount,
        members: members.map((x) => x.name),
        fundTarget: group.emergencyFundTarget,
        appUrl,
        logoUrl,
      });
      if (MOCK) {
        log(`SEND welcome mocked to=${email.slice(0, 3)}***`);
      } else {
        await ses.send(
          new SendEmailCommand({
            Source: process.env.SES_FROM,
            Destination: { ToAddresses: [email] },
            Message: {
              Subject: { Data: mail.subject, Charset: "UTF-8" },
              Body: {
                Html: { Data: mail.html, Charset: "UTF-8" },
                Text: { Data: mail.text, Charset: "UTF-8" },
              },
            },
          })
        );
        log(`SEND welcome to=${email.slice(0, 3)}***`);
      }
      sent++;
    } catch (err) {
      // sandbox rejections (unverified recipient) must never break creation
      log(`SEND_FAIL welcome member=${m.id} (${(err as Error)?.message})`);
      skipped++;
    }
  }
  return { sent, skipped };
};
