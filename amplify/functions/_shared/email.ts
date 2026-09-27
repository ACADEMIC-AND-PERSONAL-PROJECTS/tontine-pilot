// Branded HTML emails: 600px table layout, inline CSS, dark platform theme.
// Rules followed: single column, logo top-center, one CTA, subordinate footer.
const BG = "#070913";
const CARD = "#0c0f1a";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#fafafa";
const MUTED = "#a1a1aa";
const ACCENT = "#8b5cf6";
const GOLD = "#facc15";

/** Backend amount rendering: "20 000 FCFA" vs "$30". */
export function emailAmount(amount: number, currency?: string | null): string {
  if (currency === "USD") return `$${amount.toLocaleString("en-US")}`;
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

export function shell(opts: {
  lang: string;
  preheader: string;
  title: string;
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
  logoUrl: string;
  appUrl: string;
}): string {
  const { lang, preheader, title, body, ctaUrl, ctaLabel, logoUrl, appUrl } = opts;
  return `<!DOCTYPE html><html lang="${lang}" xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><meta name="color-scheme" content="dark"/><meta name="supported-color-schemes" content="dark"/><title>${title}</title></head><body style="margin:0;padding:0;background-color:${BG};color:${TEXT};font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG};"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding:0 0 24px 0;">
<img src="${logoUrl}" alt="TontinePilot" width="72" style="display:block;width:72px;height:auto;border:0;border-radius:18px;"/>
<p style="margin:12px 0 0 0;font-size:20px;font-weight:bold;letter-spacing:0.5px;"><span style="color:#a78bfa;">Tontine</span><span style="color:${GOLD};">Pilot</span></p>
<table role="presentation" width="120" cellpadding="0" cellspacing="0" border="0" style="margin:14px auto 0 auto;"><tr><td style="height:3px;background-color:${GOLD};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
<tr><td style="background-color:${CARD};border:1px solid ${BORDER};border-radius:16px;padding:32px 28px;">
<h1 style="margin:0 0 8px 0;font-size:22px;line-height:1.3;">${title}</h1>
${body}
${
  ctaUrl && ctaLabel
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0 0;"><tr><td align="center" style="background-color:${ACCENT};border-radius:12px;padding:15px 34px;"><a href="${ctaUrl}" style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;">${ctaLabel}</a></td></tr></table>`
    : ""
}
</td></tr>
<tr><td align="center" style="padding:24px 8px 0 8px;">
<p style="margin:0;font-size:12px;color:${MUTED};">TontinePilot — ${lang === "fr" ? "le copilote IA de ta tontine. Suivi uniquement, jamais d'argent réel manipulé." : "the AI copilot for your tontine. Tracking only — never handles real money."}</p>
<p style="margin:8px 0 0 0;font-size:12px;color:${MUTED};"><a href="${appUrl}" style="color:#a78bfa;text-decoration:underline;">${appUrl.replace(/^https?:\/\//, "")}</a></p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

const row = (k: string, v: string) =>
  `<tr><td style="padding:8px 0;border-bottom:1px solid ${BORDER};font-size:14px;color:${MUTED};">${k}</td><td align="right" style="padding:8px 0;border-bottom:1px solid ${BORDER};font-size:14px;font-weight:bold;">${v}</td></tr>`;

export function welcomeHtml(opts: {
  memberName: string;
  groupName: string;
  amount: number;
  currency?: string | null;
  frequency: string;
  memberCount: number;
  members: string[];
  fundTarget: number;
  appUrl: string;
  logoUrl: string;
}): { subject: string; html: string; text: string } {
  const { memberName, groupName, amount, currency, frequency, memberCount, members, fundTarget, appUrl, logoUrl } = opts;
  const money = (n: number) => emailAmount(n, currency);
  const freq = frequency === "WEEKLY" ? "hebdomadaire / weekly" : "mensuelle / monthly";
  const list = members
    .map((m) => `<li style="font-size:14px;margin:2px 0;">${m}</li>`)
    .join("");
  const body = `<p style="font-size:15px;line-height:1.6;">Bonjour ${memberName} 👋<br/>Tu as été ajouté(e) à la tontine <strong>${groupName}</strong>.</p>
<p style="font-size:15px;line-height:1.6;">Hello ${memberName} 👋<br/>You were added to the <strong>${groupName}</strong> tontine.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;">
${row("Cotisation / Contribution", money(amount))}
${row("Fréquence / Frequency", freq)}
${row("Membres / Members", String(memberCount))}
${row("Caisse de secours / Safety fund", money(fundTarget))}
</table>
<p style="font-size:14px;color:${MUTED};">Membres / Members :</p>
<ul style="margin:4px 0 0 0;padding-left:20px;">${list}</ul>`;
  return {
    subject: `Bienvenue dans ${groupName} · Welcome to ${groupName}`,
    html: shell({
      lang: "fr", preheader: `Tu as rejoint ${groupName}`,
      title: `Bienvenue 👋 · Welcome`, body,
      ctaUrl: `${appUrl}/dashboard`, ctaLabel: "Ouvrir mon dashboard · Open dashboard",
      logoUrl, appUrl,
    }),
    text: `Bonjour ${memberName}, tu as rejoint ${groupName} (${money(amount)}, ${freq}, ${memberCount} membres). Hello ${memberName}, you joined ${groupName}. ${appUrl}/dashboard`,
  };
}

export function memberMessageHtml(opts: {
  memberName: string;
  groupName: string;
  subject: string;
  message: string;
  appUrl: string;
  logoUrl: string;
}): { subject: string; html: string; text: string } {
  const { memberName, groupName, subject, message, appUrl, logoUrl } = opts;
  const body = `<p style="font-size:15px;line-height:1.6;">Bonjour ${memberName} 👋<br/>Un message de l'admin de <strong>${groupName}</strong> :</p>
<blockquote style="margin:12px 0;padding:12px 16px;border-left:3px solid ${GOLD};background:rgba(250,204,21,0.06);border-radius:0 10px 10px 0;font-size:15px;line-height:1.6;">${message}</blockquote>
<p style="font-size:13px;color:${MUTED};">— via TontinePilot</p>`;
  return {
    subject: `Message · ${groupName} — ${subject}`,
    html: shell({
      lang: "fr", preheader: subject.slice(0, 80),
      title: subject, body,
      ctaUrl: `${appUrl}/dashboard`, ctaLabel: "Ouvrir mon dashboard · Open dashboard",
      logoUrl, appUrl,
    }),
    text: `Bonjour ${memberName}, message de ${groupName} : ${message} ${appUrl}/dashboard`,
  };
}

export function reminderHtml(opts: {
  memberName: string;
  groupName: string;
  amount: number;
  currency?: string | null;
  cycleLabel: string;
  late: boolean;
  appUrl: string;
  logoUrl: string;
}): { subject: string; html: string; text: string } {
  const { memberName, groupName, amount, currency, cycleLabel, late, appUrl, logoUrl } = opts;
  const money = emailAmount(amount, currency);
  const fr = late
    ? `${memberName}, rappel amical : ta cotisation de ${money} pour ${groupName} (${cycleLabel}) est en retard. Peux-tu régulariser rapidement ? Merci !`
    : `${memberName}, petit rappel : ta cotisation de ${money} pour ${groupName} (${cycleLabel}) arrive à échéance. Merci !`;
  const en = late
    ? `${memberName}, friendly reminder: your ${money} contribution to ${groupName} (${cycleLabel}) is late. Can you settle it soon? Thank you!`
    : `${memberName}, quick reminder: your ${money} contribution to ${groupName} (${cycleLabel}) is due soon. Thank you!`;
  const body = `<p style="font-size:15px;line-height:1.6;">${fr}</p><p style="font-size:15px;line-height:1.6;color:${MUTED};">${en}</p>`;
  return {
    subject: late
      ? `Rappel : cotisation en retard · ${groupName}`
      : `Rappel : cotisation à venir · ${groupName}`,
    html: shell({
      lang: "fr", preheader: fr.slice(0, 80),
      title: late ? "⏰ Rappel de cotisation · Reminder" : "🔔 Cotisation à venir · Upcoming",
      body, ctaUrl: `${appUrl}/dashboard`,
      ctaLabel: "Voir mon groupe · View group", logoUrl, appUrl,
    }),
    text: `${fr}\n\n${en}\n\n${appUrl}/dashboard`,
  };
}
