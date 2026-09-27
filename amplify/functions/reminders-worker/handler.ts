import type { Handler } from "aws-lambda";
import { dataClient } from "../_shared/data-client";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { NLU_PROFILE, USE_MOCK, converseText, extractJson, log } from "../_shared/bedrock";
import { dedupeKey, templateNudge } from "../_shared/fallbacks";
import { applyLateEvent } from "../_shared/trust";
import { reminderHtml } from "../_shared/email";
console.log("HANDLER_REV=3");

const client = dataClient();

const region = process.env.AWS_REGION ?? "us-east-1";
const ses = new SESClient({ region });
const sns = new SNSClient({ region });
const MOCK_SEND = (process.env.MOCK_SEND ?? "true").toLowerCase() !== "false";

type AlertRow = NonNullable<Awaited<ReturnType<typeof client.models.Alert.get>>["data"]>;

async function draftFor(alert: AlertRow, memberName: string, amount: number, currency?: string | null) {
  if (USE_MOCK) {
    const t = templateNudge(memberName, amount, "septembre", alert.type === "REMINDER" ? "reminder" : "late", currency);
    return { fr: t.message_fr, en: t.message_en };
  }
  try {
    const raw = await converseText(NLU_PROFILE, "Write a warm ≤40-word late-payment reminder in FR + EN. Return ONLY JSON {\"message_fr\":\"...\",\"message_en\":\"...\"}", `Member ${memberName}, amount ${amount} FCFA, type ${alert.type}`, 400);
    const p = extractJson(raw) as { message_fr: string; message_en: string };
    return { fr: p.message_fr, en: p.message_en };
  } catch (err) {
    log(`FALLBACK: draft failed (${(err as Error)?.message})`);
    const t = templateNudge(memberName, amount, "septembre", "late", currency);
    return { fr: t.message_fr, en: t.message_en };
  }
}

export type MailBody = { subject: string; html: string; text: string };

async function sendEmail(to: string, mail: MailBody): Promise<boolean> {
  if (MOCK_SEND) {
    log(`SEND email mocked to=${to.slice(0, 3)}*** subject=${mail.subject}`);
    return true;
  }
  try {
    await ses.send(new SendEmailCommand({
      Source: process.env.SES_FROM,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: mail.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: mail.html, Charset: "UTF-8" },
          Text: { Data: mail.text, Charset: "UTF-8" },
        },
      },
    }));
    log(`SEND email to=${to.slice(0, 3)}***`);
    return true;
  } catch (err) {
    log(`SEND_FAIL email (${(err as Error)?.message})`);
    return false;
  }
}

function brandedReminder(opts: {
  memberName: string; groupName: string; amount: number; cycleLabel: string; late: boolean;
}): MailBody {
  const appUrl = process.env.APP_URL ?? "https://main.dhnfua5oyahpy.amplifyapp.com";
  const logoUrl = process.env.LOGO_URL ?? `${appUrl}/logo.jpeg`;
  return reminderHtml({ ...opts, appUrl, logoUrl });
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
  const raw = (event ?? {}) as {
    trigger?: string;
    alertId?: string;
    action?: string;
    arguments?: { alertId?: string; action?: string };
  };
  // Owner-proof resolve: Lambda-created rows are not updatable by users
  // directly (owner rule), so resolution goes through this function.
  const action = raw.action ?? raw.arguments?.action;
  const actionAlertId = raw.alertId ?? raw.arguments?.alertId;
  if (action === "resolve" && actionAlertId) {
    const updated = await client.models.Alert.update({ id: actionAlertId, resolved: true });
    if (updated.errors?.length) {
      throw new Error(`resolve rejected: ${JSON.stringify(updated.errors)?.slice(0, 200)}`);
    }
    return { sentEmail: false, sentSms: false };
  }
  // AppSync nests mutation args under event.arguments; Scheduler sends a flat payload.
  const alertId = raw.alertId ?? raw.arguments?.alertId;
  const trigger = raw.trigger ?? (alertId ? "manual" : "cron-daily");
  // Manual path: regenerate + send a single alert.
  if (trigger === "manual" && alertId) {
    const alert = (await client.models.Alert.get({ id: alertId })).data;
    if (!alert) throw new Error("VALIDATION: unknown alert");
    // DynamoDB reads are eventually consistent — one retry before giving up.
    let member = alert.memberId ? (await client.models.Member.get({ id: alert.memberId })).data : null;
    if (!member && alert.memberId) {
      await new Promise((r) => setTimeout(r, 800));
      member = (await client.models.Member.get({ id: alert.memberId })).data;
    }
    const group = alert.groupId ? (await client.models.Group.get({ id: alert.groupId })).data : null;
    const d = await draftFor(alert, alert.memberName ?? "?", group?.contributionAmount ?? 20000, group?.currency ?? undefined);
    const mail = brandedReminder({
      memberName: alert.memberName ?? "?",
      groupName: group?.name ?? "",
      amount: group?.contributionAmount ?? 20000,
      cycleLabel: `cycle ${group?.currentCycleIndex ?? ""}`,
      late: alert.type !== "REMINDER",
    });
    const sentEmail = member?.email ? await sendEmail(member.email, mail) : false;
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
            { type: "LATE_PAYMENT" } as AlertRow, m.name, group.contributionAmount,
            group.currency ?? undefined
          );
          await client.models.Alert.create({
            groupId: group.id, cycleId: cycle.id, memberId: m.id, memberName: m.name,
            type: "LATE_PAYMENT", message: d.fr, messageEn: d.en,
            createdAt: new Date().toISOString(), resolved: false, dedupeKey: key,
          }).then((r) => {
            if (r.errors?.length || !r.data) {
              throw new Error(`alert create rejected: ${JSON.stringify(r.errors)?.slice(0, 200)}`);
            }
          });
          created++;
          // Background: the late event immediately degrades the trust score,
          // so the next AI rotation works with fresh antecedents.
          await applyLateEvent(client.models, m.id).catch(() => null);
          if (await sendEmail(m.email, brandedReminder({
            memberName: m.name,
            groupName: group.name,
            amount: group.contributionAmount,
            cycleLabel: `cycle ${group.currentCycleIndex}`,
            late: true,
          }))) emailed++;
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
