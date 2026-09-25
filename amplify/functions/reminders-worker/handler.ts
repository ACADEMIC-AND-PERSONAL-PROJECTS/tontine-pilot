import type { Handler } from "aws-lambda";
import { dataClient } from "../_shared/data-client";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { NLU_PROFILE, USE_MOCK, converseText, extractJson, log } from "../_shared/bedrock";
import { dedupeKey, templateNudge } from "../_shared/fallbacks";

const client = dataClient();

const region = process.env.AWS_REGION ?? "eu-west-1";
const ses = new SESClient({ region });
const sns = new SNSClient({ region });
const MOCK_SEND = (process.env.MOCK_SEND ?? "true").toLowerCase() !== "false";

type AlertRow = NonNullable<Awaited<ReturnType<typeof client.models.Alert.get>>["data"]>;

async function draftFor(alert: AlertRow, memberName: string, amount: number) {
  if (USE_MOCK) {
    const t = templateNudge(memberName, amount, "septembre", alert.type === "REMINDER" ? "reminder" : "late");
    return { fr: t.message_fr, en: t.message_en };
  }
  try {
    const raw = await converseText(NLU_PROFILE, "Write a warm ≤40-word late-payment reminder in FR + EN. Return ONLY JSON {\"message_fr\":\"...\",\"message_en\":\"...\"}", `Member ${memberName}, amount ${amount} FCFA, type ${alert.type}`, 400);
    const p = extractJson(raw) as { message_fr: string; message_en: string };
    return { fr: p.message_fr, en: p.message_en };
  } catch (err) {
    log(`FALLBACK: draft failed (${(err as Error)?.message})`);
    const t = templateNudge(memberName, amount, "septembre", "late");
    return { fr: t.message_fr, en: t.message_en };
  }
}

async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  if (MOCK_SEND) {
    log(`SEND email mocked to=${to.slice(0, 3)}*** subject=${subject}`);
    return true;
  }
  try {
    await ses.send(new SendEmailCommand({
      Source: process.env.SES_FROM,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: { Text: { Data: body, Charset: "UTF-8" } },
      },
    }));
    log(`SEND email to=${to.slice(0, 3)}***`);
    return true;
  } catch (err) {
    log(`SEND_FAIL email (${(err as Error)?.message})`);
    return false;
  }
}

async function sendSms(phone: string, body: string): Promise<boolean> {
  if (MOCK_SEND) {
    log("SEND sms mocked");
    return true;
  }
  try {
    await sns.send(new PublishCommand({
      PhoneNumber: phone,
      Message: body,
      MessageAttributes: {
        "AWS.SNS.SMS.SMSType": { DataType: "String", StringValue: "Transactional" },
      },
    }));
    log("SEND sms");
    return true;
  } catch (err) {
    log(`SEND_FAIL sms (${(err as Error)?.message})`);
    return false;
  }
}

export const handler: Handler = async (event) => {
  const input = (event ?? {}) as { trigger?: string; alertId?: string };
  // Manual path: regenerate + send a single alert.
  if (input.trigger === "manual" && input.alertId) {
    const alert = (await client.models.Alert.get({ id: input.alertId })).data;
    if (!alert) throw new Error("VALIDATION: unknown alert");
    const member = alert.memberId ? (await client.models.Member.get({ id: alert.memberId })).data : null;
    const group = alert.groupId ? (await client.models.Group.get({ id: alert.groupId })).data : null;
    const d = await draftFor(alert, alert.memberName ?? "?", group?.contributionAmount ?? 20000);
    const body = `${d.fr}\n\n${d.en}\n\n${process.env.APP_URL}/alerts`;
    const sentEmail = member?.email ? await sendEmail(member.email, "TontinePilot — rappel / reminder", body) : false;
    const sentSms = member?.notifySms && member?.phone ? await sendSms(member.phone, d.fr) : false;
    return { sentEmail, sentSms };
  }

  // Cron path: scan all live groups, dedupe-guarded alert creation + sends.
  let created = 0;
  let emailed = 0;
  const groups = (await client.models.Group.list({ filter: { archived: { ne: true } } })).data;
  for (const group of groups) {
    try {
      const cycle = (
        await client.models.Cycle.list({ filter: { groupId: { eq: group.id }, status: { eq: "OPEN" } } })
      ).data[0];
      if (!cycle) continue;
      const members = (await client.models.Member.list({ filter: { groupId: { eq: group.id } } })).data;
      const contribs = (await client.models.Contribution.list({ filter: { cycleId: { eq: cycle.id } } })).data;
      const byMember = new Map(contribs.map((c) => [c.memberId, c]));
      for (const m of members) {
        try {
          const c = byMember.get(m.id);
          if (c && c.status === "CONFIRMED") continue;
          const key = dedupeKey(group.id, cycle.id, m.id, "LATE_PAYMENT");
          const existing = (
            await client.models.Alert.list({ filter: { dedupeKey: { eq: key }, resolved: { eq: false } } })
          ).data;
          if (existing.length > 0) continue; // idempotent: never double-alert
          const d = await draftFor(
            { type: "LATE_PAYMENT" } as AlertRow, m.name, group.contributionAmount
          );
          await client.models.Alert.create({
            groupId: group.id, cycleId: cycle.id, memberId: m.id, memberName: m.name,
            type: "LATE_PAYMENT", message: d.fr, messageEn: d.en,
            createdAt: new Date().toISOString(), resolved: false, dedupeKey: key,
          });
          created++;
          if (await sendEmail(m.email, "TontinePilot — rappel / reminder", `${d.fr}\n\n${d.en}\n\n${process.env.APP_URL}/alerts`)) emailed++;
          if (m.notifySms && m.phone) await sendSms(m.phone, d.fr);
        } catch (err) {
          log(`MEMBER_FAIL member=${m.id} (${(err as Error)?.message})`);
        }
      }
    } catch (err) {
      log(`GROUP_FAIL group=${group.id} (${(err as Error)?.message})`);
    }
  }
  log(`CRON_DONE created=${created} emailed=${emailed}`);
  return { sentEmail: emailed > 0, sentSms: false };
};
