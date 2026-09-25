import type { Handler } from "aws-lambda";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { env } from "$amplify/env/mediate";
import type { Schema } from "../../data/resource";
import { NLU_PROFILE, USE_MOCK, converseText, extractJson, log } from "../_shared/bedrock";
import { templateNudge } from "../_shared/fallbacks";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

const SYSTEM = `You are an empathic mediator for a Senegalese community savings group. Warm, respectful, never shaming, max 40 words per language.
Given the alert JSON, write message_fr, message_en (both always), and when the type allows a proposal: proposal_kind (swap|installment|emergency|null) + proposal_fr + proposal_en.
Swap proposals must name a concrete high-trust member from CANDIDATES. Installments split the balance into dated parts. Emergency proposals cite the fund balance and 2-cycle repayment.
Return ONLY JSON: {"message_fr": "...", "message_en": "...", "proposal_kind": null|"...", "proposal_fr": "...", "proposal_en": "..."}`;

export const handler: Handler = async (event) => {
  const args = (event as { arguments?: { alertId?: string; locale?: string } }).arguments ?? {};
  if (!args.alertId) throw new Error("VALIDATION: alertId required");
  const alert = (await client.models.Alert.get({ id: args.alertId })).data;
  if (!alert) throw new Error("VALIDATION: unknown alert");

  const group = alert.groupId
    ? (await client.models.Group.get({ id: alert.groupId })).data
    : null;
  const candidates = group
    ? (
        await client.models.Member.list({ filter: { groupId: { eq: group.id } } })
      ).data
        .filter((m) => (m.trustScore ?? 0) >= 90)
        .map((m) => ({ id: m.id, name: m.name, trust: m.trustScore }))
    : [];

  if (USE_MOCK) {
    log("FALLBACK: USE_MOCK=true, template nudge");
    const t = templateNudge(
      alert.memberName ?? "?",
      group?.contributionAmount ?? 20000,
      "septembre",
      alert.type === "REMINDER" ? "reminder" : "late"
    );
    return { message: t.message_fr, messageEn: t.message_en, details: "", detailsEn: "" };
  }
  try {
    const raw = await converseText(
      NLU_PROFILE,
      SYSTEM,
      `ALERT: ${JSON.stringify(alert)}. GROUP: ${group?.name} (${group?.contributionAmount} FCFA). FUND: ${group?.emergencyFundBalance}/${group?.emergencyFundTarget}. CANDIDATES: ${JSON.stringify(candidates)}`,
      800
    );
    const p = extractJson(raw) as Record<string, unknown>;
    const locale = args.locale === "en" ? "en" : "fr";
    return {
      message: ((locale === "en" ? p.message_en : p.message_fr) as string) ?? "",
      messageEn: (p.message_en as string) ?? "",
      details: ((locale === "en" ? p.proposal_en : p.proposal_fr) as string) ?? "",
      detailsEn: (p.proposal_en as string) ?? "",
    };
  } catch (err) {
    log(`FALLBACK: Bedrock failed (${(err as Error)?.message}), template nudge`);
    const t = templateNudge(
      alert.memberName ?? "?",
      group?.contributionAmount ?? 20000,
      "septembre",
      alert.type === "REMINDER" ? "reminder" : "late"
    );
    return { message: t.message_fr, messageEn: t.message_en, details: "", detailsEn: "" };
  }
};
