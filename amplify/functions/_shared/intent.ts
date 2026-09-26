// Deterministic intent pre-routing for member emails.
// The model is unreliable at volunteering tool calls, so explicit
// reminder/message requests are detected here and executed directly.
// Returns { kind, recipient } or null when no clear intent is found.
export type RoutedIntent = {
  kind: "reminder" | "message";
  recipient: string;
};

const EMAIL_RE = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/;

const REMINDER_FR = /(rappel|rappelle|relance|relancer|retard|en retard|impayé)/i;
const MESSAGE_FR =
  /(envoie|envoi|envois|message|écris|préviens|demande\s+(à|a)|dis\s+(à|a)|transmets)/i;
const REMINDER_EN = /(remind|reminder|nudge|late|overdue|unpaid)/i;
const MESSAGE_EN = /(send|message|tell|ask|notify|warn)/i;

// NOTE: \b does not work around accented chars in JS (\w is ASCII-only),
// so prepositions are anchored on whitespace/punctuation instead.
const PREP_FR = "(?:^|[\\s.,;!?:])(?:à|a|au|chez|pour|de|d['\u2019])";
const WORD = "[A-ZÀ-Þ][\\wà-ÿ'.-]*(?:\\s+[A-ZÀ-Þ][\\wà-ÿ'.-]*)?";
// NOTE: no "i" flag on purpose — the capital first letter is what tells a
// name apart from surrounding lowercase words.
const NAME_FR = new RegExp(`${PREP_FR}\\s*(${WORD})`);
const NAME_EN = /(?:^|[\s.,;!?:])(?:to|for)\s*([A-ZÀ-Þ][\wà-ÿ'.-]*(?:\s+[A-ZÀ-Þ][\wà-ÿ'.-]*)?)/i;

function pickName(question: string, fr: boolean): string | null {
  const m = question.match(EMAIL_RE);
  if (m) return m[1];
  const re = fr ? NAME_FR : NAME_EN;
  const n = question.match(re);
  if (n) return n[1].trim();
  // fallback: other-language pattern
  const alt = question.match(fr ? NAME_EN : NAME_FR);
  if (alt) return alt[1].trim();
  // last resort: first capitalized word sequence after the first word
  // ("Remind Ibrahima…" -> "Ibrahima")
  const tail = question.split(/\s+/).slice(1).join(" ");
  const bare = tail.match(/([A-ZÀ-Þ][\wà-ÿ'.-]*(?:\s+[A-ZÀ-Þ][\wà-ÿ'.-]*)?)/);
  return bare ? bare[1].trim() : null;
}

export function routeMemberEmail(question: string, uiLocale: string): RoutedIntent | null {
  const frScore =
    (question.match(/[àâäéèêëîïôöùûüçœæ]/g) ?? []).length +
    (REMINDER_FR.test(question) ? 2 : 0) +
    (MESSAGE_FR.test(question) ? 2 : 0);
  const enScore =
    (REMINDER_EN.test(question) ? 2 : 0) + (MESSAGE_EN.test(question) ? 2 : 0);
  const fr = frScore >= enScore && (frScore > 0 || uiLocale !== "en");
  const isReminder = fr ? REMINDER_FR.test(question) : REMINDER_EN.test(question);
  const isMessage = fr ? MESSAGE_FR.test(question) : MESSAGE_EN.test(question);
  if (!isReminder && !isMessage) return null;
  const recipient = pickName(question, fr);
  if (!recipient) return null;
  return { kind: isReminder ? "reminder" : "message", recipient };
}
